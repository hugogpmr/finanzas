"use client";

import { useEffect, useState, type ReactElement } from "react";
import { useActionState } from "react";
import { Plus } from "lucide-react";
import { upsertGoal, type GoalFormState } from "./actions";
import { GOAL_TYPES, type Goal, type GoalType } from "./types";
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

type GoalDialogProps = {
  goal?: Goal;
  accounts: AccountOption[];
  trigger?: ReactElement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  // Solo se usan al crear (sin `goal`), p.ej. desde la plantilla de fondo de
  // emergencia de la página para pre-rellenar el formulario.
  initialValues?: {
    name?: string;
    type?: GoalType;
    targetAmount?: number;
    monthsOfExpenses?: number;
  };
};

export function GoalDialog({
  goal,
  accounts,
  trigger,
  open,
  onOpenChange,
  initialValues,
}: GoalDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = open !== undefined;
  const dialogOpen = isControlled ? open : internalOpen;
  const setDialogOpen = isControlled ? onOpenChange! : setInternalOpen;

  const [type, setType] = useState<GoalType>(goal?.type ?? initialValues?.type ?? "savings_goal");
  const [linkedAccountId, setLinkedAccountId] = useState(goal?.linked_account_id ?? "");

  const [state, action, pending] = useActionState<GoalFormState, FormData>(upsertGoal, undefined);

  useEffect(() => {
    if (state?.success) setDialogOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const accountOptions = [
    { value: "", label: "Ninguna (importe manual)" },
    ...accounts.map((a) => ({ value: a.id, label: `${a.name} (${a.currency})` })),
  ];

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      {!isControlled && (
        <DialogTrigger
          render={
            trigger ?? (
              <Button size="sm">
                <Plus />
                Nuevo objetivo
              </Button>
            )
          }
        />
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{goal ? "Editar objetivo" : "Nuevo objetivo de ahorro"}</DialogTitle>
        </DialogHeader>
        <form action={action} className="flex flex-col gap-4">
          {goal && <input type="hidden" name="id" value={goal.id} />}

          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Nombre</Label>
            <Input
              id="name"
              name="name"
              defaultValue={goal?.name ?? initialValues?.name}
              placeholder="Fondo de emergencia, vacaciones, coche..."
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="type">Tipo</Label>
            <Select
              name="type"
              value={type}
              onValueChange={(v) => setType(v as GoalType)}
              items={GOAL_TYPES.map(({ value, label }) => ({ value, label }))}
            >
              <SelectTrigger id="type" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GOAL_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="target_amount">Importe objetivo (€)</Label>
              <Input
                id="target_amount"
                name="target_amount"
                type="number"
                step="0.01"
                min="0"
                defaultValue={goal?.target_amount ?? initialValues?.targetAmount}
                placeholder="6000"
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="target_date">Fecha objetivo (opcional)</Label>
              <Input
                id="target_date"
                name="target_date"
                type="date"
                defaultValue={goal?.target_date ?? ""}
                min={todayDateStr()}
              />
            </div>
          </div>

          {type === "emergency_fund" && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="months_of_expenses">Meses de gasto que quieres cubrir</Label>
              <Input
                id="months_of_expenses"
                name="months_of_expenses"
                type="number"
                step="1"
                min="1"
                defaultValue={goal?.months_of_expenses ?? initialValues?.monthsOfExpenses}
                placeholder="6"
              />
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="linked_account_id">Cuenta enlazada (opcional)</Label>
            <Select
              name="linked_account_id"
              value={linkedAccountId}
              onValueChange={(v) => setLinkedAccountId(v ?? "")}
              items={accountOptions}
            >
              <SelectTrigger id="linked_account_id" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {accountOptions.map((a) => (
                  <SelectItem key={a.value || "none"} value={a.value}>
                    {a.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {linkedAccountId ? (
            <p className="text-xs text-muted-foreground">
              El importe actual se toma del saldo de esa cuenta, no hace falta que lo actualices
              a mano.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              <Label htmlFor="current_amount">Importe actual (€)</Label>
              <Input
                id="current_amount"
                name="current_amount"
                type="number"
                step="0.01"
                min="0"
                defaultValue={goal?.current_amount ?? "0"}
              />
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="monthly_contribution">Aportación mensual prevista (€, opcional)</Label>
            <Input
              id="monthly_contribution"
              name="monthly_contribution"
              type="number"
              step="0.01"
              min="0"
              defaultValue={goal?.monthly_contribution ?? ""}
              placeholder="200"
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
