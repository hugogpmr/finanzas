"use client";

import { useState, useTransition } from "react";
import { MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { deleteBudget, setActiveBudget } from "./actions";
import { BudgetDialog } from "./budget-dialog";
import type { Budget } from "./types";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function BudgetRowActions({ budget }: { budget: Budget }) {
  const [editOpen, setEditOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon-sm">
              <MoreHorizontal />
              <span className="sr-only">Acciones</span>
            </Button>
          }
        />
        <DropdownMenuContent align="end">
          {!budget.is_active && (
            <DropdownMenuItem
              disabled={isPending}
              onClick={() => startTransition(() => setActiveBudget(budget.id))}
            >
              Marcar como activo
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={() => setEditOpen(true)}>Editar</DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            disabled={isPending}
            onClick={() => {
              if (confirm("¿Eliminar este presupuesto y todas sus líneas?")) {
                startTransition(async () => {
                  const result = await deleteBudget(budget.id);
                  if (result?.error) toast.error(result.error);
                });
              }
            }}
          >
            Eliminar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <BudgetDialog budget={budget} open={editOpen} onOpenChange={setEditOpen} />
    </>
  );
}
