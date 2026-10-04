"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { useUser } from "@clerk/nextjs";
import { Search, Plus, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { Contract, Creator } from "@/lib/types";
import { createContract, deleteContract, listContracts, listCreators, updateContract, type ContractWithCreator } from "@/actions";
import { dateColumn, textColumn, type DataColumn } from "@/components/data-table-columns";
import { CONTRACT_STATUS_COLORS } from "@/lib/colors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { DraggableTableHead, useColumnDrag } from "@/components/draggable-table-head";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EnumSelect } from "@/components/enum-select";
import { pickOption, useDropdownOptions } from "@/lib/use-dropdown-options";

type ContractForm = {
  creator_id: string;
  contract_type: string;
  contract_status: string;
  start_date: string;
  end_date: string;
  exclusivity: string;
  renewal_reminder: string;
  notes: string;
};

const EMPTY: ContractForm = {
  creator_id: "",
  contract_type: "Exclusive Management",
  contract_status: "Draft",
  start_date: "",
  end_date: "",
  exclusivity: "No",
  renewal_reminder: "",
  notes: "",
};

export default function ContractsPage() {
  const { user } = useUser();
  const isAdmin = user?.publicMetadata?.role === "admin";
  const dd = useDropdownOptions();

  function freshForm(): ContractForm {
    return {
      ...EMPTY,
      contract_type: pickOption(dd.options.contract_type, EMPTY.contract_type),
      contract_status: pickOption(dd.options.contract_status, EMPTY.contract_status),
      exclusivity: pickOption(dd.options.exclusivity, EMPTY.exclusivity),
    };
  }

  const [contracts, setContracts] = useState<ContractWithCreator[]>([]);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ContractWithCreator | null>(null);
  const [form, setForm] = useState<ContractForm>(() => freshForm());
  const [saving, setSaving] = useState(false);

  const load = React.useCallback(async () => {
    try {
      const [contractData, creatorData] = await Promise.all([listContracts(), listCreators()]);
      setContracts(contractData);
      setCreators(creatorData);
      setLoaded(true);
    } catch {
      toast.error("Could not load contracts");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void (async () => {
      await load();
    })();
  }, [load]);

  const filtered = query.trim()
    ? contracts.filter((c) =>
        [c.creators?.creator_name, c.contract_type, c.contract_status, c.exclusivity].some((v) =>
          (v ?? "").toLowerCase().includes(query.toLowerCase())
        )
      )
    : contracts;

  function resetForm() {
    setEditing(null);
    setForm(freshForm());
  }

  function set(v: Partial<ContractForm>) {
    setForm((prev) => ({ ...prev, ...v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: Partial<Contract> = {
        creator_id: form.creator_id,
        contract_type: form.contract_type || null,
        contract_status: form.contract_status || null,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        exclusivity: form.exclusivity || null,
        renewal_reminder: form.renewal_reminder || null,
        notes: form.notes || null,
      };
      if (!payload.creator_id) throw new Error("Please pick a creator");
      if (editing) {
        await updateContract(editing.id, payload);
        toast.success("Updated contract");
      } else {
        await createContract(payload);
        toast.success("Created contract");
      }
      setDialogOpen(false);
      resetForm();
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(contract: Contract) {
    if (!window.confirm("Delete this contract? This cannot be undone.")) return;
    try {
      await deleteContract(contract.id);
      toast.success("Deleted contract");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  const columns: DataColumn<ContractWithCreator>[] = [
    {
      key: "creator",
      label: "Creator",
      cellClassName: "font-medium",
      render: (contract) => contract.creators?.creator_name ?? "—",
    },
    textColumn("contract_type", "Type", (c) => c.contract_type),
    {
      key: "contract_status",
      label: "Status",
      render: (c) => (
        <Badge className={CONTRACT_STATUS_COLORS[c.contract_status ?? ""] ?? "bg-muted text-muted-foreground"}>
          {c.contract_status || "—"}
        </Badge>
      ),
    },
    {
      key: "term",
      label: "Term",
      cellClassName: "text-muted-foreground",
      render: (c) => (
        <>
          {c.start_date ? new Date(c.start_date).toLocaleDateString() : "—"}
          {c.end_date ? ` → ${new Date(c.end_date).toLocaleDateString()}` : ""}
        </>
      ),
    },
    textColumn("exclusivity", "Exclusive", (c) => c.exclusivity),
    dateColumn("renewal_reminder", "Renewal", (c) => c.renewal_reminder),
    {
      key: "actions",
      label: "Actions",
      align: "right",
      render: (c) =>
        isAdmin && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Actions for contract">
                <MoreVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="glass-strong">
              <DropdownMenuItem
                onClick={() => {
                  setEditing(c);
                  setForm({
                    creator_id: c.creator_id ?? "",
                    contract_type: c.contract_type ?? "Exclusive Management",
                    contract_status: c.contract_status ?? "Draft",
                    start_date: c.start_date ?? "",
                    end_date: c.end_date ?? "",
                    exclusivity: c.exclusivity ?? "No",
                    renewal_reminder: c.renewal_reminder ?? "",
                    notes: c.notes ?? "",
                  });
                  setDialogOpen(true);
                }}
              >
                <Pencil className="size-4" /> Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={() => handleDelete(c)}>
                <Trash2 className="size-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
    },
  ];

  const { ordered, all, hidden, moveColumn, toggleColumn, renameColumn, reset, canReset } =
    useTableView("contracts", columns);
  const drag = useColumnDrag(moveColumn);

  return (
    <div className="flex h-full min-h-0 flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Contracts</h1>
          <p className="mt-1 text-muted-foreground">
            {loaded ? `${contracts.length} contract${contracts.length === 1 ? "" : "s"} on file.` : "Loading contracts…"}
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
                <Plus className="size-4" /> Add Contract
              </Button>
            </DialogTrigger>
          )}
          <DialogContent className="glass-strong sm:max-w-4xl">
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Contract" : "Add Contract"}</DialogTitle>
              <DialogDescription>
                {editing ? "Update the contract details." : "Create a new contract."}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="grid gap-4">
              <div className="grid gap-2">
                <Label>Creator *</Label>
                <Select
                  value={form.creator_id}
                  onValueChange={(v) => set({ creator_id: v })}
                  disabled={!loaded}
                >
                  <SelectTrigger id="ct-creator">
                    <SelectValue placeholder="Select creator" />
                  </SelectTrigger>
                  <SelectContent className="glass-strong">
                    {creators.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.creator_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="grid gap-2">
                  <Label htmlFor="ct-type">Contract type</Label>
                  <EnumSelect
                    id="ct-type"
                    value={form.contract_type}
                    onChange={(v) => set({ contract_type: v })}
                    options={dd.options.contract_type}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="ct-status">Contract status</Label>
                  <EnumSelect
                    id="ct-status"
                    value={form.contract_status}
                    onChange={(v) => set({ contract_status: v })}
                    options={dd.options.contract_status}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="ct-exclusivity">Exclusivity</Label>
                  <EnumSelect
                    id="ct-exclusivity"
                    value={form.exclusivity}
                    onChange={(v) => set({ exclusivity: v })}
                    options={dd.options.exclusivity}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="ct-start">Start date</Label>
                  <Input id="ct-start" type="date" value={form.start_date} onChange={(e) => set({ start_date: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="ct-end">End date</Label>
                  <Input id="ct-end" type="date" value={form.end_date} onChange={(e) => set({ end_date: e.target.value })} />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="ct-renewal">Renewal reminder date</Label>
                <Input id="ct-renewal" type="date" value={form.renewal_reminder} onChange={(e) => set({ renewal_reminder: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="ct-notes">Notes</Label>
                <Input id="ct-notes" value={form.notes} onChange={(e) => set({ notes: e.target.value })} />
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving…" : editing ? "Save changes" : "Add contract"}
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
              placeholder="Search contracts…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full sm:w-72"
            />
            <ColumnSettings
              columns={all}
              hidden={hidden}
              onToggle={toggleColumn}
              onRename={renameColumn}
            />
            <ResetColumnsButton onReset={reset} visible={canReset} />
          </div>
        </CardHeader>
        <CardContent className="flex min-h-0 flex-1 flex-col p-0">
          <div className="min-h-0 flex-1 overflow-auto">
            <Table>
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
              <div className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              Loading contracts…
            </div>
          )}
          {!loading && filtered.length === 0 && (
            <p className="px-6 py-12 text-center text-sm text-muted-foreground">
              {loaded && contracts.length === 0 ? "No contracts yet. Create your first one!" : "No contracts match your search."}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
