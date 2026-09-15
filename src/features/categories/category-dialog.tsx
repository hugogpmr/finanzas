"use client";

import { useEffect, useId, useState, type ReactElement } from "react";
import { useActionState } from "react";
import { Plus } from "lucide-react";
import { upsertCategory, type CategoryFormState } from "./actions";
import {
  CATEGORY_TYPES,
  NEEDS_WANTS_SAVINGS,
  type Category,
  type CategoryType,
} from "./types";
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

type CategoryDialogProps = {
  category?: Category;
  allCategories: Category[];
  trigger?: ReactElement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function CategoryDialog({
  category,
  allCategories,
  trigger,
  open,
  onOpenChange,
}: CategoryDialogProps) {
  const id = useId();
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = open !== undefined;
  const dialogOpen = isControlled ? open : internalOpen;
  const setDialogOpen = isControlled ? onOpenChange! : setInternalOpen;

  const [type, setType] = useState<CategoryType>(category?.type ?? "expense");

  const [state, action, pending] = useActionState<CategoryFormState, FormData>(
    upsertCategory,
    undefined,
  );

  useEffect(() => {
    if (state?.success) setDialogOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  // Solo categorías raíz del mismo tipo pueden ser padre (jerarquía a 2 niveles,
  // y no permitimos elegirse a sí misma como su propio padre).
  const parentOptions = allCategories.filter(
    (c) => c.type === type && c.parent_id === null && c.id !== category?.id,
  );

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      {!isControlled && (
        <DialogTrigger
          render={
            trigger ?? (
              <Button size="sm">
                <Plus />
                Nueva categoría
              </Button>
            )
          }
        />
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{category ? "Editar categoría" : "Nueva categoría"}</DialogTitle>
        </DialogHeader>
        <form action={action} className="flex flex-col gap-4">
          {category && <input type="hidden" name="id" value={category.id} />}

          <div className="flex flex-col gap-2">
            <Label htmlFor={`${id}-name`}>Nombre</Label>
            <Input
              id={`${id}-name`}
              name="name"
              defaultValue={category?.name}
              placeholder="Ocio, Transporte..."
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor={`${id}-type`}>Tipo</Label>
            <Select
              name="type"
              value={type}
              onValueChange={(v) => setType(v as CategoryType)}
              items={CATEGORY_TYPES.map(({ value, label }) => ({ value, label }))}
            >
              <SelectTrigger id={`${id}-type`} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor={`${id}-parent_id`}>Categoría padre (opcional)</Label>
            <Select
              name="parent_id"
              defaultValue={category?.parent_id ?? ""}
              items={[
                { value: "", label: "Ninguna (categoría principal)" },
                ...parentOptions.map((p) => ({ value: p.id, label: p.name })),
              ]}
            >
              <SelectTrigger id={`${id}-parent_id`} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Ninguna (categoría principal)</SelectItem>
                {parentOptions.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor={`${id}-needs_wants_savings`}>Regla 50/30/20 (opcional)</Label>
            <Select
              name="needs_wants_savings"
              defaultValue={category?.needs_wants_savings ?? ""}
              items={[
                { value: "", label: "Sin asignar" },
                ...NEEDS_WANTS_SAVINGS.map(({ value, label }) => ({ value, label })),
              ]}
            >
              <SelectTrigger id={`${id}-needs_wants_savings`} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Sin asignar</SelectItem>
                {NEEDS_WANTS_SAVINGS.map((n) => (
                  <SelectItem key={n.value} value={n.value}>
                    {n.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="is_fixed"
              value="true"
              defaultChecked={category?.is_fixed ?? false}
              className="size-4 rounded border-input"
            />
            Gasto fijo (alquiler, suscripciones, seguros...)
          </label>

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
