"use client";

import { useEffect, useState, type ReactElement } from "react";
import { useActionState } from "react";
import { Plus } from "lucide-react";
import { upsertHolding, type HoldingFormState } from "./actions";
import { ASSET_CLASSES, type AssetClass, type Holding } from "./types";
import { CURRENCIES } from "@/features/accounts/types";
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

type HoldingDialogProps = {
  holding?: Holding;
  accounts: AccountOption[];
  trigger?: ReactElement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function HoldingDialog({ holding, accounts, trigger, open, onOpenChange }: HoldingDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = open !== undefined;
  const dialogOpen = isControlled ? open : internalOpen;
  const setDialogOpen = isControlled ? onOpenChange! : setInternalOpen;

  const [assetClass, setAssetClass] = useState<AssetClass>(holding?.asset_class ?? "etf");

  const [state, action, pending] = useActionState<HoldingFormState, FormData>(
    upsertHolding,
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
                Nueva posición
              </Button>
            )
          }
        />
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{holding ? "Editar posición" : "Nueva posición"}</DialogTitle>
        </DialogHeader>
        <form action={action} className="flex flex-col gap-4">
          {holding && <input type="hidden" name="id" value={holding.id} />}

          <div className="flex flex-col gap-2">
            <Label htmlFor="account_id">Cuenta</Label>
            <Select
              name="account_id"
              defaultValue={holding?.account_id ?? accounts[0]?.id ?? ""}
              items={accounts.map((a) => ({ value: a.id, label: `${a.name} (${a.currency})` }))}
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

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="ticker">Ticker</Label>
              <Input
                id="ticker"
                name="ticker"
                defaultValue={holding?.ticker ?? ""}
                placeholder="VWCE, AAPL..."
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="isin">ISIN (opcional)</Label>
              <Input
                id="isin"
                name="isin"
                defaultValue={holding?.isin ?? ""}
                placeholder="IE00BK5BQT80"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="asset_class">Clase de activo</Label>
            <Select
              name="asset_class"
              value={assetClass}
              onValueChange={(v) => setAssetClass(v as AssetClass)}
              items={ASSET_CLASSES.map(({ value, label }) => ({ value, label }))}
            >
              <SelectTrigger id="asset_class" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ASSET_CLASSES.map((a) => (
                  <SelectItem key={a.value} value={a.value}>
                    {a.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="sector">Sector (opcional)</Label>
              <Input
                id="sector"
                name="sector"
                defaultValue={holding?.sector ?? ""}
                placeholder="Tecnología, Global..."
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="geography">Geografía (opcional)</Label>
              <Input
                id="geography"
                name="geography"
                defaultValue={holding?.geography ?? ""}
                placeholder="EE.UU., Global, Europa..."
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="quantity">Cantidad</Label>
              <Input
                id="quantity"
                name="quantity"
                type="number"
                step="0.00000001"
                min="0"
                defaultValue={holding?.quantity ?? "0"}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="currency">Divisa</Label>
              <Select name="currency" defaultValue={holding?.currency ?? "EUR"}>
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
            <Label htmlFor="current_price">Precio actual (opcional)</Label>
            <Input
              id="current_price"
              name="current_price"
              type="number"
              step="0.000001"
              min="0"
              defaultValue={holding?.current_price ?? ""}
              placeholder="Se puede rellenar solo con “Actualizar precios”"
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
