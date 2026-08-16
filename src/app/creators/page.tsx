"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { Search, Plus, MoreVertical, Pencil, Trash2, Camera, Play } from "lucide-react";
import { Creator } from "@/lib/types";
import { createCreator, deleteCreator, listCreators, updateCreator } from "@/actions";
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
  creator_username: string;
  email: string;
  phone_number: string;
  instagram: string;
  youtube: string;
  niche: string;
  city: string;
  country: string;
  followers_instagram: string;
  followers_youtube: string;
  engagement_rate: string;
  primary_content_type: string;
  priority: string;
  interested_in_exclusive_mgmt: string;
  assigned_manager: string;
  notes: string;
  rate_card_received: boolean;
  gst_available: boolean;
  payment_details_received: boolean;
};

const EMPTY: CreatorForm = {
  creator_name: "",
  creator_username: "",
  email: "",
  phone_number: "",
  instagram: "",
  youtube: "",
  niche: "",
  city: "",
  country: "",
  followers_instagram: "",
  followers_youtube: "",
  engagement_rate: "",
  primary_content_type: "",
  priority: "Medium",
  interested_in_exclusive_mgmt: "No",
  assigned_manager: "",
  notes: "",
  rate_card_received: false,
  gst_available: false,
  payment_details_received: false,
};

const PRIORITY_COLORS: Record<string, string> = {
  High: "bg-foreground/10 text-foreground",
  Medium: "bg-muted text-muted-foreground",
  Low: "bg-border/60 text-muted-foreground",
};

