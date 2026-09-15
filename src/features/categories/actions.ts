"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { CATEGORY_TYPE_VALUES, DEFAULT_CATEGORIES, type CategoryType } from "./types";

export type CategoryFormState = { error?: string; success?: boolean } | undefined;

// Se llama desde las páginas de categorías y transacciones: si el usuario
// todavía no tiene ninguna categoría, le sembramos un set inicial razonable
// para que no arranque con las páginas completamente vacías.
export async function ensureDefaultCategories(userId: string) {
  const supabase = await createClient();
  const { count } = await supabase
    .from("categories")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  if (count && count > 0) return;

  for (const parent of DEFAULT_CATEGORIES) {
    const { data: parentRow, error } = await supabase
      .from("categories")
      .insert({
        user_id: userId,
        name: parent.name,
        type: parent.type,
        needs_wants_savings: parent.needsWantsSavings ?? null,
        is_fixed: parent.isFixed ?? false,
      })
      .select("id")
      .single();

    if (error || !parentRow || !parent.children) continue;

    await supabase.from("categories").insert(
      parent.children.map((childName) => ({
        user_id: userId,
        name: childName,
        type: parent.type,
        parent_id: parentRow.id,
        needs_wants_savings: parent.needsWantsSavings ?? null,
        is_fixed: parent.isFixed ?? false,
      })),
    );
  }
}

export async function upsertCategory(
  _prevState: CategoryFormState,
  formData: FormData,
): Promise<CategoryFormState> {
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
  const parentId = String(formData.get("parent_id") ?? "");
  const needsWantsSavings = String(formData.get("needs_wants_savings") ?? "");
  const isFixed = String(formData.get("is_fixed") ?? "") === "true";

  if (!name) {
    return { error: "El nombre es obligatorio." };
  }
  if (!CATEGORY_TYPE_VALUES.includes(type as CategoryType)) {
    return { error: "Tipo de categoría no válido." };
  }

  const payload = {
    user_id: user.id,
    name,
    type,
    parent_id: parentId || null,
    needs_wants_savings: needsWantsSavings || null,
    is_fixed: isFixed,
  };

  const { error } =
    typeof id === "string" && id.length > 0
      ? await supabase.from("categories").update(payload).eq("id", id).eq("user_id", user.id)
      : await supabase.from("categories").insert(payload);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/categorias");
  revalidatePath("/transacciones");
  return { success: true };
}

export async function deleteCategory(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  await supabase.from("categories").delete().eq("id", id).eq("user_id", user.id);
  revalidatePath("/categorias");
  revalidatePath("/transacciones");
}
