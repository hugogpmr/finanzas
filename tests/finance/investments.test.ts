import { describe, expect, test } from "vitest";
import { groupAllocation, yieldOnCostPct } from "@/lib/finance/investments";

describe("yieldOnCostPct", () => {
  test("dividendos anuales sobre coste de adquisición", () => {
    expect(yieldOnCostPct(50, 1000)).toBeCloseTo(5, 10);
  });

  test("null con coste de adquisición 0", () => {
    expect(yieldOnCostPct(50, 0)).toBeNull();
  });
});

describe("groupAllocation", () => {
  test("agrupa por clave y calcula el % de cada grupo, ordenado de mayor a menor", () => {
    const result = groupAllocation([
      { key: "stock", valueEur: 600 },
      { key: "bond", valueEur: 300 },
      { key: "stock", valueEur: 100 },
    ]);
    expect(result).toEqual([
      { key: "stock", valueEur: 700, pct: 70 },
      { key: "bond", valueEur: 300, pct: 30 },
    ]);
  });

  test("array vacío sin buckets", () => {
    expect(groupAllocation([])).toEqual([]);
  });
});
