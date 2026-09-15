// KPIs del dashboard (Sprint 2, docs/plan-tecnico.md sección 3/5). Funciones
// puras: reciben importes ya convertidos a EUR (ver src/features/dashboard/queries.ts
// para la agregación real contra la base de datos) y devuelven el KPI o `null`
// cuando no hay datos suficientes para calcularlo (evita NaN/Infinity en la UI).

function pct(numerator: number, denominator: number): number | null {
  if (denominator <= 0) return null;
  return (numerator / denominator) * 100;
}

// Cash flow neto del mes: ingresos menos gastos (ambos en positivo).
export function netCashFlow(incomeEur: number, expensesEur: number): number {
  return incomeEur - expensesEur;
}

// Tasa de ahorro = ahorro mensual / ingresos. Benchmark habitual: 15-20%.
export function savingsRatePct(incomeEur: number, expensesEur: number): number | null {
  return pct(netCashFlow(incomeEur, expensesEur), incomeEur);
}

// Proporción del gasto total que es "fijo" (categorías marcadas is_fixed).
export function fixedExpenseRatioPct(
  fixedExpensesEur: number,
  totalExpensesEur: number,
): number | null {
  return pct(fixedExpensesEur, totalExpensesEur);
}

export type NeedsWantsSavingsBreakdown = {
  needs: number;
  wants: number;
  savings: number;
  unassigned: number;
};

// Distribución 50/30/20 como porcentaje del gasto total categorizado con la
// etiqueta needs/wants/savings (unassigned queda fuera del reparto ideal pero
// se informa para que el usuario sepa cuánto le falta por etiquetar).
export function needsWantsSavingsPct(
  totals: NeedsWantsSavingsBreakdown,
): NeedsWantsSavingsBreakdown | null {
  const total = totals.needs + totals.wants + totals.savings + totals.unassigned;
  if (total <= 0) return null;
  return {
    needs: (totals.needs / total) * 100,
    wants: (totals.wants / total) * 100,
    savings: (totals.savings / total) * 100,
    unassigned: (totals.unassigned / total) * 100,
  };
}

// Meses de cobertura del fondo de emergencia = activos líquidos / gastos
// esenciales mensuales (needs). Benchmark habitual: 3-6 meses.
export function emergencyFundMonths(
  liquidAssetsEur: number,
  essentialMonthlyExpensesEur: number,
): number | null {
  if (essentialMonthlyExpensesEur <= 0) return null;
  return liquidAssetsEur / essentialMonthlyExpensesEur;
}

// Ratio de liquidez = activos líquidos / gasto mensual total (más laxo que el
// fondo de emergencia, que solo cuenta gasto esencial).
export function liquidityRatio(
  liquidAssetsEur: number,
  totalMonthlyExpensesEur: number,
): number | null {
  if (totalMonthlyExpensesEur <= 0) return null;
  return liquidAssetsEur / totalMonthlyExpensesEur;
}

// DTI (Debt-to-Income) = pagos mensuales de deuda / ingresos brutos mensuales.
// Benchmark: <36%.
export function dtiPct(
  monthlyDebtPaymentsEur: number,
  grossMonthlyIncomeEur: number,
): number | null {
  return pct(monthlyDebtPaymentsEur, grossMonthlyIncomeEur);
}

// Ratio de vivienda = pago mensual de vivienda / ingresos brutos mensuales.
// Benchmark: <28%.
export function housingRatioPct(
  monthlyHousingPaymentEur: number,
  grossMonthlyIncomeEur: number,
): number | null {
  return pct(monthlyHousingPaymentEur, grossMonthlyIncomeEur);
}

// Patrimonio neto = activos - pasivos (ambos ya convertidos a EUR).
export function netWorth(totalAssetsEur: number, totalLiabilitiesEur: number): number {
  return totalAssetsEur - totalLiabilitiesEur;
}

// Múltiplo de patrimonio sobre ingreso anual (hitos Fidelity: ~1x a los 30,
// 3x a los 40, 6x a los 50, 10x a los 67).
export function netWorthMultiple(
  netWorthEur: number,
  annualIncomeEur: number,
): number | null {
  if (annualIncomeEur <= 0) return null;
  return netWorthEur / annualIncomeEur;
}

// FIRE number = gasto anual × (1 / tasa de retirada). Con la regla del 4%
// (Trinity Study) equivale a ×25; para horizontes muy largos se puede pasar
// una tasa más conservadora (3-3,5% → ×28,5-33,3).
export function fireNumber(annualExpensesEur: number, withdrawalRate = 0.04): number {
  return annualExpensesEur / withdrawalRate;
}

// Años hasta alcanzar el FIRE number, despejando `n` de la fórmula de interés
// compuesto con aportaciones periódicas:
//   objetivo = PV×(1+r)^n + PMT×[((1+r)^n − 1)/r]
// Reescrita como (1+r)^n = (objetivo + PMT/r) / (PV + PMT/r), de donde se
// despeja n directamente (sin iterar). `annualReturnRate` por defecto 5%
// nominal: con ese valor, una tasa de ahorro del 50% da ~17 años y del 70%
// ~8,5 años, que son los puntos de referencia del informe (docs/plan-tecnico.md).
export function yearsToFire({
  targetEur,
  currentNetWorthEur,
  annualSavingsEur,
  annualReturnRate = 0.05,
}: {
  targetEur: number;
  currentNetWorthEur: number;
  annualSavingsEur: number;
  annualReturnRate?: number;
}): number | null {
  if (currentNetWorthEur >= targetEur) return 0;
  if (annualSavingsEur <= 0) return null; // nunca se llega ahorrando 0 o menos

  const r = annualReturnRate;
  const pmtOverR = annualSavingsEur / r;
  const base = (targetEur + pmtOverR) / (currentNetWorthEur + pmtOverR);
  if (base <= 0) return null;

  return Math.log(base) / Math.log(1 + r);
}
