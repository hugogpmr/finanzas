export const MATCH_TYPES = [
  { value: "merchant_contains", label: "El comercio contiene..." },
  { value: "description_regex", label: "La descripción coincide con (regex)" },
] as const;

export type MatchType = (typeof MATCH_TYPES)[number]["value"];

export function matchTypeLabel(type: string) {
  return MATCH_TYPES.find((m) => m.value === type)?.label ?? type;
}

export type CategorizationRule = {
  id: string;
  user_id: string;
  match_type: MatchType;
  pattern: string;
  category_id: string;
  priority: number;
  category?: { name: string } | null;
};
