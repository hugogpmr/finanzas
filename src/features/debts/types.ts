export const DEBT_TYPES = [
  { value: "credit_card", label: "Tarjeta de crédito" },
  { value: "personal_loan", label: "Préstamo personal" },
  { value: "mortgage", label: "Hipoteca" },
  { value: "credit_line", label: "Línea de crédito" },
] as const;

export type DebtType = (typeof DEBT_TYPES)[number]["value"];

export function debtTypeLabel(type: string) {
  return DEBT_TYPES.find((t) => t.value === type)?.label ?? type;
}

// numeric(18,2)/(6,4) llegan como string desde supabase-js (ver CLAUDE.md).
// interest_rate y apr son puntos porcentuales de TIN/TAE anual (5.25 = 5,25%),
// no una fracción — así es como aparecen en el papel del préstamo.
export type Debt = {
  id: string;
  user_id: string;
  account_id: string | null;
  name: string;
  debt_type: DebtType;
  principal: string;
  original_principal: string;
  interest_rate: string;
  apr: string | null;
  minimum_payment: string;
  term_months: number | null;
  start_date: string;
  payment_day: number;
  account?: { name: string } | null;
};
