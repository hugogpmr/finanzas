export const GOAL_TYPES = [
  { value: "savings_goal", label: "Ahorro" },
  { value: "emergency_fund", label: "Fondo de emergencia" },
  { value: "sinking_fund", label: "Fondo específico (sinking fund)" },
] as const;

export type GoalType = (typeof GOAL_TYPES)[number]["value"];

export function goalTypeLabel(type: string) {
  return GOAL_TYPES.find((t) => t.value === type)?.label ?? type;
}

export type Goal = {
  id: string;
  user_id: string;
  name: string;
  type: GoalType;
  target_amount: string;
  current_amount: string;
  target_date: string | null;
  linked_account_id: string | null;
  monthly_contribution: string | null;
  months_of_expenses: number | null;
  created_at: string;
  linked_account?: { name: string; currency: string; current_balance: string } | null;
};

export const EMERGENCY_FUND_DEFAULT_MONTHS = 6;
