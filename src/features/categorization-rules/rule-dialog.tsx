"use client";

import { useEffect, useId, useState, type ReactElement } from "react";
import { useActionState } from "react";
import { Plus } from "lucide-react";
import { upsertRule, type RuleFormState } from "./actions";
import { MATCH_TYPES, type CategorizationRule, type MatchType } from "./types";
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

type RuleDialogProps = {
  rule?: CategorizationRule;
  categories: Category[];
  trigger?: ReactElement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function RuleDialog({ rule, categories, trigger, open, onOpenChange }: RuleDialogProps) {
  const id = useId();
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = open !== undefined;
  const dialogOpen = isControlled ? open : internalOpen;
  const setDialogOpen = isControlled ? onOpenChange! : setInternalOpen;

  const [matchType, setMatchType] = useState<MatchType>(rule?.match_type ?? "merchant_contains");

  const [state, action, pending] = useActionState<RuleFormState, FormData>(upsertRule, undefined);

  useEffect(() => {
    if (state?.success) setDialogOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const categoryOptions = sortCategoriesByHierarchy(categories).map((c) => ({
    value: c.id,
    label: c.parent_id ? `— ${c.name}` : c.name,
  }));

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      {!isControlled && (
        <DialogTrigger
          render={
            trigger ?? (
              <Button size="sm">
                <Plus />
                Nueva regla
              </Button>
            )
          }
        />
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{rule ? "Editar regla" : "Nueva regla de auto-categorización"}</DialogTitle>
        </DialogHeader>
        <form action={action} className="flex flex-col gap-4">
          {rule && <input type="hidden" name="id" value={rule.id} />}

          <div className="flex flex-col gap-2">
            <Label htmlFor={`${id}-match_type`}>Condición</Label>
            <Select
              name="match_type"
              value={matchType}
              onValueChange={(v) => setMatchType(v as MatchType)}
              items={MATCH_TYPES.map(({ value, label }) => ({ value, label }))}
            >
              <SelectTrigger id={`${id}-match_type`} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MATCH_TYPES.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor={`${id}-pattern`}>
              {matchType === "merchant_contains" ? "Texto a buscar" : "Expresión regular"}
            </Label>
            <Input
              id={`${id}-pattern`}
              name="pattern"
              defaultValue={rule?.pattern}
              placeholder={matchType === "merchant_contains" ? "mercadona" : "^uber.*eats$"}
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor={`${id}-category_id`}>Categoría a asignar</Label>
            <Select
              name="category_id"
              defaultValue={rule?.category_id}
              items={categoryOptions}
            >
              <SelectTrigger id={`${id}-category_id`} className="w-full">
                <SelectValue />
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

          <div className="flex flex-col gap-2">
            <Label htmlFor={`${id}-priority`}>Prioridad (mayor número = se aplica antes)</Label>
            <Input
              id={`${id}-priority`}
              name="priority"
              type="number"
              step="1"
              defaultValue={rule?.priority ?? 0}
              required
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
