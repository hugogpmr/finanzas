export const ASSET_CLASSES = [
  { value: "stock", label: "Acción" },
  { value: "etf", label: "ETF" },
  { value: "index_fund", label: "Fondo indexado" },
  { value: "pension_plan", label: "Plan de pensiones" },
  { value: "crypto", label: "Cripto" },
  { value: "bond", label: "Bono" },
] as const;

export type AssetClass = (typeof ASSET_CLASSES)[number]["value"];

export function assetClassLabel(value: string) {
  return ASSET_CLASSES.find((a) => a.value === value)?.label ?? value;
}

export const INVESTMENT_TX_TYPES = [
  { value: "buy", label: "Compra" },
  { value: "sell", label: "Venta" },
  { value: "dividend", label: "Dividendo" },
  { value: "fee", label: "Comisión" },
  { value: "deposit", label: "Aportación" },
  { value: "withdrawal", label: "Retirada" },
] as const;

export type InvestmentTxType = (typeof INVESTMENT_TX_TYPES)[number]["value"];

export function investmentTxTypeLabel(value: string) {
  return INVESTMENT_TX_TYPES.find((t) => t.value === value)?.label ?? value;
}

// numeric(...) llega como string desde supabase-js (ver CLAUDE.md). `quantity`
// y `current_price` se mantienen a mano (igual que accounts.current_balance),
// no se recalculan solos a partir del historial de investment_transactions.
export type Holding = {
  id: string;
  user_id: string;
  account_id: string;
  ticker: string | null;
  isin: string | null;
  asset_class: AssetClass;
  sector: string | null;
  geography: string | null;
  currency: string;
  quantity: string;
  current_price: string | null;
  price_updated_at: string | null;
  account?: { name: string } | null;
};

// `amount`: negativo = entra dinero (compra/aportación), positivo = sale
// dinero (venta/retirada/dividendo) — misma convención que usan XIRR/TWR en
// src/lib/finance/, así el importe ya sirve directamente como flujo de caja.
export type InvestmentTransaction = {
  id: string;
  user_id: string;
  holding_id: string;
  account_id: string | null;
  type: InvestmentTxType;
  date: string;
  quantity: string | null;
  price_per_unit: string | null;
  amount: string;
  currency: string;
  fee: string;
};
