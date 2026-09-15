import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { todayDateStr } from "@/lib/date";
import { aggregateNetWorth } from "@/lib/finance/net-worth";

// Snapshot mensual de patrimonio neto (Sprint 7, docs/plan-tecnico.md).
// Lo llama un cron de GitHub Actions (.github/workflows/net-worth-snapshot.yml)
// el día 1 de cada mes. NO es una ruta pública: usa la service_role key para
// leer las cuentas de todos los usuarios de una vez (RLS solo deja ver las
// propias), así que se protege con un secreto compartido en vez de con la
// sesión de un usuario — no hay sesión posible en un cron.
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
  }

  const supabase = createServiceClient();
  const today = todayDateStr();

  const { data: accounts, error: accountsError } = await supabase
    .from("accounts")
    .select("user_id, type, account_class, currency, current_balance");

  if (accountsError) {
    return NextResponse.json({ ok: false, error: accountsError.message }, { status: 500 });
  }

  const accountsByUser = new Map<string, typeof accounts>();
  for (const account of accounts ?? []) {
    const list = accountsByUser.get(account.user_id) ?? [];
    list.push(account);
    accountsByUser.set(account.user_id, list);
  }

  const currencies = new Set((accounts ?? []).map((a) => a.currency));
  const ratesByCurrency = new Map<string, number>();
  for (const currency of currencies) {
    if (currency === "EUR") {
      ratesByCurrency.set(currency, 1);
      continue;
    }
    const { data: cached } = await supabase
      .from("fx_rates")
      .select("rate")
      .eq("date", today)
      .eq("base", currency)
      .eq("quote", "EUR")
      .maybeSingle();

    if (cached) {
      ratesByCurrency.set(currency, Number(cached.rate));
      continue;
    }

    try {
      const res = await fetch(`https://api.frankfurter.dev/v1/${today}?base=${currency}&symbols=EUR`);
      const json = (await res.json()) as { rates?: Record<string, number> };
      const rate = json.rates?.EUR;
      ratesByCurrency.set(currency, typeof rate === "number" ? rate : 1);
      if (typeof rate === "number") {
        await supabase
          .from("fx_rates")
          .upsert({ date: today, base: currency, quote: "EUR", rate }, { onConflict: "date,base,quote" });
      }
    } catch {
      ratesByCurrency.set(currency, 1);
    }
  }

  let snapshotted = 0;
  for (const [userId, userAccounts] of accountsByUser) {
    const breakdown = aggregateNetWorth(
      userAccounts.map((a) => ({ ...a, current_balance: Number(a.current_balance) })),
      ratesByCurrency,
    );

    const { error } = await supabase.from("net_worth_snapshots").upsert(
      {
        user_id: userId,
        snapshot_date: today,
        total_assets: breakdown.totalAssetsEur.toFixed(2),
        total_liabilities: breakdown.totalLiabilitiesEur.toFixed(2),
        net_worth: breakdown.netWorthEur.toFixed(2),
        liquid_net_worth: breakdown.liquidNetWorthEur.toFixed(2),
        breakdown: breakdown.byType,
      },
      { onConflict: "user_id,snapshot_date" },
    );

    if (!error) snapshotted++;
  }

  return NextResponse.json({ ok: true, users: accountsByUser.size, snapshotted, date: today });
}
