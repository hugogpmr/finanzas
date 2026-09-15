import { createClient } from "@/lib/supabase/server";
import { debtTypeLabel, type Debt } from "@/features/debts/types";
import { DebtDialog } from "@/features/debts/debt-dialog";
import { DebtRowActions } from "@/features/debts/debt-row-actions";
import { DebtSimulator } from "@/features/debts/debt-simulator";
import { formatCurrency, formatPercent } from "@/lib/format";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function DeudasPage() {
  const supabase = await createClient();

  const [{ data: debtsData, error }, { data: accountsData }] = await Promise.all([
    supabase.from("debts").select("*, account:accounts(name)").order("interest_rate", { ascending: false }),
    supabase.from("accounts").select("id, name, currency").eq("account_class", "liability").order("name"),
  ]);

  const debts = (debtsData ?? []) as Debt[];
  const accounts = accountsData ?? [];

  const simulatorInputs = debts.map((d) => ({
    id: d.id,
    balance: Number(d.principal),
    annualRatePct: Number(d.interest_rate),
    minimumPayment: Number(d.minimum_payment),
  }));
  const debtNamesById = Object.fromEntries(debts.map((d) => [d.id, d.name]));

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Deudas</h1>
          <p className="text-sm text-muted-foreground">
            Tarjetas, préstamos e hipotecas, con un simulador de avalancha vs. bola de nieve.
          </p>
        </div>
        <DebtDialog accounts={accounts} />
      </div>

      {error && <p className="text-sm text-destructive">{error.message}</p>}

      {debts.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          Sin deudas todavía. Si no tienes ninguna, ¡mejor que mejor!
        </p>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
                <TableHead className="text-right">TIN</TableHead>
                <TableHead className="text-right">Cuota mínima</TableHead>
                <TableHead>Cuenta</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {debts.map((debt) => (
                <TableRow key={debt.id}>
                  <TableCell className="font-medium">{debt.name}</TableCell>
                  <TableCell>{debtTypeLabel(debt.debt_type)}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCurrency(debt.principal, "EUR")}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatPercent(Number(debt.interest_rate))}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCurrency(debt.minimum_payment, "EUR")}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {debt.account?.name ?? "—"}
                  </TableCell>
                  <TableCell>
                    <DebtRowActions debt={debt} accounts={accounts} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <section className="flex flex-col gap-4">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Simulador de liquidación
            </h2>
            <DebtSimulator debts={simulatorInputs} debtNamesById={debtNamesById} />
          </section>
        </>
      )}
    </div>
  );
}
