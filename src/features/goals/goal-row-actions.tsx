"use client";

import { useState, useTransition } from "react";
import { MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { deleteGoal } from "./actions";
import { GoalDialog } from "./goal-dialog";
import type { Goal } from "./types";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function GoalRowActions({
  goal,
  accounts,
}: {
  goal: Goal;
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
              if (confirm("¿Eliminar este objetivo?")) {
                startTransition(async () => {
                  const result = await deleteGoal(goal.id);
                  if (result?.error) toast.error(result.error);
                });
              }
            }}
          >
            Eliminar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <GoalDialog goal={goal} accounts={accounts} open={editOpen} onOpenChange={setEditOpen} />
    </>
  );
}
