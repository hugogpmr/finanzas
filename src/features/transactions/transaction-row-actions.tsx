"use client";

import { useState, useTransition } from "react";
import { MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { deleteTransaction } from "./actions";
import { TransactionDialog } from "./transaction-dialog";
import type { Transaction } from "./types";
import type { Category } from "@/features/categories/types";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function TransactionRowActions({
  transaction,
  accounts,
  categories,
}: {
  transaction: Transaction;
  accounts: { id: string; name: string; currency: string }[];
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
              if (confirm("¿Eliminar esta transacción? Esta acción no se puede deshacer.")) {
                startTransition(async () => {
                  const result = await deleteTransaction(transaction.id);
                  if (result?.error) toast.error(result.error);
                });
              }
            }}
          >
            Eliminar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <TransactionDialog
        transaction={transaction}
        accounts={accounts}
        categories={categories}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </>
  );
}
