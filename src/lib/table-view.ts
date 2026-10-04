/**
 * Per-user table view state: column order (and later labels / visibility).
 * Persisted server-side per (user, table_key) in public.table_view_prefs.
 */

export type TableViewPrefs = {
  /** Column keys in display order. Missing keys fall back to declaration order. */
  order?: string[];
  /** Display-label overrides keyed by column key. */
  labels?: Record<string, string>;
  /** Column keys the user has hidden. */
  hidden?: string[];
};

/** Minimal shape a column must satisfy to participate in reordering. */
export type TableColumn = {
  key: string;
  label: string;
};

export type DropSide = "before" | "after";

export function defaultOrder(columns: { key: string }[]): string[] {
  return columns.map((c) => c.key);
}

/**
 * Merge a saved order over the declared columns: drop keys that no longer
 * exist, append columns added since the order was saved, keep the rest.
 */
export function resolveOrder(columns: { key: string }[], saved: string[] | undefined): string[] {
  const keys = defaultOrder(columns);
  if (!saved?.length) return keys;

  const known = new Set(keys);
  const kept = saved.filter((key) => known.has(key));
  const seen = new Set(kept);
  return [...kept, ...keys.filter((key) => !seen.has(key))];
}

export function isDefaultOrder(order: string[], columns: { key: string }[]): boolean {
  const keys = defaultOrder(columns);
  return order.length === keys.length && order.every((key, i) => key === keys[i]);
}

/** Move `fromKey` so that it lands immediately before/after `toKey`. */
export function moveColumnKey(
  order: string[],
  fromKey: string,
  toKey: string,
  side: DropSide
): string[] {
  if (fromKey === toKey) return order;

  const next = order.filter((key) => key !== fromKey);
  const target = next.indexOf(toKey);
  if (target === -1) return order;

  next.splice(side === "after" ? target + 1 : target, 0, fromKey);
  return next;
}

/**
 * Rewrite the visible slots of `order` to match `nextVisible`, leaving hidden
 * keys at their current index. Lets a column keep its place while hidden.
 */
export function applyVisibleOrder(
  order: string[],
  hidden: string[],
  nextVisible: string[]
): string[] {
  const hiddenSet = new Set(hidden);
  let cursor = 0;
  return order.map((key) => (hiddenSet.has(key) ? key : nextVisible[cursor++]));
}