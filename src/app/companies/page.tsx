"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { Search, Plus, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { Company } from "@/lib/types";
import { createCompany, deleteCompany, listCompanies, updateCompany } from "@/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

type CompanyForm = {
  name: string;
  domain: string;
  logo: string;
  industry: string;
  notes: string;
};

const EMPTY: CompanyForm = {
  name: "",
  domain: "",
  logo: "",
  industry: "",
  notes: "",
};

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Company | null>(null);
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
    let cancelled = false;
    void (async () => {
      try {
        const data = await listCompanies();
        if (cancelled) return;
        setCompanies(data);
        setLoaded(true);
      } catch {
        if (!cancelled) toast.error("Could not load companies");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = query.trim()
    ? companies.filter((c) =>
        [c.name, c.domain, c.industry].some((v) => (v ?? "").toLowerCase().includes(query.toLowerCase()))
      )
    : companies;

  function resetForm() {
    setEditing(null);
    setForm(EMPTY);
  }

  function set(v: Partial<CompanyForm>) {
    setForm((prev) => ({ ...prev, ...v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: Partial<Company> = {
        name: form.name,
        domain: form.domain || null,
        logo: form.logo || null,
        industry: form.industry || null,
        notes: form.notes || null,
      };
      if (editing) {
        await updateCompany(editing.id, payload);
        toast.success(`Updated ${payload.name}`);
      } else {
        await createCompany(payload);
        toast.success(`Created ${payload.name}`);
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

  async function handleDelete(company: Company) {
    if (!window.confirm(`Delete ${company.name}? This cannot be undone.`)) return;
    try {
      await deleteCompany(company.id);
      toast.success(`Deleted ${company.name}`);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Companies</h1>
          <p className="mt-1 text-muted-foreground">
            {loaded ? `${companies.length} compan${companies.length === 1 ? "y" : "ies"} on file.` : "Loading companies…"}
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
              <Plus className="size-4" /> Add Company
            </Button>
          </DialogTrigger>
          <DialogContent className="glass-strong">
            <DialogHeader>
              <DialogTitle>{editing ? `Edit ${editing.name}` : "Add Company"}</DialogTitle>
              <DialogDescription>
                {editing ? "Update the company's details." : "Add a new partner company."}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="grid gap-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="cp-name">Name *</Label>
                  <Input id="cp-name" required value={form.name} onChange={(e) => set({ name: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="cp-domain">Domain</Label>
                  <Input id="cp-domain" value={form.domain} onChange={(e) => set({ domain: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="cp-industry">Industry</Label>
                  <Input id="cp-industry" value={form.industry} onChange={(e) => set({ industry: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="cp-logo">Logo URL</Label>
                  <Input id="cp-logo" value={form.logo} onChange={(e) => set({ logo: e.target.value })} />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="cp-notes">Notes</Label>
                <Input id="cp-notes" value={form.notes} onChange={(e) => set({ notes: e.target.value })} />
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving…" : editing ? "Save changes" : "Add company"}
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
              placeholder="Search companies…"
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
                  <TableHead className="pl-6">Company</TableHead>
                  <TableHead>Industry</TableHead>
                  <TableHead>Domain</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="pr-6 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((company) => (
                  <TableRow key={company.id} className="hover:bg-accent/40">
                    <TableCell className="pl-6">
                      <div className="flex items-center gap-3">
                        {company.logo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={company.logo}
                            alt=""
                            className="size-10 shrink-0 rounded-lg object-cover ring-1 ring-border"
                          />
                        ) : (
                          <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-sm font-semibold text-primary">
                            {company.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <p className="truncate font-medium">{company.name}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{company.industry || "—"}</TableCell>
                    <TableCell>
                      {company.domain ? (
                        <a
                          href={`https://${company.domain}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary hover:underline"
                        >
                          {company.domain}
                        </a>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[240px] truncate text-muted-foreground">{company.notes || "—"}</TableCell>
                    <TableCell className="pr-6 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" aria-label={`Actions for ${company.name}`}>
                            <MoreVertical className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="glass-strong">
                          <DropdownMenuItem
                            onClick={() => {
                              setEditing(company);
                              setForm({
                                name: company.name,
                                domain: company.domain ?? "",
                                logo: company.logo ?? "",
                                industry: company.industry ?? "",
                                notes: company.notes ?? "",
                              });
                              setDialogOpen(true);
                            }}
                          >
                            <Pencil className="size-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem variant="destructive" onClick={() => handleDelete(company)}>
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
              Loading companies…
            </div>
          )}
          {!loading && filtered.length === 0 && (
            <p className="px-6 py-12 text-center text-sm text-muted-foreground">
              {loaded && companies.length === 0 ? "No companies yet. Add your first one!" : "No companies match your search."}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
