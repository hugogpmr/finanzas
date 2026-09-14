import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-2xl font-semibold">Hola{user?.email ? `, ${user.email}` : ""}</h1>
      <p className="text-muted-foreground">
        Este es el punto de partida del dashboard. Las cuentas, transacciones y el
        resto de KPIs llegan en el Sprint 1.
      </p>
    </div>
  );
}
