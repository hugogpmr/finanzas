"use client";

import { useEffect, useId, useState, type ReactElement } from "react";
import { useActionState } from "react";
import { Plus } from "lucide-react";
import { upsertDebt, type DebtFormState } from "./actions";
import { DEBT_TYPES, type Debt, type DebtType } from "./types";
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

type DebtDialogProps = {
  debt?: Debt;
  accounts: AccountOption[];
  trigger?: ReactElement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function DebtDialog({ debt, accounts, trigger, open, onOpenChange }: DebtDialogProps) {
  const id = useId();
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = open !== undefined;
  const dialogOpen = isControlled ? open : internalOpen;
  const setDialogOpen = isControlled ? onOpenChange! : setInternalOpen;

  const [debtType, setDebtType] = useState<DebtType>(debt?.debt_type ?? "credit_card");

  const [state, action, pending] = useActionState<DebtFormState, FormData>(upsertDebt, undefined);

  useEffect(() => {
    if (state?.success) setDialogOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const accountOptions = [
    { value: "", label: "Ninguna" },
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
                Nueva deuda
              </Button>
            )
          }
        />
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{debt ? "Editar deuda" : "Nueva deuda"}</DialogTitle>
        </DialogHeader>
        <form action={action} className="flex flex-col gap-4">
          {debt && <input type="hidden" name="id" value={debt.id} />}

          <div className="flex flex-col gap-2">
            <Label htmlFor={`${id}-name`}>Nombre</Label>
            <Input
              id={`${id}-name`}
              name="name"
              defaultValue={debt?.name}
              placeholder="Tarjeta Visa, préstamo del coche..."
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor={`${id}-debt_type`}>Tipo</Label>
            <Select
              name="debt_type"
              value={debtType}
              onValueChange={(v) => setDebtType(v as DebtType)}
              items={DEBT_TYPES.map(({ value, label }) => ({ value, label }))}
            >
              <SelectTrigger id={`${id}-debt_type`} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DEBT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor={`${id}-principal`}>Saldo pendiente (€)</Label>
              <Input
                id={`${id}-principal`}
                name="principal"
                type="number"
                step="0.01"
                min="0"
                defaultValue={debt?.principal}
                placeholder="1500"
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor={`${id}-original_principal`}>Principal original (€, opcional)</Label>
              <Input
                id={`${id}-original_principal`}
                name="original_principal"
                type="number"
                step="0.01"
                min="0"
                defaultValue={debt?.original_principal}
                placeholder="Igual al pendiente si se deja en blanco"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor={`${id}-interest_rate`}>TIN anual (%)</Label>
              <Input
                id={`${id}-interest_rate`}
                name="interest_rate"
                type="number"
                step="0.01"
                min="0"
                max="100"
                defaultValue={debt?.interest_rate}
                placeholder="19.5"
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor={`${id}-apr`}>TAE (%, opcional)</Label>
              <Input
                id={`${id}-apr`}
                name="apr"
                type="number"
                step="0.01"
                min="0"
                max="100"
                defaultValue={debt?.apr ?? ""}
                placeholder="21.3"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor={`${id}-minimum_payment`}>Cuota mínima (€/mes)</Label>
              <Input
                id={`${id}-minimum_payment`}
                name="minimum_payment"
                type="number"
                step="0.01"
                min="0"
                defaultValue={debt?.minimum_payment}
                placeholder="50"
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor={`${id}-term_months`}>Plazo restante (meses, opcional)</Label>
              <Input
                id={`${id}-term_months`}
                name="term_months"
                type="number"
                step="1"
                min="1"
                defaultValue={debt?.term_months ?? ""}
                placeholder="36"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor={`${id}-start_date`}>Fecha de inicio</Label>
              <Input
                id={`${id}-start_date`}
                name="start_date"
                type="date"
                defaultValue={debt?.start_date ?? todayDateStr()}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor={`${id}-payment_day`}>Día de pago (1-31)</Label>
              <Input
                id={`${id}-payment_day`}
                name="payment_day"
                type="number"
                step="1"
                min="1"
                max="31"
                defaultValue={debt?.payment_day ?? 1}
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor={`${id}-account_id`}>Cuenta relacionada (opcional)</Label>
            <Select name="account_id" defaultValue={debt?.account_id ?? ""} items={accountOptions}>
              <SelectTrigger id={`${id}-account_id`} className="w-full">
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
