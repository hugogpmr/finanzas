// Cálculo puro para objetivos de ahorro (Sprint 3, docs/plan-tecnico.md
// sección 4). A diferencia del patrimonio (que puede invertirse y crecer con
// interés compuesto, ver yearsToFire en kpis.ts), un objetivo de ahorro es
// una hucha: se asume sin rentabilidad, así que la proyección es lineal.

// Meses para alcanzar un objetivo de ahorro aportando una cantidad fija cada
// mes. `null` si nunca se alcanza (aportación 0 o negativa y aún no se llegó).
export function monthsToGoal(
  targetEur: number,
  currentEur: number,
  monthlyContributionEur: number,
): number | null {
  const remaining = targetEur - currentEur;
  if (remaining <= 0) return 0;
  if (monthlyContributionEur <= 0) return null;
  return remaining / monthlyContributionEur;
}

// Progreso 0-100 (capado, por si el usuario supera el objetivo).
export function goalProgressPct(targetEur: number, currentEur: number): number | null {
  if (targetEur <= 0) return null;
  return Math.min(100, Math.max(0, (currentEur / targetEur) * 100));
}
