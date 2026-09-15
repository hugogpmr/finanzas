// Parsing puro de valores de una fila de CSV bancario (Sprint 6, ver
// docs/plan-tecnico.md sección "Sprint 6"). Nunca asumir que un CSV de banco
// viene en un formato limpio: fechas y separadores decimales varían por
// entidad. Estas funciones son deliberadamente conservadoras (devuelven
// `null` en vez de adivinar mal) porque el usuario revisa cada fila en la
// previsualización antes de importar nada — esa vista es la red de
// seguridad real, no un parseo perfecto.

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
// Asume DD/MM/YYYY o DD-MM-YYYY (convención española, día primero), no
// MM/DD/YYYY (EE.UU.): el usuario objetivo de esta app está en España.
const DMY_DATE = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/;

export function parseImportedDate(raw: string): string | null {
  const trimmed = raw.trim();

  if (ISO_DATE.test(trimmed)) return trimmed;

  const match = trimmed.match(DMY_DATE);
  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// Acepta tanto "1.234,56" (España) como "1,234.56" (internacional): el
// separador decimal es el que aparece más a la derecha (coma o punto), el
// otro se trata como separador de miles y se descarta. Con un solo
// separador se asume que es el decimal. Caso límite no resuelto a propósito:
// un importe redondo de miles con un único punto y sin decimales (p.ej.
// "1.234" queriendo decir 1234 €) se interpreta como 1,234 € — el usuario lo
// vería mal en la previsualización antes de confirmar la importación.
export function parseImportedAmount(raw: string): number | null {
  const cleaned = raw.trim().replace(/[^0-9,.-]/g, "");
  if (!cleaned) return null;

  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");

  let normalized: string;
  if (lastComma > lastDot) {
    normalized = `${cleaned.slice(0, lastComma).replace(/[.,]/g, "")}.${cleaned.slice(lastComma + 1)}`;
  } else if (lastDot > lastComma) {
    normalized = `${cleaned.slice(0, lastDot).replace(/[.,]/g, "")}.${cleaned.slice(lastDot + 1)}`;
  } else {
    normalized = cleaned;
  }

  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}
