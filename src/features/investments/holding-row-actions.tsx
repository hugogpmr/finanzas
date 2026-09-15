"use client";

import { useState, useTransition } from "react";
import { MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { deleteHolding } from "./actions";
import { HoldingDialog } from "./holding-dialog";
import type { Holding } from "./types";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function HoldingRowActions({
  holding,
  accounts,
}: {
  holding: Holding;
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
              if (confirm("¿Eliminar esta posición y todo su historial de movimientos?")) {
                startTransition(async () => {
                  const result = await deleteHolding(holding.id);
                  if (result?.error) toast.error(result.error);
                });
              }
            }}
          >
            Eliminar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <HoldingDialog holding={holding} accounts={accounts} open={editOpen} onOpenChange={setEditOpen} />
    </>
  );
}
