import { describe, expect, test } from "vitest";
import { compareDebtStrategies, simulateDebtPayoff } from "@/lib/finance/debts";

describe("simulateDebtPayoff", () => {
  test("una sola deuda: amortización mes a mes exacta", () => {
    // A mano: mes1 interés=1000*0.01=10, saldo=1000+10-300=710
    //         mes2 interés=7.1,  saldo=710+7.1-300=417.1
    //         mes3 interés=4.17, saldo=417.1+4.17-300=121.27
    //         mes4 interés=1.21, debido=122.48 < pago(300) ⇒ se salda
    // intereses totales = 10+7.1+4.17+1.21 = 22.48
    const result = simulateDebtPayoff(
      [{ id: "a", balance: 1000, annualRatePct: 12, minimumPayment: 300 }],
      "avalanche",
      0,
    );
    expect(result.totalMonths).toBe(4);
    expect(result.totalInterestPaid).toBeCloseTo(22.48, 2);
    expect(result.payoffOrder).toEqual(["a"]);
    expect(result.payoffMonthByDebtId).toEqual({ a: 4 });
    expect(result.negativeAmortizationDebtIds).toEqual([]);
    expect(result.reachedMaxMonths).toBe(false);
  });

  test("avalancha liquida primero la de mayor TIN, aunque tenga más saldo", () => {
    const debts = [
      { id: "highRateBig", balance: 3000, annualRatePct: 24, minimumPayment: 80 },
      { id: "lowRateSmall", balance: 1000, annualRatePct: 6, minimumPayment: 50 },
    ];
    const result = simulateDebtPayoff(debts, "avalanche", 200);
    expect(result.payoffOrder).toEqual(["highRateBig", "lowRateSmall"]);
  });

  test("bola de nieve liquida primero la de menor saldo, aunque tenga menos TIN", () => {
    const debts = [
      { id: "highRateBig", balance: 3000, annualRatePct: 24, minimumPayment: 80 },
      { id: "lowRateSmall", balance: 1000, annualRatePct: 6, minimumPayment: 50 },
    ];
    const result = simulateDebtPayoff(debts, "snowball", 200);
    expect(result.payoffOrder).toEqual(["lowRateSmall", "highRateBig"]);
  });

  test("amortización negativa: la cuota no cubre ni el interés ⇒ se marca y nunca se liquida", () => {
    const result = simulateDebtPayoff(
      [{ id: "bad", balance: 1000, annualRatePct: 24, minimumPayment: 5 }],
      "avalanche",
      0,
    );
    expect(result.negativeAmortizationDebtIds).toEqual(["bad"]);
    expect(result.reachedMaxMonths).toBe(true);
    expect(result.payoffMonthByDebtId.bad).toBeNull();
  });

  test("una deuda ya a 0 se considera liquidada desde el principio", () => {
    const result = simulateDebtPayoff(
      [{ id: "done", balance: 0, annualRatePct: 10, minimumPayment: 50 }],
      "avalanche",
      0,
    );
    expect(result.totalMonths).toBe(0);
    expect(result.payoffOrder).toEqual(["done"]);
  });
});

describe("compareDebtStrategies", () => {
  test("la avalancha nunca paga más intereses totales que la bola de nieve", () => {
    const debts = [
      { id: "highRateBig", balance: 3000, annualRatePct: 24, minimumPayment: 80 },
      { id: "lowRateSmall", balance: 1000, annualRatePct: 6, minimumPayment: 50 },
    ];
    const cmp = compareDebtStrategies(debts, 200);
    expect(cmp.avalanche.totalInterestPaid).toBeLessThanOrEqual(cmp.snowball.totalInterestPaid);
    expect(cmp.interestSaved).toBeCloseTo(120, 2);
    expect(cmp.monthsSaved).toBe(0);
  });

  // Regresión: sin extra mensual, la única "extra" que existe es el sobrante
  // que se libera al saldar una deuda dentro del propio mes de su último
  // pago. Si esa deuda es la última en el orden de la estrategia, no hay
  // ninguna otra deuda ese mismo mes a la que pasarle el sobrante — y si el
  // sobrante se perdía en vez de guardarse para el mes siguiente, avalancha
  // podía salir peor que bola de nieve solo por el orden de la lista, lo cual
  // viola la propiedad matemática de que avalancha es siempre óptima o igual.
  test("sin extra mensual, avalancha sigue sin costar más que bola de nieve", () => {
    const debts = [
      { id: "highRateBig", balance: 3000, annualRatePct: 24, minimumPayment: 80 },
      { id: "lowRateSmall", balance: 1000, annualRatePct: 6, minimumPayment: 50 },
    ];
    const cmp = compareDebtStrategies(debts, 0);
    expect(cmp.avalanche.totalInterestPaid).toBeLessThanOrEqual(cmp.snowball.totalInterestPaid);
    expect(cmp.interestSaved).toBeCloseTo(172.83, 2);
    expect(cmp.monthsSaved).toBe(7);
  });
});
