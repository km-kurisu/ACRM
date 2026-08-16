"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { Search, Plus, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { Contract, Creator } from "@/lib/types";
import { createContract, deleteContract, listContracts, listCreators, updateContract, type ContractWithCreator } from "@/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
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

type ContractForm = {
  creator_id: string;
  contract_type: string;
  contract_status: string;
  start_date: string;
  end_date: string;
  exclusivity: string;
  renewal_reminder: boolean;
  notes: string;
};

const EMPTY: ContractForm = {
  creator_id: "",
  contract_type: "Exclusive Management",
  contract_status: "Draft",
  start_date: "",
  end_date: "",
  exclusivity: "No",
  renewal_reminder: false,
  notes: "",
};

const STATUS_COLORS: Record<string, string> = {
  Draft: "bg-muted text-muted-foreground",
  Active: "bg-foreground/10 text-foreground",
  Expired: "bg-muted text-muted-foreground",
  Terminated: "bg-border/60 text-muted-foreground line-through",
};

export default function ContractsPage() {
  const [contracts, setContracts] = useState<ContractWithCreator[]>([]);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ContractWithCreator | null>(null);
  const [form, setForm] = useState<ContractForm>(EMPTY);
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
    let cancelled = false;
    void (async () => {
      try {
        const [contractData, creatorData] = await Promise.all([listContracts(), listCreators()]);
        if (cancelled) return;
        setContracts(contractData);
        setCreators(creatorData);
        setLoaded(true);
      } catch {
        if (!cancelled) toast.error("Could not load contracts");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = query.trim()
    ? contracts.filter((c) =>
        [c.creators?.creator_name, c.contract_type, c.contract_status, c.exclusivity].some((v) =>
          (v ?? "").toLowerCase().includes(query.toLowerCase())
        )
      )
    : contracts;

  function resetForm() {
    setEditing(null);
    setForm(EMPTY);
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
        renewal_reminder: form.renewal_reminder,
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
          <DialogTrigger asChild>
            <Button className="glass">
              <Plus className="size-4" /> Add Contract
            </Button>
          </DialogTrigger>
          <DialogContent className="glass-strong">
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
                  <select
                    id="ct-type"
                    value={form.contract_type}
                    onChange={(e) => set({ contract_type: e.target.value })}
                    className="h-8 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="Exclusive Management">Exclusive Management</option>
                    <option value="Talent Representation">Talent Representation</option>
                    <option value="Campaign Specific">Campaign Specific</option>
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="ct-status">Contract status</Label>
                  <select
                    id="ct-status"
                    value={form.contract_status}
                    onChange={(e) => set({ contract_status: e.target.value })}
                    className="h-8 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="Draft">Draft</option>
                    <option value="Active">Active</option>
                    <option value="Expired">Expired</option>
                    <option value="Terminated">Terminated</option>
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="ct-exclusivity">Exclusivity</Label>
                  <select
                    id="ct-exclusivity"
                    value={form.exclusivity}
                    onChange={(e) => set({ exclusivity: e.target.value })}
                    className="h-8 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="No">No</option>
                    <option value="Yes">Yes</option>
                  </select>
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
              <div className="grid gap-3 rounded-lg border border-border/40 p-4">
                <Label className="flex items-center gap-2 text-sm font-normal">
                  <input
                    type="checkbox"
                    checked={form.renewal_reminder}
                    onChange={(e) => set({ renewal_reminder: e.target.checked })}
                    className="size-4 accent-primary"
                  />
                  Send renewal reminder
                </Label>
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
          </div>
        </CardHeader>
        <CardContent className="flex min-h-0 flex-1 flex-col p-0">
          <div className="min-h-0 flex-1 overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-card/60 backdrop-blur-xl">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-6">Creator</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Term</TableHead>
                  <TableHead>Exclusive</TableHead>
                  <TableHead>Renewal</TableHead>
                  <TableHead className="pr-6 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((contract) => (
                  <TableRow key={contract.id} className="hover:bg-accent/40">
                    <TableCell className="pl-6 font-medium">{contract.creators?.creator_name ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{contract.contract_type || "—"}</TableCell>
                    <TableCell>
                      <Badge className={STATUS_COLORS[contract.contract_status ?? ""] ?? "bg-muted text-muted-foreground"}>
                        {contract.contract_status || "—"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {contract.start_date ? new Date(contract.start_date).toLocaleDateString() : "—"}
                      {contract.end_date ? ` → ${new Date(contract.end_date).toLocaleDateString()}` : ""}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{contract.exclusivity || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {contract.renewal_reminder ? "Yes" : "No"}
                    </TableCell>
                    <TableCell className="pr-6 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" aria-label="Actions for contract">
                            <MoreVertical className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="glass-strong">
                          <DropdownMenuItem
                            onClick={() => {
                              setEditing(contract);
                              setForm({
                                creator_id: contract.creator_id ?? "",
                                contract_type: contract.contract_type ?? "Exclusive Management",
                                contract_status: contract.contract_status ?? "Draft",
                                start_date: contract.start_date ?? "",
                                end_date: contract.end_date ?? "",
                                exclusivity: contract.exclusivity ?? "No",
                                renewal_reminder: contract.renewal_reminder ?? false,
                                notes: contract.notes ?? "",
                              });
                              setDialogOpen(true);
                            }}
                          >
                            <Pencil className="size-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem variant="destructive" onClick={() => handleDelete(contract)}>
                            <Trash2 className="size-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
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
