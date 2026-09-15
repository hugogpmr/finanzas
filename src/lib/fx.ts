import type { SupabaseClient } from "@supabase/supabase-js";

// No es lógica financiera pura (hace red + caché en BD), por eso vive aquí y
// no en src/lib/finance/. Los tipos de cambio son estables intradía, así que
// se cachean en fx_rates y nunca se piden dos veces para la misma fecha+par.
export async function getEurRate(
  supabase: SupabaseClient,
  currency: string,
  date: string,
): Promise<number> {
  if (currency === "EUR") return 1;

  const { data: cached } = await supabase
    .from("fx_rates")
    .select("rate")
    .eq("date", date)
    .eq("base", currency)
    .eq("quote", "EUR")
    .maybeSingle();

  if (cached) return Number(cached.rate);

  try {
    const res = await fetch(
      `https://api.frankfurter.dev/v1/${date}?base=${currency}&symbols=EUR`,
    );
    if (!res.ok) throw new Error(`Frankfurter respondió ${res.status}`);

    const json = (await res.json()) as { rates?: Record<string, number> };
    const rate = json.rates?.EUR;
    if (typeof rate !== "number") throw new Error("Frankfurter no devolvió tasa EUR");

    // Best-effort: si otra petición concurrente ya la insertó, ignorar el conflicto.
    await supabase
      .from("fx_rates")
      .upsert({ date, base: currency, quote: "EUR", rate }, { onConflict: "date,base,quote" });

    return rate;
  } catch (error) {
    // No bloquear el guardado de la transacción por un fallo de la API externa:
    // se guarda con fx_rate = 1 (aproximación) y se puede corregir más adelante.
    console.error("getEurRate: fallo al obtener tipo de cambio, usando 1 como fallback", error);
    return 1;
  }
}
