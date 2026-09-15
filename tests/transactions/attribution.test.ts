import { describe, expect, test } from "vitest";
import { attributeTransactionParts } from "@/lib/transactions/attribution";

describe("attributeTransactionParts", () => {
  test("transacción no dividida: una única parte con su categoría", () => {
    const parts = attributeTransactionParts({
      amount: "-100.00",
      amount_eur: "-92.50",
      category_id: "cat-1",
      is_split: false,
      splits: null,
    });
    expect(parts).toEqual([{ categoryId: "cat-1", amountEur: 92.5 }]);
  });

  test("transacción dividida: prorratea cada división con el mismo tipo de cambio", () => {
    // amount_eur/amount = 0.5 (p.ej. una divisa que vale la mitad que el EUR)
    const parts = attributeTransactionParts({
      amount: "-100.00",
      amount_eur: "-50.00",
      category_id: null,
      is_split: true,
      splits: [
        { category_id: "cat-a", amount: "-70.00" },
        { category_id: "cat-b", amount: "-30.00" },
      ],
    });
    expect(parts).toEqual([
      { categoryId: "cat-a", amountEur: 35 },
      { categoryId: "cat-b", amountEur: 15 },
    ]);
  });

  test("is_split true pero sin filas de división: cae al comportamiento no dividido", () => {
    const parts = attributeTransactionParts({
      amount: "-40.00",
      amount_eur: "-40.00",
      category_id: "cat-1",
      is_split: true,
      splits: [],
    });
    expect(parts).toEqual([{ categoryId: "cat-1", amountEur: 40 }]);
  });

  test("importe 0 no divide por cero (fxRatio se queda en 0)", () => {
    const parts = attributeTransactionParts({
      amount: 0,
      amount_eur: 0,
      category_id: null,
      is_split: true,
      splits: [{ category_id: "cat-a", amount: "-10" }],
    });
    expect(parts).toEqual([{ categoryId: "cat-a", amountEur: 0 }]);
  });
});
