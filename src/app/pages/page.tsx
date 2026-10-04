"use client";

import React, { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ExternalLink } from "lucide-react";
import { listPages, type CreatorPageRow } from "@/actions";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { DraggableTableHead, useColumnDrag } from "@/components/draggable-table-head";
import { ResetColumnsButton } from "@/components/reset-columns-button";
import { ColumnSettings } from "@/components/column-settings";
import { useTableView } from "@/lib/use-table-view";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { textColumn, type DataColumn } from "@/components/data-table-columns";

function followerCount(value: number | null | undefined) {
  return value != null && value > 0 ? value.toLocaleString("en-IN") : "—";
}

const PLATFORMS = ["Instagram", "YouTube", "X (Twitter)", "Other"] as const;

function PagesInner() {
  const [rows, setRows] = useState<CreatorPageRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [platform, setPlatform] = useState("Instagram");

  React.useEffect(() => {
    listPages()
      .then((data) => {
        setRows(data);
        setLoaded(true);
      })
      .catch(() => toast.error("Could not load pages"))
      .finally(() => setLoading(false));
  }, []);

  const filtered = platform === "all" ? rows : rows.filter((r) => r.platform === platform);

  const columns: DataColumn<CreatorPageRow>[] = [
    {
      key: "creator",
      label: "Creator",
      render: (row) => (
        <div className="flex items-center gap-2">
          <div className="grid size-7 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">
            {row.creator_name.charAt(0).toUpperCase()}
          </div>
          <Link
            href={`/creators/${row.creator_id}`}
            className="whitespace-nowrap font-medium text-primary underline-offset-4 hover:underline"
          >
            {row.creator_name}
          </Link>
        </div>
      ),
    },
    textColumn("platform", "Platform", (r) => r.platform),
    {
      key: "page",
      label: "Page",
      cellClassName: "whitespace-nowrap",
      render: (row) =>
        row.url ? (
          <a
            href={row.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline"
          >
            @{row.handle}
            <ExternalLink className="size-3" />
          </a>
        ) : (
          <span className="text-muted-foreground">@{row.handle}</span>
        ),
    },
    {
      key: "followers",
      label: "Followers",
      align: "right",
      cellClassName: "tabular-nums",
      render: (row) => followerCount(row.followers),
    },
    {
      key: "total_followers",
      label: "Total Followers",
      align: "right",
      cellClassName: "tabular-nums",
      render: (row) => followerCount(row.total_followers),
    },
    {
      key: "brand_deal_value",
      label: "Brand Deal Value",
      align: "right",
      cellClassName: "tabular-nums",
      render: (row) => (row.brand_deal_value > 0 ? `$${row.brand_deal_value.toLocaleString()}` : "—"),
    },
    {
      key: "engagement_rate",
      label: "Engagement",
      align: "right",
      cellClassName: "tabular-nums",
      render: (row) => (row.engagement_rate != null ? `${row.engagement_rate}%` : "—"),
    },
  ];

  const { ordered, all, hidden, moveColumn, toggleColumn, renameColumn, reset, canReset } =
    useTableView("pages", columns);
  const drag = useColumnDrag(moveColumn);

  return (
    <div className="flex h-full min-h-0 flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Pages</h1>
        <p className="mt-1 text-muted-foreground">
          {loaded ? `${filtered.length} page${filtered.length === 1 ? "" : "s"} shown.` : "Loading pages…"}
        </p>
      </div>

      <Card className="glass flex min-h-0 flex-1 flex-col">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="min-w-0">
            <CardTitle>Social Media Pages</CardTitle>
            <CardDescription>One row per platform page. Deal values and engagement are per creator.</CardDescription>
          </div>
          <div className="flex items-center gap-2 sm:ml-auto">
            <ColumnSettings
              columns={all}
              hidden={hidden}
              onToggle={toggleColumn}
              onRename={renameColumn}
            />
            <ResetColumnsButton onReset={reset} visible={canReset} />
            <Select value={platform} onValueChange={setPlatform}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Platform" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Platforms</SelectItem>
                {PLATFORMS.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="flex min-h-0 flex-1 flex-col p-0">
          <div className="min-h-0 flex-1 overflow-auto">
            <Table className="min-w-max">
              <TableHeader className="sticky top-0 z-10 bg-card/60 backdrop-blur-xl">
                <TableRow className="hover:bg-transparent">
                  {ordered.map((col, i) => (
                    <DraggableTableHead
                      key={col.key}
                      columnKey={col.key}
                      drag={drag}
                      className={cn(
                        i === 0 && "pl-6",
                        i === ordered.length - 1 && "pr-6",
                        col.align === "right" && "text-right"
                      )}
                    >
                      {col.label}
                    </DraggableTableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((row) => (
                  <TableRow key={`${row.creator_id}-${row.platform}`} className="hover:bg-accent/40">
                    {ordered.map((col, i) => (
                      <TableCell
                        key={col.key}
                        className={cn(
                          col.cellClassName,
                          i === 0 && "pl-6",
                          i === ordered.length - 1 && "pr-6",
                          col.align === "right" && "text-right"
                        )}
                      >
                        {col.render(row)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {loading && (
            <div className="flex items-center justify-center gap-3 px-6 py-12 text-muted-foreground">
              <div className="size-4 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
              Loading pages…
            </div>
          )}
          {!loading && loaded && filtered.length === 0 && (
            <p className="px-6 py-12 text-center text-sm text-muted-foreground">
              {rows.length === 0 ? "No creator pages yet." : `No ${platform} pages yet.`}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function PagesPage() {
  return <PagesInner />;
}
