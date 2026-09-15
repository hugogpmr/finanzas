import { createClient } from "@/lib/supabase/server";
import { ImportWizard } from "@/features/import/import-wizard";
import type { Category } from "@/features/categories/types";

export default async function ImportarPage() {
  const supabase = await createClient();

  const [{ data: accountsData }, { data: categoriesData }] = await Promise.all([
    supabase.from("accounts").select("id, name, currency").order("name"),
    supabase.from("categories").select("*").order("name"),
  ]);

  const accounts = accountsData ?? [];
  const categories = (categoriesData ?? []) as Category[];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">Importar CSV</h1>
        <p className="text-sm text-muted-foreground">
          Sube un extracto de tu banco, mapea las columnas y revisa antes de importar.
        </p>
      </div>

      {accounts.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          Crea antes una cuenta en <span className="font-medium">Cuentas</span> para poder importar
          transacciones.
        </p>
      ) : (
        <ImportWizard accounts={accounts} categories={categories} />
      )}
    </div>
  );
}
