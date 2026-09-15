"use client";

import {
  useEffect,
  useId,
  useMemo,
  useState,
  type Dispatch,
  type ReactElement,
  type SetStateAction,
} from "react";
import { useActionState } from "react";
import { Plus, X } from "lucide-react";
import { upsertTransaction, type TransactionFormState } from "./actions";
import { TRANSACTION_KINDS, type Transaction, type TransactionKind } from "./types";
import { sortCategoriesByHierarchy, type Category } from "@/features/categories/types";
import { todayDateStr } from "@/lib/date";
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

type SplitRow = { key: string; categoryId: string; amount: string; note: string };

function newSplitRow(): SplitRow {
  return { key: crypto.randomUUID(), categoryId: "", amount: "", note: "" };
}

function SplitEditor({
  splits,
  setSplits,
  categoryOptions,
  total,
}: {
  splits: SplitRow[];
  setSplits: Dispatch<SetStateAction<SplitRow[]>>;
  categoryOptions: { value: string; label: string }[];
  total: number;
}) {
  const splitTotal = splits.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
  const remaining = Number((total - splitTotal).toFixed(2));

  function updateRow(key: string, patch: Partial<SplitRow>) {
    setSplits((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }
  function removeRow(key: string) {
    setSplits((rows) => rows.filter((r) => r.key !== key));
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border p-3">
      <Label>División por categoría</Label>
      {splits.map((row) => (
        <div key={row.key} className="flex items-center gap-2">
          <Select
            value={row.categoryId}
            onValueChange={(v) => updateRow(row.key, { categoryId: v as string })}
            items={categoryOptions}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent>
              {categoryOptions.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="number"
            step="0.01"
            min="0"
            placeholder="Importe"
            className="w-24 shrink-0"
            value={row.amount}
            onChange={(e) => updateRow(row.key, { amount: e.target.value })}
          />
          <Input
            placeholder="Nota (opcional)"
            className="w-28 shrink-0"
            value={row.note}
            onChange={(e) => updateRow(row.key, { note: e.target.value })}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => removeRow(row.key)}
          >
            <X />
            <span className="sr-only">Quitar</span>
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="self-start"
        onClick={() => setSplits((rows) => [...rows, newSplitRow()])}
      >
        <Plus />
        Añadir división
      </Button>
      <p
        className={`text-xs ${Math.abs(remaining) < 0.01 ? "text-muted-foreground" : "text-destructive"}`}
      >
        {Math.abs(remaining) < 0.01
          ? "Las divisiones suman el importe total."
          : `Falta repartir ${remaining.toFixed(2)} (negativo = te has pasado).`}
      </p>
    </div>
  );
}

export function TransactionDialog({
  transaction,
  accounts,
  categories,
  trigger,
  open,
  onOpenChange,
}: TransactionDialogProps) {
  const id = useId();
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = open !== undefined;
  const dialogOpen = isControlled ? open : internalOpen;
  const setDialogOpen = isControlled ? onOpenChange! : setInternalOpen;

  const [kind, setKind] = useState<TransactionKind>(
    transaction ? (Number(transaction.amount) < 0 ? "expense" : "income") : "expense",
  );

  const [isSplit, setIsSplit] = useState(transaction?.is_split ?? false);
  const [splits, setSplits] = useState<SplitRow[]>(() => {
    const existing = transaction?.splits ?? [];
    if (existing.length === 0) return [newSplitRow(), newSplitRow()];
    return existing.map((s) => ({
      key: s.id,
      categoryId: s.category_id ?? "",
      amount: Math.abs(Number(s.amount)).toFixed(2),
      note: s.note ?? "",
    }));
  });
  const [amount, setAmount] = useState(
    transaction ? Math.abs(Number(transaction.amount)).toFixed(2) : "",
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

  const splitTotal = splits.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
  const splitsMatchTotal =
    splits.some((s) => s.categoryId && s.amount) &&
    Math.abs(splitTotal - (Number(amount) || 0)) < 0.01;

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
            <Label htmlFor={`${id}-kind`}>Tipo</Label>
            <Select
              name="kind"
              value={kind}
              onValueChange={(v) => setKind(v as TransactionKind)}
              items={TRANSACTION_KINDS.map(({ value, label }) => ({ value, label }))}
            >
              <SelectTrigger id={`${id}-kind`} className="w-full">
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
              <Label htmlFor={`${id}-amount`}>Importe</Label>
              <Input
                id={`${id}-amount`}
                name="amount"
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor={`${id}-date`}>Fecha</Label>
              <Input
                id={`${id}-date`}
                name="date"
                type="date"
                defaultValue={transaction?.date ?? todayDateStr()}
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor={`${id}-account_id`}>Cuenta</Label>
            <Select
              name="account_id"
              defaultValue={transaction?.account_id ?? accounts[0]?.id}
              items={accounts.map((a) => ({
                value: a.id,
                label: `${a.name} (${a.currency})`,
              }))}
            >
              <SelectTrigger id={`${id}-account_id`} className="w-full">
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

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isSplit}
              onChange={(e) => setIsSplit(e.target.checked)}
              className="size-4 rounded border-input"
            />
            Dividir en varias categorías
          </label>
          <input type="hidden" name="is_split" value={isSplit ? "true" : "false"} />

          {isSplit ? (
            <SplitEditor
              splits={splits}
              setSplits={setSplits}
              categoryOptions={categoryOptions}
              total={Number(amount) || 0}
            />
          ) : (
            <div className="flex flex-col gap-2">
              <Label htmlFor={`${id}-category_id`}>Categoría (opcional)</Label>
              <Select
                name="category_id"
                defaultValue={transaction?.category_id ?? ""}
                items={[{ value: "", label: "Sin categorizar" }, ...categoryOptions]}
              >
                <SelectTrigger id={`${id}-category_id`} className="w-full">
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
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor={`${id}-merchant`}>Comercio (opcional)</Label>
            <Input
              id={`${id}-merchant`}
              name="merchant"
              defaultValue={transaction?.merchant ?? ""}
              placeholder="Mercadona, Netflix..."
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor={`${id}-description`}>Descripción (opcional)</Label>
            <Input
              id={`${id}-description`}
              name="description"
              defaultValue={transaction?.description ?? ""}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor={`${id}-tags`}>Etiquetas (opcional)</Label>
            <Input
              id={`${id}-tags`}
              name="tags"
              defaultValue={defaultTags}
              placeholder="viaje, trabajo... (separadas por comas)"
            />
          </div>

          <input
            type="hidden"
            name="splits_json"
            value={JSON.stringify(
              splits
                .filter((s) => s.categoryId && s.amount)
                .map((s) => ({ category_id: s.categoryId, amount: s.amount, note: s.note })),
            )}
          />

          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

          <DialogFooter>
            <Button type="submit" disabled={pending || (isSplit && !splitsMatchTotal)}>
              {pending ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
