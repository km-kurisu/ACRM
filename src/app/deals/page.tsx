"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { useUser } from "@clerk/nextjs";
import { Search, Plus, MoreVertical, Pencil, Trash2, Users, Building2 } from "lucide-react";
import { Deal, Creator, Company } from "@/lib/types";
import { createDeal, deleteDeal, listDeals, listCreators, listCompanies, updateDeal, type DealWithRefs } from "@/actions";
import { textColumn, type DataColumn } from "@/components/data-table-columns";
import { DEAL_STATUS_COLORS } from "@/lib/colors";
import { EnumSelect } from "@/components/enum-select";
import { pickOption, useDropdownOptions } from "@/lib/use-dropdown-options";
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
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";

type DealForm = {
  creator_ids: string[];
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
  creator_ids: [],
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

const PAYMENT_COLORS: Record<string, string> = {
  Paid: "bg-foreground/10 text-foreground",
  Pending: "bg-muted text-muted-foreground",
  Overdue: "bg-foreground/20 text-foreground",
};

export default function DealsPage() {
  const { user } = useUser();
  const isAdmin = user?.publicMetadata?.role === "admin";
  const dd = useDropdownOptions();

  function freshForm(): DealForm {
    return {
      ...EMPTY,
      campaign_status: pickOption(dd.options.campaign_status, EMPTY.campaign_status),
      invoice_status: pickOption(dd.options.invoice_status, EMPTY.invoice_status),
      payment_status: pickOption(dd.options.payment_status, EMPTY.payment_status),
    };
  }

  const [deals, setDeals] = useState<DealWithRefs[]>([]);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<DealWithRefs | null>(null);
  const [form, setForm] = useState<DealForm>(() => freshForm());
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
    void (async () => {
      await load();
    })();
  }, [load]);

  const filtered = query.trim()
    ? deals.filter((d) =>
        [d.campaign, d.creators.map((c) => c.creator_name).join(", "), d.companies?.name, d.campaign_status, d.payment_status].some((v) =>
          (v ?? "").toLowerCase().includes(query.toLowerCase())
        )
      )
    : deals;

  function resetForm() {
    setEditing(null);
    setForm(freshForm());
  }

  function set(v: Partial<DealForm>) {
    setForm((prev) => ({ ...prev, ...v }));
  }

  function toggleCreator(creatorId: string) {
    setForm((prev) => ({
      ...prev,
      creator_ids: prev.creator_ids.includes(creatorId)
        ? prev.creator_ids.filter((id) => id !== creatorId)
        : [...prev.creator_ids, creatorId],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const basePayload = {
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

      if (!basePayload.company_id) throw new Error("Please pick a company");
      if (form.creator_ids.length === 0) throw new Error("Please select at least one creator");

      if (editing) {
        await updateDeal(editing.id, basePayload, form.creator_ids);
        toast.success(`Updated "${basePayload.campaign}"`);
      } else {
        await createDeal(basePayload, form.creator_ids);
        toast.success(`Created "${basePayload.campaign}"`);
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

  const companyOptions = companies.map((c) => ({ id: c.id, label: c.name }));

  const columns: DataColumn<DealWithRefs>[] = [
    {
      key: "campaign",
      label: "Campaign",
      render: (deal) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{deal.campaign || "Untitled"}</p>
          <p className="truncate text-xs text-muted-foreground">
            {deal.due_date ? `Due ${new Date(deal.due_date).toLocaleDateString()}` : ""}
            {deal.completion_date ? ` · Done ${new Date(deal.completion_date).toLocaleDateString()}` : ""}
          </p>
        </div>
      ),
    },
    {
      key: "creators",
      label: "Creators",
      render: (deal) =>
        deal.creators.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {deal.creators.map((c) => (
              <Badge key={c.id} variant="outline" className="max-w-[160px] truncate">
                {c.creator_name}
              </Badge>
            ))}
          </div>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    textColumn("company", "Company", (deal) => deal.companies?.name),
    {
      key: "deal_value",
      label: "Value",
      align: "right",
      cellClassName: "tabular-nums",
      render: (deal) => (deal.deal_value != null ? `$${deal.deal_value.toLocaleString()}` : "—"),
    },
    {
      key: "agency_commission",
      label: "Commission",
      align: "right",
      cellClassName: "tabular-nums",
      render: (deal) => (deal.agency_commission != null ? `$${deal.agency_commission.toLocaleString()}` : "—"),
    },
    {
      key: "campaign_status",
      label: "Status",
      render: (deal) => (
        <Badge className={DEAL_STATUS_COLORS[deal.campaign_status ?? ""] ?? "bg-muted text-muted-foreground"}>
          {deal.campaign_status || "—"}
        </Badge>
      ),
    },
    {
      key: "payment_status",
      label: "Payment",
      render: (deal) => (
        <Badge className={PAYMENT_COLORS[deal.payment_status ?? ""] ?? "bg-muted text-muted-foreground"}>
          {deal.payment_status || "—"}
        </Badge>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      align: "right",
      render: (deal) =>
        isAdmin && (
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
                    creator_ids: deal.creators.map((c) => c.id),
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
        ),
    },
  ];

  const { ordered, all, hidden, moveColumn, toggleColumn, renameColumn, reset, canReset } =
    useTableView("deals", columns);
  const drag = useColumnDrag(moveColumn);

  return (
    <div className="flex h-full min-h-0 flex-col gap-6">
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
          {isAdmin && (
            <DialogTrigger asChild>
              <Button className="glass" variant="secondary">
                <Plus className="size-4" /> Add Deal
              </Button>
            </DialogTrigger>
          )}
          <DialogContent className="glass-strong max-h-[85vh] overflow-y-auto sm:max-w-4xl">
            <DialogHeader>
              <DialogTitle>{editing ? `Edit "${editing.campaign}"` : "Add Deal"}</DialogTitle>
              <DialogDescription>
                {editing ? "Update the deal's details." : "Link creators with a company."}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="d-campaign">Campaign *</Label>
                <Input id="d-campaign" required value={form.campaign} onChange={(e) => set({ campaign: e.target.value })} />
              </div>

              <div className="grid gap-2">
                <Label>Creators *</Label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button type="button" variant="secondary" className="glass w-fit">
                      <Users className="size-4" />
                      Creators
                      {form.creator_ids.length > 0 && (
                        <Badge className="ml-1 h-5 min-w-5 px-1 tabular-nums">{form.creator_ids.length}</Badge>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="glass-strong max-h-80 w-64 overflow-y-auto">
                    {creators.length === 0 && (
                      <p className="px-2 py-6 text-center text-xs text-muted-foreground">No creators available.</p>
                    )}
                    {creators.map((c) => (
                      <DropdownMenuCheckboxItem
                        key={c.id}
                        checked={form.creator_ids.includes(c.id)}
                        onSelect={(e) => e.preventDefault()}
                        onCheckedChange={() => toggleCreator(c.id)}
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="grid size-6 shrink-0 place-items-center rounded-full bg-foreground/10 text-xs font-semibold">
                            {c.creator_name.charAt(0).toUpperCase()}
                          </span>
                          <span className="truncate">{c.creator_name}</span>
                        </span>
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label>Company *</Label>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button type="button" variant="secondary" className="glass w-full justify-start font-normal">
                        <Building2 className="size-4 shrink-0" />
                        <span className="truncate">
                          {companyOptions.find((c) => c.id === form.company_id)?.label ?? "Select company"}
                        </span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="glass-strong max-h-80 w-64 overflow-y-auto">
                      {companyOptions.length === 0 && (
                        <p className="px-2 py-6 text-center text-xs text-muted-foreground">No companies available.</p>
                      )}
                      <DropdownMenuRadioGroup value={form.company_id} onValueChange={(v) => set({ company_id: v })}>
                        {companyOptions.map((c) => (
                          <DropdownMenuRadioItem key={c.id} value={c.id}>
                            <span className="truncate">{c.label}</span>
                          </DropdownMenuRadioItem>
                        ))}
                      </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
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
                  <EnumSelect
                    id="d-campaign-status"
                    value={form.campaign_status}
                    onChange={(v) => set({ campaign_status: v })}
                    options={dd.options.campaign_status}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="d-invoice">Invoice status</Label>
                  <EnumSelect
                    id="d-invoice"
                    value={form.invoice_status}
                    onChange={(v) => set({ invoice_status: v })}
                    options={dd.options.invoice_status}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="d-payment">Payment status</Label>
                  <EnumSelect
                    id="d-payment"
                    value={form.payment_status}
                    onChange={(v) => set({ payment_status: v })}
                    options={dd.options.payment_status}
                  />
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

      <Card className="glass flex min-h-0 flex-1 flex-col">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Search className="size-4 text-muted-foreground" />
            <Input
              placeholder="Search deals…"
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
