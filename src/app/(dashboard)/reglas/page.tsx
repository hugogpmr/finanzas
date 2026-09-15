import { createClient } from "@/lib/supabase/server";
import type { Category } from "@/features/categories/types";
import { RuleDialog } from "@/features/categorization-rules/rule-dialog";
import { RuleRowActions } from "@/features/categorization-rules/rule-row-actions";
import { matchTypeLabel, type CategorizationRule } from "@/features/categorization-rules/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function ReglasPage() {
  const supabase = await createClient();

  const [{ data: categoriesData }, { data: rulesData, error }] = await Promise.all([
    supabase.from("categories").select("*").order("name"),
    supabase
      .from("categorization_rules")
      .select("*, category:categories(name)")
      .order("priority", { ascending: false }),
  ]);

  const categories = (categoriesData ?? []) as Category[];
  const rules = (rulesData ?? []) as CategorizationRule[];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Reglas de auto-categorización</h1>
          <p className="text-sm text-muted-foreground">
            Si al crear una transacción no eliges categoría, se aplica la primera regla que
            coincida (por prioridad).
          </p>
        </div>
        {categories.length > 0 && <RuleDialog categories={categories} />}
      </div>

      {error && <p className="text-sm text-destructive">{error.message}</p>}

      {categories.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          Necesitas al menos una categoría antes de crear reglas.
        </p>
      ) : rules.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          Sin reglas todavía.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Condición</TableHead>
              <TableHead>Patrón</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead className="text-right">Prioridad</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rules.map((rule) => (
              <TableRow key={rule.id}>
                <TableCell>{matchTypeLabel(rule.match_type)}</TableCell>
                <TableCell className="font-mono text-sm">{rule.pattern}</TableCell>
                <TableCell>{rule.category?.name ?? "—"}</TableCell>
                <TableCell className="text-right tabular-nums">{rule.priority}</TableCell>
                <TableCell>
                  <RuleRowActions rule={rule} categories={categories} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
