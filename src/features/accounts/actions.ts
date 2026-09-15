"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ACCOUNT_TYPE_VALUES, accountClassOf, type AccountType } from "./types";

export type AccountFormState = { error?: string; success?: boolean } | undefined;

export async function upsertAccount(
  _prevState: AccountFormState,
  formData: FormData,
): Promise<AccountFormState> {
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
  const currency = String(formData.get("currency") ?? "EUR").trim().toUpperCase();
  const institution = String(formData.get("institution") ?? "").trim();
  const currentBalance = Number(formData.get("current_balance"));

  if (!name) {
    return { error: "El nombre es obligatorio." };
  }
  if (!ACCOUNT_TYPE_VALUES.includes(type as AccountType)) {
    return { error: "Tipo de cuenta no válido." };
  }
  if (currency.length !== 3) {
    return { error: "La divisa debe tener 3 letras (p. ej. EUR)." };
  }
  if (Number.isNaN(currentBalance)) {
    return { error: "El saldo debe ser un número." };
  }

  const payload = {
    user_id: user.id,
    name,
    type,
    account_class: accountClassOf(type as AccountType),
    currency,
    current_balance: currentBalance,
    institution: institution || null,
  };

  const { error } =
    typeof id === "string" && id.length > 0
      ? await supabase.from("accounts").update(payload).eq("id", id).eq("user_id", user.id)
      : await supabase.from("accounts").insert(payload);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/cuentas");
  return { success: true };
}

export async function deleteAccount(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "No has iniciado sesión." };

  const { error } = await supabase.from("accounts").delete().eq("id", id).eq("user_id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/cuentas");
  return {};
}
