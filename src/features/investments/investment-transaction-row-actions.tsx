"use client";

import { useState, useTransition } from "react";
import { MoreHorizontal } from "lucide-react";
import { deleteInvestmentTransaction } from "./actions";
import { InvestmentTransactionDialog } from "./investment-transaction-dialog";
import type { Holding, InvestmentTransaction } from "./types";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function InvestmentTransactionRowActions({
  transaction,
  holdings,
}: {
  transaction: InvestmentTransaction;
  holdings: Holding[];
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
              if (confirm("¿Eliminar este movimiento?")) {
                startTransition(() => deleteInvestmentTransaction(transaction.id));
              }
            }}
          >
            Eliminar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <InvestmentTransactionDialog
        transaction={transaction}
        holdings={holdings}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </>
  );
}
