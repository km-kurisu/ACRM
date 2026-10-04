import React from "react";

export type DataColumn<Row> = {
  key: string;
  label: string;
  align?: "left" | "right";
  cellClassName?: string;
  render: (row: Row) => React.ReactNode;
};

export function textColumn<Row>(
  key: string,
  label: string,
  get: (row: Row) => string | null | undefined,
  cellClassName = "whitespace-nowrap text-muted-foreground"
): DataColumn<Row> {
  return { key, label, cellClassName, render: (row) => get(row) || "—" };
}

export function dateColumn<Row>(
  key: string,
  label: string,
  get: (row: Row) => string | null | undefined,
  cellClassName = "whitespace-nowrap text-muted-foreground"
): DataColumn<Row> {
  return {
    key,
    label,
    cellClassName,
    render: (row) => {
      const value = get(row);
      return value ? new Date(value).toLocaleDateString() : "—";
    },
  };
}

export function numberColumn<Row>(
  key: string,
  label: string,
  get: (row: Row) => number | null | undefined,
  cellClassName = "tabular-nums"
): DataColumn<Row> {
  return {
    key,
    label,
    align: "right",
    cellClassName,
    render: (row) => {
      const value = get(row);
      return value != null && value > 0 ? value.toLocaleString() : "—";
    },
  };
}