import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Cliente con la service_role key: SALTA RLS por completo. Solo para código
// que corre en el servidor sin sesión de usuario (crons, jobs) y que necesita
// leer/escribir datos de TODOS los usuarios a la vez — por ejemplo el
// snapshot mensual de patrimonio neto. JAMÁS importar esto desde un
// componente cliente ni exponer la clave con el prefijo NEXT_PUBLIC_.
export function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}
