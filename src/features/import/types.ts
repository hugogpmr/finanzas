// Fila cruda tal como la devuelve papaparse con `header: true`: claves = las
// cabeceras detectadas en el CSV, valores = texto sin parsear.
export type RawCsvRow = Record<string, string>;

export type ColumnMapping = {
  date: string;
  amount: string;
  merchant: string; // "" si no se mapea ninguna columna
  description: string; // "" si no se mapea ninguna columna
};

export type ImportPreviewRow = {
  rowIndex: number;
  date: string | null;
  amount: number | null;
  merchant: string | null;
  description: string | null;
  isDuplicate: boolean;
  suggestedCategoryId: string | null;
};

export type ImportRowToCommit = {
  date: string;
  amount: number;
  merchant: string | null;
  description: string | null;
  categoryId: string | null;
};
