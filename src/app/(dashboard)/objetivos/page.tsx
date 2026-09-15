import { createClient } from "@/lib/supabase/server";
import { getDashboardData } from "@/features/dashboard/queries";
import { withCurrentAmountEur } from "@/features/goals/queries";
import { goalTypeLabel, type Goal } from "@/features/goals/types";
import { goalProgressPct, monthsToGoal } from "@/lib/finance/goals";
import { GoalDialog } from "@/features/goals/goal-dialog";
import { GoalRowActions } from "@/features/goals/goal-row-actions";
import { EmergencyFundTemplateButton } from "@/features/goals/emergency-fund-template-button";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/format";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function ObjetivosPage() {
  const supabase = await createClient();

  const [{ data: goalsData, error }, { data: accountsData }, dashboardData] = await Promise.all([
    supabase
      .from("goals")
      .select("*, linked_account:accounts(name, currency, current_balance)")
      .order("created_at", { ascending: false }),
    supabase.from("accounts").select("id, name, currency").eq("account_class", "asset").order("name"),
    getDashboardData(),
  ]);

  const accounts = accountsData ?? [];
  const goals = (goalsData ?? []) as Goal[];
  const goalsWithCurrent = await withCurrentAmountEur(supabase, goals);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Objetivos de ahorro</h1>
          <p className="text-sm text-muted-foreground">
            Fondo de emergencia, ahorros con fecha y fondos específicos (sinking funds).
          </p>
        </div>
        <div className="flex gap-2">
          <EmergencyFundTemplateButton
            accounts={accounts}
            avgEssentialMonthlyExpensesEur={dashboardData.kpis.avgEssentialMonthlyExpensesEur}
          />
          <GoalDialog accounts={accounts} />
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error.message}</p>}

      {goals.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          Sin objetivos todavía.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="w-56">Progreso</TableHead>
              <TableHead className="text-right">Cuánto falta</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {goalsWithCurrent.map((goal) => {
              const target = Number(goal.target_amount);
              const progress = goalProgressPct(target, goal.currentAmountEur);
              const monthlyContribution = goal.monthly_contribution
                ? Number(goal.monthly_contribution)
                : 0;
              const months = monthsToGoal(target, goal.currentAmountEur, monthlyContribution);

              return (
                <TableRow key={goal.id}>
                  <TableCell className="font-medium">
                    {goal.name}
                    {goal.linked_account?.name && (
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        ({goal.linked_account.name})
                      </span>
                    )}
                  </TableCell>
                  <TableCell>{goalTypeLabel(goal.type)}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-foreground"
                          style={{ width: `${progress ?? 0}%` }}
                        />
                      </div>
                      <p className="text-xs tabular-nums text-muted-foreground">
                        {formatCurrency(goal.currentAmountEur, "EUR")} de{" "}
                        {formatCurrency(target, "EUR")}
                        {progress !== null && ` (${formatPercent(progress)})`}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {months === null
                      ? monthlyContribution > 0
                        ? "—"
                        : "Sin aportación fijada"
                      : months === 0
                        ? "¡Conseguido!"
                        : `${formatNumber(months)} meses`}
                  </TableCell>
                  <TableCell>
                    <GoalRowActions goal={goal} accounts={accounts} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
