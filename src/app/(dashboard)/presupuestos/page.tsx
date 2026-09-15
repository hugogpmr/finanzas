import { createClient } from "@/lib/supabase/server";
import { withSpending } from "@/features/budgets/queries";
import { budgetMethodLabel, budgetPeriodLabel, type Budget, type BudgetLine } from "@/features/budgets/types";
import { BudgetDialog } from "@/features/budgets/budget-dialog";
import { BudgetLineDialog } from "@/features/budgets/budget-line-dialog";
import { BudgetRowActions } from "@/features/budgets/budget-row-actions";
import { BudgetLineRowActions } from "@/features/budgets/budget-line-row-actions";
import { BudgetProgressBar } from "@/features/budgets/budget-progress-bar";
import type { Category } from "@/features/categories/types";
import { formatCurrency } from "@/lib/format";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function PresupuestosPage() {
  const supabase = await createClient();

  const [{ data: budgetsData, error }, { data: categoriesData }] = await Promise.all([
    supabase.from("budgets").select("*").order("is_active", { ascending: false }).order("start_date", { ascending: false }),
    supabase.from("categories").select("*").order("name"),
  ]);

  const budgets = (budgetsData ?? []) as Budget[];
  const categories = (categoriesData ?? []) as Category[];
  const activeBudget = budgets.find((b) => b.is_active) ?? null;

  let lines: BudgetLine[] = [];
  let linesWithSpending: Awaited<ReturnType<typeof withSpending>> = [];
  if (activeBudget) {
    const { data: linesData } = await supabase
      .from("budget_lines")
      .select("*, category:categories(name)")
      .eq("budget_id", activeBudget.id);
    lines = (linesData ?? []) as BudgetLine[];
    linesWithSpending = await withSpending(supabase, activeBudget, lines);
  }

  const totalIncome = activeBudget ? Number(activeBudget.total_income) : 0;
  const totalAllocated = linesWithSpending.reduce((s, l) => s + l.effectiveAllocatedEur, 0);
  const totalSpent = linesWithSpending.reduce((s, l) => s + l.spentEur, 0);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Presupuestos</h1>
          <p className="text-sm text-muted-foreground">
            Reparte tus ingresos por categoría y compara con lo que gastas de verdad.
          </p>
        </div>
        <BudgetDialog />
      </div>

      {error && <p className="text-sm text-destructive">{error.message}</p>}

      {budgets.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          Sin presupuestos todavía.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Método</TableHead>
              <TableHead>Periodo</TableHead>
              <TableHead className="text-right">Ingreso</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {budgets.map((budget) => (
              <TableRow key={budget.id}>
                <TableCell className="font-medium">{budget.name}</TableCell>
                <TableCell>{budgetMethodLabel(budget.method)}</TableCell>
                <TableCell>{budgetPeriodLabel(budget.period)}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatCurrency(budget.total_income, "EUR")}
                </TableCell>
                <TableCell>
                  {budget.is_active ? (
                    <span className="text-xs font-medium text-emerald-600 dark:text-emerald-500">
                      Activo
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <BudgetRowActions budget={budget} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {activeBudget && (
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Líneas de &ldquo;{activeBudget.name}&rdquo; ({budgetPeriodLabel(activeBudget.period).toLowerCase()})
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Asignado: {formatCurrency(totalAllocated, "EUR")} · Gastado:{" "}
                {formatCurrency(totalSpent, "EUR")} · Ingreso: {formatCurrency(totalIncome, "EUR")}
              </p>
            </div>
            {categories.length > 0 && (
              <BudgetLineDialog budgetId={activeBudget.id} categories={categories} />
            )}
          </div>

          {activeBudget.method === "50_30_20" && (
            <p className="rounded-lg border border-dashed p-4 text-xs text-muted-foreground">
              Referencia 50/30/20 sobre {formatCurrency(totalIncome, "EUR")}: Necesidades{" "}
              {formatCurrency(totalIncome * 0.5, "EUR")} · Deseos {formatCurrency(totalIncome * 0.3, "EUR")} ·
              Ahorro {formatCurrency(totalIncome * 0.2, "EUR")}
            </p>
          )}

          {lines.length === 0 ? (
            <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              Sin líneas todavía: añade una por cada categoría que quieras controlar.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Categoría</TableHead>
                  <TableHead className="w-56">Progreso</TableHead>
                  <TableHead className="text-right">Restante</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {linesWithSpending.map((line) => (
                  <TableRow key={line.id}>
                    <TableCell className="font-medium">
                      {line.category?.name ?? "—"}
                      {line.rollover && (
                        <span className="ml-2 text-xs font-normal text-muted-foreground">(sobre)</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <BudgetProgressBar
                        spentEur={line.spentEur}
                        allocatedEur={line.effectiveAllocatedEur}
                        alertThresholdPct={
                          line.alert_threshold_pct ? Number(line.alert_threshold_pct) : null
                        }
                      />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(line.effectiveAllocatedEur - line.spentEur, "EUR")}
                    </TableCell>
                    <TableCell>
                      <BudgetLineRowActions
                        budgetId={activeBudget.id}
                        line={line}
                        categories={categories}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </section>
      )}
    </div>
  );
}
