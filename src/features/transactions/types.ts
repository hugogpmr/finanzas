export type Transaction = {
  id: string;
  user_id: string;
  account_id: string;
  category_id: string | null;
  amount: string;
  currency: string;
  amount_eur: string;
  fx_rate: string;
  date: string;
  merchant: string | null;
  description: string | null;
  is_recurring: boolean;
  recurring_group_id: string | null;
  is_split: boolean;
  transfer_pair_id: string | null;
  created_at: string;
  account?: { name: string; currency: string } | null;
  category?: { name: string; parent_id: string | null } | null;
  transaction_tags?: { tag: { id: string; name: string } }[];
};

export const TRANSACTION_KINDS = [
  { value: "expense", label: "Gasto" },
  { value: "income", label: "Ingreso" },
] as const;

export type TransactionKind = (typeof TRANSACTION_KINDS)[number]["value"];
