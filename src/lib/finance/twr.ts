// TWR (Time-Weighted Return): a diferencia de XIRR, ninguna librería JS
// mainstream lo trae (docs/plan-tecnico.md sección 5) — se codifica a mano
// aquí como enlace geométrico de subperiodos. Separa la rentabilidad de la
// inversión en sí del efecto de cuándo el usuario aportó o retiró dinero
// (a diferencia de XIRR, que sí depende del timing de los flujos).
//
// Cada periodo va desde justo después de un flujo externo hasta justo antes
// del siguiente (o hasta la fecha de valoración final). `externalFlow` sigue
// la convención de investment_transactions.amount: negativo = aportación
// (entra dinero a la posición), positivo = retirada.
export type TwrPeriod = {
  startValue: number;
  endValue: number;
  externalFlow: number;
};

// Devuelve la rentabilidad total del periodo completo como fracción (0.25 =
// 25%), igual que calculateXirr. null si no hay periodos o si algún
// subperiodo parte de valor 0 o negativo (no se puede calcular su HP).
export function timeWeightedReturn(periods: TwrPeriod[]): number | null {
  if (periods.length === 0) return null;

  let linked = 1;
  for (const period of periods) {
    if (period.startValue <= 0) return null;
    const holdingPeriodReturn =
      (period.endValue - period.startValue - period.externalFlow) / period.startValue;
    linked *= 1 + holdingPeriodReturn;
  }

  return linked - 1;
}

// Anualiza un TWR total calculado sobre `years` años: (1+TWR)^(1/años) - 1.
// null si TWR es null o si años <= 0 (no se puede anualizar un periodo nulo).
export function annualizeTwr(twr: number | null, years: number): number | null {
  if (twr === null || years <= 0) return null;
  return Math.pow(1 + twr, 1 / years) - 1;
}
