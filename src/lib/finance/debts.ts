// Motor de amortización mes a mes para comparar avalancha vs bola de nieve
// (docs/plan-tecnico.md sección 5). Función pura: recibe el estado de las
// deudas y devuelve cuántos meses y cuántos intereses cuesta liquidarlas con
// cada estrategia. No conoce fechas de calendario reales, solo "mes 1, mes 2...".
//
// `annualRatePct` es el TIN anual en puntos porcentuales (5.25 = 5,25%), no
// una fracción — así es como el usuario lo ve en el papel de su préstamo/
// tarjeta, y así se guarda `interest_rate` en la tabla `debts`.

const MAX_MONTHS = 600; // 50 años: límite de seguridad para no simular para siempre

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export type DebtInput = {
  id: string;
  balance: number;
  annualRatePct: number;
  minimumPayment: number;
};

export type DebtStrategy = "avalanche" | "snowball";

export type DebtSimulationResult = {
  totalMonths: number;
  totalInterestPaid: number;
  payoffOrder: string[];
  payoffMonthByDebtId: Record<string, number | null>;
  negativeAmortizationDebtIds: string[];
  reachedMaxMonths: boolean;
};

// Avalancha: TIN descendente (óptimo matemáticamente). Bola de nieve: saldo
// ascendente (paga antes la más pequeña, más motivador). El orden se fija al
// principio y no se recalcula mes a mes — así trabaja cualquier calculadora
// de este tipo, y evita que el orden "salte" a media simulación.
function sortByStrategy(debts: DebtInput[], strategy: DebtStrategy): DebtInput[] {
  const sorted = [...debts];
  if (strategy === "avalanche") {
    sorted.sort((a, b) => b.annualRatePct - a.annualRatePct);
  } else {
    sorted.sort((a, b) => a.balance - b.balance);
  }
  return sorted;
}

export function simulateDebtPayoff(
  debtsInput: DebtInput[],
  strategy: DebtStrategy,
  extraMonthlyPayment = 0,
): DebtSimulationResult {
  const order = sortByStrategy(debtsInput, strategy);
  const state = order.map((d) => ({ ...d, paid: d.balance <= 0, paidOffMonth: null as number | null }));

  let month = 0;
  let totalInterestPaid = 0;
  let extraPool = extraMonthlyPayment;
  const negativeAmortizationDebtIds = new Set<string>();
  const payoffOrder: string[] = state.filter((d) => d.paid).map((d) => d.id);

  while (state.some((d) => !d.paid) && month < MAX_MONTHS) {
    month++;
    // El "extra" del mes (aportación del usuario + cuotas ya liberadas de
    // deudas saldadas) se dirige entera a la primera deuda activa según el
    // orden de la estrategia; si esa deuda se salda con lo que sobra, el
    // remanente cae en cascada a la siguiente deuda activa el mismo mes.
    let monthExtra = extraPool;

    for (const debt of state) {
      if (debt.paid) continue;

      const interest = round2(debt.balance * (debt.annualRatePct / 100 / 12));
      totalInterestPaid = round2(totalInterestPaid + interest);
      const owed = round2(debt.balance + interest);

      let payment = debt.minimumPayment;
      if (monthExtra > 0) {
        payment = round2(payment + monthExtra);
        monthExtra = 0;
      }

      if (payment < interest) negativeAmortizationDebtIds.add(debt.id);

      if (payment >= owed) {
        monthExtra = round2(monthExtra + (payment - owed));
        debt.balance = 0;
        debt.paid = true;
        debt.paidOffMonth = month;
        payoffOrder.push(debt.id);
        extraPool = round2(extraPool + debt.minimumPayment);
      } else {
        debt.balance = round2(owed - payment);
      }
    }

    // Si la última deuda activa del mes se salda con sobrante y no queda
    // ninguna otra deuda después en el orden para absorberlo ese mismo mes,
    // ese sobrante no se pierde: se suma al fondo "extra" del mes siguiente.
    // Sin este ajuste, el resultado dependería de qué deuda queda última en
    // el orden de cada estrategia, y avalancha podría salir (incorrectamente)
    // más cara que bola de nieve en vez de ser como mucho igual de barata.
    if (monthExtra > 0) {
      extraPool = round2(extraPool + monthExtra);
    }
  }

  return {
    totalMonths: month,
    totalInterestPaid,
    payoffOrder,
    payoffMonthByDebtId: Object.fromEntries(state.map((d) => [d.id, d.paidOffMonth])),
    negativeAmortizationDebtIds: Array.from(negativeAmortizationDebtIds),
    reachedMaxMonths: month >= MAX_MONTHS && state.some((d) => !d.paid),
  };
}

export type DebtStrategyComparison = {
  avalanche: DebtSimulationResult;
  snowball: DebtSimulationResult;
  monthsSaved: number; // positivo = avalancha termina antes
  interestSaved: number; // positivo = avalancha paga menos intereses
};

export function compareDebtStrategies(
  debts: DebtInput[],
  extraMonthlyPayment = 0,
): DebtStrategyComparison {
  const avalanche = simulateDebtPayoff(debts, "avalanche", extraMonthlyPayment);
  const snowball = simulateDebtPayoff(debts, "snowball", extraMonthlyPayment);
  return {
    avalanche,
    snowball,
    monthsSaved: snowball.totalMonths - avalanche.totalMonths,
    interestSaved: round2(snowball.totalInterestPaid - avalanche.totalInterestPaid),
  };
}
