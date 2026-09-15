import { createClient } from "@/lib/supabase/server";
import { getEurRate } from "@/lib/fx";
import { toDateStr, todayDateStr } from "@/lib/date";
import { calculateXirr, type CashFlow } from "@/lib/finance/xirr";
import { timeWeightedReturn } from "@/lib/finance/twr";
import { groupAllocation, yieldOnCostPct, type AllocationSlice } from "@/lib/finance/investments";
import { assetClassLabel, type Holding, type InvestmentTransaction } from "./types";

type PriceSnapshotRow = { holding_id: string; date: string; price: string; market_value: string };

const DIVIDEND_TRAILING_MONTHS = 12;

export type HoldingMetrics = {
  holding: Holding;
  marketValueEur: number | null;
  costBasisEur: number;
  unrealizedGainEur: number | null;
  xirr: number | null;
  twr: number | null;
  yieldOnCostPct: number | null;
};

export type PortfolioData = {
  hasAnyHolding: boolean;
  holdings: HoldingMetrics[];
  totalMarketValueEur: number;
  totalCostBasisEur: number;
  portfolioXirr: number | null;
  allocationByClass: AllocationSlice[];
  allocationBySector: AllocationSlice[];
  allocationByGeography: AllocationSlice[];
  allocationByCurrency: AllocationSlice[];
};

function emptyPortfolio(): PortfolioData {
  return {
    hasAnyHolding: false,
    holdings: [],
    totalMarketValueEur: 0,
    totalCostBasisEur: 0,
    portfolioXirr: null,
    allocationByClass: [],
    allocationBySector: [],
    allocationByGeography: [],
    allocationByCurrency: [],
  };
}

