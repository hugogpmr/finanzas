import { describe, expect, test } from "vitest";
import { annualizeTwr, timeWeightedReturn } from "@/lib/finance/twr";

describe("timeWeightedReturn", () => {
  test("un solo periodo sin flujos externos: HP = rentabilidad simple", () => {
    // 1000 -> 1200 sin aportar ni retirar nada ⇒ +20%.
    const twr = timeWeightedReturn([{ startValue: 1000, endValue: 1200, externalFlow: 0 }]);
    expect(twr).toBeCloseTo(0.2, 10);
  });

  test("dos periodos se enlazan geométricamente, no se suman", () => {
    // Periodo 1: 1000 -> 1100 (+10%). Periodo 2: arranca en 1100, se aporta
    // 400 (flujo negativo = entra dinero) y cierra en 1650, es decir el saldo
    // "orgánico" pasó de 1100+400=1500 a 1650 ⇒ HP2 = (1650-1100-(-400))/1100
    // = 950/1100 ≈ 0.863636. Enlazado: 1.10 × 1.863636 - 1 ≈ 1.05, no 0.973636
    // (la suma ingenua de HPs) — así se comprueba que se enlaza geométricamente.
    const twr = timeWeightedReturn([
      { startValue: 1000, endValue: 1100, externalFlow: 0 },
      { startValue: 1100, endValue: 1650, externalFlow: -400 },
    ]);
    expect(twr).toBeCloseTo(1.1 * (1 + 950 / 1100) - 1, 10);
  });

  test("null sin periodos", () => {
    expect(timeWeightedReturn([])).toBeNull();
  });

  test("null si un periodo arranca en valor 0", () => {
    expect(timeWeightedReturn([{ startValue: 0, endValue: 100, externalFlow: 0 }])).toBeNull();
  });
});

describe("annualizeTwr", () => {
  test("anualiza un TWR de 2 años", () => {
    // (1.21)^(1/2) - 1 = 0.10 exacto (21% en 2 años ⇒ 10% anual compuesto).
    expect(annualizeTwr(0.21, 2)).toBeCloseTo(0.1, 10);
  });

  test("null si el TWR de entrada es null", () => {
    expect(annualizeTwr(null, 3)).toBeNull();
  });

  test("null con años <= 0", () => {
    expect(annualizeTwr(0.1, 0)).toBeNull();
  });
});
