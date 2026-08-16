"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { Search, Plus, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { Outreach, Creator } from "@/lib/types";
import { createOutreach, deleteOutreach, listOutreach, listCreators, updateOutreach, type OutreachWithCreator } from "@/actions";
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

type OutreachForm = {
  creator_id: string;
  contact_method: string;
  date_contacted: string;
  next_follow_up_date: string;
  current_status: string;
  outcome: string;
  notes: string;
};

const EMPTY: OutreachForm = {
  creator_id: "",
  contact_method: "Email",
  date_contacted: "",
  next_follow_up_date: "",
  current_status: "No Response",
  outcome: "",
  notes: "",
};

const STATUS_COLORS: Record<string, string> = {
  Negotiating: "bg-foreground/10 text-foreground",
  Interested: "bg-foreground/10 text-foreground",
  "Meeting Scheduled": "bg-foreground/15 text-foreground",
  "Not Interested": "bg-muted text-muted-foreground line-through",
  "No Response": "bg-muted text-muted-foreground",
  Signed: "bg-foreground/10 text-foreground",
};

export default function OutreachPage() {
  const [items, setItems] = useState<OutreachWithCreator[]>([]);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<OutreachWithCreator | null>(null);
  const [form, setForm] = useState<OutreachForm>(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = React.useCallback(async () => {
    try {
      const [outreachData, creatorData] = await Promise.all([listOutreach(), listCreators()]);
      setItems(outreachData);
      setCreators(creatorData);
      setLoaded(true);
    } catch {
      toast.error("Could not load outreach");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [outreachData, creatorData] = await Promise.all([listOutreach(), listCreators()]);
        if (cancelled) return;
        setItems(outreachData);
        setCreators(creatorData);
        setLoaded(true);
      } catch {
        if (!cancelled) toast.error("Could not load outreach");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = query.trim()
    ? items.filter((o) =>
        [o.creators?.creator_name, o.contact_method, o.current_status, o.outcome].some((v) =>
          (v ?? "").toLowerCase().includes(query.toLowerCase())
        )
      )
    : items;

  function resetForm() {
    setEditing(null);
    setForm(EMPTY);
  }

  function set(v: Partial<OutreachForm>) {
    setForm((prev) => ({ ...prev, ...v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: Partial<Outreach> = {
        creator_id: form.creator_id,
        contact_method: form.contact_method || null,
        date_contacted: form.date_contacted || null,
        next_follow_up_date: form.next_follow_up_date || null,
        current_status: form.current_status || null,
        outcome: form.outcome || null,
        notes: form.notes || null,
      };
      if (!payload.creator_id) throw new Error("Please pick a creator");
      if (editing) {
        await updateOutreach(editing.id, payload);
        toast.success("Updated outreach record");
      } else {
        await createOutreach(payload);
        toast.success("Created outreach record");
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

  async function handleDelete(item: Outreach) {
    if (!window.confirm("Delete this outreach record? This cannot be undone.")) return;
    try {
      await deleteOutreach(item.id);
      toast.success("Deleted outreach record");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Outreach</h1>
          <p className="mt-1 text-muted-foreground">
            {loaded ? `${items.length} outreach activit${items.length === 1 ? "y" : "ies"} logged.` : "Loading outreach…"}
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
              <Plus className="size-4" /> Log Outreach
            </Button>
          </DialogTrigger>
          <DialogContent className="glass-strong">
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Outreach" : "Log Outreach"}</DialogTitle>
              <DialogDescription>
                {editing ? "Update the outreach record." : "Log a new outreach touchpoint."}
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
                  <SelectTrigger id="o-creator">
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
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="o-method">Contact method</Label>
                  <select
                    id="o-method"
                    value={form.contact_method}
                    onChange={(e) => set({ contact_method: e.target.value })}
                    className="h-8 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="Email">Email</option>
                    <option value="Instagram">Instagram</option>
                    <option value="WhatsApp">WhatsApp</option>
                    <option value="Phone">Phone</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="o-status">Current status</Label>
                  <select
                    id="o-status"
                    value={form.current_status}
                    onChange={(e) => set({ current_status: e.target.value })}
                    className="h-8 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="No Response">No Response</option>
                    <option value="Interested">Interested</option>
                    <option value="Negotiating">Negotiating</option>
                    <option value="Meeting Scheduled">Meeting Scheduled</option>
                    <option value="Not Interested">Not Interested</option>
                    <option value="Signed">Signed</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="o-contacted">Date contacted</Label>
                  <Input id="o-contacted" type="date" value={form.date_contacted} onChange={(e) => set({ date_contacted: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="o-followup">Next follow-up</Label>
                  <Input id="o-followup" type="date" value={form.next_follow_up_date} onChange={(e) => set({ next_follow_up_date: e.target.value })} />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="o-outcome">Outcome</Label>
                <Input id="o-outcome" value={form.outcome} onChange={(e) => set({ outcome: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="o-notes">Notes</Label>
                <Input id="o-notes" value={form.notes} onChange={(e) => set({ notes: e.target.value })} />
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving…" : editing ? "Save changes" : "Log outreach"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="glass">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Search className="size-4 text-muted-foreground" />
            <Input
              placeholder="Search outreach…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full sm:w-72"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-6">Creator</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Contacted</TableHead>
                  <TableHead>Next follow-up</TableHead>
                  <TableHead>Outcome</TableHead>
                  <TableHead className="pr-6 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((item) => (
                  <TableRow key={item.id} className="hover:bg-accent/40">
                    <TableCell className="pl-6 font-medium">{item.creators?.creator_name ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{item.contact_method || "—"}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={STATUS_COLORS[item.current_status ?? ""] ?? "bg-muted text-muted-foreground"}>
                        {item.current_status || "—"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {item.date_contacted ? new Date(item.date_contacted).toLocaleDateString() : "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {item.next_follow_up_date ? new Date(item.next_follow_up_date).toLocaleDateString() : "—"}
                    </TableCell>
                    <TableCell className="max-w-[220px] truncate text-muted-foreground">{item.outcome || "—"}</TableCell>
                    <TableCell className="pr-6 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" aria-label="Actions for outreach record">
                            <MoreVertical className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="glass-strong">
                          <DropdownMenuItem
                            onClick={() => {
                              setEditing(item);
                              setForm({
                                creator_id: item.creator_id ?? "",
                                contact_method: item.contact_method ?? "Email",
                                date_contacted: item.date_contacted ?? "",
                                next_follow_up_date: item.next_follow_up_date ?? "",
                                current_status: item.current_status ?? "No Response",
                                outcome: item.outcome ?? "",
                                notes: item.notes ?? "",
                              });
                              setDialogOpen(true);
                            }}
                          >
                            <Pencil className="size-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem variant="destructive" onClick={() => handleDelete(item)}>
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
              Loading outreach…
            </div>
          )}
          {!loading && filtered.length === 0 && (
            <p className="px-6 py-12 text-center text-sm text-muted-foreground">
              {loaded && items.length === 0 ? "No outreach yet. Log your first touchpoint!" : "No outreach matches your search."}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
