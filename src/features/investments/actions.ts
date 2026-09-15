"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { todayDateStr } from "@/lib/date";
import { fetchCurrentPrice } from "@/lib/prices/twelvedata";
import {
  ASSET_CLASSES,
  INVESTMENT_TX_TYPES,
  type AssetClass,
  type InvestmentTxType,
} from "./types";

export type HoldingFormState = { error?: string; success?: boolean } | undefined;

const ASSET_CLASS_VALUES = ASSET_CLASSES.map((a) => a.value);

export async function upsertHolding(
  _prevState: HoldingFormState,
  formData: FormData,
): Promise<HoldingFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "No has iniciado sesión." };
  }

  const id = formData.get("id");
  const accountId = String(formData.get("account_id") ?? "").trim();
  const ticker = String(formData.get("ticker") ?? "").trim().toUpperCase();
  const isin = String(formData.get("isin") ?? "").trim().toUpperCase();
  const assetClass = String(formData.get("asset_class") ?? "");
  const sector = String(formData.get("sector") ?? "").trim();
  const geography = String(formData.get("geography") ?? "").trim();
  const currency = String(formData.get("currency") ?? "").trim().toUpperCase();
  const quantity = Number(formData.get("quantity"));
  const rawCurrentPrice = String(formData.get("current_price") ?? "").trim();

  if (!accountId) {
    return { error: "La cuenta es obligatoria." };
  }
  if (!ASSET_CLASS_VALUES.includes(assetClass as AssetClass)) {
    return { error: "Clase de activo no válida." };
  }
  if (!ticker && !isin) {
    return { error: "Indica al menos un ticker o un ISIN." };
  }
  if (!currency || currency.length !== 3) {
    return { error: "La divisa debe tener 3 letras (EUR, USD...)." };
  }
  if (Number.isNaN(quantity) || quantity < 0) {
    return { error: "La cantidad debe ser un número igual o mayor que 0." };
  }

  let currentPrice: number | null = null;
  if (rawCurrentPrice) {
    currentPrice = Number(rawCurrentPrice);
    if (Number.isNaN(currentPrice) || currentPrice < 0) {
      return { error: "El precio actual debe ser un número igual o mayor que 0." };
    }
  }

  const payload = {
    user_id: user.id,
    account_id: accountId,
    ticker: ticker || null,
    isin: isin || null,
    asset_class: assetClass,
    sector: sector || null,
    geography: geography || null,
    currency,
    quantity,
    current_price: currentPrice,
    price_updated_at: currentPrice !== null ? new Date().toISOString() : null,
  };

  const { error } =
    typeof id === "string" && id.length > 0
      ? await supabase.from("holdings").update(payload).eq("id", id).eq("user_id", user.id)
      : await supabase.from("holdings").insert(payload);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/inversiones");
  return { success: true };
}

export async function deleteHolding(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "No has iniciado sesión." };

  // ON DELETE CASCADE en investment_transactions/price_snapshots (ver
  // prisma/schema.prisma) se lleva el historial de la posición con ella.
  const { error } = await supabase.from("holdings").delete().eq("id", id).eq("user_id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/inversiones");
  return {};
}

export type InvestmentTxFormState = { error?: string; success?: boolean } | undefined;

const INVESTMENT_TX_TYPE_VALUES = INVESTMENT_TX_TYPES.map((t) => t.value);

// Compra/aportación/comisión: dinero que sale del bolsillo del inversor
// (signo negativo, ver src/lib/finance/CLAUDE.md). Venta/retirada/dividendo:
// dinero que recibe (signo positivo). Así el importe guardado ya sirve
// directamente como flujo de caja para XIRR sin transformarlo de nuevo.
const OUTFLOW_TYPES = new Set<InvestmentTxType>(["buy", "deposit", "fee"]);

