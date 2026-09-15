// `date.toISOString().slice(0, 10)` parece la forma obvia de sacar "hoy" en
// formato YYYY-MM-DD, pero toISOString() convierte a UTC: para cualquier
// usuario en una zona con offset positivo (España, UTC+1/+2) eso resta horas
// y puede devolver el día de ayer (p.ej. la 1 de la madrugada en Madrid en
// verano todavía es el día anterior en UTC). Usar siempre esta función en su
// lugar, tanto en cliente (fecha por defecto de un formulario) como en
// servidor (rango de fechas de una consulta).
export function toDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function todayDateStr(): string {
  return toDateStr(new Date());
}
