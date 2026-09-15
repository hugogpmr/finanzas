"use client";

import { useState, useTransition } from "react";
import { MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { deleteBudgetLine } from "./actions";
import { BudgetLineDialog } from "./budget-line-dialog";
import type { BudgetLine } from "./types";
import type { Category } from "@/features/categories/types";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function BudgetLineRowActions({
  budgetId,
  line,
  categories,
}: {
  budgetId: string;
  line: BudgetLine;
  categories: Category[];
}) {
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
          <DropdownMenuItem onClick={() => setEditOpen(true)}>Editar</DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            disabled={isPending}
            onClick={() => {
              if (confirm("¿Eliminar esta línea del presupuesto?")) {
                startTransition(async () => {
                  const result = await deleteBudgetLine(line.id);
                  if (result?.error) toast.error(result.error);
                });
              }
            }}
          >
            Eliminar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <BudgetLineDialog
        budgetId={budgetId}
        line={line}
        categories={categories}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </>
  );
}
