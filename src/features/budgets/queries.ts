import type { SupabaseClient } from "@supabase/supabase-js";
import { getCategoryExpenseTotals } from "@/lib/transactions/category-totals";
import { currentPeriodRange, previousPeriodRange } from "./period";
import type { Budget, BudgetLine } from "./types";

export type BudgetLineWithSpending = BudgetLine & {
  spentEur: number;
  // Asignado + lo que sobró del periodo anterior si `rollover` está activo
  // (solo se mira un periodo hacia atrás, no una acumulación indefinida:
  // ver comentario en ./period.ts).
  effectiveAllocatedEur: number;
};

// Añade a cada línea del presupuesto activo cuánto se ha gastado ya en el
// periodo actual (y, si tiene rollover, cuánto sobró del periodo anterior).
export async function withSpending(
  supabase: SupabaseClient,
  budget: Budget,
  lines: BudgetLine[],
): Promise<BudgetLineWithSpending[]> {
  if (lines.length === 0) return [];

  const today = new Date();
  const current = currentPeriodRange(budget.period, today);
  const previous = previousPeriodRange(budget.period, today);

  const needsPreviousPeriod = lines.some((l) => l.rollover);
  const [currentTotals, previousTotals] = await Promise.all([
    getCategoryExpenseTotals(supabase, current),
    needsPreviousPeriod
      ? getCategoryExpenseTotals(supabase, previous)
      : Promise.resolve(new Map<string, number>()),
  ]);

  return lines.map((line) => {
    const spentEur = currentTotals.get(line.category_id) ?? 0;
    const allocated = Number(line.allocated);
    let effectiveAllocatedEur = allocated;

    if (line.rollover) {
      const previousSpent = previousTotals.get(line.category_id) ?? 0;
      const leftover = Math.max(0, allocated - previousSpent);
      effectiveAllocatedEur = allocated + leftover;
    }

    return { ...line, spentEur, effectiveAllocatedEur };
  });
}
