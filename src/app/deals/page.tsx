"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { Search, Plus, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { Deal, Creator, Company } from "@/lib/types";
import { createDeal, deleteDeal, listDeals, listCreators, listCompanies, updateDeal, type DealWithRefs } from "@/actions";
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

type DealForm = {
  creator_id: string;
  company_id: string;
  campaign: string;
  deal_value: string;
  agency_commission: string;
  campaign_status: string;
  invoice_status: string;
  payment_status: string;
  due_date: string;
  completion_date: string;
  notes: string;
};

const EMPTY: DealForm = {
  creator_id: "",
  company_id: "",
  campaign: "",
  deal_value: "",
  agency_commission: "",
  campaign_status: "Pitched",
  invoice_status: "Not Sent",
  payment_status: "Pending",
  due_date: "",
  completion_date: "",
  notes: "",
};

const STATUS_COLORS: Record<string, string> = {
  Pitched: "bg-muted text-muted-foreground",
  "In Progress": "bg-foreground/10 text-foreground",
  Confirmed: "bg-foreground/10 text-foreground",
  Completed: "bg-muted text-muted-foreground",
  Cancelled: "bg-border/60 text-muted-foreground line-through",
};

const PAYMENT_COLORS: Record<string, string> = {
  Paid: "bg-foreground/10 text-foreground",
  Pending: "bg-muted text-muted-foreground",
  Overdue: "bg-foreground/20 text-foreground",
};

