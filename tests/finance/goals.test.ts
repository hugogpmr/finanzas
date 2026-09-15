import { describe, expect, test } from "vitest";
import { goalProgressPct, monthsToGoal } from "@/lib/finance/goals";

describe("monthsToGoal", () => {
  test("caso típico: proyección lineal sin rentabilidad", () => {
    expect(monthsToGoal(6000, 1500, 500)).toBeCloseTo(9, 5);
  });

  test("ya se alcanzó el objetivo ⇒ 0 meses", () => {
    expect(monthsToGoal(6000, 6000, 500)).toBe(0);
    expect(monthsToGoal(6000, 7000, 500)).toBe(0);
  });

  test("sin aportación mensual (o negativa) y objetivo sin alcanzar ⇒ null", () => {
    expect(monthsToGoal(6000, 1000, 0)).toBeNull();
    expect(monthsToGoal(6000, 1000, -100)).toBeNull();
  });
});

describe("goalProgressPct", () => {
  test("caso típico", () => {
    expect(goalProgressPct(6000, 1500)).toBeCloseTo(25, 5);
  });

  test("capado a 100 si se supera el objetivo", () => {
    expect(goalProgressPct(6000, 9000)).toBe(100);
  });

  test("capado a 0 si el importe actual es negativo", () => {
    expect(goalProgressPct(6000, -100)).toBe(0);
  });

  test("objetivo 0 o negativo devuelve null (evita división por cero)", () => {
    expect(goalProgressPct(0, 100)).toBeNull();
  });
});
