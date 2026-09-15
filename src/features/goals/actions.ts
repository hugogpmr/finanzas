"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { GOAL_TYPES, type GoalType } from "./types";

export type GoalFormState = { error?: string; success?: boolean } | undefined;

const GOAL_TYPE_VALUES = GOAL_TYPES.map((t) => t.value);

export async function upsertGoal(
  _prevState: GoalFormState,
  formData: FormData,
): Promise<GoalFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "No has iniciado sesión." };
  }

  const id = formData.get("id");
  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? "");
  const targetAmount = Number(formData.get("target_amount"));
  const targetDate = String(formData.get("target_date") ?? "").trim();
  const linkedAccountId = String(formData.get("linked_account_id") ?? "").trim();
  const rawMonthlyContribution = String(formData.get("monthly_contribution") ?? "").trim();
  const rawMonthsOfExpenses = String(formData.get("months_of_expenses") ?? "").trim();
  const rawCurrentAmount = String(formData.get("current_amount") ?? "").trim();

  if (!name) {
    return { error: "El nombre es obligatorio." };
  }
  if (!GOAL_TYPE_VALUES.includes(type as GoalType)) {
    return { error: "Tipo de objetivo no válido." };
  }
  if (Number.isNaN(targetAmount) || targetAmount <= 0) {
    return { error: "El importe objetivo debe ser un número mayor que 0." };
  }

  let monthlyContribution: number | null = null;
  if (rawMonthlyContribution) {
    monthlyContribution = Number(rawMonthlyContribution);
    if (Number.isNaN(monthlyContribution) || monthlyContribution < 0) {
      return { error: "La aportación mensual debe ser un número." };
    }
  }

  let monthsOfExpenses: number | null = null;
  if (rawMonthsOfExpenses) {
    monthsOfExpenses = Number(rawMonthsOfExpenses);
    if (Number.isNaN(monthsOfExpenses) || monthsOfExpenses <= 0) {
      return { error: "Los meses de gastos deben ser un número mayor que 0." };
    }
  }

  // Con cuenta enlazada, el importe actual se calcula siempre a partir del
  // saldo de esa cuenta (ver src/features/goals/queries.ts) para no tener dos
  // fuentes de verdad que puedan desincronizarse: el valor manual se ignora.
  let currentAmount = 0;
  if (!linkedAccountId) {
    currentAmount = rawCurrentAmount ? Number(rawCurrentAmount) : 0;
    if (Number.isNaN(currentAmount) || currentAmount < 0) {
      return { error: "El importe actual debe ser un número." };
    }
  }

  const payload = {
    user_id: user.id,
    name,
    type,
    target_amount: targetAmount,
    current_amount: currentAmount,
    target_date: targetDate || null,
    linked_account_id: linkedAccountId || null,
    monthly_contribution: monthlyContribution,
    months_of_expenses: monthsOfExpenses,
  };

  const { error } =
    typeof id === "string" && id.length > 0
      ? await supabase.from("goals").update(payload).eq("id", id).eq("user_id", user.id)
      : await supabase.from("goals").insert(payload);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/objetivos");
  return { success: true };
}

export async function deleteGoal(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  await supabase.from("goals").delete().eq("id", id).eq("user_id", user.id);
  revalidatePath("/objetivos");
}
