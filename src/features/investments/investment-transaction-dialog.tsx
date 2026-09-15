"use client";

import { useEffect, useId, useState, type ReactElement } from "react";
import { useActionState } from "react";
import { Plus } from "lucide-react";
import { upsertInvestmentTransaction, type InvestmentTxFormState } from "./actions";
import { INVESTMENT_TX_TYPES, type Holding, type InvestmentTransaction, type InvestmentTxType } from "./types";
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

type InvestmentTransactionDialogProps = {
  transaction?: InvestmentTransaction;
  holdings: Holding[];
  defaultHoldingId?: string;
  trigger?: ReactElement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

const TYPES_WITH_QUANTITY = new Set<InvestmentTxType>(["buy", "sell"]);

export function InvestmentTransactionDialog({
  transaction,
  holdings,
  defaultHoldingId,
  trigger,
  open,
  onOpenChange,
}: InvestmentTransactionDialogProps) {
  const id = useId();
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = open !== undefined;
  const dialogOpen = isControlled ? open : internalOpen;
  const setDialogOpen = isControlled ? onOpenChange! : setInternalOpen;

  const [type, setType] = useState<InvestmentTxType>(transaction?.type ?? "buy");
  const [quantity, setQuantity] = useState(transaction?.quantity ?? "");
  const [pricePerUnit, setPricePerUnit] = useState(transaction?.price_per_unit ?? "");
  const [amount, setAmount] = useState(transaction ? String(Math.abs(Number(transaction.amount))) : "");

  const [state, action, pending] = useActionState<InvestmentTxFormState, FormData>(
    upsertInvestmentTransaction,
    undefined,
  );

  useEffect(() => {
    if (state?.success) setDialogOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const showQuantityFields = TYPES_WITH_QUANTITY.has(type);

  function updateQuantity(value: string) {
    setQuantity(value);
    if (value && pricePerUnit) {
      setAmount(String(Number(value) * Number(pricePerUnit)));
    }
  }

  function updatePricePerUnit(value: string) {
    setPricePerUnit(value);
    if (quantity && value) {
      setAmount(String(Number(quantity) * Number(value)));
    }
  }

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      {!isControlled && (
        <DialogTrigger
          render={
            trigger ?? (
              <Button size="sm">
                <Plus />
                Nuevo movimiento
              </Button>
            )
          }
        />
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{transaction ? "Editar movimiento" : "Nuevo movimiento"}</DialogTitle>
        </DialogHeader>
        <form action={action} className="flex flex-col gap-4">
          {transaction && <input type="hidden" name="id" value={transaction.id} />}

          <div className="flex flex-col gap-2">
            <Label htmlFor={`${id}-holding_id`}>Posición</Label>
            <Select
              name="holding_id"
              defaultValue={transaction?.holding_id ?? defaultHoldingId ?? holdings[0]?.id ?? ""}
              items={holdings.map((h) => ({ value: h.id, label: h.ticker ?? h.isin ?? h.id }))}
            >
              <SelectTrigger id={`${id}-holding_id`} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {holdings.map((h) => (
                  <SelectItem key={h.id} value={h.id}>
                    {h.ticker ?? h.isin ?? h.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor={`${id}-type`}>Tipo</Label>
              <Select
                name="type"
                value={type}
                onValueChange={(v) => setType(v as InvestmentTxType)}
                items={INVESTMENT_TX_TYPES.map(({ value, label }) => ({ value, label }))}
              >
                <SelectTrigger id={`${id}-type`} className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INVESTMENT_TX_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

          {showQuantityFields && (
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor={`${id}-quantity`}>Cantidad</Label>
                <Input
                  id={`${id}-quantity`}
                  name="quantity"
                  type="number"
                  step="0.00000001"
                  min="0"
                  value={quantity}
                  onChange={(e) => updateQuantity(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor={`${id}-price_per_unit`}>Precio por unidad</Label>
                <Input
                  id={`${id}-price_per_unit`}
                  name="price_per_unit"
                  type="number"
                  step="0.000001"
                  min="0"
                  value={pricePerUnit}
                  onChange={(e) => updatePricePerUnit(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor={`${id}-amount`}>Importe (sin signo)</Label>
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
              <Label htmlFor={`${id}-fee`}>Comisión (opcional)</Label>
              <Input
                id={`${id}-fee`}
                name="fee"
                type="number"
                step="0.01"
                min="0"
                defaultValue={transaction?.fee ?? ""}
                placeholder="0"
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
