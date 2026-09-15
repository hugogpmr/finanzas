"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { DEBT_TYPES, type DebtType } from "./types";

export type DebtFormState = { error?: string; success?: boolean } | undefined;

const DEBT_TYPE_VALUES = DEBT_TYPES.map((t) => t.value);

export async function upsertDebt(
  _prevState: DebtFormState,
  formData: FormData,
): Promise<DebtFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "No has iniciado sesión." };
  }

  const id = formData.get("id");
  const name = String(formData.get("name") ?? "").trim();
  const debtType = String(formData.get("debt_type") ?? "");
  const principal = Number(formData.get("principal"));
  const rawOriginalPrincipal = String(formData.get("original_principal") ?? "").trim();
  const interestRate = Number(formData.get("interest_rate"));
  const rawApr = String(formData.get("apr") ?? "").trim();
  const minimumPayment = Number(formData.get("minimum_payment"));
  const rawTermMonths = String(formData.get("term_months") ?? "").trim();
  const startDate = String(formData.get("start_date") ?? "").trim();
  const paymentDay = Number(formData.get("payment_day"));
  const accountId = String(formData.get("account_id") ?? "").trim();

  if (!name) {
    return { error: "El nombre es obligatorio." };
  }
  if (!DEBT_TYPE_VALUES.includes(debtType as DebtType)) {
    return { error: "Tipo de deuda no válido." };
  }
  if (Number.isNaN(principal) || principal <= 0) {
    return { error: "El saldo pendiente debe ser un número mayor que 0." };
  }
  if (Number.isNaN(interestRate) || interestRate < 0 || interestRate > 100) {
    return { error: "El TIN debe ser un número entre 0 y 100." };
  }
  if (Number.isNaN(minimumPayment) || minimumPayment <= 0) {
    return { error: "La cuota mínima debe ser un número mayor que 0." };
  }
  if (!startDate) {
    return { error: "La fecha de inicio es obligatoria." };
  }
  if (Number.isNaN(paymentDay) || paymentDay < 1 || paymentDay > 31) {
    return { error: "El día de pago debe estar entre 1 y 31." };
  }

  // Si no se indica, el principal original es el saldo actual (deuda recién
  // añadida sin historial previo conocido).
  const originalPrincipal = rawOriginalPrincipal ? Number(rawOriginalPrincipal) : principal;
  if (Number.isNaN(originalPrincipal) || originalPrincipal <= 0) {
    return { error: "El principal original debe ser un número mayor que 0." };
  }

  let apr: number | null = null;
  if (rawApr) {
    apr = Number(rawApr);
    if (Number.isNaN(apr) || apr < 0 || apr > 100) {
      return { error: "La TAE debe ser un número entre 0 y 100." };
    }
  }

  let termMonths: number | null = null;
  if (rawTermMonths) {
    termMonths = Number(rawTermMonths);
    if (Number.isNaN(termMonths) || termMonths <= 0) {
      return { error: "El plazo en meses debe ser un número mayor que 0." };
    }
  }

  const payload = {
    user_id: user.id,
    account_id: accountId || null,
    name,
    debt_type: debtType,
    principal,
    original_principal: originalPrincipal,
    interest_rate: interestRate,
    apr,
    minimum_payment: minimumPayment,
    term_months: termMonths,
    start_date: startDate,
    payment_day: paymentDay,
  };

  const { error } =
    typeof id === "string" && id.length > 0
      ? await supabase.from("debts").update(payload).eq("id", id).eq("user_id", user.id)
      : await supabase.from("debts").insert(payload);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/deudas");
  return { success: true };
}

export async function deleteDebt(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  await supabase.from("debts").delete().eq("id", id).eq("user_id", user.id);
  revalidatePath("/deudas");
}
