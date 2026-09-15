"use client";

import { useState, useTransition } from "react";
import { MoreHorizontal } from "lucide-react";
import { deleteCategory } from "./actions";
import { CategoryDialog } from "./category-dialog";
import type { Category } from "./types";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function CategoryRowActions({
  category,
  allCategories,
}: {
  category: Category;
  allCategories: Category[];
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
              if (
                confirm(
                  `¿Eliminar la categoría "${category.name}"? Las transacciones y subcategorías asociadas quedarán sin categorizar.`,
                )
              ) {
                startTransition(() => deleteCategory(category.id));
              }
            }}
          >
            Eliminar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CategoryDialog
        category={category}
        allCategories={allCategories}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </>
  );
}