export default function DealsPage() {
  const [deals, setDeals] = useState<DealWithRefs[]>([]);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<DealWithRefs | null>(null);
  const [form, setForm] = useState<DealForm>(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = React.useCallback(async () => {
    try {
      const [dealData, creatorData, companyData] = await Promise.all([
        listDeals(),
        listCreators(),
        listCompanies(),
      ]);
      setDeals(dealData);
      setCreators(creatorData);
      setCompanies(companyData);
      setLoaded(true);
    } catch {
      toast.error("Could not load deals");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [dealData, creatorData, companyData] = await Promise.all([
          listDeals(),
          listCreators(),
          listCompanies(),
        ]);
        if (cancelled) return;
        setDeals(dealData);
        setCreators(creatorData);
        setCompanies(companyData);
        setLoaded(true);
      } catch {
        if (!cancelled) toast.error("Could not load deals");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = query.trim()
    ? deals.filter((d) =>
        [d.campaign, d.creators?.creator_name, d.companies?.name, d.campaign_status, d.payment_status].some((v) =>
          (v ?? "").toLowerCase().includes(query.toLowerCase())
        )
      )
    : deals;

  function resetForm() {
    setEditing(null);
    setForm(EMPTY);
  }

  function set(v: Partial<DealForm>) {
    setForm((prev) => ({ ...prev, ...v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: Partial<Deal> = {
        creator_id: form.creator_id,
        company_id: form.company_id,
        campaign: form.campaign,
        deal_value: form.deal_value ? Number(form.deal_value) : null,
        agency_commission: form.agency_commission ? Number(form.agency_commission) : null,
        campaign_status: form.campaign_status || null,
        invoice_status: form.invoice_status || null,
        payment_status: form.payment_status || null,
        due_date: form.due_date || null,
        completion_date: form.completion_date || null,
        notes: form.notes || null,
      };
      if (!payload.creator_id) throw new Error("Please pick a creator");
      if (!payload.company_id) throw new Error("Please pick a company");
      if (editing) {
        await updateDeal(editing.id, payload);
        toast.success(`Updated "${payload.campaign}"`);
      } else {
        await createDeal(payload);
        toast.success(`Created "${payload.campaign}"`);
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

  async function handleDelete(deal: Deal) {
    if (!window.confirm(`Delete "${deal.campaign}"? This cannot be undone.`)) return;
    try {
      await deleteDeal(deal.id);
      toast.success(`Deleted "${deal.campaign}"`);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  const creatorOptions = creators.map((c) => ({ id: c.id, label: c.creator_name }));
  const companyOptions = companies.map((c) => ({ id: c.id, label: c.name }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Deals</h1>
          <p className="mt-1 text-muted-foreground">
            {loaded ? `${deals.length} deal${deals.length === 1 ? "" : "s"} in the pipeline.` : "Loading deals…"}
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
              <Plus className="size-4" /> Add Deal
            </Button>
          </DialogTrigger>
          <DialogContent className="glass-strong max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? `Edit "${editing.campaign}"` : "Add Deal"}</DialogTitle>
              <DialogDescription>
                {editing ? "Update the deal's details." : "Link a creator with a company."}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="d-campaign">Campaign *</Label>
                <Input id="d-campaign" required value={form.campaign} onChange={(e) => set({ campaign: e.target.value })} />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label>Creator *</Label>
                  <Select
                    value={form.creator_id}
                    onValueChange={(v) => set({ creator_id: v })}
                    disabled={!loaded}
                  >
                    <SelectTrigger id="d-creator">
                      <SelectValue placeholder="Select creator" />
                    </SelectTrigger>
                    <SelectContent className="glass-strong">
                      {creatorOptions.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Company *</Label>
                  <Select
                    value={form.company_id}
                    onValueChange={(v) => set({ company_id: v })}
                    disabled={!loaded}
                  >
                    <SelectTrigger id="d-company">
                      <SelectValue placeholder="Select company" />
                    </SelectTrigger>
                    <SelectContent className="glass-strong">
                      {companyOptions.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="d-value">Deal value ($)</Label>
                  <Input id="d-value" type="number" min={0} value={form.deal_value} onChange={(e) => set({ deal_value: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="d-commission">Agency commission ($)</Label>
                  <Input id="d-commission" type="number" min={0} value={form.agency_commission} onChange={(e) => set({ agency_commission: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="grid gap-2">
                  <Label htmlFor="d-campaign-status">Campaign status</Label>
                  <select
                    id="d-campaign-status"
                    value={form.campaign_status}
                    onChange={(e) => set({ campaign_status: e.target.value })}
                    className="h-8 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="Pitched">Pitched</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Confirmed">Confirmed</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="d-invoice">Invoice status</Label>
                  <select
                    id="d-invoice"
                    value={form.invoice_status}
                    onChange={(e) => set({ invoice_status: e.target.value })}
                    className="h-8 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="Not Sent">Not Sent</option>
                    <option value="Sent">Sent</option>
                    <option value="Overdue">Overdue</option>
                    <option value="Paid">Paid</option>
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="d-payment">Payment status</Label>
                  <select
                    id="d-payment"
                    value={form.payment_status}
                    onChange={(e) => set({ payment_status: e.target.value })}
                    className="h-8 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Paid">Paid</option>
                    <option value="Overdue">Overdue</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="d-due">Due date</Label>
                  <Input id="d-due" type="date" value={form.due_date} onChange={(e) => set({ due_date: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="d-completion">Completion date</Label>
                  <Input id="d-completion" type="date" value={form.completion_date} onChange={(e) => set({ completion_date: e.target.value })} />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="d-notes">Notes</Label>
                <Input id="d-notes" value={form.notes} onChange={(e) => set({ notes: e.target.value })} />
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving…" : editing ? "Save changes" : "Add deal"}
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
              placeholder="Search deals…"
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
                  <TableHead className="pl-6">Campaign</TableHead>
                  <TableHead>Creator</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead className="text-right">Commission</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead className="pr-6 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((deal) => (
                  <TableRow key={deal.id} className="hover:bg-accent/40">
                    <TableCell className="pl-6">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{deal.campaign || "Untitled"}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {deal.due_date ? `Due ${new Date(deal.due_date).toLocaleDateString()}` : ""}
                          {deal.completion_date ? ` · Done ${new Date(deal.completion_date).toLocaleDateString()}` : ""}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{deal.creators?.creator_name ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{deal.companies?.name ?? "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {deal.deal_value != null ? `$${deal.deal_value.toLocaleString()}` : "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {deal.agency_commission != null ? `$${deal.agency_commission.toLocaleString()}` : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge className={STATUS_COLORS[deal.campaign_status ?? ""] ?? "bg-muted text-muted-foreground"}>
                        {deal.campaign_status || "—"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={PAYMENT_COLORS[deal.payment_status ?? ""] ?? "bg-muted text-muted-foreground"}>
                        {deal.payment_status || "—"}
                      </Badge>
                    </TableCell>
                    <TableCell className="pr-6 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" aria-label={`Actions for ${deal.campaign}`}>
                            <MoreVertical className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="glass-strong">
                          <DropdownMenuItem
                            onClick={() => {
                              setEditing(deal);
                              setForm({
                                creator_id: deal.creator_id ?? "",
                                company_id: deal.company_id ?? "",
                                campaign: deal.campaign ?? "",
                                deal_value: deal.deal_value != null ? String(deal.deal_value) : "",
                                agency_commission: deal.agency_commission != null ? String(deal.agency_commission) : "",
                                campaign_status: deal.campaign_status ?? "Pitched",
                                invoice_status: deal.invoice_status ?? "Not Sent",
                                payment_status: deal.payment_status ?? "Pending",
                                due_date: deal.due_date ?? "",
                                completion_date: deal.completion_date ?? "",
                                notes: deal.notes ?? "",
                              });
                              setDialogOpen(true);
                            }}
                          >
                            <Pencil className="size-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem variant="destructive" onClick={() => handleDelete(deal)}>
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
              Loading deals…
            </div>
          )}
          {!loading && filtered.length === 0 && (
            <p className="px-6 py-12 text-center text-sm text-muted-foreground">
              {loaded && deals.length === 0 ? "No deals yet. Create your first one!" : "No deals match your search."}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
