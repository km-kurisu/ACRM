export function parseFilterIds(raw: string | string[] | null | undefined): string[] {
  const value = Array.isArray(raw) ? raw.join(",") : raw ?? "";
  const seen = new Set<string>();
  for (const part of value.split(",")) {
    const id = part.trim();
    if (id) seen.add(id);
  }
  return [...seen];
}
