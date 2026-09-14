import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/format";
import { accountTypeLabel, type Account } from "@/features/accounts/types";
import { AccountDialog } from "@/features/accounts/account-dialog";
import { AccountRowActions } from "@/features/accounts/account-row-actions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function CuentasPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("accounts")
    .select("*")
    .order("created_at", { ascending: true });

  const accounts = (data ?? []) as Account[];
  const assets = accounts.filter((a) => a.account_class === "asset");
  const liabilities = accounts.filter((a) => a.account_class === "liability");

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Cuentas</h1>
          <p className="text-sm text-muted-foreground">
            Todas tus cuentas de activo y pasivo, en una sola vista.
          </p>
        </div>
        <AccountDialog />
      </div>

      {error && <p className="text-sm text-destructive">{error.message}</p>}

      <AccountGroup title="Activos" accounts={assets} emptyText="Sin cuentas de activo todavía." />
      <AccountGroup
        title="Pasivos"
        accounts={liabilities}
        emptyText="Sin cuentas de pasivo todavía."
      />
    </div>
  );
}

function AccountGroup({
  title,
  accounts,
  emptyText,
}: {
  title: string;
  accounts: Account[];
  emptyText: string;
}) {
  const total = accounts.reduce((sum, a) => sum + Number(a.current_balance), 0);

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          {title}
        </h2>
        {accounts.length > 0 && (
          <span className="text-sm font-medium tabular-nums">
            {formatCurrency(total, accounts[0].currency)}
          </span>
        )}
      </div>

      {accounts.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          {emptyText}
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Entidad</TableHead>
              <TableHead className="text-right">Saldo</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {accounts.map((account) => (
              <TableRow key={account.id}>
                <TableCell className="font-medium">{account.name}</TableCell>
                <TableCell>{accountTypeLabel(account.type)}</TableCell>
                <TableCell className="text-muted-foreground">
                  {account.institution ?? "—"}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatCurrency(account.current_balance, account.currency)}
                </TableCell>
                <TableCell>
                  <AccountRowActions account={account} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </section>
  );
}
