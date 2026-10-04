"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { getTableViewPrefs, saveTableViewPrefs } from "@/actions";
import {
  applyVisibleOrder,
  defaultOrder,
  moveColumnKey,
  resolveOrder,
  type DropSide,
  type TableViewPrefs,
} from "@/lib/table-view";

type ViewState = {
  order: string[];
  labels: Record<string, string>;
  hidden: string[];
};

export function useTableView<T extends { key: string; label: string }>(
  tableKey: string,
  columns: T[]
) {
  const keysSignature = columns.map((c) => c.key).join(" ");

  const columnsRef = useRef(columns);
  const [view, setView] = useState<ViewState>(() => ({
    order: defaultOrder(columns),
    labels: {},
    hidden: [],
  }));
  const viewRef = useRef(view);

  useEffect(() => {
    columnsRef.current = columns;
    viewRef.current = view;
  });

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        const prefs = await getTableViewPrefs(tableKey);
        if (!active) return;
        const order = resolveOrder(columnsRef.current, prefs.order);
        const known = new Set(order);
        setView({
          order,
          labels: Object.fromEntries(
            Object.entries(prefs.labels ?? {}).filter(([key]) => known.has(key))
          ),
          hidden: (prefs.hidden ?? []).filter((key) => known.has(key)),
        });
      } catch {
        // keep the declared columns
      }
    })();

    return () => {
      active = false;
    };
  }, [tableKey, keysSignature]);

  const update = useCallback(
    (next: ViewState) => {
      viewRef.current = next;
      setView(next);

      const known = new Set(next.order);
      const prefs: TableViewPrefs = {
        order: next.order,
        labels: Object.fromEntries(Object.entries(next.labels).filter(([key]) => known.has(key))),
        hidden: next.hidden.filter((key) => known.has(key)),
      };
      void saveTableViewPrefs(tableKey, prefs).catch((err) => {
        toast.error(err instanceof Error ? err.message : "Could not save column layout");
      });
    },
    [tableKey]
  );

  const moveColumn = useCallback(
    (fromKey: string, toKey: string, side: DropSide) => {
      const current = viewRef.current;
      const hidden = new Set(current.hidden);
      const visible = current.order.filter((key) => !hidden.has(key));
      const nextVisible = moveColumnKey(visible, fromKey, toKey, side);
      if (nextVisible === visible) return;
      update({ ...current, order: applyVisibleOrder(current.order, current.hidden, nextVisible) });
    },
    [update]
  );

  const toggleColumn = useCallback(
    (key: string) => {
      const current = viewRef.current;
      const isHidden = current.hidden.includes(key);
      if (!isHidden && current.order.length - current.hidden.length <= 1) return;
      update({
        ...current,
        hidden: isHidden ? current.hidden.filter((k) => k !== key) : [...current.hidden, key],
      });
    },
    [update]
  );

  const renameColumn = useCallback(
    (key: string, rawLabel: string) => {
      const label = rawLabel.trim();
      if (!label) return;

      const current = viewRef.current;
      const declared = columnsRef.current.find((c) => c.key === key);
      const labels = { ...current.labels };
      if (!declared || label === declared.label) delete labels[key];
      else labels[key] = label;
      update({ ...current, labels });
    },
    [update]
  );

  const reset = useCallback(() => {
    update({ order: defaultOrder(columnsRef.current), labels: {}, hidden: [] });
  }, [update]);

  const byKey = new Map(columns.map((c) => [c.key, c]));
  const all = view.order.flatMap((key) => {
    const column = byKey.get(key);
    return column ? [{ ...column, label: view.labels[key] ?? column.label }] : [];
  });
  const hiddenSet = new Set(view.hidden);
  const ordered = all.filter((c) => !hiddenSet.has(c.key));
  const defaults = defaultOrder(columns);

  return {
    ordered,
    all,
    hidden: view.hidden,
    moveColumn,
    toggleColumn,
    renameColumn,
    reset,
    canReset:
      view.order.some((key, i) => key !== defaults[i]) ||
      Object.keys(view.labels).length > 0 ||
      view.hidden.length > 0,
  };
}