// Models sometimes return the text "null" instead of an empty value. Treat those as "no cost".
export function cleanCost(cost: string | null | undefined): string | null {
  if (typeof cost !== "string") return null;
  const t = cost.trim();
  return !t || /^(null|none|undefined|n\/a|-)$/i.test(t) ? null : t;
}

export function costLabel(cost: string | null | undefined): string {
  return cleanCost(cost) ?? "No fees found in the docs";
}