export async function getPortfolioData(): Promise<PortfolioData> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return emptyPortfolio();

  const [{ data: holdingsData }, { data: txData }, { data: snapshotsData }] = await Promise.all([
    supabase.from("holdings").select("*, account:accounts(name)").order("ticker"),
    supabase.from("investment_transactions").select("*").order("date", { ascending: true }),
    supabase
      .from("price_snapshots")
      .select("holding_id, date, price, market_value")
      .order("date", { ascending: true }),
  ]);

  const holdings = (holdingsData ?? []) as Holding[];
  if (holdings.length === 0) return emptyPortfolio();

  const transactions = (txData ?? []) as InvestmentTransaction[];
  const snapshots = (snapshotsData ?? []) as PriceSnapshotRow[];

  const today = todayDateStr();
  const currencies = new Set(holdings.map((h) => h.currency));
  // El tipo de cambio de hoy sirve para valorar las posiciones; el de cada
  // transacción se pide aparte (fecha propia) para convertir sus flujos de
  // caja con el tipo de cambio real del día en que ocurrieron.
  const todayRatesByCurrency = new Map<string, number>();
  await Promise.all(
    Array.from(currencies).map(async (currency) => {
      todayRatesByCurrency.set(currency, await getEurRate(supabase, currency, today));
    }),
  );

  const txByHolding = new Map<string, InvestmentTransaction[]>();
  for (const tx of transactions) {
    const list = txByHolding.get(tx.holding_id) ?? [];
    list.push(tx);
    txByHolding.set(tx.holding_id, list);
  }

  const snapshotsByHolding = new Map<string, PriceSnapshotRow[]>();
  for (const s of snapshots) {
    const list = snapshotsByHolding.get(s.holding_id) ?? [];
    list.push(s);
    snapshotsByHolding.set(s.holding_id, list);
  }

  const dividendCutoff = new Date();
  dividendCutoff.setMonth(dividendCutoff.getMonth() - DIVIDEND_TRAILING_MONTHS);
  const dividendCutoffStr = toDateStr(dividendCutoff);

  const holdingMetrics: HoldingMetrics[] = [];
  const portfolioCashflows: CashFlow[] = [];

  for (const holding of holdings) {
    const rate = todayRatesByCurrency.get(holding.currency) ?? 1;
    const currentPrice = holding.current_price !== null ? Number(holding.current_price) : null;
    const quantity = Number(holding.quantity);
    const marketValueEur = currentPrice !== null ? quantity * currentPrice * rate : null;

    const txs = txByHolding.get(holding.id) ?? [];

    let costBasisEur = 0;
    let annualDividendEur = 0;
    const cashflows: CashFlow[] = [];

    for (const tx of txs) {
      const txRate = await getEurRate(supabase, tx.currency, tx.date);
      const amountEur = Number(tx.amount) * txRate;
      cashflows.push({ amount: amountEur, date: new Date(tx.date) });

      if (tx.type === "buy") {
        costBasisEur += Math.abs(amountEur) + Number(tx.fee) * txRate;
      }
      if (tx.type === "dividend" && tx.date >= dividendCutoffStr) {
        annualDividendEur += Math.abs(amountEur);
      }
    }

    // El valor de mercado actual se trata como un flujo de caja positivo a
    // fecha de hoy: es dinero que el inversor todavía "posee" aunque no lo
    // haya vendido (convención estándar para calcular MWR/XIRR de una
    // posición abierta).
    if (marketValueEur !== null) {
      cashflows.push({ amount: marketValueEur, date: new Date(today) });
    }

    const xirr = calculateXirr(cashflows);
    portfolioCashflows.push(...cashflows);

    // TWR: se enlazan los periodos entre snapshots de precio consecutivos
    // (price_snapshots, uno por cada vez que se actualiza el precio), usando
    // como flujo externo del periodo la suma de compras/ventas ocurridas en
    // ese rango de fechas. Es una simplificación honesta: sin una valoración
    // diaria de la posición, no se puede aislar el efecto exacto del día
    // concreto del movimiento (ver src/lib/finance/twr.ts). Se calcula en la
    // divisa nativa de la posición, no en EUR, para no mezclar la
    // rentabilidad de la inversión con el efecto del tipo de cambio.
    const holdingSnapshots = snapshotsByHolding.get(holding.id) ?? [];
    let twr: number | null = null;
    if (holdingSnapshots.length >= 2) {
      const periods = [];
      for (let i = 1; i < holdingSnapshots.length; i++) {
        const prev = holdingSnapshots[i - 1];
        const curr = holdingSnapshots[i];
        const externalFlow = txs
          .filter(
            (t) => (t.type === "buy" || t.type === "sell") && t.date > prev.date && t.date <= curr.date,
          )
          .reduce((sum, t) => sum + Number(t.amount), 0);
        periods.push({
          startValue: Number(prev.market_value),
          endValue: Number(curr.market_value),
          externalFlow,
        });
      }
      twr = timeWeightedReturn(periods);
    }

    holdingMetrics.push({
      holding,
      marketValueEur,
      costBasisEur,
      unrealizedGainEur: marketValueEur !== null ? marketValueEur - costBasisEur : null,
      xirr,
      twr,
      yieldOnCostPct: yieldOnCostPct(annualDividendEur, costBasisEur),
    });
  }

  const withMarketValue = holdingMetrics.filter(
    (h): h is HoldingMetrics & { marketValueEur: number } => h.marketValueEur !== null,
  );
  const totalMarketValueEur = holdingMetrics.reduce((sum, h) => sum + (h.marketValueEur ?? 0), 0);
  const totalCostBasisEur = holdingMetrics.reduce((sum, h) => sum + h.costBasisEur, 0);
  const portfolioXirr = calculateXirr(portfolioCashflows);

  return {
    hasAnyHolding: true,
    holdings: holdingMetrics,
    totalMarketValueEur,
    totalCostBasisEur,
    portfolioXirr,
    allocationByClass: groupAllocation(
      withMarketValue.map((h) => ({
        key: assetClassLabel(h.holding.asset_class),
        valueEur: h.marketValueEur,
      })),
    ),
    allocationBySector: groupAllocation(
      withMarketValue.map((h) => ({ key: h.holding.sector ?? "Sin sector", valueEur: h.marketValueEur })),
    ),
    allocationByGeography: groupAllocation(
      withMarketValue.map((h) => ({
        key: h.holding.geography ?? "Sin región",
        valueEur: h.marketValueEur,
      })),
    ),
    allocationByCurrency: groupAllocation(
      withMarketValue.map((h) => ({ key: h.holding.currency, valueEur: h.marketValueEur })),
    ),
  };
}
