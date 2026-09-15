import { toDateStr } from "@/lib/date";

// Ventana de fechas del periodo "actual" de un presupuesto. Se asume que un
// presupuesto mensual/semanal es recurrente: el periodo activo es siempre el
// mes/semana que contiene hoy, no un rango fijo desde `start_date` (esa
// fecha solo marca desde cuándo existe el presupuesto).

export function currentPeriodRange(period: "monthly" | "weekly", today = new Date()) {
  if (period === "monthly") {
    const from = new Date(today.getFullYear(), today.getMonth(), 1);
    const to = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return { from: toDateStr(from), to: toDateStr(to) };
  }
  // Semanal: los 7 días que terminan hoy (incluido).
  const from = new Date(today);
  from.setDate(from.getDate() - 6);
  return { from: toDateStr(from), to: toDateStr(today) };
}

// Mismo rango, pero el periodo inmediatamente anterior (para el rollover:
// solo se mira un periodo hacia atrás, no una acumulación histórica completa).
export function previousPeriodRange(period: "monthly" | "weekly", today = new Date()) {
  if (period === "monthly") {
    const from = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const to = new Date(today.getFullYear(), today.getMonth(), 0);
    return { from: toDateStr(from), to: toDateStr(to) };
  }
  const to = new Date(today);
  to.setDate(to.getDate() - 7);
  const from = new Date(to);
  from.setDate(from.getDate() - 6);
  return { from: toDateStr(from), to: toDateStr(to) };
}