export async function upsertInvestmentTransaction(
  _prevState: InvestmentTxFormState,
  formData: FormData,
): Promise<InvestmentTxFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "No has iniciado sesión." };
  }

  const id = formData.get("id");
  const holdingId = String(formData.get("holding_id") ?? "").trim();
  const type = String(formData.get("type") ?? "") as InvestmentTxType;
  const date = String(formData.get("date") ?? "").trim();
  const rawQuantity = String(formData.get("quantity") ?? "").trim();
  const rawPricePerUnit = String(formData.get("price_per_unit") ?? "").trim();
  const rawAmount = Number(formData.get("amount"));
  const fee = formData.get("fee") ? Number(formData.get("fee")) : 0;

  if (!holdingId) {
    return { error: "La posición es obligatoria." };
  }
  if (!INVESTMENT_TX_TYPE_VALUES.includes(type)) {
    return { error: "Tipo de movimiento no válido." };
  }
  if (!date) {
    return { error: "La fecha es obligatoria." };
  }
  if (Number.isNaN(rawAmount) || rawAmount <= 0) {
    return { error: "El importe debe ser un número mayor que 0." };
  }
  if (Number.isNaN(fee) || fee < 0) {
    return { error: "La comisión debe ser un número igual o mayor que 0." };
  }

  const { data: holding, error: holdingError } = await supabase
    .from("holdings")
    .select("id, currency")
    .eq("id", holdingId)
    .eq("user_id", user.id)
    .single();

  if (holdingError || !holding) {
    return { error: "La posición seleccionada no es válida." };
  }

  let quantity: number | null = null;
  if (rawQuantity) {
    quantity = Number(rawQuantity);
    if (Number.isNaN(quantity) || quantity <= 0) {
      return { error: "La cantidad debe ser un número mayor que 0." };
    }
  }

  let pricePerUnit: number | null = null;
  if (rawPricePerUnit) {
    pricePerUnit = Number(rawPricePerUnit);
    if (Number.isNaN(pricePerUnit) || pricePerUnit <= 0) {
      return { error: "El precio por unidad debe ser un número mayor que 0." };
    }
  }

  const amount = OUTFLOW_TYPES.has(type) ? -Math.abs(rawAmount) : Math.abs(rawAmount);

  const payload = {
    user_id: user.id,
    holding_id: holdingId,
    type,
    date,
    quantity,
    price_per_unit: pricePerUnit,
    amount,
    currency: holding.currency,
    fee,
  };

  const { error } =
    typeof id === "string" && id.length > 0
      ? await supabase
          .from("investment_transactions")
          .update(payload)
          .eq("id", id)
          .eq("user_id", user.id)
      : await supabase.from("investment_transactions").insert(payload);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/inversiones");
  return { success: true };
}

export async function deleteInvestmentTransaction(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "No has iniciado sesión." };

  const { error } = await supabase
    .from("investment_transactions")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/inversiones");
  return {};
}

export type RefreshPricesResult = { error?: string; updated?: number; skipped?: number };

// Actualiza current_price/price_updated_at de cada posición con ticker desde
// Twelve Data y guarda un price_snapshot de hoy (histórico para TWR). Sin
// TWELVE_DATA_API_KEY configurada, no falla: informa de que hace falta la
// clave y el usuario puede seguir editando el precio a mano en cada posición.
export async function refreshPrices(): Promise<RefreshPricesResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "No has iniciado sesión." };
  }

  if (!process.env.TWELVE_DATA_API_KEY) {
    return {
      error:
        "Configura TWELVE_DATA_API_KEY (twelvedata.com, plan gratis) en las variables de entorno para actualizar precios automáticamente. Mientras tanto, edita el precio a mano en cada posición.",
    };
  }

  const { data: holdings } = await supabase
    .from("holdings")
    .select("id, ticker, quantity")
    .eq("user_id", user.id)
    .not("ticker", "is", null);

  if (!holdings || holdings.length === 0) {
    return { updated: 0, skipped: 0 };
  }

  const today = todayDateStr();
  let updated = 0;
  let skipped = 0;

  for (const holding of holdings) {
    if (!holding.ticker) {
      skipped++;
      continue;
    }

    const price = await fetchCurrentPrice(holding.ticker);
    if (price === null) {
      skipped++;
      continue;
    }

    const marketValue = Number(holding.quantity) * price;

    await supabase
      .from("holdings")
      .update({ current_price: price, price_updated_at: new Date().toISOString() })
      .eq("id", holding.id);

    await supabase.from("price_snapshots").upsert(
      {
        holding_id: holding.id,
        date: today,
        price,
        market_value: Number(marketValue.toFixed(2)),
      },
      { onConflict: "holding_id,date" },
    );

    updated++;
  }

  revalidatePath("/inversiones");
  return { updated, skipped };
}
