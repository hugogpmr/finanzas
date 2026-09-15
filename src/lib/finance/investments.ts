// Métricas puras de la cartera de inversión que no son XIRR/TWR (ver
// src/lib/finance/xirr.ts y twr.ts para esos).

// Yield-on-cost = dividendos anuales / coste de adquisición. A diferencia del
// yield actual (dividendos / valor de mercado), no baja cuando sube la
// cotización: mide el rendimiento respecto a lo que realmente se pagó.
export function yieldOnCostPct(
  annualDividendEur: number,
  costBasisEur: number,
): number | null {
  if (costBasisEur <= 0) return null;
  return (annualDividendEur / costBasisEur) * 100;
}

export type AllocationBucket = { key: string; valueEur: number };
export type AllocationSlice = { key: string; valueEur: number; pct: number };

// Agrupa el valor de mercado de las posiciones por una clave (clase de
// activo, sector, geografía o divisa) y calcula el % que representa cada una
// sobre el total. Ordena de mayor a menor para que la UI no tenga que hacerlo.
export function groupAllocation(buckets: AllocationBucket[]): AllocationSlice[] {
  const totals = new Map<string, number>();
  for (const b of buckets) {
    totals.set(b.key, (totals.get(b.key) ?? 0) + b.valueEur);
  }

  const total = Array.from(totals.values()).reduce((sum, v) => sum + v, 0);
  if (total <= 0) return [];

  return Array.from(totals.entries())
    .map(([key, valueEur]) => ({ key, valueEur, pct: (valueEur / total) * 100 }))
    .sort((a, b) => b.valueEur - a.valueEur);
}
