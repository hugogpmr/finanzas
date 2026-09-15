"use client";

import { useEffect, useMemo, useState, type ReactElement } from "react";
import { useActionState } from "react";
import { Plus } from "lucide-react";
import { upsertTransaction, type TransactionFormState } from "./actions";
import { TRANSACTION_KINDS, type Transaction, type TransactionKind } from "./types";
import { sortCategoriesByHierarchy, type Category } from "@/features/categories/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type AccountOption = { id: string; name: string; currency: string };

type TransactionDialogProps = {
  transaction?: Transaction;
  accounts: AccountOption[];
  categories: Category[];
  trigger?: ReactElement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function TransactionDialog({
  transaction,
  accounts,
  categories,
  trigger,
  open,
  onOpenChange,
}: TransactionDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = open !== undefined;
  const dialogOpen = isControlled ? open : internalOpen;
  const setDialogOpen = isControlled ? onOpenChange! : setInternalOpen;

  const [kind, setKind] = useState<TransactionKind>(
    transaction ? (Number(transaction.amount) < 0 ? "expense" : "income") : "expense",
  );

  const [state, action, pending] = useActionState<TransactionFormState, FormData>(
    upsertTransaction,
    undefined,
  );

  useEffect(() => {
    if (state?.success) setDialogOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const categoryOptions = useMemo(
    () =>
      sortCategoriesByHierarchy(categories.filter((c) => c.type === kind)).map((c) => ({
        value: c.id,
        label: c.parent_id ? `— ${c.name}` : c.name,
      })),
    [categories, kind],
  );

  const defaultTags = (transaction?.transaction_tags ?? []).map((t) => t.tag.name).join(", ");

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      {!isControlled && (
        <DialogTrigger
          render={
            trigger ?? (
              <Button size="sm">
                <Plus />
                Nueva transacción
              </Button>
            )
          }
        />
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{transaction ? "Editar transacción" : "Nueva transacción"}</DialogTitle>
        </DialogHeader>
        <form action={action} className="flex flex-col gap-4">
          {transaction && <input type="hidden" name="id" value={transaction.id} />}

          <div className="flex flex-col gap-2">
            <Label htmlFor="kind">Tipo</Label>
            <Select
              name="kind"
              value={kind}
              onValueChange={(v) => setKind(v as TransactionKind)}
              items={TRANSACTION_KINDS.map(({ value, label }) => ({ value, label }))}
            >
              <SelectTrigger id="kind" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TRANSACTION_KINDS.map((k) => (
                  <SelectItem key={k.value} value={k.value}>
                    {k.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="amount">Importe</Label>
              <Input
                id="amount"
                name="amount"
                type="number"
                step="0.01"
                min="0"
                defaultValue={
                  transaction ? Math.abs(Number(transaction.amount)).toFixed(2) : undefined
                }
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="date">Fecha</Label>
              <Input
                id="date"
                name="date"
                type="date"
                defaultValue={transaction?.date ?? todayIso()}
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="account_id">Cuenta</Label>
            <Select
              name="account_id"
              defaultValue={transaction?.account_id ?? accounts[0]?.id}
              items={accounts.map((a) => ({
                value: a.id,
                label: `${a.name} (${a.currency})`,
              }))}
            >
              <SelectTrigger id="account_id" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name} ({a.currency})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="category_id">Categoría (opcional)</Label>
            <Select
              name="category_id"
              defaultValue={transaction?.category_id ?? ""}
              items={[{ value: "", label: "Sin categorizar" }, ...categoryOptions]}
            >
              <SelectTrigger id="category_id" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Sin categorizar</SelectItem>
                {categoryOptions.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="merchant">Comercio (opcional)</Label>
            <Input
              id="merchant"
              name="merchant"
              defaultValue={transaction?.merchant ?? ""}
              placeholder="Mercadona, Netflix..."
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="description">Descripción (opcional)</Label>
            <Input
              id="description"
              name="description"
              defaultValue={transaction?.description ?? ""}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="tags">Etiquetas (opcional)</Label>
            <Input
              id="tags"
              name="tags"
              defaultValue={defaultTags}
              placeholder="viaje, trabajo... (separadas por comas)"
            />
          </div>

          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
