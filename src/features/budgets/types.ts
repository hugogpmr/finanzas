// Los valores del enum `BudgetMethod` en Postgres son literalmente estos
// (ver prisma/migrations/20260914193944_init/migration.sql): el modelo de
// Prisma lo llama `fifty_thirty_twenty` con @map("50_30_20") porque un
// identificador de enum de Prisma no puede empezar por un número, pero como
// leemos/escribimos con supabase-js (no Prisma Client) hay que usar el valor
// real de la base de datos, "50_30_20".
export const BUDGET_METHODS = [
  { value: "50_30_20", label: "50/30/20" },
  { value: "zero_based", label: "Base cero" },
  { value: "envelope", label: "Sobres" },
  { value: "pay_yourself_first", label: "Págate primero" },
] as const;

export type BudgetMethod = (typeof BUDGET_METHODS)[number]["value"];

export function budgetMethodLabel(method: string) {
  return BUDGET_METHODS.find((m) => m.value === method)?.label ?? method;
}

export const BUDGET_PERIODS = [
  { value: "monthly", label: "Mensual" },
  { value: "weekly", label: "Semanal" },
] as const;

export type BudgetPeriod = (typeof BUDGET_PERIODS)[number]["value"];

export function budgetPeriodLabel(period: string) {
  return BUDGET_PERIODS.find((p) => p.value === period)?.label ?? period;
}

export type Budget = {
  id: string;
  user_id: string;
  name: string;
  method: BudgetMethod;
  period: BudgetPeriod;
  start_date: string;
  total_income: string;
  is_active: boolean;
};

export type BudgetLine = {
  id: string;
  budget_id: string;
  category_id: string;
  allocated: string;
  rollover: boolean;
  alert_threshold_pct: string | null;
  category?: { name: string } | null;
};
