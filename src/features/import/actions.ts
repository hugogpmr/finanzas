"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getEurRate } from "@/lib/fx";
import { parseImportedAmount, parseImportedDate } from "@/lib/csv/parse-row";
import { matchCategorizationRule } from "@/features/categorization-rules/actions";
import type { ColumnMapping, ImportPreviewRow, ImportRowToCommit, RawCsvRow } from "./types";

function mapRow(raw: RawCsvRow, mapping: ColumnMapping) {
  const date = parseImportedDate(raw[mapping.date] ?? "");
  const amount = parseImportedAmount(raw[mapping.amount] ?? "");
  const merchant = mapping.merchant ? (raw[mapping.merchant] ?? "").trim() || null : null;
  const description = mapping.description ? (raw[mapping.description] ?? "").trim() || null : null;
  return { date, amount, merchant, description };
}

// Clave para detectar duplicados: misma fecha + mismo importe + mismo texto
// (comercio si lo hay, si no descripción). No es infalible (dos cargos
// iguales el mismo día al mismo comercio se marcarían como duplicado aunque
// sean reales) pero el usuario ve el resultado en la previsualización y
// puede forzar la importación de una fila marcada como duplicada.
function duplicateKey(date: string, amount: number, text: string | null): string {
  return `${date}|${amount.toFixed(2)}|${(text ?? "").toLowerCase()}`;
}

export type PreviewImportResult = { error?: string; rows?: ImportPreviewRow[] };

export async function previewImport(
  accountId: string,
  mapping: ColumnMapping,
  rawRows: RawCsvRow[],
): Promise<PreviewImportResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "No has iniciado sesión." };
  }

  const { data: account, error: accountError } = await supabase
    .from("accounts")
    .select("id")
    .eq("id", accountId)
    .eq("user_id", user.id)
    .single();

  if (accountError || !account) {
    return { error: "La cuenta seleccionada no es válida." };
  }

  const mapped = rawRows.map((raw) => mapRow(raw, mapping));
  const validDates = mapped.map((r) => r.date).filter((d): d is string => d !== null);

  const existingKeys = new Set<string>();
  if (validDates.length > 0) {
    const minDate = validDates.reduce((a, b) => (a < b ? a : b));
    const maxDate = validDates.reduce((a, b) => (a > b ? a : b));

    const { data: existing } = await supabase
      .from("transactions")
      .select("date, amount, merchant, description")
      .eq("account_id", accountId)
      .gte("date", minDate)
      .lte("date", maxDate);

    for (const tx of existing ?? []) {
      existingKeys.add(duplicateKey(tx.date, Number(tx.amount), tx.merchant ?? tx.description));
    }
  }

  const rows: ImportPreviewRow[] = [];
  for (let i = 0; i < mapped.length; i++) {
    const { date, amount, merchant, description } = mapped[i];

    const isDuplicate =
      date !== null && amount !== null
        ? existingKeys.has(duplicateKey(date, amount, merchant ?? description))
        : false;

    const suggestedCategoryId =
      merchant || description
        ? await matchCategorizationRule(supabase, user.id, merchant, description)
        : null;

    rows.push({
      rowIndex: i,
      date,
      amount,
      merchant,
      description,
      isDuplicate,
      suggestedCategoryId,
    });
  }

  return { rows };
}

export type CommitImportResult = { error?: string; imported?: number };

export async function commitImport(
  accountId: string,
  rows: ImportRowToCommit[],
): Promise<CommitImportResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "No has iniciado sesión." };
  }

  if (rows.length === 0) {
    return { error: "No hay filas seleccionadas para importar." };
  }

  const { data: account, error: accountError } = await supabase
    .from("accounts")
    .select("currency")
    .eq("id", accountId)
    .eq("user_id", user.id)
    .single();

  if (accountError || !account) {
    return { error: "La cuenta seleccionada no es válida." };
  }

  const payloads = [];
  for (const row of rows) {
    const fxRate = await getEurRate(supabase, account.currency, row.date);
    const amountEur = Number((row.amount * fxRate).toFixed(2));
    const categoryId =
      row.categoryId ||
      (await matchCategorizationRule(supabase, user.id, row.merchant, row.description));

    payloads.push({
      user_id: user.id,
      account_id: accountId,
      category_id: categoryId || null,
      amount: row.amount,
      currency: account.currency,
      amount_eur: amountEur,
      fx_rate: fxRate,
      date: row.date,
      merchant: row.merchant,
      description: row.description,
      is_split: false,
    });
  }

  const { error } = await supabase.from("transactions").insert(payloads);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/transacciones");
  revalidatePath("/dashboard");
  return { imported: payloads.length };
}
