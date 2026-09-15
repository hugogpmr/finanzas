export const CATEGORY_TYPES = [
  { value: "income", label: "Ingreso" },
  { value: "expense", label: "Gasto" },
] as const;

export type CategoryType = (typeof CATEGORY_TYPES)[number]["value"];

export const CATEGORY_TYPE_VALUES = CATEGORY_TYPES.map((t) => t.value);

export function categoryTypeLabel(type: string) {
  return CATEGORY_TYPES.find((t) => t.value === type)?.label ?? type;
}

export const NEEDS_WANTS_SAVINGS = [
  { value: "needs", label: "Necesidad" },
  { value: "wants", label: "Deseo" },
  { value: "savings", label: "Ahorro" },
] as const;

export function needsWantsSavingsLabel(value: string | null) {
  if (!value) return "—";
  return NEEDS_WANTS_SAVINGS.find((n) => n.value === value)?.label ?? value;
}

export type Category = {
  id: string;
  user_id: string;
  name: string;
  parent_id: string | null;
  type: CategoryType;
  is_fixed: boolean;
  needs_wants_savings: "needs" | "wants" | "savings" | null;
  icon: string | null;
  color: string | null;
  created_at: string;
};

// Semilla inicial para que un usuario nuevo no vea las páginas de categorías/
// transacciones vacías. Solo se inserta si el usuario todavía no tiene ninguna.
export const DEFAULT_CATEGORIES: {
  name: string;
  type: CategoryType;
  needsWantsSavings?: "needs" | "wants" | "savings";
  children?: string[];
}[] = [
  { name: "Nómina", type: "income" },
  { name: "Otros ingresos", type: "income" },
  {
    name: "Vivienda",
    type: "expense",
    needsWantsSavings: "needs",
    children: ["Alquiler o hipoteca", "Suministros"],
  },
  {
    name: "Alimentación",
    type: "expense",
    needsWantsSavings: "needs",
    children: ["Supermercado", "Restaurantes"],
  },
  { name: "Transporte", type: "expense", needsWantsSavings: "needs" },
  { name: "Salud", type: "expense", needsWantsSavings: "needs" },
  { name: "Ocio", type: "expense", needsWantsSavings: "wants" },
  { name: "Compras", type: "expense", needsWantsSavings: "wants" },
  { name: "Suscripciones", type: "expense", needsWantsSavings: "wants" },
  { name: "Ahorro e inversión", type: "expense", needsWantsSavings: "savings" },
  { name: "Otros gastos", type: "expense" },
];

// Ordena las categorías con cada hija justo debajo de su padre, para pintar
// jerarquía con una simple indentación en listas/selects planos.
export function sortCategoriesByHierarchy(categories: Category[]): Category[] {
  const byParent = new Map<string | null, Category[]>();
  for (const c of categories) {
    const key = c.parent_id;
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key)!.push(c);
  }

  const result: Category[] = [];
  function addChildren(parentId: string | null) {
    const children = byParent.get(parentId) ?? [];
    for (const child of children) {
      result.push(child);
      addChildren(child.id);
    }
  }
  addChildren(null);
  return result;
}
