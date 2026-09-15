// XIRR (tasa interna de retorno con fechas reales, money-weighted return): se
// usa la librería @webcarrot/xirr (Newton-Raphson) en vez de reinventar el
// cálculo — ver src/lib/finance/CLAUDE.md. Convención de signos igual que
// `investment_transactions.amount`: negativo = entra dinero (compra/aportación),
// positivo = sale dinero (venta/retirada/dividendo) o valor actual de lo que
// aún se posee (se trata como una "venta" hipotética a fecha de hoy).
import { xirr as computeXirr, type CashFlow } from "@webcarrot/xirr";

export type { CashFlow };

export function calculateXirr(flows: CashFlow[]): number | null {
  const hasPositive = flows.some((f) => f.amount > 0);
  const hasNegative = flows.some((f) => f.amount < 0);
  if (flows.length < 2 || !hasPositive || !hasNegative) return null;

  try {
    const rate = computeXirr(flows);
    return Number.isFinite(rate) ? rate : null;
  } catch {
    return null;
  }
}
