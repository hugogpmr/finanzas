"use client";

import { useEffect, useState, type ReactElement } from "react";
import { useActionState } from "react";
import { Plus } from "lucide-react";
import { upsertAccount, type AccountFormState } from "./actions";
import { ACCOUNT_TYPES, CURRENCIES, type Account } from "./types";
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

type AccountDialogProps = {
  account?: Account;
  /** Modo no controlado (por defecto): botón propio que abre el diálogo. */
  trigger?: ReactElement;
  /** Modo controlado: se omite el trigger y se gestiona open/onOpenChange desde fuera. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function AccountDialog({ account, trigger, open, onOpenChange }: AccountDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = open !== undefined;
  const dialogOpen = isControlled ? open : internalOpen;
  const setDialogOpen = isControlled ? onOpenChange! : setInternalOpen;

  const [state, action, pending] = useActionState<AccountFormState, FormData>(
    upsertAccount,
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
                Nueva cuenta
              </Button>
            )
          }
        />
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{account ? "Editar cuenta" : "Nueva cuenta"}</DialogTitle>
        </DialogHeader>
        <form action={action} className="flex flex-col gap-4">
          {account && <input type="hidden" name="id" value={account.id} />}

          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Nombre</Label>
            <Input
              id="name"
              name="name"
              defaultValue={account?.name}
              placeholder="Cuenta corriente Santander"
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="type">Tipo</Label>
            <Select
              name="type"
              defaultValue={account?.type ?? "checking"}
              items={ACCOUNT_TYPES.map(({ value, label }) => ({ value, label }))}
            >
              <SelectTrigger id="type" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACCOUNT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="current_balance">Saldo actual</Label>
              <Input
                id="current_balance"
                name="current_balance"
                type="number"
                step="0.01"
                defaultValue={account?.current_balance ?? "0"}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="currency">Divisa</Label>
              <Select name="currency" defaultValue={account?.currency ?? "EUR"}>
                <SelectTrigger id="currency" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="institution">Entidad (opcional)</Label>
            <Input
              id="institution"
              name="institution"
              defaultValue={account?.institution ?? ""}
              placeholder="Santander, Trade Republic..."
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
