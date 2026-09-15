"use client";

import { useState, useTransition } from "react";
import { MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { deleteDebt } from "./actions";
import { DebtDialog } from "./debt-dialog";
import type { Debt } from "./types";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function DebtRowActions({
  debt,
  accounts,
}: {
  debt: Debt;
  accounts: { id: string; name: string; currency: string }[];
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
              if (confirm("¿Eliminar esta deuda?")) {
                startTransition(async () => {
                  const result = await deleteDebt(debt.id);
                  if (result?.error) toast.error(result.error);
                });
              }
            }}
          >
            Eliminar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DebtDialog debt={debt} accounts={accounts} open={editOpen} onOpenChange={setEditOpen} />
    </>
  );
}