export default function CreatorsPage() {
  const [creators, setCreators] = useState<Creator[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Creator | null>(null);
  const [form, setForm] = useState<CreatorForm>(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = React.useCallback(async () => {
    try {
      const data = await listCreators();
      setCreators(data);
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
        const data = await listCreators();
        if (cancelled) return;
        setCreators(data);
        setLoaded(true);
      } catch {
        if (!cancelled) toast.error("Could not load creators");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = query.trim()
    ? creators.filter((c) =>
        [c.creator_name, c.creator_username, c.email, c.niche, c.city, c.country].some((v) =>
          (v ?? "").toLowerCase().includes(query.toLowerCase())
        )
      )
    : creators;

  function resetForm() {
    setEditing(null);
    setForm(EMPTY);
  }

  function set(v: Partial<CreatorForm>) {
    setForm((prev) => ({ ...prev, ...v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: Partial<Creator> = {
        creator_name: form.creator_name,
        creator_username: form.creator_username || null,
        email: form.email || null,
        phone_number: form.phone_number || null,
        instagram: form.instagram || null,
        youtube: form.youtube || null,
        niche: form.niche || null,
        city: form.city || null,
        country: form.country || null,
        followers_instagram: form.followers_instagram ? Number(form.followers_instagram) : null,
        followers_youtube: form.followers_youtube ? Number(form.followers_youtube) : null,
        engagement_rate: form.engagement_rate ? Number(form.engagement_rate) : null,
        primary_content_type: form.primary_content_type || null,
        priority: (form.priority || null) as Creator["priority"],
        interested_in_exclusive_mgmt: (form.interested_in_exclusive_mgmt || null) as Creator["interested_in_exclusive_mgmt"],
        assigned_manager: form.assigned_manager || null,
        notes: form.notes || null,
        rate_card_received: form.rate_card_received,
        gst_available: form.gst_available,
        payment_details_received: form.payment_details_received,
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
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(creator: Creator) {
    if (!window.confirm(`Delete ${creator.creator_name}? This cannot be undone.`)) return;
    try {
      await deleteCreator(creator.id);
      toast.success(`Deleted ${creator.creator_name}`);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Creators</h1>
          <p className="mt-1 text-muted-foreground">
            {loaded ? `${creators.length} creator${creators.length === 1 ? "" : "s"} on the roster.` : "Loading roster…"}
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
              <Plus className="size-4" /> Add Creator
            </Button>
          </DialogTrigger>
          <DialogContent className="glass-strong max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? `Edit ${editing.creator_name}` : "Add Creator"}</DialogTitle>
              <DialogDescription>
                {editing ? "Update the creator's details." : "Add a new creator to the roster."}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="grid gap-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="c-name">Name *</Label>
                  <Input id="c-name" required value={form.creator_name} onChange={(e) => set({ creator_name: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="c-username">Username</Label>
                  <Input id="c-username" value={form.creator_username} onChange={(e) => set({ creator_username: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="c-email">Email</Label>
                  <Input id="c-email" type="email" value={form.email} onChange={(e) => set({ email: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="c-phone">Phone</Label>
                  <Input id="c-phone" value={form.phone_number} onChange={(e) => set({ phone_number: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="c-ig">Instagram handle</Label>
                  <Input id="c-ig" value={form.instagram} onChange={(e) => set({ instagram: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="c-yt">YouTube channel</Label>
                  <Input id="c-yt" value={form.youtube} onChange={(e) => set({ youtube: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="grid gap-2">
                  <Label htmlFor="c-niche">Niche</Label>
                  <Input id="c-niche" value={form.niche} onChange={(e) => set({ niche: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="c-type">Content type</Label>
                  <Input id="c-type" value={form.primary_content_type} onChange={(e) => set({ primary_content_type: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="c-city">City</Label>
                  <Input id="c-city" value={form.city} onChange={(e) => set({ city: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="c-country">Country</Label>
                  <Input id="c-country" value={form.country} onChange={(e) => set({ country: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="grid gap-2">
                  <Label htmlFor="c-followers">Instagram followers</Label>
                  <Input id="c-followers" type="number" min={0} value={form.followers_instagram} onChange={(e) => set({ followers_instagram: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="c-youtubers">YouTube subscribers</Label>
                  <Input id="c-youtubers" type="number" min={0} value={form.followers_youtube} onChange={(e) => set({ followers_youtube: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="c-engagement">Engagement rate (%)</Label>
                  <Input id="c-engagement" type="number" min={0} step="0.1" value={form.engagement_rate} onChange={(e) => set({ engagement_rate: e.target.value })} />
                </div>
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
                  <Label htmlFor="c-exclusive">Exclusive interest</Label>
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
                  <Label htmlFor="c-manager">Assigned manager</Label>
                  <Input id="c-manager" value={form.assigned_manager} onChange={(e) => set({ assigned_manager: e.target.value })} />
                </div>
              </div>
              <div className="grid gap-3 rounded-lg border border-border/40 p-4 sm:grid-cols-3">
                <Label className="flex items-center gap-2 text-sm font-normal">
                  <Checkbox checked={form.rate_card_received} onCheckedChange={(v) => set({ rate_card_received: !!v })} />
                  Rate card received
                </Label>
                <Label className="flex items-center gap-2 text-sm font-normal">
                  <Checkbox checked={form.gst_available} onCheckedChange={(v) => set({ gst_available: !!v })} />
                  GST available
                </Label>
                <Label className="flex items-center gap-2 text-sm font-normal">
                  <Checkbox checked={form.payment_details_received} onCheckedChange={(v) => set({ payment_details_received: !!v })} />
                  Payment details received
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

      <Card className="glass">
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Search className="size-4 text-muted-foreground" />
              <Input
                placeholder="Search creators…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full sm:w-72"
              />
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>
                High priority: <span className="font-medium tabular-nums text-foreground">{creators.filter((c) => c.priority === "High").length}</span>
              </span>
              <span>
                Exclusive: <span className="font-medium tabular-nums">{creators.filter((c) => c.interested_in_exclusive_mgmt === "Yes").length}</span>
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-6">Creator</TableHead>
                  <TableHead>Niche</TableHead>
                  <TableHead className="text-right">Followers</TableHead>
                  <TableHead className="text-right">Engagement</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Exclusive</TableHead>
                  <TableHead>Manager</TableHead>
                  <TableHead className="pr-6 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((creator) => (
                  <TableRow key={creator.id} className="hover:bg-accent/40">
                    <TableCell className="pl-6">
                      <div className="flex items-center gap-3">
                        <div className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                          {creator.creator_name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-medium">{creator.creator_name}</p>
                          <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                            {creator.instagram && (
                              <>
                                <Camera className="size-3" /> @{creator.instagram}
                              </>
                            )}
                            {creator.youtube && (
                              <>
                                <Play className="ml-2 size-3" /> {creator.youtube}
                              </>
                            )}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      <span className="block">{creator.niche || "—"}</span>
                      <span className="block text-xs">{creator.city || creator.country || ""}</span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {creator.followers_instagram ? creator.followers_instagram.toLocaleString() : "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {creator.engagement_rate != null ? `${creator.engagement_rate}%` : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge className={PRIORITY_COLORS[creator.priority ?? ""] ?? "bg-muted text-muted-foreground"}>
                        {creator.priority || "—"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{creator.interested_in_exclusive_mgmt || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{creator.assigned_manager || "—"}</TableCell>
                    <TableCell className="pr-6 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" aria-label={`Actions for ${creator.creator_name}`}>
                            <MoreVertical className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="glass-strong">
                          <DropdownMenuItem
                            onClick={() => {
                              setEditing(creator);
                              setForm({
                                creator_name: creator.creator_name,
                                creator_username: creator.creator_username ?? "",
                                email: creator.email ?? "",
                                phone_number: creator.phone_number ?? "",
                                instagram: creator.instagram ?? "",
                                youtube: creator.youtube ?? "",
                                niche: creator.niche ?? "",
                                city: creator.city ?? "",
                                country: creator.country ?? "",
                                followers_instagram: creator.followers_instagram != null ? String(creator.followers_instagram) : "",
                                followers_youtube: creator.followers_youtube != null ? String(creator.followers_youtube) : "",
                                engagement_rate: creator.engagement_rate != null ? String(creator.engagement_rate) : "",
                                primary_content_type: creator.primary_content_type ?? "",
                                priority: creator.priority ?? "Medium",
                                interested_in_exclusive_mgmt: creator.interested_in_exclusive_mgmt ?? "No",
                                assigned_manager: creator.assigned_manager ?? "",
                                notes: creator.notes ?? "",
                                rate_card_received: creator.rate_card_received ?? false,
                                gst_available: creator.gst_available ?? false,
                                payment_details_received: creator.payment_details_received ?? false,
                              });
                              setDialogOpen(true);
                            }}
                          >
                            <Pencil className="size-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem variant="destructive" onClick={() => handleDelete(creator)}>
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
              Loading creators…
            </div>
          )}
          {!loading && filtered.length === 0 && (
            <p className="px-6 py-12 text-center text-sm text-muted-foreground">
              {loaded && creators.length === 0 ? "No creators yet. Add your first one!" : "No creators match your search."}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
