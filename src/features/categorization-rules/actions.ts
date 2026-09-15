"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { MATCH_TYPES, type MatchType } from "./types";

export type RuleFormState = { error?: string; success?: boolean } | undefined;

const MATCH_TYPE_VALUES = MATCH_TYPES.map((m) => m.value);

export async function upsertRule(
  _prevState: RuleFormState,
  formData: FormData,
): Promise<RuleFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "No has iniciado sesión." };
  }

  const id = formData.get("id");
  const matchType = String(formData.get("match_type") ?? "");
  const pattern = String(formData.get("pattern") ?? "").trim();
  const categoryId = String(formData.get("category_id") ?? "");
  const priority = Number(formData.get("priority") ?? 0);

  if (!MATCH_TYPE_VALUES.includes(matchType as MatchType)) {
    return { error: "Tipo de coincidencia no válido." };
  }
  if (!pattern) {
    return { error: "El patrón es obligatorio." };
  }
  if (matchType === "description_regex") {
    try {
      new RegExp(pattern);
    } catch {
      return { error: "La expresión regular no es válida." };
    }
  }
  if (!categoryId) {
    return { error: "Selecciona una categoría." };
  }
  if (Number.isNaN(priority)) {
    return { error: "La prioridad debe ser un número." };
  }

  const payload = {
    user_id: user.id,
    match_type: matchType,
    pattern,
    category_id: categoryId,
    priority,
  };

  const { error } =
    typeof id === "string" && id.length > 0
      ? await supabase.from("categorization_rules").update(payload).eq("id", id).eq("user_id", user.id)
      : await supabase.from("categorization_rules").insert(payload);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/reglas");
  return { success: true };
}

export async function deleteRule(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "No has iniciado sesión." };

  const { error } = await supabase
    .from("categorization_rules")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/reglas");
  return {};
}

// Se usa desde transactions/actions.ts cuando el usuario no elige categoría a
// mano: busca la primera regla (por prioridad descendente) que case con el
// comercio/descripción de la transacción.
export async function matchCategorizationRule(
  supabase: SupabaseClient,
  userId: string,
  merchant: string | null,
  description: string | null,
): Promise<string | null> {
  const { data: rules } = await supabase
    .from("categorization_rules")
    .select("match_type, pattern, category_id")
    .eq("user_id", userId)
    .order("priority", { ascending: false });

  if (!rules) return null;

  for (const rule of rules) {
    if (rule.match_type === "merchant_contains") {
      if (merchant && merchant.toLowerCase().includes(rule.pattern.toLowerCase())) {
        return rule.category_id;
      }
    } else if (rule.match_type === "description_regex") {
      try {
        if (description && new RegExp(rule.pattern, "i").test(description)) {
          return rule.category_id;
        }
      } catch {
        // Regex inválida guardada (no debería pasar, se valida al crear la
        // regla) — se ignora esa regla en vez de romper el guardado.
      }
    }
  }

  return null;
}
