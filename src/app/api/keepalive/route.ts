import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Endpoint público (ver PUBLIC_PATHS en src/lib/supabase/middleware.ts) que un
// cron de GitHub Actions llama cada pocos días (.github/workflows/keepalive.yml)
// para que Supabase no pause el proyecto por inactividad. Basta con ejecutar
// una query real contra Postgres; no hace falta autenticarse ni usar la
// service_role key — un select con la anon key ya cuenta como actividad,
// aunque RLS haga que no devuelva filas.
export async function GET() {
  const supabase = await createClient();
  const { error } = await supabase.from("fx_rates").select("id").limit(1);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, checkedAt: new Date().toISOString() });
}
