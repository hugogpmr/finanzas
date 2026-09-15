import { describe, expect, test } from "vitest";
import { calculateXirr } from "@/lib/finance/xirr";

describe("calculateXirr", () => {
  test("ejemplo de referencia del README de xirr (RayDeCampo/nodejs-xirr)", () => {
    // https://www.npmjs.com/package/xirr — compras de -1000, -2500 y -1000 en
    // fechas distintas, valor final 5050 el 24/08/2016 ⇒ 0.2504234710540838
    // documentado con esa librería. @webcarrot/xirr usa internamente un
    // day-count ligeramente distinto (difiere en la 4ª cifra decimal, no es
    // un bug) así que se compara con precisión 4 en vez de exactitud total.
    const rate = calculateXirr([
      { amount: -1000, date: new Date(2016, 0, 15) },
      { amount: -2500, date: new Date(2016, 1, 8) },
      { amount: -1000, date: new Date(2016, 3, 17) },
      { amount: 5050, date: new Date(2016, 7, 24) },
    ]);
    expect(rate).toBeCloseTo(0.2504234710540838, 4);
  });

  test("null si todos los flujos tienen el mismo signo", () => {
    const rate = calculateXirr([
      { amount: -1000, date: new Date(2024, 0, 1) },
      { amount: -500, date: new Date(2024, 6, 1) },
    ]);
    expect(rate).toBeNull();
  });

  test("null con menos de dos flujos", () => {
    expect(calculateXirr([{ amount: -1000, date: new Date(2024, 0, 1) }])).toBeNull();
  });

  test("una compra y una venta con ganancia simple", () => {
    // 1000 invertidos, devuelven 1100 exactamente un año después ⇒ 10% anual.
    const rate = calculateXirr([
      { amount: -1000, date: new Date(2023, 0, 1) },
      { amount: 1100, date: new Date(2024, 0, 1) },
    ]);
    expect(rate).toBeCloseTo(0.1, 2);
  });
});
