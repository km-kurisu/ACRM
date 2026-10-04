"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { useUser } from "@clerk/nextjs";
import { Search, Plus, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { Creator } from "@/lib/types";
import { createCreator, deleteCreator, listMasterData, updateCreator, type MasterDataRow } from "@/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { DraggableTableHead, useColumnDrag } from "@/components/draggable-table-head";
import { dateColumn, numberColumn, textColumn, type DataColumn } from "@/components/data-table-columns";
import { ResetColumnsButton } from "@/components/reset-columns-button";
import { ColumnSettings } from "@/components/column-settings";
import { useTableView } from "@/lib/use-table-view";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { CONTRACT_STATUS_COLORS, MGMT_COLORS, PRIORITY_COLORS } from "@/lib/colors";
import {
  EMPTY_CREATOR_FORM,
  CreatorFormFields,
  creatorFormFromRow,
  toCreatorPayload,
  type CreatorFormValues,
} from "@/components/creator-form";
import { listCustomFilters } from "@/actions";
import { CustomFilterPicker, useActiveFilterIds } from "@/components/custom-filter-picker";
import { matchesFilter, type CustomFilter } from "@/lib/custom-filters";

const TABLE_KEY = "master_data";

function yesNoColumn(
  key: string,
  label: string,
  get: (row: MasterDataRow) => string | null | undefined
): DataColumn<MasterDataRow> {
  return {
    key,
    label,
    cellClassName: "whitespace-nowrap text-muted-foreground",
    render: (row) => {
      const value = get(row);
      if (value == null) return "—";
      if (typeof value === "string") return value === "Yes" ? "Yes" : "No";
      return value ? "Yes" : "No";
    },
  };
}

function MasterDataInner() {
  const { user } = useUser();
  const isAdmin = user?.publicMetadata?.role === "admin";
  const [rows, setRows] = useState<MasterDataRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Creator | null>(null);
  const [form, setForm] = useState<CreatorFormValues>(EMPTY_CREATOR_FORM);
  const [saving, setSaving] = useState(false);
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
      toast.error("Could not load master data");
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

  function resetForm() {
    setEditing(null);
    setForm(EMPTY_CREATOR_FORM);
  }

  function set(v: Partial<CreatorFormValues>) {
    setForm((prev) => ({ ...prev, ...v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = toCreatorPayload(form);
      if (editing) {
        await updateCreator(editing.id, payload);
        toast.success(`Updated ${payload.creator_name}`);
      } else {
        await createCreator(payload);
        toast.success(`Created ${payload.creator_name}`);
      }
      setDialogOpen(false);
      resetForm();
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(row: MasterDataRow) {
    if (!window.confirm(`Delete ${row.creator_name}? This cannot be undone.`)) return;
    try {
      await deleteCreator(row.id);
      toast.success(`Deleted ${row.creator_name}`);
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  const columns: DataColumn<MasterDataRow>[] = [
    {
      key: "creator_name",
      label: "Creator Name",
      render: (row) => (
        <div className="flex items-center gap-2">
          <div className="grid size-7 shrink-0 place-items-center rounded-full bg-foreground/10 text-xs font-semibold">
            {row.creator_name.charAt(0).toUpperCase()}
          </div>
          <span className="whitespace-nowrap font-medium">{row.creator_name}</span>
        </div>
      ),
    },
    textColumn("creator_type", "Type", (r) => r.creator_type),
    textColumn("instagram", "Instagram", (r) => r.instagram),
    textColumn("youtube", "YouTube", (r) => r.youtube),
    textColumn("x_twitter", "X (Twitter)", (r) => r.x_twitter),
    textColumn("other_platforms", "Other Platforms", (r) => r.other_platforms),
    textColumn("email", "Email", (r) => r.email),
    textColumn("phone_number", "Phone", (r) => r.phone_number),
    textColumn("city", "City", (r) => r.city),
    textColumn("state", "State", (r) => r.state),
    textColumn("country", "Country", (r) => r.country),
    textColumn("niche", "Niche", (r) => r.niche),
    numberColumn("followers_instagram", "Followers (IG)", (r) => r.followers_instagram),
    numberColumn("followers_youtube", "Followers (YT)", (r) => r.followers_youtube),
    numberColumn("total_reach", "Total Reach", (r) => r.total_reach, "font-semibold tabular-nums"),
    {
      key: "engagement_rate",
      label: "Engagement",
      align: "right",
      cellClassName: "tabular-nums",
      render: (row) => (row.engagement_rate != null ? `${row.engagement_rate}%` : "—"),
    },
    textColumn("primary_content_type", "Content Type", (r) => r.primary_content_type),
    textColumn("languages", "Languages", (r) => r.languages),
    {
      key: "management_status",
      label: "Mgmt Status",
      render: (row) => (
        <Badge className={MGMT_COLORS[row.management_status ?? ""] ?? "bg-muted text-muted-foreground"}>
          {row.management_status || "—"}
        </Badge>
      ),
    },
    textColumn("interested_in_exclusive_mgmt", "Exclusive?", (r) => r.interested_in_exclusive_mgmt),
    dateColumn("date_first_contacted", "First Contacted", (r) => r.date_first_contacted),
    dateColumn("next_follow_up_date", "Next Follow-up", (r) => r.next_follow_up_date),
    textColumn("outreach_outcome", "Outreach Outcome", (r) => r.outreach_outcome),
    {
      key: "contract_status",
      label: "Contract Status",
      render: (row) => (
        <Badge className={CONTRACT_STATUS_COLORS[row.contract_status ?? ""] ?? "bg-muted text-muted-foreground"}>
          {row.contract_status || "—"}
        </Badge>
      ),
    },
    yesNoColumn("rate_card_received", "Rate Card", (r) => r.rate_card_received),
    yesNoColumn("gst_available", "GST", (r) => r.gst_available),
    yesNoColumn("payment_details_received", "Payment", (r) => r.payment_details_received),
    {
      key: "priority",
      label: "Priority",
      render: (row) => (
        <Badge className={PRIORITY_COLORS[row.priority ?? ""] ?? "bg-muted text-muted-foreground"}>
          {row.priority || "—"}
        </Badge>
      ),
    },
    textColumn("assigned_manager", "Manager", (r) => r.assigned_manager),
    textColumn("notes", "Notes", (r) => r.notes, "max-w-[280px] truncate text-muted-foreground"),
    {
      key: "actions",
      label: "Actions",
      align: "right",
      render: (row) =>
        isAdmin && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label={`Actions for ${row.creator_name}`}>
                <MoreVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="glass-strong">
              <DropdownMenuItem
                onClick={() => {
                  setEditing(row);
                  setForm(creatorFormFromRow(row));
                  setDialogOpen(true);
                }}
              >
                <Pencil className="size-4" /> Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={() => handleDelete(row)}>
                <Trash2 className="size-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
    },
  ];

  const { ordered, all, hidden, moveColumn, toggleColumn, renameColumn, reset, canReset } =
    useTableView(TABLE_KEY, columns);
  const drag = useColumnDrag(moveColumn);

  return (
    <div className="flex h-full min-h-0 flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Master Data</h1>
          <p className="mt-1 text-muted-foreground">
            {loaded
              ? `${rows.length} creator${rows.length === 1 ? "" : "s"} in the registry. Auto columns are computed from outreach and contracts.`
              : "Loading registry…"}
          </p>
        </div>
        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}
        >
          {isAdmin && (
            <DialogTrigger asChild>
              <Button className="glass" variant="secondary">
                <Plus className="size-4" /> Add Creator
              </Button>
            </DialogTrigger>
          )}
          <DialogContent className="glass-strong max-h-[85vh] overflow-y-auto sm:max-w-4xl">
            <DialogHeader>
              <DialogTitle>{editing ? `Edit ${editing.creator_name}` : "Add Creator"}</DialogTitle>
              <DialogDescription>
                {editing ? "Update the creator's details." : "Add a new creator to the registry."}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="grid gap-5">
              <CreatorFormFields values={form} onChange={set} />
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving…" : editing ? "Save changes" : "Add creator"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
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
              Drag column headers to reorder
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
              Loading master data…
            </div>
          )}
          {!loading && filtered.length === 0 && (
            <p className="px-6 py-12 text-center text-sm text-muted-foreground">
              {loaded && rows.length === 0 ? "No creators yet. Add your first one!" : activeConditions.length > 0 ? "No creators match the active filters." : "No creators match your search."}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function MasterDataPage() {
  return (
    <React.Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading…</div>}>
      <MasterDataInner />
    </React.Suspense>
  );
}
