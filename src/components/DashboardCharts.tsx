"use client";

import React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
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

export function PipelineBarChart({ data }: { data: ChartDatum[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          cursor={{ fill: "color-mix(in oklab, var(--color-foreground) 6%, transparent)" }}
          contentStyle={TOOLTIP_STYLE}
          labelStyle={{ color: "var(--color-foreground)", fontWeight: 600 }}
          itemStyle={{ color: "var(--color-foreground)" }}
        />
        <Bar
          dataKey="value"
          name="Creators"
          radius={[6, 6, 0, 0]}
          fill="color-mix(in oklab, var(--color-foreground) 80%, transparent)"
          maxBarSize={56}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function DealStatusDonutChart({ data }: { data: ChartDatum[] }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  return (
    <div>
      <div className="relative h-[220px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              cx="50%"
              cy="50%"
              innerRadius={62}
              outerRadius={92}
              paddingAngle={2}
              stroke="transparent"
            >
              {data.map((_, i) => (
                <Cell key={i} fill={GRAY_FILLS[i % GRAY_FILLS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={TOOLTIP_STYLE} itemStyle={{ color: "var(--color-foreground)" }} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-3xl font-bold tabular-nums">{total}</p>
          <p className="text-xs text-muted-foreground">Total deals</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1.5">
        {data.map((d, i) => (
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
