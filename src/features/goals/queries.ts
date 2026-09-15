import type { SupabaseClient } from "@supabase/supabase-js";
import { getEurRate } from "@/lib/fx";
import { todayDateStr } from "@/lib/date";
import type { Goal } from "./types";

export type GoalWithCurrentEur = Goal & { currentAmountEur: number };

// El importe actual de un objetivo enlazado a una cuenta se toma del saldo
// real de esa cuenta (ver el comentario en actions.ts sobre por qué), no del
// campo `current_amount` guardado. Se convierte a EUR con el tipo de cambio
// de hoy porque target_amount/current_amount no llevan divisa propia en el
// esquema (se asumen en EUR, igual que el resto del dashboard).
export async function withCurrentAmountEur(
  supabase: SupabaseClient,
  goals: Goal[],
): Promise<GoalWithCurrentEur[]> {
  const linkedIds = goals.map((g) => g.linked_account_id).filter((id): id is string => !!id);
  if (linkedIds.length === 0) {
    return goals.map((g) => ({ ...g, currentAmountEur: Number(g.current_amount) }));
  }

  const { data: accounts } = await supabase
    .from("accounts")
    .select("id, currency, current_balance")
    .in("id", linkedIds);

  const accountsById = new Map((accounts ?? []).map((a) => [a.id, a]));
  const today = todayDateStr();
  const ratesByCurrency = new Map<string, number>();

  const result: GoalWithCurrentEur[] = [];
  for (const goal of goals) {
    if (!goal.linked_account_id) {
      result.push({ ...goal, currentAmountEur: Number(goal.current_amount) });
      continue;
    }
    const account = accountsById.get(goal.linked_account_id);
    if (!account) {
      result.push({ ...goal, currentAmountEur: Number(goal.current_amount) });
      continue;
    }
    if (!ratesByCurrency.has(account.currency)) {
      ratesByCurrency.set(account.currency, await getEurRate(supabase, account.currency, today));
    }
    const rate = ratesByCurrency.get(account.currency) ?? 1;
    result.push({ ...goal, currentAmountEur: Number(account.current_balance) * rate });
  }
  return result;
}
