import { createClient } from "@/lib/supabase/server";
import { getEurRate } from "@/lib/fx";
import { toDateStr } from "@/lib/date";
import { attributeTransactionParts } from "@/lib/transactions/attribution";
import { aggregateNetWorth } from "@/lib/finance/net-worth";
import {
  dtiPct,
  emergencyFundMonths,
  fireNumber,
  fixedExpenseRatioPct,
  housingRatioPct,
  liquidityRatio,
  needsWantsSavingsPct,
  netCashFlow,
  netWorthMultiple,
  savingsRatePct,
  yearsToFire,
  type NeedsWantsSavingsBreakdown,
} from "@/lib/finance/kpis";

const MONTHS_OF_HISTORY = 12;
const AVERAGE_OVER_MONTHS = 3;

type CategoryRow = {
  id: string;
  name: string;
  parent_id: string | null;
  is_fixed: boolean;
  needs_wants_savings: "needs" | "wants" | "savings" | null;
};

type TransactionRow = {
  date: string;
  amount: string;
  amount_eur: string;
  category_id: string | null;
  is_split: boolean;
  splits: { category_id: string | null; amount: string }[] | null;
};

type MonthBucket = {
  key: string;
  incomeEur: number;
  expensesEur: number;
  fixedExpensesEur: number;
  needs: number;
  wants: number;
  savings: number;
  unassigned: number;
  housingEur: number;
};

function emptyBucket(key: string): MonthBucket {
  return {
    key,
    incomeEur: 0,
    expensesEur: 0,
    fixedExpensesEur: 0,
    needs: 0,
    wants: 0,
    savings: 0,
    unassigned: 0,
    housingEur: 0,
  };
}

function monthKey(dateStr: string) {
  return dateStr.slice(0, 7);
}

const MONTH_LABELS = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
];

function monthLabel(key: string) {
  const [year, month] = key.split("-");
  return `${MONTH_LABELS[Number(month) - 1]} ${year.slice(2)}`;
}

// Una categoría (o su padre) se considera "vivienda" por nombre: es una
// heurística simple para el MVP (no hay un flag dedicado en el esquema).
// Si el usuario renombra o borra la categoría "Vivienda" sembrada por
// ensureDefaultCategories, este ratio deja de calcularse (vuelve a 0), no
// rompe nada más.
function isHousingCategory(
  categoryId: string | null,
  categoriesById: Map<string, CategoryRow>,
): boolean {
  if (!categoryId) return false;
  const category = categoriesById.get(categoryId);
  if (!category) return false;
  if (category.name.toLowerCase().includes("vivienda")) return true;
  if (category.parent_id) {
    const parent = categoriesById.get(category.parent_id);
    if (parent?.name.toLowerCase().includes("vivienda")) return true;
  }
  return false;
}

function averageOfLastMonths(
  buckets: MonthBucket[],
  field: keyof Omit<MonthBucket, "key">,
): number | null {
  const withActivity = buckets.filter((b) => b.incomeEur > 0 || b.expensesEur > 0);
  const lastN = withActivity.slice(-AVERAGE_OVER_MONTHS);
  if (lastN.length === 0) return null;
  return lastN.reduce((sum, b) => sum + b[field], 0) / lastN.length;
}

export type DashboardData = {
  hasAnyAccount: boolean;
  hasAnyTransaction: boolean;
  kpis: {
    avgMonthlyIncomeEur: number | null;
    avgMonthlyExpensesEur: number | null;
    avgEssentialMonthlyExpensesEur: number | null;
    netCashFlowEur: number | null;
    savingsRatePct: number | null;
    fixedExpenseRatioPct: number | null;
    needsWantsSavingsPct: NeedsWantsSavingsBreakdown | null;
    emergencyFundMonths: number | null;
    liquidityRatio: number | null;
    dtiPct: number | null;
    housingRatioPct: number | null;
    liquidAssetsEur: number;
    totalAssetsEur: number;
    totalLiabilitiesEur: number;
    netWorthEur: number;
    liquidNetWorthEur: number;
    netWorthMultiple: number | null;
    fireNumberEur: number | null;
    yearsToFire: number | null;
  };
  monthlySeries: { key: string; label: string; incomeEur: number; expensesEur: number }[];
  categoryComparison: { category: string; currentEur: number; previousEur: number }[];
};

