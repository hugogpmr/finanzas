"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { BUDGET_METHODS, BUDGET_PERIODS, type BudgetMethod, type BudgetPeriod } from "./types";

export type BudgetFormState = { error?: string; success?: boolean } | undefined;

const BUDGET_METHOD_VALUES = BUDGET_METHODS.map((m) => m.value);
const BUDGET_PERIOD_VALUES = BUDGET_PERIODS.map((p) => p.value);

export async function upsertBudget(
  _prevState: BudgetFormState,
  formData: FormData,
): Promise<BudgetFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "No has iniciado sesión." };
  }

  const id = formData.get("id");
  const name = String(formData.get("name") ?? "").trim();
  const method = String(formData.get("method") ?? "");
  const period = String(formData.get("period") ?? "");
  const startDate = String(formData.get("start_date") ?? "");
  const totalIncome = Number(formData.get("total_income"));

  if (!name) {
    return { error: "El nombre es obligatorio." };
  }
  if (!BUDGET_METHOD_VALUES.includes(method as BudgetMethod)) {
    return { error: "Método de presupuesto no válido." };
  }
  if (!BUDGET_PERIOD_VALUES.includes(period as BudgetPeriod)) {
    return { error: "Periodo no válido." };
  }
  if (!startDate) {
    return { error: "La fecha de inicio es obligatoria." };
  }
  if (Number.isNaN(totalIncome) || totalIncome <= 0) {
    return { error: "El ingreso total debe ser un número mayor que 0." };
  }

  const payload = {
    user_id: user.id,
    name,
    method,
    period,
    start_date: startDate,
    total_income: totalIncome,
  };

  const isEdit = typeof id === "string" && id.length > 0;

  if (isEdit) {
    const { error } = await supabase
      .from("budgets")
      .update(payload)
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) return { error: error.message };
  } else {
    // Un presupuesto nuevo se activa automáticamente y desactiva los demás
    // (el MVP asume un único presupuesto activo a la vez).
    const { data: created, error } = await supabase
      .from("budgets")
      .insert({ ...payload, is_active: true })
      .select("id")
      .single();
    if (error || !created) return { error: error?.message ?? "No se pudo crear el presupuesto." };

    await supabase
      .from("budgets")
      .update({ is_active: false })
      .eq("user_id", user.id)
      .neq("id", created.id);
  }

  revalidatePath("/presupuestos");
  return { success: true };
}

export async function deleteBudget(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "No has iniciado sesión." };

  const { error } = await supabase.from("budgets").delete().eq("id", id).eq("user_id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/presupuestos");
  return {};
}

export async function setActiveBudget(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  await supabase.from("budgets").update({ is_active: false }).eq("user_id", user.id).neq("id", id);
  await supabase.from("budgets").update({ is_active: true }).eq("id", id).eq("user_id", user.id);
  revalidatePath("/presupuestos");
}

export type BudgetLineFormState = { error?: string; success?: boolean } | undefined;

export async function upsertBudgetLine(
  _prevState: BudgetLineFormState,
  formData: FormData,
): Promise<BudgetLineFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "No has iniciado sesión." };
  }

  const id = formData.get("id");
  const budgetId = String(formData.get("budget_id") ?? "");
  const categoryId = String(formData.get("category_id") ?? "");
  const allocated = Number(formData.get("allocated"));
  const rollover = String(formData.get("rollover") ?? "") === "true";
  const rawThreshold = String(formData.get("alert_threshold_pct") ?? "").trim();

  if (!budgetId) {
    return { error: "Falta el presupuesto." };
  }
  if (!categoryId) {
    return { error: "Selecciona una categoría." };
  }
  if (Number.isNaN(allocated) || allocated <= 0) {
    return { error: "El importe asignado debe ser un número mayor que 0." };
  }

  let alertThresholdPct: number | null = null;
  if (rawThreshold) {
    alertThresholdPct = Number(rawThreshold);
    if (Number.isNaN(alertThresholdPct) || alertThresholdPct <= 0 || alertThresholdPct > 100) {
      return { error: "El umbral de alerta debe estar entre 1 y 100." };
    }
  }

  // La policy de budget_lines comprueba la propiedad a través de budgets
  // (ver migración de RLS), así que no hace falta (ni se puede) filtrar
  // budget_lines por user_id directamente.
  const { data: budget } = await supabase
    .from("budgets")
    .select("id")
    .eq("id", budgetId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!budget) {
    return { error: "El presupuesto no es válido." };
  }

  const payload = {
    budget_id: budgetId,
    category_id: categoryId,
    allocated,
    rollover,
    alert_threshold_pct: alertThresholdPct,
  };

  const isEdit = typeof id === "string" && id.length > 0;
  const { error } = isEdit
    ? await supabase.from("budget_lines").update(payload).eq("id", id)
    : await supabase.from("budget_lines").insert(payload);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/presupuestos");
  return { success: true };
}

export async function deleteBudgetLine(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "No has iniciado sesión." };

  const { error } = await supabase.from("budget_lines").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/presupuestos");
  return {};
}
