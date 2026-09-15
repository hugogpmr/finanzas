import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ensureDefaultCategories } from "@/features/categories/actions";
import type { Category } from "@/features/categories/types";
import { TransactionDialog } from "@/features/transactions/transaction-dialog";
import { TransactionRowActions } from "@/features/transactions/transaction-row-actions";
import type { Transaction } from "@/features/transactions/types";
import { formatCurrency } from "@/lib/format";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function TransaccionesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    await ensureDefaultCategories(user.id);
  }

  const [{ data: accountsData }, { data: categoriesData }, { data: transactionsData, error }] =
    await Promise.all([
      supabase.from("accounts").select("id, name, currency").order("name"),
      supabase.from("categories").select("*").order("name"),
      supabase
        .from("transactions")
        .select(
          "*, account:accounts(name, currency), category:categories(name, parent_id), transaction_tags(tag:tags(id, name))",
        )
        .order("date", { ascending: false })
        .order("created_at", { ascending: false }),
    ]);

  const accounts = accountsData ?? [];
  const categories = (categoriesData ?? []) as Category[];
  const transactions = (transactionsData ?? []) as unknown as Transaction[];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Transacciones</h1>
          <p className="text-sm text-muted-foreground">
            Registra tus ingresos y gastos, categorizados y con etiquetas.
          </p>
        </div>
        {accounts.length > 0 && (
          <TransactionDialog accounts={accounts} categories={categories} />
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error.message}</p>}

      {accounts.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          Necesitas al menos una cuenta antes de registrar transacciones.{" "}
          <Button variant="link" className="h-auto p-0" render={<Link href="/cuentas" />}>
            Crea una cuenta
          </Button>
        </p>
      ) : transactions.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          Sin transacciones todavía.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Cuenta</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead>Comercio / etiquetas</TableHead>
              <TableHead className="text-right">Importe</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((tx) => {
              const isExpense = Number(tx.amount) < 0;
              const tags = tx.transaction_tags?.map((t) => t.tag.name) ?? [];
              return (
                <TableRow key={tx.id}>
                  <TableCell className="whitespace-nowrap">{tx.date}</TableCell>
                  <TableCell>{tx.account?.name ?? "—"}</TableCell>
                  <TableCell>
                    {tx.category
                      ? tx.category.parent_id
                        ? `↳ ${tx.category.name}`
                        : tx.category.name
                      : "Sin categorizar"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {tx.merchant ?? tx.description ?? "—"}
                    {tags.length > 0 && (
                      <span className="ml-2 text-xs">
                        {tags.map((t) => `#${t}`).join(" ")}
                      </span>
                    )}
                  </TableCell>
                  <TableCell
                    className={`text-right tabular-nums font-medium ${
                      isExpense ? "text-destructive" : "text-emerald-600 dark:text-emerald-500"
                    }`}
                  >
                    {formatCurrency(tx.amount, tx.currency)}
                  </TableCell>
                  <TableCell>
                    <TransactionRowActions
                      transaction={tx}
                      accounts={accounts}
                      categories={categories}
                    />
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
