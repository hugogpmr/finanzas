import type { SupabaseClient } from "@supabase/supabase-js";
import { attributeTransactionParts } from "./attribution";

// Gasto total en EUR por categoría (RLS ya limita al usuario autenticado, no
// hace falta filtrar por user_id) dentro de un rango de fechas inclusive.
// Usado por presupuestos (src/features/budgets/queries.ts) para comparar
// gasto real contra lo asignado en cada línea.
export async function getCategoryExpenseTotals(
  supabase: SupabaseClient,
  range: { from: string; to: string },
): Promise<Map<string, number>> {
  const { data } = await supabase
    .from("transactions")
    .select(
      "amount, amount_eur, category_id, is_split, splits:transaction_splits(category_id, amount)",
    )
    .gte("date", range.from)
    .lte("date", range.to)
    .lt("amount", 0);

  const totals = new Map<string, number>();
  for (const tx of data ?? []) {
    for (const part of attributeTransactionParts(tx)) {
      if (!part.categoryId) continue;
      totals.set(part.categoryId, (totals.get(part.categoryId) ?? 0) + part.amountEur);
    }
  }
  return totals;
}
