import { describe, expect, test } from "vitest";
import { parseImportedAmount, parseImportedDate } from "@/lib/csv/parse-row";

describe("parseImportedDate", () => {
  test("formato ISO YYYY-MM-DD", () => {
    expect(parseImportedDate("2024-03-07")).toBe("2024-03-07");
  });

  test("formato español DD/MM/YYYY", () => {
    expect(parseImportedDate("07/03/2024")).toBe("2024-03-07");
  });

  test("formato español con guiones DD-MM-YYYY", () => {
    expect(parseImportedDate("07-03-2024")).toBe("2024-03-07");
  });

  test("con espacios alrededor", () => {
    expect(parseImportedDate("  07/03/2024  ")).toBe("2024-03-07");
  });

  test("null con mes fuera de rango", () => {
    expect(parseImportedDate("07/13/2024")).toBeNull();
  });

  test("null con formato irreconocible", () => {
    expect(parseImportedDate("marzo de 2024")).toBeNull();
  });
});

describe("parseImportedAmount", () => {
  test("formato español con miles y decimales: 1.234,56", () => {
    expect(parseImportedAmount("1.234,56")).toBeCloseTo(1234.56, 2);
  });

  test("formato internacional con miles y decimales: 1,234.56", () => {
    expect(parseImportedAmount("1,234.56")).toBeCloseTo(1234.56, 2);
  });

  test("solo coma decimal: 45,30", () => {
    expect(parseImportedAmount("45,30")).toBeCloseTo(45.3, 2);
  });

  test("negativo con coma decimal: -45,30", () => {
    expect(parseImportedAmount("-45,30")).toBeCloseTo(-45.3, 2);
  });

  test("solo punto decimal: 1234.56", () => {
    expect(parseImportedAmount("1234.56")).toBeCloseTo(1234.56, 2);
  });

  test("entero sin separador", () => {
    expect(parseImportedAmount("1234")).toBe(1234);
  });

  test("con símbolo de divisa y espacios", () => {
    expect(parseImportedAmount(" -45,30 € ")).toBeCloseTo(-45.3, 2);
  });

  test("null con cadena vacía", () => {
    expect(parseImportedAmount("")).toBeNull();
  });

  test("null sin dígitos", () => {
    expect(parseImportedAmount("N/A")).toBeNull();
  });
});
