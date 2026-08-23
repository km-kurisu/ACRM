"use client";

import React from "react";
import {
  ResponsiveContainer,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";

export type ChartDatum = { label: string; value: number };

const GRAY_FILLS = [
  "color-mix(in oklab, var(--color-foreground) 92%, transparent)",
  "color-mix(in oklab, var(--color-foreground) 72%, transparent)",
  "color-mix(in oklab, var(--color-foreground) 52%, transparent)",
  "color-mix(in oklab, var(--color-foreground) 34%, transparent)",
  "color-mix(in oklab, var(--color-foreground) 18%, transparent)",
];

const TOOLTIP_STYLE: React.CSSProperties = {
  background: "color-mix(in oklab, var(--color-card) 95%, transparent)",
  border: "1px solid var(--color-border)",
  borderRadius: "10px",
  color: "var(--color-foreground)",
  fontSize: "12px",
  backdropFilter: "blur(12px)",
};

export function DonutChart({
  data,
  height,
  outerRadius,
  caption,
  filterZero = false,
}: {
  data: ChartDatum[];
  height: number;
  outerRadius: number;
  caption: string;
  filterZero?: boolean;
}) {
  const shown = filterZero ? data.filter((d) => d.value > 0) : data;
  const total = data.reduce((sum, d) => sum + d.value, 0);
  return (
    <div>
      <div className="relative w-full" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={shown}
              dataKey="value"
              nameKey="label"
              cx="50%"
              cy="50%"
              innerRadius={62}
              outerRadius={outerRadius}
              paddingAngle={2}
              stroke="transparent"
            >
              {shown.map((_, i) => (
                <Cell key={i} fill={GRAY_FILLS[i % GRAY_FILLS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={TOOLTIP_STYLE} itemStyle={{ color: "var(--color-foreground)" }} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-3xl font-bold tabular-nums">{total}</p>
          <p className="text-xs text-muted-foreground">{caption}</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1.5">
        {shown.map((d, i) => (
          <span
            key={d.label}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"
          >
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ background: GRAY_FILLS[i % GRAY_FILLS.length] }}
            />
            {d.label} · {d.value}
          </span>
        ))}
      </div>
    </div>
  );
}
