"use client";

import React, { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Search } from "lucide-react";
import { listCustomFilters, listMasterData, type MasterDataRow } from "@/actions";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { DraggableTableHead, useColumnDrag } from "@/components/draggable-table-head";
import { ResetColumnsButton } from "@/components/reset-columns-button";
import { ColumnSettings } from "@/components/column-settings";
import { useTableView } from "@/lib/use-table-view";
import { cn } from "@/lib/utils";
import { MGMT_COLORS, PRIORITY_COLORS } from "@/lib/colors";
import { CustomFilterPicker, useActiveFilterIds } from "@/components/custom-filter-picker";
import { matchesFilter, type CustomFilter } from "@/lib/custom-filters";
import { textColumn, type DataColumn } from "@/components/data-table-columns";

function followerCount(value: number | null | undefined) {
  return value != null && value > 0 ? value.toLocaleString("en-IN") : "—";
}

function CreatorsInner() {
  const [rows, setRows] = useState<MasterDataRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const activeIds = useActiveFilterIds();
  const [savedFilters, setSavedFilters] = useState<CustomFilter[]>([]);

  React.useEffect(() => {
    listCustomFilters()
      .then(setSavedFilters)
      .catch(() => setSavedFilters([]));
  }, []);

  const activeConditions = React.useMemo(
    () => savedFilters.filter((f) => activeIds.includes(f.id)).flatMap((f) => f.conditions),
    [savedFilters, activeIds]
  );

  const refresh = React.useCallback(async () => {
    try {
      const data = await listMasterData();
      setRows(data);
      setLoaded(true);
    } catch {
      toast.error("Could not load creators");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void (async () => {
      await refresh();
    })();
  }, [refresh]);

  const customFiltered =
    activeConditions.length > 0
      ? rows.filter((r) => matchesFilter(r as unknown as Record<string, unknown>, activeConditions))
      : rows;
  const filtered = query.trim()
    ? customFiltered.filter((r) =>
        [r.creator_name, r.creator_type, r.email, r.niche, r.city, r.country, r.assigned_manager].some((v) =>
          (v ?? "").toLowerCase().includes(query.toLowerCase())
        )
      )
    : customFiltered;

  const columns: DataColumn<MasterDataRow>[] = [
    {
      key: "creator_name",
      label: "Creator Name",
      render: (row) => (
        <div className="flex items-center gap-2">
          <div className="grid size-7 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">
            {row.creator_name.charAt(0).toUpperCase()}
          </div>
          <Link
            href={`/creators/${row.id}`}
            className="whitespace-nowrap font-medium text-primary underline-offset-4 hover:underline"
          >
            {row.creator_name}
          </Link>
        </div>
      ),
    },
    textColumn("creator_type", "Type", (r) => r.creator_type),
    textColumn("niche", "Niche", (r) => r.niche),
    textColumn("email", "Email", (r) => r.email),
    textColumn("city", "City", (r) => r.city),
    textColumn("country", "Country", (r) => r.country),
    {
      key: "followers_instagram",
      label: "Followers (IG)",
      align: "right",
      cellClassName: "tabular-nums",
      render: (row) => followerCount(row.followers_instagram),
    },
    {
      key: "followers_youtube",
      label: "Followers (YT)",
      align: "right",
      cellClassName: "tabular-nums",
      render: (row) => followerCount(row.followers_youtube),
    },
    {
      key: "total_reach",
      label: "Total Reach",
      align: "right",
      cellClassName: "font-semibold tabular-nums",
      render: (row) => followerCount(row.total_reach),
    },
    {
      key: "engagement_rate",
      label: "Engagement",
      align: "right",
      cellClassName: "tabular-nums",
      render: (row) => (row.engagement_rate != null ? `${row.engagement_rate}%` : "—"),
    },
    {
      key: "management_status",
      label: "Mgmt Status",
      render: (row) => (
        <Badge className={MGMT_COLORS[row.management_status ?? ""] ?? "bg-muted text-muted-foreground"}>
          {row.management_status || "—"}
        </Badge>
      ),
    },
    textColumn("assigned_manager", "Manager", (r) => r.assigned_manager),
    {
      key: "priority",
      label: "Priority",
      render: (row) => (
        <Badge className={PRIORITY_COLORS[row.priority ?? ""] ?? "bg-muted text-muted-foreground"}>
          {row.priority || "—"}
        </Badge>
      ),
    },
  ];

  const { ordered, all, hidden, moveColumn, toggleColumn, renameColumn, reset, canReset } =
    useTableView("creators", columns);
  const drag = useColumnDrag(moveColumn);

  return (
    <div className="flex h-full min-h-0 flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Creators</h1>
        <p className="mt-1 text-muted-foreground">
          {loaded ? `${rows.length} creator${rows.length === 1 ? "" : "s"} in the roster.` : "Loading creators…"}
        </p>
      </div>

      <Card className="glass flex min-h-0 flex-1 flex-col">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Search className="size-4 text-muted-foreground" />
            <Input
              placeholder="Search creators…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full sm:w-72"
            />
            <span className="hidden text-xs text-muted-foreground sm:inline">
              Click a name to view details · Drag headers to reorder
            </span>
            {activeConditions.length > 0 && loaded && (
              <span className="hidden text-xs text-muted-foreground md:inline">
                {filtered.length} of {rows.length} shown
              </span>
            )}
            <div className="ml-auto flex items-center gap-2">
              <ColumnSettings
              columns={all}
              hidden={hidden}
              onToggle={toggleColumn}
              onRename={renameColumn}
            />
            <ResetColumnsButton onReset={reset} visible={canReset} />
              <CustomFilterPicker />
            </div>
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
                  <TableRow key={row.id} className="hover:bg-accent/40">
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
              Loading creators…
            </div>
          )}
          {!loading && filtered.length === 0 && (
            <p className="px-6 py-12 text-center text-sm text-muted-foreground">
              {loaded && rows.length === 0
                ? "No creators yet."
                : activeConditions.length > 0
                  ? "No creators match the active filters."
                  : "No creators match your search."}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function CreatorsPage() {
  return (
    <React.Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading…</div>}>
      <CreatorsInner />
    </React.Suspense>
  );
}
