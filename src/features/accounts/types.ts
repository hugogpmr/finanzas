export const ACCOUNT_TYPES = [
  { value: "checking", label: "Cuenta corriente", class: "asset" },
  { value: "savings", label: "Cuenta de ahorro", class: "asset" },
  { value: "cash", label: "Efectivo", class: "asset" },
  { value: "brokerage", label: "Cuenta de inversión", class: "asset" },
  { value: "pension", label: "Plan de pensiones", class: "asset" },
  { value: "deposit", label: "Depósito", class: "asset" },
  { value: "crypto", label: "Cripto", class: "asset" },
  { value: "real_estate", label: "Inmueble", class: "asset" },
  { value: "credit_card", label: "Tarjeta de crédito", class: "liability" },
  { value: "personal_loan", label: "Préstamo personal", class: "liability" },
  { value: "mortgage", label: "Hipoteca", class: "liability" },
  { value: "credit_line", label: "Línea de crédito", class: "liability" },
] as const;

export type AccountType = (typeof ACCOUNT_TYPES)[number]["value"];
export type AccountClass = "asset" | "liability";

export const ACCOUNT_TYPE_VALUES = ACCOUNT_TYPES.map((t) => t.value);

export const LIABILITY_TYPES: readonly AccountType[] = ACCOUNT_TYPES.filter(
  (t) => t.class === "liability",
).map((t) => t.value);

export function accountTypeLabel(type: string) {
  return ACCOUNT_TYPES.find((t) => t.value === type)?.label ?? type;
}

export function accountClassOf(type: AccountType): AccountClass {
  return LIABILITY_TYPES.includes(type) ? "liability" : "asset";
}

export const CURRENCIES = ["EUR", "USD", "GBP", "CHF"] as const;

// numeric(18,2) de Postgres llega como string via PostgREST/supabase-js,
// nunca como number (evita perder precisión). Parsear solo al formatear.
export type Account = {
  id: string;
  user_id: string;
  name: string;
  type: AccountType;
  account_class: AccountClass;
  currency: string;
  current_balance: string;
  institution: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};
