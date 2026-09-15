"use client";

import { useEffect, useState, type ReactElement } from "react";
import { useActionState } from "react";
import { Plus } from "lucide-react";
import { upsertBudget, type BudgetFormState } from "./actions";
import { BUDGET_METHODS, BUDGET_PERIODS, type Budget, type BudgetMethod, type BudgetPeriod } from "./types";
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

type BudgetDialogProps = {
  budget?: Budget;
  trigger?: ReactElement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function BudgetDialog({ budget, trigger, open, onOpenChange }: BudgetDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = open !== undefined;
  const dialogOpen = isControlled ? open : internalOpen;
  const setDialogOpen = isControlled ? onOpenChange! : setInternalOpen;

  const [method, setMethod] = useState<BudgetMethod>(budget?.method ?? "50_30_20");
  const [period, setPeriod] = useState<BudgetPeriod>(budget?.period ?? "monthly");

  const [state, action, pending] = useActionState<BudgetFormState, FormData>(
    upsertBudget,
    undefined,
  );

  useEffect(() => {
    if (state?.success) setDialogOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      {!isControlled && (
        <DialogTrigger
          render={
            trigger ?? (
              <Button size="sm">
                <Plus />
                Nuevo presupuesto
              </Button>
            )
          }
        />
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{budget ? "Editar presupuesto" : "Nuevo presupuesto"}</DialogTitle>
        </DialogHeader>
        <form action={action} className="flex flex-col gap-4">
          {budget && <input type="hidden" name="id" value={budget.id} />}

          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Nombre</Label>
            <Input
              id="name"
              name="name"
              defaultValue={budget?.name}
              placeholder="Presupuesto de octubre"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="method">Método</Label>
              <Select
                name="method"
                value={method}
                onValueChange={(v) => setMethod(v as BudgetMethod)}
                items={BUDGET_METHODS.map(({ value, label }) => ({ value, label }))}
              >
                <SelectTrigger id="method" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BUDGET_METHODS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="period">Periodo</Label>
              <Select
                name="period"
                value={period}
                onValueChange={(v) => setPeriod(v as BudgetPeriod)}
                items={BUDGET_PERIODS.map(({ value, label }) => ({ value, label }))}
              >
                <SelectTrigger id="period" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BUDGET_PERIODS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="start_date">Fecha de inicio</Label>
              <Input
                id="start_date"
                name="start_date"
                type="date"
                defaultValue={budget?.start_date ?? todayDateStr()}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="total_income">Ingreso total (€)</Label>
              <Input
                id="total_income"
                name="total_income"
                type="number"
                step="0.01"
                min="0"
                defaultValue={budget?.total_income}
                placeholder="2000"
                required
              />
            </div>
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
