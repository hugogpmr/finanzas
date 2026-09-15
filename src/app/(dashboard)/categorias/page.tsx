import { createClient } from "@/lib/supabase/server";
import { ensureDefaultCategories } from "@/features/categories/actions";
import {
  categoryTypeLabel,
  needsWantsSavingsLabel,
  sortCategoriesByHierarchy,
  type Category,
} from "@/features/categories/types";
import { CategoryDialog } from "@/features/categories/category-dialog";
import { CategoryRowActions } from "@/features/categories/category-row-actions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function CategoriasPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    await ensureDefaultCategories(user.id);
  }

  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("name", { ascending: true });

  const categories = (data ?? []) as Category[];
  const income = sortCategoriesByHierarchy(categories.filter((c) => c.type === "income"));
  const expense = sortCategoriesByHierarchy(categories.filter((c) => c.type === "expense"));

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Categorías</h1>
          <p className="text-sm text-muted-foreground">
            Organiza tus ingresos y gastos. Puedes anidar subcategorías dentro de una
            categoría principal.
          </p>
        </div>
        <CategoryDialog allCategories={categories} />
      </div>

      {error && <p className="text-sm text-destructive">{error.message}</p>}

      <CategoryGroup
        title="Ingresos"
        categories={income}
        allCategories={categories}
        emptyText="Sin categorías de ingreso todavía."
      />
      <CategoryGroup
        title="Gastos"
        categories={expense}
        allCategories={categories}
        emptyText="Sin categorías de gasto todavía."
      />
    </div>
  );
}

function CategoryGroup({
  title,
  categories,
  allCategories,
  emptyText,
}: {
  title: string;
  categories: Category[];
  allCategories: Category[];
  emptyText: string;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
        {title}
      </h2>

      {categories.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          {emptyText}
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>50/30/20</TableHead>
              <TableHead>Fijo</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map((category) => (
              <TableRow key={category.id}>
                <TableCell className="font-medium">
                  {category.parent_id ? (
                    <span className="pl-6 text-muted-foreground">↳ {category.name}</span>
                  ) : (
                    category.name
                  )}
                </TableCell>
                <TableCell>{categoryTypeLabel(category.type)}</TableCell>
                <TableCell className="text-muted-foreground">
                  {needsWantsSavingsLabel(category.needs_wants_savings)}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {category.is_fixed ? "Sí" : "—"}
                </TableCell>
                <TableCell>
                  <CategoryRowActions category={category} allCategories={allCategories} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </section>
  );
}
