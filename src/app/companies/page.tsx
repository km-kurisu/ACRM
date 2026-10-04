"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { useUser } from "@clerk/nextjs";
import { Plus, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { CompanyInput, CompanyWithContacts } from "@/lib/types";
import { createCompany, deleteCompany, listCompanies, updateCompany } from "@/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { dateColumn, textColumn, type DataColumn } from "@/components/data-table-columns";
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
import { Checkbox } from "@/components/ui/checkbox";

type ContactForm = {
  name: string;
  role: string;
  email: string;
  phone_number: string;
  is_poc: boolean;
};

type CompanyForm = {
  name: string;
  domain: string;
  logo: string;
  industry: string;
  last_contacted: string;
  next_meeting: string;
  notes: string;
  contacts: ContactForm[];
};

const EMPTY_CONTACT: ContactForm = { name: "", role: "", email: "", phone_number: "", is_poc: false };

const EMPTY: CompanyForm = {
  name: "",
  domain: "",
  logo: "",
  industry: "",
  last_contacted: "",
  next_meeting: "",
  notes: "",
  contacts: [],
};

export default function CompaniesPage() {
  const { user } = useUser();
  const isAdmin = user?.publicMetadata?.role === "admin";
  const [companies, setCompanies] = useState<CompanyWithContacts[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CompanyWithContacts | null>(null);
  const [form, setForm] = useState<CompanyForm>(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = React.useCallback(async () => {
    try {
      const data = await listCompanies();
      setCompanies(data);
      setLoaded(true);
    } catch {
      toast.error("Could not load companies");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void (async () => {
      await load();
    })();
  }, [load]);

  function resetForm() {
    setEditing(null);
    setForm(EMPTY);
  }

  function set(v: Partial<CompanyForm>) {
    setForm((prev) => ({ ...prev, ...v }));
  }

  function updateContact(i: number, v: Partial<ContactForm>) {
    setForm((prev) => ({
      ...prev,
      contacts: prev.contacts.map((c, j) => (j === i ? { ...c, ...v } : c)),
    }));
  }

  function setPoc(i: number, checked: boolean) {
    setForm((prev) => ({
      ...prev,
      contacts: prev.contacts.map((c, j) => ({ ...c, is_poc: checked && j === i })),
    }));
  }

  function addContact() {
    setForm((prev) => ({ ...prev, contacts: [...prev.contacts, { ...EMPTY_CONTACT }] }));
  }

  function removeContact(i: number) {
    setForm((prev) => ({ ...prev, contacts: prev.contacts.filter((_, j) => j !== i) }));
  }

  function openEdit(row: CompanyWithContacts) {
    setEditing(row);
    setForm({
      name: row.name,
      domain: row.domain ?? "",
      logo: row.logo ?? "",
      industry: row.industry ?? "",
      last_contacted: row.last_contacted ?? "",
      next_meeting: row.next_meeting ?? "",
      notes: row.notes ?? "",
      contacts: (row.company_contacts ?? []).map((c) => ({
        name: c.name,
        role: c.role ?? "",
        email: c.email ?? "",
        phone_number: c.phone_number ?? "",
        is_poc: c.is_poc,
      })),
    });
    setDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: CompanyInput = {
        name: form.name.trim(),
        domain: form.domain || null,
        logo: form.logo || null,
        industry: form.industry || null,
        last_contacted: form.last_contacted || null,
        next_meeting: form.next_meeting || null,
        notes: form.notes || null,
        contacts: form.contacts
          .filter((c) => c.name.trim())
          .map((c) => ({
            name: c.name.trim(),
            role: c.role || null,
            email: c.email || null,
            phone_number: c.phone_number || null,
            is_poc: c.is_poc,
          })),
      };

      if (editing) {
        await updateCompany(editing.id, payload);
        toast.success(`Updated "${payload.name}"`);
      } else {
        await createCompany(payload);
        toast.success(`Created "${payload.name}"`);
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

  async function handleDelete(row: CompanyWithContacts) {
    if (!window.confirm(`Delete "${row.name}"? This cannot be undone.`)) return;
    try {
      await deleteCompany(row.id);
      toast.success(`Deleted "${row.name}"`);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  const columns: DataColumn<CompanyWithContacts>[] = [
    {
      key: "name",
      label: "Name",
      render: (row) => <p className="truncate font-medium">{row.name}</p>,
    },
    textColumn("domain", "Domain", (row) => row.domain),
    textColumn("industry", "Industry", (row) => row.industry),
    textColumn("poc", "POC", (row) => row.company_contacts.find((c) => c.is_poc)?.name),
    dateColumn("last_contacted", "Last contacted", (row) => row.last_contacted, "whitespace-nowrap tabular-nums text-muted-foreground"),
    dateColumn("next_meeting", "Next meeting", (row) => row.next_meeting, "whitespace-nowrap tabular-nums text-muted-foreground"),
    dateColumn("created_at", "Created", (row) => row.created_at, "whitespace-nowrap tabular-nums text-muted-foreground"),
    {
      key: "actions",
      label: "Actions",
      align: "right",
      render: (row) =>
        isAdmin && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label={`Actions for ${row.name}`}>
                <MoreVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="glass-strong">
              <DropdownMenuItem onClick={() => openEdit(row)}>
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
    useTableView("companies", columns);
  const drag = useColumnDrag(moveColumn);

  return (
    <div className="flex h-full min-h-0 flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Companies</h1>
          <p className="mt-1 text-muted-foreground">
            {loaded ? `${companies.length} compan${companies.length === 1 ? "y" : "ies"} tracked.` : "Loading companies…"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ColumnSettings
            columns={all}
            hidden={hidden}
            onToggle={toggleColumn}
            onRename={renameColumn}
          />
          <ResetColumnsButton onReset={reset} visible={canReset} />
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
                <Plus className="size-4" /> Add company
              </Button>
            </DialogTrigger>
          )}
          <DialogContent className="glass-strong max-h-[85vh] overflow-y-auto sm:max-w-4xl">
            <DialogHeader>
              <DialogTitle>{editing ? `Edit "${editing.name}"` : "Add company"}</DialogTitle>
              <DialogDescription>
                {editing ? "Update the company's details and contacts." : "Add a new company to the roster."}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="grid gap-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="co-name">Name *</Label>
                  <Input id="co-name" required value={form.name} onChange={(e) => set({ name: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="co-domain">Domain</Label>
                  <Input id="co-domain" value={form.domain} onChange={(e) => set({ domain: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="co-logo">Logo (URL)</Label>
                  <Input id="co-logo" value={form.logo} onChange={(e) => set({ logo: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="co-industry">Industry</Label>
                  <Input id="co-industry" value={form.industry} onChange={(e) => set({ industry: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="co-last-contacted">Last contacted</Label>
                  <Input id="co-last-contacted" type="date" value={form.last_contacted} onChange={(e) => set({ last_contacted: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="co-next-meeting">Next meeting</Label>
                  <Input id="co-next-meeting" type="date" value={form.next_meeting} onChange={(e) => set({ next_meeting: e.target.value })} />
                </div>
                <div className="grid gap-2 sm:col-span-2">
                  <Label htmlFor="co-notes">Notes</Label>
                  <Input id="co-notes" value={form.notes} onChange={(e) => set({ notes: e.target.value })} />
                </div>
              </div>

              <div className="grid gap-3">
                <Label>Contacts</Label>
                {form.contacts.length === 0 && (
                  <p className="text-xs text-muted-foreground">No contacts yet.</p>
                )}
                {form.contacts.map((contact, i) => (
                  <div key={i} className="glass grid gap-3 rounded-lg border border-border/40 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <label className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-1 text-sm transition-colors hover:bg-accent/60">
                        <Checkbox checked={contact.is_poc} onCheckedChange={(v) => setPoc(i, v === true)} />
                        <span className="font-medium">Point of contact</span>
                      </label>
                      <Button type="button" variant="ghost" size="icon" aria-label={`Remove contact ${i + 1}`} onClick={() => removeContact(i)}>
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="grid gap-2">
                        <Label htmlFor={`c-name-${i}`}>Name *</Label>
                        <Input id={`c-name-${i}`} value={contact.name} onChange={(e) => updateContact(i, { name: e.target.value })} />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor={`c-role-${i}`}>Role</Label>
                        <Input id={`c-role-${i}`} value={contact.role} onChange={(e) => updateContact(i, { role: e.target.value })} />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor={`c-email-${i}`}>Email</Label>
                        <Input id={`c-email-${i}`} value={contact.email} onChange={(e) => updateContact(i, { email: e.target.value })} />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor={`c-phone-${i}`}>Phone</Label>
                        <Input id={`c-phone-${i}`} value={contact.phone_number} onChange={(e) => updateContact(i, { phone_number: e.target.value })} />
                      </div>
                    </div>
                  </div>
                ))}
                <div>
                  <Button type="button" variant="outline" size="sm" onClick={addContact}>
                    <Plus className="size-4" /> Add contact
                  </Button>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving || !form.name.trim()}>
                  {saving ? "Saving…" : editing ? "Save changes" : "Add company"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="glass flex min-h-0 flex-1 flex-col">
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
                {companies.map((row) => (
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
              Loading companies…
            </div>
          )}
          {!loading && companies.length === 0 && (
            <p className="px-6 py-12 text-center text-sm text-muted-foreground">
              {loaded ? "No companies yet. Add your first one!" : ""}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
