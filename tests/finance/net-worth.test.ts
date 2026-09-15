import { describe, expect, test } from "vitest";
import { aggregateNetWorth } from "@/lib/finance/net-worth";

describe("aggregateNetWorth", () => {
  test("agrega activos y pasivos en EUR, incluida conversión de divisa", () => {
    const result = aggregateNetWorth(
      [
        { type: "checking", account_class: "asset", currency: "EUR", current_balance: 1000 },
        { type: "brokerage", account_class: "asset", currency: "USD", current_balance: 1000 },
        { type: "credit_card", account_class: "liability", currency: "EUR", current_balance: 300 },
      ],
      new Map([["USD", 0.9]]),
    );

    expect(result.totalAssetsEur).toBeCloseTo(1900, 2); // 1000 + 1000*0.9
    expect(result.totalLiabilitiesEur).toBeCloseTo(300, 2);
    expect(result.netWorthEur).toBeCloseTo(1600, 2);
  });

  test("solo cuenta como líquido checking/savings/cash", () => {
    const result = aggregateNetWorth(
      [
        { type: "checking", account_class: "asset", currency: "EUR", current_balance: 500 },
        { type: "brokerage", account_class: "asset", currency: "EUR", current_balance: 2000 },
      ],
      new Map(),
    );

    expect(result.liquidAssetsEur).toBeCloseTo(500, 2);
    expect(result.totalAssetsEur).toBeCloseTo(2500, 2);
    expect(result.liquidNetWorthEur).toBeCloseTo(500, 2);
  });

  test("agrupa por tipo de cuenta en byType", () => {
    const result = aggregateNetWorth(
      [
        { type: "checking", account_class: "asset", currency: "EUR", current_balance: 500 },
        { type: "checking", account_class: "asset", currency: "EUR", current_balance: 200 },
        { type: "mortgage", account_class: "liability", currency: "EUR", current_balance: 100000 },
      ],
      new Map(),
    );

    expect(result.byType.checking).toBeCloseTo(700, 2);
    expect(result.byType.mortgage).toBeCloseTo(100000, 2);
  });

  test("sin cuentas, todo a 0", () => {
    const result = aggregateNetWorth([], new Map());
    expect(result.netWorthEur).toBe(0);
    expect(result.liquidNetWorthEur).toBe(0);
    expect(result.byType).toEqual({});
  });
});
