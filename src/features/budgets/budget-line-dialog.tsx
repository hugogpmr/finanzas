"use client";

import { useEffect, useId, useState, type ReactElement } from "react";
import { useActionState } from "react";
import { Plus } from "lucide-react";
import { upsertBudgetLine, type BudgetLineFormState } from "./actions";
import type { BudgetLine } from "./types";
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

type BudgetLineDialogProps = {
  budgetId: string;
  line?: BudgetLine;
  categories: Category[];
  trigger?: ReactElement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function BudgetLineDialog({
  budgetId,
  line,
  categories,
  trigger,
  open,
  onOpenChange,
}: BudgetLineDialogProps) {
  const id = useId();
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = open !== undefined;
  const dialogOpen = isControlled ? open : internalOpen;
  const setDialogOpen = isControlled ? onOpenChange! : setInternalOpen;

  const [rollover, setRollover] = useState(line?.rollover ?? false);

  const [state, action, pending] = useActionState<BudgetLineFormState, FormData>(
    upsertBudgetLine,
    undefined,
  );

  useEffect(() => {
    if (state?.success) setDialogOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const expenseCategories = sortCategoriesByHierarchy(
    categories.filter((c) => c.type === "expense"),
  );
  const categoryOptions = expenseCategories.map((c) => ({
    value: c.id,
    label: c.parent_id ? `— ${c.name}` : c.name,
  }));

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      {!isControlled && (
        <DialogTrigger
          render={
            trigger ?? (
              <Button size="sm" variant="outline">
                <Plus />
                Añadir línea
              </Button>
            )
          }
        />
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{line ? "Editar línea" : "Nueva línea del presupuesto"}</DialogTitle>
        </DialogHeader>
        <form action={action} className="flex flex-col gap-4">
          {line && <input type="hidden" name="id" value={line.id} />}
          <input type="hidden" name="budget_id" value={budgetId} />

          <div className="flex flex-col gap-2">
            <Label htmlFor={`${id}-category_id`}>Categoría</Label>
            <Select name="category_id" defaultValue={line?.category_id} items={categoryOptions}>
              <SelectTrigger id={`${id}-category_id`} className="w-full">
                <SelectValue placeholder="Elige una categoría" />
              </SelectTrigger>
              <SelectContent>
                {categoryOptions.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor={`${id}-allocated`}>Asignado (€)</Label>
              <Input
                id={`${id}-allocated`}
                name="allocated"
                type="number"
                step="0.01"
                min="0"
                defaultValue={line?.allocated}
                placeholder="300"
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor={`${id}-alert_threshold_pct`}>Avisar al superar % (opcional)</Label>
              <Input
                id={`${id}-alert_threshold_pct`}
                name="alert_threshold_pct"
                type="number"
                step="1"
                min="1"
                max="100"
                defaultValue={line?.alert_threshold_pct ?? ""}
                placeholder="80"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={rollover}
              onChange={(e) => setRollover(e.target.checked)}
              className="size-4 rounded border-input"
            />
            Lo que sobre pasa al siguiente periodo (sobres)
          </label>
          <input type="hidden" name="rollover" value={rollover ? "true" : "false"} />

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
