import { describe, expect, test } from "vitest";
import {
  dtiPct,
  emergencyFundMonths,
  fireNumber,
  fixedExpenseRatioPct,
  housingRatioPct,
  liquidityRatio,
  needsWantsSavingsPct,
  netCashFlow,
  netWorth,
  netWorthMultiple,
  savingsRatePct,
  yearsToFire,
} from "@/lib/finance/kpis";

describe("netCashFlow", () => {
  test("ingresos menos gastos", () => {
    expect(netCashFlow(3000, 2000)).toBe(1000);
  });
});

describe("savingsRatePct", () => {
  test("caso típico", () => {
    expect(savingsRatePct(3000, 2400)).toBeCloseTo(20, 5);
  });

  test("sin ingresos devuelve null en vez de Infinity/NaN", () => {
    expect(savingsRatePct(0, 100)).toBeNull();
  });
});

describe("fixedExpenseRatioPct", () => {
  test("caso típico", () => {
    expect(fixedExpenseRatioPct(800, 2000)).toBeCloseTo(40, 5);
  });

  test("sin gasto total devuelve null", () => {
    expect(fixedExpenseRatioPct(0, 0)).toBeNull();
  });
});

describe("needsWantsSavingsPct", () => {
  test("reparto 50/30/20 exacto", () => {
    const result = needsWantsSavingsPct({ needs: 500, wants: 300, savings: 200, unassigned: 0 });
    expect(result).not.toBeNull();
    expect(result!.needs).toBeCloseTo(50, 5);
    expect(result!.wants).toBeCloseTo(30, 5);
    expect(result!.savings).toBeCloseTo(20, 5);
    expect(result!.unassigned).toBeCloseTo(0, 5);
  });

  test("sin ningún importe devuelve null", () => {
    expect(needsWantsSavingsPct({ needs: 0, wants: 0, savings: 0, unassigned: 0 })).toBeNull();
  });
});

describe("emergencyFundMonths", () => {
  test("caso típico", () => {
    expect(emergencyFundMonths(9000, 1500)).toBeCloseTo(6, 5);
  });

  test("sin gasto esencial devuelve null", () => {
    expect(emergencyFundMonths(9000, 0)).toBeNull();
  });
});

describe("liquidityRatio", () => {
  test("caso típico", () => {
    expect(liquidityRatio(6000, 2000)).toBeCloseTo(3, 5);
  });
});

describe("dtiPct", () => {
  test("caso típico bajo el benchmark del 36%", () => {
    expect(dtiPct(600, 3000)).toBeCloseTo(20, 5);
  });
});

describe("housingRatioPct", () => {
  test("caso típico bajo el benchmark del 28%", () => {
    expect(housingRatioPct(700, 3000)).toBeCloseTo(23.333, 1);
  });
});

describe("netWorth y netWorthMultiple", () => {
  test("patrimonio neto = activos - pasivos", () => {
    expect(netWorth(50000, 20000)).toBe(30000);
  });

  test("múltiplo sobre ingreso anual", () => {
    expect(netWorthMultiple(120000, 40000)).toBeCloseTo(3, 5);
  });
});

describe("fireNumber", () => {
  test("regla del 4% (×25)", () => {
    expect(fireNumber(24000)).toBeCloseTo(600000, 5);
  });

  test("tasa conservadora del 3,5% (×28,57)", () => {
    expect(fireNumber(24000, 0.035)).toBeCloseTo(685714.29, 1);
  });
});

describe("yearsToFire", () => {
  // Puntos de referencia del informe (docs/plan-tecnico.md sección 5): con
  // patrimonio inicial 0 y retorno real del 5%, una tasa de ahorro del 50%
  // lleva a la jubilación en ~17 años y del 70% en ~8,5 años (regla del 4%,
  // FIRE = 25x gasto anual).
  test("tasa de ahorro 50% ⇒ ~17 años", () => {
    const income = 1;
    const savingsRate = 0.5;
    const annualExpenses = income * (1 - savingsRate);
    const years = yearsToFire({
      targetEur: fireNumber(annualExpenses),
      currentNetWorthEur: 0,
      annualSavingsEur: income * savingsRate,
    });
    expect(years).toBeCloseTo(16.6, 1);
  });

  test("tasa de ahorro 70% ⇒ ~8,5 años", () => {
    const income = 1;
    const savingsRate = 0.7;
    const annualExpenses = income * (1 - savingsRate);
    const years = yearsToFire({
      targetEur: fireNumber(annualExpenses),
      currentNetWorthEur: 0,
      annualSavingsEur: income * savingsRate,
    });
    expect(years).toBeCloseTo(8.79, 1);
  });

  test("ya se alcanzó el objetivo ⇒ 0 años", () => {
    expect(
      yearsToFire({ targetEur: 500000, currentNetWorthEur: 600000, annualSavingsEur: 10000 }),
    ).toBe(0);
  });

  test("sin ahorro anual (o negativo) ⇒ inalcanzable (null)", () => {
    expect(
      yearsToFire({ targetEur: 500000, currentNetWorthEur: 0, annualSavingsEur: 0 }),
    ).toBeNull();
    expect(
      yearsToFire({ targetEur: 500000, currentNetWorthEur: 0, annualSavingsEur: -100 }),
    ).toBeNull();
  });
});
