import { describe, expect, test } from "vitest";
import { currentPeriodRange, previousPeriodRange } from "@/features/budgets/period";

// Fecha de referencia fija para que el test no dependa del día en que se ejecute.
const REF = new Date(2026, 8, 15); // 15 de septiembre de 2026 (mes con 30 días)

describe("currentPeriodRange", () => {
  test("mensual: del día 1 al último día del mes", () => {
    expect(currentPeriodRange("monthly", REF)).toEqual({ from: "2026-09-01", to: "2026-09-30" });
  });

  test("semanal: los 7 días que terminan hoy", () => {
    expect(currentPeriodRange("weekly", REF)).toEqual({ from: "2026-09-09", to: "2026-09-15" });
  });
});

describe("previousPeriodRange", () => {
  test("mensual: el mes natural anterior completo", () => {
    expect(previousPeriodRange("monthly", REF)).toEqual({ from: "2026-08-01", to: "2026-08-31" });
  });

  test("semanal: los 7 días anteriores al periodo actual", () => {
    expect(previousPeriodRange("weekly", REF)).toEqual({ from: "2026-09-02", to: "2026-09-08" });
  });

  test("mensual cruzando año (enero ⇒ diciembre del año anterior)", () => {
    const jan = new Date(2026, 0, 10);
    expect(previousPeriodRange("monthly", jan)).toEqual({ from: "2025-12-01", to: "2025-12-31" });
  });
});