export async function getDashboardData(): Promise<DashboardData> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const empty: DashboardData = {
    hasAnyAccount: false,
    hasAnyTransaction: false,
    kpis: {
      avgMonthlyIncomeEur: null,
      avgMonthlyExpensesEur: null,
      avgEssentialMonthlyExpensesEur: null,
      netCashFlowEur: null,
      savingsRatePct: null,
      fixedExpenseRatioPct: null,
      needsWantsSavingsPct: null,
      emergencyFundMonths: null,
      liquidityRatio: null,
      dtiPct: null,
      housingRatioPct: null,
      liquidAssetsEur: 0,
      totalAssetsEur: 0,
      totalLiabilitiesEur: 0,
      netWorthEur: 0,
      liquidNetWorthEur: 0,
      netWorthMultiple: null,
      fireNumberEur: null,
      yearsToFire: null,
    },
    monthlySeries: [],
    categoryComparison: [],
  };

  if (!user) return empty;

  const today = new Date();
  const historyStart = new Date(today.getFullYear(), today.getMonth() - (MONTHS_OF_HISTORY - 1), 1);
  const historyStartStr = toDateStr(historyStart);
  const todayStr = toDateStr(today);

  const [{ data: accountsData }, { data: categoriesData }, { data: transactionsData }, { data: debtsData }] =
    await Promise.all([
      supabase.from("accounts").select("type, account_class, currency, current_balance"),
      supabase
        .from("categories")
        .select("id, name, parent_id, is_fixed, needs_wants_savings"),
      supabase
        .from("transactions")
        .select("date, amount, amount_eur, category_id, is_split, splits:transaction_splits(category_id, amount)")
        .gte("date", historyStartStr)
        .order("date", { ascending: true }),
      supabase.from("debts").select("minimum_payment"),
    ]);

  const accounts = accountsData ?? [];
  const categories = (categoriesData ?? []) as CategoryRow[];
  const transactions = (transactionsData ?? []) as unknown as TransactionRow[];
  const debts = debtsData ?? [];

  if (accounts.length === 0) return { ...empty, hasAnyAccount: false };
  if (transactions.length === 0) {
    // Igualmente calculamos patrimonio neto: no depende de transacciones.
  }

  const categoriesById = new Map(categories.map((c) => [c.id, c]));

  // --- Patrimonio: convertir cada cuenta a EUR con el tipo de cambio de hoy ---
  const currencies = new Set(accounts.map((a) => a.currency));
  const ratesByCurrency = new Map<string, number>();
  await Promise.all(
    Array.from(currencies).map(async (currency) => {
      ratesByCurrency.set(currency, await getEurRate(supabase, currency, todayStr));
    }),
  );

  const {
    totalAssetsEur,
    totalLiabilitiesEur,
    liquidAssetsEur,
    netWorthEur,
    liquidNetWorthEur,
  } = aggregateNetWorth(
    accounts.map((a) => ({ ...a, current_balance: Number(a.current_balance) })),
    ratesByCurrency,
  );

  // --- Transacciones: buckets por mes calendario ---
  const buckets = new Map<string, MonthBucket>();
  for (let i = 0; i < MONTHS_OF_HISTORY; i++) {
    const d = new Date(today.getFullYear(), today.getMonth() - (MONTHS_OF_HISTORY - 1 - i), 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    buckets.set(key, emptyBucket(key));
  }

  // Total de gasto por categoría raíz, para el mes actual y el anterior
  // (independiente de los buckets mensuales de KPIs, que van por needs/wants/fixed).
  const currentMonthKey = monthKey(todayStr);
  const previousMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const previousMonthKey = `${previousMonthDate.getFullYear()}-${String(previousMonthDate.getMonth() + 1).padStart(2, "0")}`;
  const categoryTotals = new Map<string, { current: number; previous: number }>();

  function addCategoryAmount(key: string, categoryId: string | null, amountEur: number) {
    const category = categoryId ? categoriesById.get(categoryId) : undefined;
    const rootName = category
      ? category.parent_id
        ? categoriesById.get(category.parent_id)?.name ?? category.name
        : category.name
      : "Sin categorizar";

    const entry = categoryTotals.get(rootName) ?? { current: 0, previous: 0 };
    if (key === currentMonthKey) entry.current += amountEur;
    else if (key === previousMonthKey) entry.previous += amountEur;
    categoryTotals.set(rootName, entry);
  }

  for (const tx of transactions) {
    const key = monthKey(tx.date);
    const bucket = buckets.get(key);
    const amountEur = Number(tx.amount_eur);
    const isIncome = Number(tx.amount) > 0;

    if (bucket) {
      if (isIncome) {
        bucket.incomeEur += amountEur;
      } else {
        bucket.expensesEur += Math.abs(amountEur);

        for (const part of attributeTransactionParts(tx)) {
          const category = part.categoryId ? categoriesById.get(part.categoryId) : undefined;
          if (category?.is_fixed) bucket.fixedExpensesEur += part.amountEur;
          if (isHousingCategory(part.categoryId, categoriesById)) {
            bucket.housingEur += part.amountEur;
          }
          switch (category?.needs_wants_savings) {
            case "needs":
              bucket.needs += part.amountEur;
              break;
            case "wants":
              bucket.wants += part.amountEur;
              break;
            case "savings":
              bucket.savings += part.amountEur;
              break;
            default:
              bucket.unassigned += part.amountEur;
          }

          addCategoryAmount(key, part.categoryId, part.amountEur);
        }
      }
    }
  }

  const monthlySeries = Array.from(buckets.values()).map((b) => ({
    key: b.key,
    label: monthLabel(b.key),
    incomeEur: b.incomeEur,
    expensesEur: b.expensesEur,
  }));

  const categoryComparison = Array.from(categoryTotals.entries())
    .map(([category, totals]) => ({ category, currentEur: totals.current, previousEur: totals.previous }))
    .filter((c) => c.currentEur > 0 || c.previousEur > 0)
    .sort((a, b) => b.currentEur + b.previousEur - (a.currentEur + a.previousEur))
    .slice(0, 8);

  const bucketList = Array.from(buckets.values());
  const avgMonthlyIncomeEur = averageOfLastMonths(bucketList, "incomeEur");
  const avgMonthlyExpensesEur = averageOfLastMonths(bucketList, "expensesEur");
  const avgFixedExpensesEur = averageOfLastMonths(bucketList, "fixedExpensesEur");
  const avgHousingEur = averageOfLastMonths(bucketList, "housingEur");
  const avgNeeds = averageOfLastMonths(bucketList, "needs");
  const avgWants = averageOfLastMonths(bucketList, "wants");
  const avgSavings = averageOfLastMonths(bucketList, "savings");
  const avgUnassigned = averageOfLastMonths(bucketList, "unassigned");

  const netCashFlowEur =
    avgMonthlyIncomeEur !== null && avgMonthlyExpensesEur !== null
      ? netCashFlow(avgMonthlyIncomeEur, avgMonthlyExpensesEur)
      : null;

  const monthlyDebtPaymentsEur = debts.reduce((sum, d) => sum + Number(d.minimum_payment), 0);

  const annualIncomeEur = avgMonthlyIncomeEur !== null ? avgMonthlyIncomeEur * 12 : null;
  const annualExpensesEur = avgMonthlyExpensesEur !== null ? avgMonthlyExpensesEur * 12 : null;
  const annualSavingsEur = netCashFlowEur !== null ? netCashFlowEur * 12 : null;

  const fireNumberEur = annualExpensesEur !== null ? fireNumber(annualExpensesEur) : null;

  return {
    hasAnyAccount: true,
    hasAnyTransaction: transactions.length > 0,
    kpis: {
      avgMonthlyIncomeEur,
      avgMonthlyExpensesEur,
      avgEssentialMonthlyExpensesEur: avgNeeds,
      netCashFlowEur,
      savingsRatePct:
        avgMonthlyIncomeEur !== null && avgMonthlyExpensesEur !== null
          ? savingsRatePct(avgMonthlyIncomeEur, avgMonthlyExpensesEur)
          : null,
      fixedExpenseRatioPct:
        avgFixedExpensesEur !== null && avgMonthlyExpensesEur !== null
          ? fixedExpenseRatioPct(avgFixedExpensesEur, avgMonthlyExpensesEur)
          : null,
      needsWantsSavingsPct:
        avgNeeds !== null && avgWants !== null && avgSavings !== null && avgUnassigned !== null
          ? needsWantsSavingsPct({
              needs: avgNeeds,
              wants: avgWants,
              savings: avgSavings,
              unassigned: avgUnassigned,
            })
          : null,
      emergencyFundMonths: avgNeeds !== null ? emergencyFundMonths(liquidAssetsEur, avgNeeds) : null,
      liquidityRatio:
        avgMonthlyExpensesEur !== null ? liquidityRatio(liquidAssetsEur, avgMonthlyExpensesEur) : null,
      dtiPct: annualIncomeEur !== null ? dtiPct(monthlyDebtPaymentsEur, annualIncomeEur / 12) : null,
      housingRatioPct:
        avgHousingEur !== null && annualIncomeEur !== null
          ? housingRatioPct(avgHousingEur, annualIncomeEur / 12)
          : null,
      liquidAssetsEur,
      totalAssetsEur,
      totalLiabilitiesEur,
      netWorthEur,
      liquidNetWorthEur,
      netWorthMultiple: annualIncomeEur !== null ? netWorthMultiple(netWorthEur, annualIncomeEur) : null,
      fireNumberEur,
      yearsToFire:
        fireNumberEur !== null && annualSavingsEur !== null
          ? yearsToFire({
              targetEur: fireNumberEur,
              currentNetWorthEur: netWorthEur,
              annualSavingsEur,
            })
          : null,
    },
    monthlySeries,
    categoryComparison,
  };
}
