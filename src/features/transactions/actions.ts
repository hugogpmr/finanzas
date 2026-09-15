"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { getEurRate } from "@/lib/fx";
import { matchCategorizationRule } from "@/features/categorization-rules/actions";
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

// Reemplaza las divisiones de una transacción (transaction_splits). Se llama
// siempre, incluso con array vacío, para que desactivar "dividir" en una
// edición borre las divisiones que hubiera antes.
async function syncSplits(
  supabase: Awaited<ReturnType<typeof createClient>>,
  transactionId: string,
  splits: { category_id: string; amount: number; note: string | null }[],
) {
  await supabase.from("transaction_splits").delete().eq("transaction_id", transactionId);

  if (splits.length === 0) return;

  await supabase.from("transaction_splits").insert(
    splits.map((s) => ({
      transaction_id: transactionId,
      category_id: s.category_id,
      amount: s.amount,
      note: s.note,
    })),
  );
}

const RECURRING_MIN_OCCURRENCES = 3;

// Heurística simple pedida por el plan: mismo comercio + mismo importe (y
// divisa) al menos 3 veces => se marcan todas como recurrentes con un
// recurring_group_id compartido. Solo se ejecuta al crear (no en cada edición)
// y solo si hay comercio, para no marcar como recurrente cualquier gasto suelto.
async function detectRecurring(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  merchant: string,
  amount: number,
  currency: string,
) {
  const { data: matches } = await supabase
    .from("transactions")
    .select("id, recurring_group_id")
    .eq("user_id", userId)
    .eq("merchant", merchant)
    .eq("amount", amount)
    .eq("currency", currency);

  if (!matches || matches.length < RECURRING_MIN_OCCURRENCES) return;

  const existingGroupId = matches.find((m) => m.recurring_group_id)?.recurring_group_id;
  const groupId = existingGroupId ?? randomUUID();

  await supabase
    .from("transactions")
    .update({ is_recurring: true, recurring_group_id: groupId })
    .in(
      "id",
      matches.map((m) => m.id),
    );
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
  const isSplitMode = String(formData.get("is_split") ?? "") === "true";

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

  let parsedSplits: { category_id: string; amount: number; note: string | null }[] = [];
  if (isSplitMode) {
    try {
      const raw = JSON.parse(String(formData.get("splits_json") ?? "[]")) as {
        category_id: string;
        amount: string;
        note: string;
      }[];
      parsedSplits = raw
        .filter((s) => s.category_id && s.amount)
        .map((s) => ({
          category_id: s.category_id,
          amount: Math.abs(Number(s.amount)),
          note: s.note?.trim() || null,
        }));
    } catch {
      return { error: "Formato de división inválido." };
    }

    if (parsedSplits.length === 0) {
      return { error: "Añade al menos una división con categoría e importe." };
    }
    if (parsedSplits.some((s) => Number.isNaN(s.amount) || s.amount <= 0)) {
      return { error: "Cada división necesita un importe mayor que 0." };
    }
    const splitSum = parsedSplits.reduce((sum, s) => sum + s.amount, 0);
    if (Math.abs(splitSum - rawAmount) > 0.01) {
      return {
        error: `Las divisiones (${splitSum.toFixed(2)}) no coinciden con el importe total (${rawAmount.toFixed(2)}).`,
      };
    }
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
  const fxRate = await getEurRate(supabase, account.currency, date);
  const amountEur = Number((amount * fxRate).toFixed(2));

  // Si está dividida no tiene categoría propia (va en transaction_splits). Si
  // no, y el usuario no eligió categoría a mano, probamos las reglas de
  // auto-categorización antes de dejarla sin categorizar.
  const resolvedCategoryId = isSplitMode
    ? null
    : categoryId ||
      (await matchCategorizationRule(supabase, user.id, merchant || null, description || null));

  const payload = {
    user_id: user.id,
    account_id: accountId,
    category_id: resolvedCategoryId || null,
    amount,
    currency: account.currency,
    amount_eur: amountEur,
    fx_rate: fxRate,
    date,
    merchant: merchant || null,
    description: description || null,
    is_split: isSplitMode,
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

  await syncSplits(
    supabase,
    saved.id,
    isSplitMode
      ? parsedSplits.map((s) => ({
          ...s,
          amount: kind === "expense" ? -s.amount : s.amount,
        }))
      : [],
  );

  if (!isEdit && merchant) {
    await detectRecurring(supabase, user.id, merchant, amount, account.currency);
  }

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
