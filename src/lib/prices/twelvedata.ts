// Cliente mínimo de Twelve Data (free tier: 800 llamadas/día, más generoso
// que el de Alpha Vantage) para el precio actual de un ticker. No es lógica
// financiera pura (hace red), por eso vive fuera de src/lib/finance/, igual
// que src/lib/fx.ts. Requiere TWELVE_DATA_API_KEY en el entorno — sin ella,
// devuelve null y el usuario sigue pudiendo introducir el precio a mano en
// el diálogo de la posición.
export async function fetchCurrentPrice(symbol: string): Promise<number | null> {
  const apiKey = process.env.TWELVE_DATA_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch(
      `https://api.twelvedata.com/price?symbol=${encodeURIComponent(symbol)}&apikey=${apiKey}`,
    );
    if (!res.ok) return null;

    const json = (await res.json()) as { price?: string; status?: string };
    if (!json.price) return null;

    const price = Number(json.price);
    return Number.isFinite(price) && price > 0 ? price : null;
  } catch (error) {
    console.error(`fetchCurrentPrice: fallo al pedir el precio de ${symbol}`, error);
    return null;
  }
}
