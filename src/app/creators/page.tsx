"use client";

import React, { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useUser } from "@clerk/nextjs";
import { Search, Plus, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { Creator } from "@/lib/types";
import { createCreator, deleteCreator, listMasterData, updateCreator, type MasterDataRow } from "@/actions";
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
import { Checkbox } from "@/components/ui/checkbox";

type CreatorForm = {
  creator_name: string;
  creator_type: string;
  instagram: string;
  youtube: string;
  x_twitter: string;
  other_platforms: string;
  email: string;
  phone_number: string;
  city: string;
  state: string;
  country: string;
  niche: string;
  followers_instagram: string;
  followers_youtube: string;
  engagement_rate: string;
  primary_content_type: string;
  languages: string;
  interested_in_exclusive_mgmt: string;
  rate_card_received: boolean;
  gst_available: boolean;
  payment_details_received: boolean;
  priority: string;
  assigned_manager: string;
  notes: string;
};

const EMPTY: CreatorForm = {
  creator_name: "",
  creator_type: "",
  instagram: "",
  youtube: "",
  x_twitter: "",
  other_platforms: "",
  email: "",
  phone_number: "",
  city: "",
  state: "",
  country: "",
  niche: "",
  followers_instagram: "",
  followers_youtube: "",
  engagement_rate: "",
  primary_content_type: "",
  languages: "",
  interested_in_exclusive_mgmt: "No",
  rate_card_received: false,
  gst_available: false,
  payment_details_received: false,
  priority: "Medium",
  assigned_manager: "",
  notes: "",
};

const PRIORITY_COLORS: Record<string, string> = {
  High: "bg-foreground/10 text-foreground",
  Medium: "bg-muted text-muted-foreground",
  Low: "bg-border/60 text-muted-foreground",
};

const MGMT_COLORS: Record<string, string> = {
  Signed: "bg-foreground/10 text-foreground",
  Negotiating: "bg-foreground/15 text-foreground",
  Prospect: "bg-muted text-muted-foreground",
};

const LANGUAGE_OPTIONS = [
  "English", "Hindi", "Japanese", "Korean", "Chinese (Mandarin)", "Spanish", "Portuguese",
  "French", "German", "Italian", "Russian", "Arabic", "Thai", "Vietnamese", "Indonesian",
  "Tagalog", "Bengali", "Tamil", "Telugu", "Marathi", "Gujarati", "Punjabi", "Urdu",
];

export default function CreatorsPage() {
  const { user } = useUser();
  const isAdmin = user?.publicMetadata?.role === "admin";
  const [rows, setRows] = useState<MasterDataRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Creator | null>(null);
  const [form, setForm] = useState<CreatorForm>(EMPTY);
  const [saving, setSaving] = useState(false);

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
    let cancelled = false;
    void (async () => {
      try {
        const data = await listMasterData();
        if (cancelled) return;
        setRows(data);
        setLoaded(true);
      } catch {
        if (!cancelled) toast.error("Could not load creators");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const filtered = query.trim()
    ? rows.filter((r) =>
        [r.creator_name, r.creator_type, r.email, r.niche, r.city, r.country, r.assigned_manager].some((v) =>
          (v ?? "").toLowerCase().includes(query.toLowerCase())
        )
      )
    : rows;

  function resetForm() {
    setEditing(null);
    setForm(EMPTY);
  }

  function set(v: Partial<CreatorForm>) {
    setForm((prev) => ({ ...prev, ...v }));
  }

  function fmtNum(value: number | null | undefined) {
    return value != null && value > 0 ? value.toLocaleString("en-IN") : "—";
  }

  function openEdit(row: MasterDataRow) {
    setEditing(row);
    setForm({
      creator_name: row.creator_name,
      creator_type: row.creator_type ?? "",
      instagram: row.instagram ?? "",
      youtube: row.youtube ?? "",
      x_twitter: row.x_twitter ?? "",
      other_platforms: row.other_platforms ?? "",
      email: row.email ?? "",
      phone_number: row.phone_number ?? "",
      city: row.city ?? "",
      state: row.state ?? "",
      country: row.country ?? "",
      niche: row.niche ?? "",
      followers_instagram: row.followers_instagram != null ? String(row.followers_instagram) : "",
      followers_youtube: row.followers_youtube != null ? String(row.followers_youtube) : "",
      engagement_rate: row.engagement_rate != null ? String(row.engagement_rate) : "",
      primary_content_type: row.primary_content_type ?? "",
      languages: row.languages ?? "",
      interested_in_exclusive_mgmt: row.interested_in_exclusive_mgmt ?? "No",
      rate_card_received: row.rate_card_received === "Yes",
      gst_available: row.gst_available === "Yes",
      payment_details_received: row.payment_details_received === "Yes",
      priority: row.priority ?? "Medium",
      assigned_manager: row.assigned_manager ?? "",
      notes: row.notes ?? "",
    });
    setDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: Partial<Creator> = {
        creator_name: form.creator_name,
        creator_type: form.creator_type || null,
        instagram: form.instagram || null,
        youtube: form.youtube || null,
        x_twitter: form.x_twitter || null,
        other_platforms: form.other_platforms || null,
        email: form.email || null,
        phone_number: form.phone_number || null,
        city: form.city || null,
        state: form.state || null,
        country: form.country || null,
        niche: form.niche || null,
        followers_instagram: form.followers_instagram ? Number(form.followers_instagram) : null,
        followers_youtube: form.followers_youtube ? Number(form.followers_youtube) : null,
        engagement_rate: form.engagement_rate ? Number(form.engagement_rate) : null,
        primary_content_type: form.primary_content_type || null,
        languages: form.languages || null,
        interested_in_exclusive_mgmt: (form.interested_in_exclusive_mgmt || null) as Creator["interested_in_exclusive_mgmt"],
        rate_card_received: form.rate_card_received ? "Yes" : "No",
        gst_available: form.gst_available ? "Yes" : "No",
        payment_details_received: form.payment_details_received ? "Yes" : "No",
        priority: (form.priority || null) as Creator["priority"],
        assigned_manager: form.assigned_manager || null,
        notes: form.notes || null,
      };
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

  return (
    <div className="flex h-full min-h-0 flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Creators</h1>
          <p className="mt-1 text-muted-foreground">
            {loaded ? `${rows.length} creator${rows.length === 1 ? "" : "s"} in the roster.` : "Loading creators…"}
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
                {editing ? "Update the creator's details." : "Add a new creator to the roster."}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="grid gap-5">
              {/* Basic Info */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="c-name">Creator Name *</Label>
                  <Input id="c-name" required value={form.creator_name} onChange={(e) => set({ creator_name: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="c-type">Creator Type</Label>
                  <select
                    id="c-type"
                    value={form.creator_type}
                    onChange={(e) => set({ creator_type: e.target.value })}
                    className="h-8 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="">—</option>
                    <option value="Individual">Individual</option>
                    <option value="Agency">Agency</option>
                    <option value="MCN">MCN</option>
                    <option value="Brand">Brand</option>
                    <option value="Studio">Studio</option>
                  </select>
                </div>
              </div>

              {/* Contact */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="c-email">Email</Label>
                  <Input id="c-email" type="email" value={form.email} onChange={(e) => set({ email: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="c-phone">Phone Number</Label>
                  <Input id="c-phone" value={form.phone_number} onChange={(e) => set({ phone_number: e.target.value })} />
                </div>
              </div>

              {/* Location */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="grid gap-2">
                  <Label htmlFor="c-city">City</Label>
                  <Input id="c-city" value={form.city} onChange={(e) => set({ city: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="c-state">State</Label>
                  <Input id="c-state" value={form.state} onChange={(e) => set({ state: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="c-country">Country</Label>
                  <Input id="c-country" value={form.country} onChange={(e) => set({ country: e.target.value })} />
                </div>
              </div>

              {/* Social Media */}
              <div className="grid gap-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Social Media</p>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="c-ig">Instagram</Label>
                  <Input id="c-ig" value={form.instagram} onChange={(e) => set({ instagram: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="c-yt">YouTube</Label>
                  <Input id="c-yt" value={form.youtube} onChange={(e) => set({ youtube: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="c-x">X (Twitter)</Label>
                  <Input id="c-x" value={form.x_twitter} onChange={(e) => set({ x_twitter: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="c-other">Other Platforms</Label>
                  <Input id="c-other" value={form.other_platforms} onChange={(e) => set({ other_platforms: e.target.value })} />
                </div>
              </div>

              {/* Content & Niche */}
              <div className="grid gap-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Content &amp; Niche</p>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="grid gap-2">
                  <Label htmlFor="c-niche">Niche</Label>
                  <select
                    id="c-niche"
                    value={form.niche}
                    onChange={(e) => set({ niche: e.target.value })}
                    className="h-8 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="">—</option>
                    <option value="Cosplay">Cosplay</option>
                    <option value="Fan Art / Illustration">Fan Art / Illustration</option>
                    <option value="AMV Editing">AMV Editing</option>
                    <option value="Anime Commentary / Review">Anime Commentary / Review</option>
                    <option value="Voice Acting / Dubbing">Voice Acting / Dubbing</option>
                    <option value="Anime News">Anime News</option>
                    <option value="Figure Collecting">Figure Collecting</option>
                    <option value="Manga Content">Manga Content</option>
                    <option value="Gaming + Anime">Gaming + Anime</option>
                    <option value="Anime Merch Reviews">Anime Merch Reviews</option>
                  </select>
                </div>
                <div className="grid gap-2 sm:col-span-2">
                  <Label htmlFor="c-content">Primary Content Type</Label>
                  <Input id="c-content" value={form.primary_content_type} onChange={(e) => set({ primary_content_type: e.target.value })} />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Languages</Label>
                <div className="flex flex-wrap gap-x-4 gap-y-2 rounded-md border border-input bg-background p-3">
                  {LANGUAGE_OPTIONS.map((lang) => (
                    <Label key={lang} className="flex items-center gap-1.5 text-sm font-normal">
                      <Checkbox
                        checked={form.languages.split(", ").filter(Boolean).includes(lang)}
                        onCheckedChange={(checked) => {
                          const current = form.languages.split(", ").filter(Boolean);
                          const next = checked
                            ? [...current, lang]
                            : current.filter((l) => l !== lang);
                          set({ languages: next.join(", ") });
                        }}
                      />
                      {lang}
                    </Label>
                  ))}
                </div>
              </div>

              {/* Metrics */}
              <div className="grid gap-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Metrics</p>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="grid gap-2">
                  <Label htmlFor="c-followers">Followers (Instagram)</Label>
                  <Input id="c-followers" type="number" min={0} value={form.followers_instagram} onChange={(e) => set({ followers_instagram: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="c-youtubers">Followers (YouTube)</Label>
                  <Input id="c-youtubers" type="number" min={0} value={form.followers_youtube} onChange={(e) => set({ followers_youtube: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="c-engagement">Engagement Rate (%)</Label>
                  <Input id="c-engagement" type="number" min={0} step="0.1" value={form.engagement_rate} onChange={(e) => set({ engagement_rate: e.target.value })} />
                </div>
              </div>

              {/* Management */}
              <div className="grid gap-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Management</p>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="grid gap-2">
                  <Label htmlFor="c-priority">Priority</Label>
                  <select
                    id="c-priority"
                    value={form.priority}
                    onChange={(e) => set({ priority: e.target.value })}
                    className="h-8 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="c-exclusive">Exclusive Mgmt Interest</Label>
                  <select
                    id="c-exclusive"
                    value={form.interested_in_exclusive_mgmt}
                    onChange={(e) => set({ interested_in_exclusive_mgmt: e.target.value })}
                    className="h-8 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                    <option value="Maybe">Maybe</option>
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="c-manager">Assigned Manager</Label>
                  <Input id="c-manager" value={form.assigned_manager} onChange={(e) => set({ assigned_manager: e.target.value })} />
                </div>
              </div>

              {/* Documents & Notes */}
              <div className="grid gap-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Documents &amp; Notes</p>
              </div>
              <div className="grid gap-3 rounded-lg border border-border/40 p-4 sm:grid-cols-3">
                <Label className="flex items-center gap-2 text-sm font-normal">
                  <Checkbox checked={form.rate_card_received} onCheckedChange={(v) => set({ rate_card_received: !!v })} />
                  Rate Card Received
                </Label>
                <Label className="flex items-center gap-2 text-sm font-normal">
                  <Checkbox checked={form.gst_available} onCheckedChange={(v) => set({ gst_available: !!v })} />
                  GST Available
                </Label>
                <Label className="flex items-center gap-2 text-sm font-normal">
                  <Checkbox checked={form.payment_details_received} onCheckedChange={(v) => set({ payment_details_received: !!v })} />
                  Payment Details Received
                </Label>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="c-notes">Notes</Label>
                <Input id="c-notes" value={form.notes} onChange={(e) => set({ notes: e.target.value })} />
              </div>
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
              Click a name to view details · Scroll right for all columns
            </span>
          </div>
        </CardHeader>
        <CardContent className="flex min-h-0 flex-1 flex-col p-0">
          <div className="min-h-0 flex-1 overflow-auto">
            <Table className="min-w-max">
              <TableHeader className="sticky top-0 z-10 bg-card/60 backdrop-blur-xl">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-6">Creator Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Niche</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead className="text-right">Followers (IG)</TableHead>
                  <TableHead className="text-right">Followers (YT)</TableHead>
                  <TableHead className="text-right">Total Reach</TableHead>
                  <TableHead className="text-right">Engagement</TableHead>
                  <TableHead>Mgmt Status</TableHead>
                  <TableHead>Manager</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead className="pr-6 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((row) => (
                  <TableRow key={row.id} className="hover:bg-accent/40">
                    <TableCell className="pl-6">
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
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{row.creator_type || "—"}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{row.niche || "—"}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{row.email || "—"}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{row.city || "—"}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{row.country || "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtNum(row.followers_instagram)}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtNum(row.followers_youtube)}</TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">{fmtNum(row.total_reach)}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.engagement_rate != null ? `${row.engagement_rate}%` : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge className={MGMT_COLORS[row.management_status ?? ""] ?? "bg-muted text-muted-foreground"}>
                        {row.management_status || "—"}
                      </Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{row.assigned_manager || "—"}</TableCell>
                    <TableCell>
                      <Badge className={PRIORITY_COLORS[row.priority ?? ""] ?? "bg-muted text-muted-foreground"}>
                        {row.priority || "—"}
                      </Badge>
                    </TableCell>
                    <TableCell className="pr-6 text-right">
                      {isAdmin && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" aria-label={`Actions for ${row.creator_name}`}>
                              <MoreVertical className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="glass-strong">
                            <DropdownMenuItem onClick={() => openEdit(row)}>
                              <Pencil className="size-4" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/creators/${row.id}`}>View Details</Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem variant="destructive" onClick={() => handleDelete(row)}>
                              <Trash2 className="size-4" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
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
              {loaded && rows.length === 0 ? "No creators yet. Add your first one!" : "No creators match your search."}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
