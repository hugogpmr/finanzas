import { createClient } from "@/lib/supabase/server";
import { getPortfolioData } from "@/features/investments/queries";
import { assetClassLabel, investmentTxTypeLabel, type InvestmentTransaction } from "@/features/investments/types";
import { HoldingDialog } from "@/features/investments/holding-dialog";
import { HoldingRowActions } from "@/features/investments/holding-row-actions";
import { InvestmentTransactionDialog } from "@/features/investments/investment-transaction-dialog";
import { InvestmentTransactionRowActions } from "@/features/investments/investment-transaction-row-actions";
import { RefreshPricesButton } from "@/features/investments/refresh-prices-button";
import { AllocationBreakdown } from "@/features/investments/allocation-breakdown";
import { KpiCard } from "@/features/dashboard/kpi-card";
import { formatCurrency, formatPercent } from "@/lib/format";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function InversionesPage() {
  const supabase = await createClient();

  const [portfolio, { data: accountsData }, { data: txData }] = await Promise.all([
    getPortfolioData(),
    supabase
      .from("accounts")
      .select("id, name, currency")
      .in("type", ["brokerage", "pension"])
      .order("name"),
    supabase
      .from("investment_transactions")
      .select("*")
      .order("date", { ascending: false }),
  ]);

  const accounts = accountsData ?? [];
  const holdings = portfolio.holdings.map((h) => h.holding);
  const transactions = (txData ?? []) as InvestmentTransaction[];
  const holdingNameById = Object.fromEntries(
    holdings.map((h) => [h.id, h.ticker ?? h.isin ?? "—"]),
  );

  const unrealizedGainEur = portfolio.totalMarketValueEur - portfolio.totalCostBasisEur;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Inversiones</h1>
          <p className="text-sm text-muted-foreground">
            Posiciones, rentabilidad (XIRR/TWR) y asignación de activos de tu cartera.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <RefreshPricesButton />
          {accounts.length > 0 && <HoldingDialog accounts={accounts} />}
        </div>
      </div>

      {accounts.length === 0 && (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          Crea antes una cuenta de tipo &ldquo;Cuenta de inversión&rdquo; o &ldquo;Plan de pensiones&rdquo; en{" "}
          <span className="font-medium">Cuentas</span> para poder añadir posiciones.
        </p>
      )}

      {portfolio.hasAnyHolding && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <KpiCard title="Valor de mercado" value={formatCurrency(portfolio.totalMarketValueEur, "EUR")} />
          <KpiCard title="Coste de adquisición" value={formatCurrency(portfolio.totalCostBasisEur, "EUR")} />
          <KpiCard
            title="Ganancia no realizada"
            value={formatCurrency(unrealizedGainEur, "EUR")}
            hint={portfolio.totalCostBasisEur > 0 ? formatPercent((unrealizedGainEur / portfolio.totalCostBasisEur) * 100, 1) : undefined}
          />
          <KpiCard
            title="XIRR de la cartera"
            value={portfolio.portfolioXirr !== null ? formatPercent(portfolio.portfolioXirr * 100, 1) : null}
            hint="Rentabilidad anualizada ponderada por el momento de cada movimiento"
          />
        </div>
      )}

      {holdings.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          Sin posiciones todavía.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ticker</TableHead>
              <TableHead>Clase</TableHead>
              <TableHead className="text-right">Cantidad</TableHead>
              <TableHead className="text-right">Precio</TableHead>
              <TableHead className="text-right">Valor (EUR)</TableHead>
              <TableHead className="text-right">Coste (EUR)</TableHead>
              <TableHead className="text-right">XIRR</TableHead>
              <TableHead className="text-right">TWR</TableHead>
              <TableHead className="text-right">Yield/coste</TableHead>
              <TableHead>Cuenta</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {portfolio.holdings.map(({ holding, marketValueEur, costBasisEur, xirr, twr, yieldOnCostPct }) => (
              <TableRow key={holding.id}>
                <TableCell className="font-medium">{holding.ticker ?? holding.isin ?? "—"}</TableCell>
                <TableCell>{assetClassLabel(holding.asset_class)}</TableCell>
                <TableCell className="text-right tabular-nums">{holding.quantity}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {holding.current_price ? formatCurrency(holding.current_price, holding.currency) : "—"}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {marketValueEur !== null ? formatCurrency(marketValueEur, "EUR") : "—"}
                </TableCell>
                <TableCell className="text-right tabular-nums">{formatCurrency(costBasisEur, "EUR")}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {xirr !== null ? formatPercent(xirr * 100, 1) : "—"}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {twr !== null ? formatPercent(twr * 100, 1) : "—"}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {yieldOnCostPct !== null ? formatPercent(yieldOnCostPct, 1) : "—"}
                </TableCell>
                <TableCell className="text-muted-foreground">{holding.account?.name ?? "—"}</TableCell>
                <TableCell>
                  <HoldingRowActions holding={holding} accounts={accounts} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {portfolio.hasAnyHolding && (
        <section className="flex flex-col gap-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Asignación de activos
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <AllocationBreakdown title="Por clase de activo" slices={portfolio.allocationByClass} />
            <AllocationBreakdown title="Por sector" slices={portfolio.allocationBySector} />
            <AllocationBreakdown title="Por geografía" slices={portfolio.allocationByGeography} />
            <AllocationBreakdown title="Por divisa" slices={portfolio.allocationByCurrency} />
          </div>
        </section>
      )}

      {holdings.length > 0 && (
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Movimientos
            </h2>
            <InvestmentTransactionDialog holdings={holdings} />
          </div>

          {transactions.length === 0 ? (
            <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              Sin movimientos todavía: añade compras, ventas o dividendos para calcular XIRR/TWR.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Posición</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Cantidad</TableHead>
                  <TableHead className="text-right">Precio/u.</TableHead>
                  <TableHead className="text-right">Importe</TableHead>
                  <TableHead className="text-right">Comisión</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell className="font-medium">{holdingNameById[tx.holding_id] ?? "—"}</TableCell>
                    <TableCell>{investmentTxTypeLabel(tx.type)}</TableCell>
                    <TableCell>{tx.date}</TableCell>
                    <TableCell className="text-right tabular-nums">{tx.quantity ?? "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {tx.price_per_unit ? formatCurrency(tx.price_per_unit, tx.currency) : "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(tx.amount, tx.currency)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {Number(tx.fee) > 0 ? formatCurrency(tx.fee, tx.currency) : "—"}
                    </TableCell>
                    <TableCell>
                      <InvestmentTransactionRowActions transaction={tx} holdings={holdings} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </section>
      )}
    </div>
  );
}
