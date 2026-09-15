"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { TransactionKind } from "./types";

export type TransactionFormState = { error?: string; success?: boolean } | undefined;

function parseTags(raw: string): string[] {
  return Array.from(
    new Set(
      raw
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    ),
  );
}

// Sincroniza las etiquetas de una transacción a partir de una lista de nombres:
// crea las que falten (tags es única por user_id+name) y reemplaza las filas
// de transaction_tags por las correspondientes a esos nombres.
async function syncTags(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  transactionId: string,
  tagNames: string[],
) {
  await supabase.from("transaction_tags").delete().eq("transaction_id", transactionId);

  if (tagNames.length === 0) return;

  const { data: tags, error } = await supabase
    .from("tags")
    .upsert(
      tagNames.map((name) => ({ user_id: userId, name })),
      { onConflict: "user_id,name" },
    )
    .select("id");

  if (error || !tags) return;

  await supabase
    .from("transaction_tags")
    .insert(tags.map((tag) => ({ transaction_id: transactionId, tag_id: tag.id })));
}

export async function upsertTransaction(
  _prevState: TransactionFormState,
  formData: FormData,
): Promise<TransactionFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "No has iniciado sesión." };
  }

  const id = formData.get("id");
  const accountId = String(formData.get("account_id") ?? "");
  const categoryId = String(formData.get("category_id") ?? "");
  const kind = String(formData.get("kind") ?? "") as TransactionKind;
  const rawAmount = Number(formData.get("amount"));
  const date = String(formData.get("date") ?? "");
  const merchant = String(formData.get("merchant") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const tagNames = parseTags(String(formData.get("tags") ?? ""));

  if (!accountId) {
    return { error: "La cuenta es obligatoria." };
  }
  if (kind !== "expense" && kind !== "income") {
    return { error: "Selecciona si es un ingreso o un gasto." };
  }
  if (Number.isNaN(rawAmount) || rawAmount <= 0) {
    return { error: "El importe debe ser un número mayor que 0." };
  }
  if (!date) {
    return { error: "La fecha es obligatoria." };
  }

  const { data: account, error: accountError } = await supabase
    .from("accounts")
    .select("currency")
    .eq("id", accountId)
    .single();

  if (accountError || !account) {
    return { error: "La cuenta seleccionada no es válida." };
  }

  const amount = kind === "expense" ? -Math.abs(rawAmount) : Math.abs(rawAmount);

  // TODO: cuando se implemente la conversión de divisa (Frankfurter), calcular
  // amount_eur real en vez de asumir 1:1. Por ahora fx_rate se queda en su
  // default (1) y amount_eur iguala a amount, igual que ya hacíamos antes de
  // tener esta feature.
  const payload = {
    user_id: user.id,
    account_id: accountId,
    category_id: categoryId || null,
    amount,
    currency: account.currency,
    amount_eur: amount,
    date,
    merchant: merchant || null,
    description: description || null,
  };

  const isEdit = typeof id === "string" && id.length > 0;
  const { data: saved, error } = isEdit
    ? await supabase
        .from("transactions")
        .update(payload)
        .eq("id", id)
        .eq("user_id", user.id)
        .select("id")
        .single()
    : await supabase.from("transactions").insert(payload).select("id").single();

  if (error || !saved) {
    return { error: error?.message ?? "No se pudo guardar la transacción." };
  }

  await syncTags(supabase, user.id, saved.id, tagNames);

  revalidatePath("/transacciones");
  return { success: true };
}

export async function deleteTransaction(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  await supabase.from("transactions").delete().eq("id", id).eq("user_id", user.id);
  revalidatePath("/transacciones");
}
