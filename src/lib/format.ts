export function formatCurrency(amount: string | number, currency: string) {
  const value = typeof amount === "string" ? Number(amount) : amount;
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency,
  }).format(value);
}
