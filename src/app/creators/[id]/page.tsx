"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { useUser } from "@clerk/nextjs";
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  MoreVertical,
  Megaphone,
  FileText,
  Handshake,
} from "lucide-react";
import {
  getCreator,
  updateCreator,
  deleteCreator,
  listOutreachByCreator,
  createOutreach,
  updateOutreach,
  deleteOutreach,
  listContractsByCreator,
  createContract,
  updateContract,
  deleteContract,
  listDealsByCreator,
  createDeal,
  updateDeal,
  deleteDeal,
  listCompanies,
  type MasterDataRow,
  listMasterData,
} from "@/actions";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import type { Creator, Outreach, Contract, Deal, Company } from "@/lib/types";

const PRIORITY_COLORS: Record<string, string> = {
  High: "bg-foreground/10 text-foreground",
  Medium: "bg-muted text-muted-foreground",
  Low: "bg-border/60 text-muted-foreground",
};

const OUTREACH_STATUS_COLORS: Record<string, string> = {
  Negotiating: "bg-foreground/10 text-foreground",
  Interested: "bg-foreground/10 text-foreground",
  Signed: "bg-foreground/10 text-foreground",
  "Awaiting Reply": "bg-foreground/15 text-foreground",
  "On Hold": "bg-foreground/15 text-foreground",
  "Not Interested": "bg-muted text-muted-foreground line-through",
  "No Response": "bg-muted text-muted-foreground",
};

const CONTRACT_STATUS_COLORS: Record<string, string> = {
  Active: "bg-foreground/10 text-foreground",
  Draft: "bg-muted text-muted-foreground",
  Renewed: "bg-foreground/10 text-foreground",
  Expired: "bg-muted text-muted-foreground",
  Terminated: "bg-border/60 text-muted-foreground line-through",
};

const DEAL_STATUS_COLORS: Record<string, string> = {
  Pitched: "bg-muted text-muted-foreground",
  "In Progress": "bg-foreground/10 text-foreground",
  Confirmed: "bg-foreground/10 text-foreground",
  Completed: "bg-muted text-muted-foreground",
  Cancelled: "bg-border/60 text-muted-foreground line-through",
};

export default function CreatorDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { user } = useUser();
  const isAdmin = user?.publicMetadata?.role === "admin";

  const [creator, setCreator] = useState<Creator | null>(null);
  const [masterRow, setMasterRow] = useState<MasterDataRow | null>(null);
  const [outreach, setOutreach] = useState<Outreach[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  const [creatorDialogOpen, setCreatorDialogOpen] = useState(false);
  const [creatorForm, setCreatorForm] = useState({
    creator_name: "",
    creator_type: "",
    instagram: "",
    youtube: "",
    x_twitter: "",
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
  });

  const [outreachDialogOpen, setOutreachDialogOpen] = useState(false);
  const [outreachEditing, setOutreachEditing] = useState<Outreach | null>(null);
  const [outreachForm, setOutreachForm] = useState({
    contact_method: "Email",
    date_contacted: "",
    next_follow_up_date: "",
    current_status: "No Response",
    outcome: "Pending",
    notes: "",
  });

  const [contractDialogOpen, setContractDialogOpen] = useState(false);
  const [contractEditing, setContractEditing] = useState<Contract | null>(null);
  const [contractForm, setContractForm] = useState({
    contract_type: "Exclusive Management",
    contract_status: "Draft",
    start_date: "",
    end_date: "",
    exclusivity: "No",
    renewal_reminder: "",
    notes: "",
  });

  const [dealDialogOpen, setDealDialogOpen] = useState(false);
  const [dealEditing, setDealEditing] = useState<Deal | null>(null);
  const [dealForm, setDealForm] = useState({
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
  });

  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [c, rows, o, ct, dl, comp] = await Promise.all([
        getCreator(id),
        listMasterData(),
        listOutreachByCreator(id),
        listContractsByCreator(id),
        listDealsByCreator(id),
        listCompanies(),
      ]);
      setCreator(c);
      setMasterRow(rows.find((r) => r.id === id) ?? null);
      setOutreach(o);
      setContracts(ct);
      setDeals(dl);
      setCompanies(comp);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await load();
      if (cancelled) return;
    })();
    return () => { cancelled = true; };
  }, [load]);

  async function handleCreatorSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: Partial<Creator> = {
        creator_name: creatorForm.creator_name,
        creator_type: creatorForm.creator_type || null,
        instagram: creatorForm.instagram || null,
        youtube: creatorForm.youtube || null,
        x_twitter: creatorForm.x_twitter || null,
        email: creatorForm.email || null,
        phone_number: creatorForm.phone_number || null,
        city: creatorForm.city || null,
        state: creatorForm.state || null,
        country: creatorForm.country || null,
        niche: creatorForm.niche || null,
        followers_instagram: creatorForm.followers_instagram ? Number(creatorForm.followers_instagram) : null,
        followers_youtube: creatorForm.followers_youtube ? Number(creatorForm.followers_youtube) : null,
        engagement_rate: creatorForm.engagement_rate ? Number(creatorForm.engagement_rate) : null,
        primary_content_type: creatorForm.primary_content_type || null,
        languages: creatorForm.languages || null,
        interested_in_exclusive_mgmt: creatorForm.interested_in_exclusive_mgmt as Creator["interested_in_exclusive_mgmt"],
        rate_card_received: creatorForm.rate_card_received ? "Yes" : "No",
        gst_available: creatorForm.gst_available ? "Yes" : "No",
        payment_details_received: creatorForm.payment_details_received ? "Yes" : "No",
        priority: creatorForm.priority as Creator["priority"],
        assigned_manager: creatorForm.assigned_manager || null,
        notes: creatorForm.notes || null,
      };
      await updateCreator(id, payload);
      toast.success("Creator updated");
      setCreatorDialogOpen(false);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteCreator() {
    if (!window.confirm(`Delete ${creator?.creator_name}? This cannot be undone.`)) return;
    try {
      await deleteCreator(id);
      toast.success("Creator deleted");
      window.location.href = "/creators";
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  async function handleOutreachSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: Partial<Outreach> = {
        creator_id: id,
        contact_method: outreachForm.contact_method || null,
        date_contacted: outreachForm.date_contacted || null,
        next_follow_up_date: outreachForm.next_follow_up_date || null,
        current_status: outreachForm.current_status || null,
        outcome: outreachForm.outcome || null,
        notes: outreachForm.notes || null,
      };
      if (outreachEditing) {
        await updateOutreach(outreachEditing.id, payload);
        toast.success("Outreach updated");
      } else {
        await createOutreach(payload);
        toast.success("Outreach created");
      }
      setOutreachDialogOpen(false);
      setOutreachEditing(null);
      setOutreachForm({ contact_method: "Email", date_contacted: "", next_follow_up_date: "", current_status: "No Response", outcome: "Pending", notes: "" });
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteOutreach(item: Outreach) {
    if (!window.confirm("Delete this outreach record?")) return;
    try {
      await deleteOutreach(item.id);
      toast.success("Outreach deleted");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  async function handleContractSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: Partial<Contract> = {
        creator_id: id,
        contract_type: contractForm.contract_type || null,
        contract_status: contractForm.contract_status || null,
        start_date: contractForm.start_date || null,
        end_date: contractForm.end_date || null,
        exclusivity: contractForm.exclusivity || null,
        renewal_reminder: contractForm.renewal_reminder || null,
        notes: contractForm.notes || null,
      };
      if (contractEditing) {
        await updateContract(contractEditing.id, payload);
        toast.success("Contract updated");
      } else {
        await createContract(payload);
        toast.success("Contract created");
      }
      setContractDialogOpen(false);
      setContractEditing(null);
      setContractForm({ contract_type: "Exclusive Management", contract_status: "Draft", start_date: "", end_date: "", exclusivity: "No", renewal_reminder: "", notes: "" });
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteContract(item: Contract) {
    if (!window.confirm("Delete this contract?")) return;
    try {
      await deleteContract(item.id);
      toast.success("Contract deleted");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  async function handleDealSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: Partial<Deal> = {
        creator_id: id,
        company_id: dealForm.company_id || null,
        campaign: dealForm.campaign || null,
        deal_value: dealForm.deal_value ? Number(dealForm.deal_value) : null,
        agency_commission: dealForm.agency_commission ? Number(dealForm.agency_commission) : null,
        campaign_status: dealForm.campaign_status || null,
        invoice_status: dealForm.invoice_status || null,
        payment_status: dealForm.payment_status || null,
        due_date: dealForm.due_date || null,
        completion_date: dealForm.completion_date || null,
        notes: dealForm.notes || null,
      };
      if (dealEditing) {
        await updateDeal(dealEditing.id, payload);
        toast.success("Deal updated");
      } else {
        await createDeal(payload);
        toast.success("Deal created");
      }
      setDealDialogOpen(false);
      setDealEditing(null);
      setDealForm({ company_id: "", campaign: "", deal_value: "", agency_commission: "", campaign_status: "Pitched", invoice_status: "Not Sent", payment_status: "Pending", due_date: "", completion_date: "", notes: "" });
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteDeal(item: Deal) {
    if (!window.confirm("Delete this deal?")) return;
    try {
      await deleteDeal(item.id);
      toast.success("Deal deleted");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-3 py-24 text-muted-foreground">
        <div className="size-4 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
        Loading creator…
      </div>
    );
  }

  if (!creator) {
    return (
      <div className="py-24 text-center text-muted-foreground">
        <p>Creator not found.</p>
        <Link href="/creators" className="mt-2 inline-flex items-center gap-1 text-sm text-primary hover:underline">
          <ArrowLeft className="size-3" /> Back to creators
        </Link>
      </div>
    );
  }

  const fmtDate = (v: string | null | undefined) => (v ? new Date(v).toLocaleDateString() : "—");
  const fmtNum = (v: number | null | undefined) => (v != null && v > 0 ? v.toLocaleString() : "—");

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/creators" className="rounded-lg p-1.5 transition-colors hover:bg-accent">
            <ArrowLeft className="size-4" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{creator.creator_name}</h1>
            <p className="mt-1 text-muted-foreground">
              {creator.creator_type ? creator.creator_type : ""}
              {creator.niche ? ` · ${creator.niche}` : ""}
            </p>
          </div>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              className="glass"
              onClick={() => {
                setCreatorForm({
                  creator_name: creator.creator_name,
                  creator_type: creator.creator_type ?? "",
                  instagram: creator.instagram ?? "",
                  youtube: creator.youtube ?? "",
                  x_twitter: creator.x_twitter ?? "",
                  email: creator.email ?? "",
                  phone_number: creator.phone_number ?? "",
                  city: creator.city ?? "",
                  state: creator.state ?? "",
                  country: creator.country ?? "",
                  niche: creator.niche ?? "",
                  followers_instagram: creator.followers_instagram != null ? String(creator.followers_instagram) : "",
                  followers_youtube: creator.followers_youtube != null ? String(creator.followers_youtube) : "",
                  engagement_rate: creator.engagement_rate != null ? String(creator.engagement_rate) : "",
                  primary_content_type: creator.primary_content_type ?? "",
                  languages: creator.languages ?? "",
                  interested_in_exclusive_mgmt: creator.interested_in_exclusive_mgmt ?? "No",
                  rate_card_received: creator.rate_card_received === "Yes",
                  gst_available: creator.gst_available === "Yes",
                  payment_details_received: creator.payment_details_received === "Yes",
                  priority: creator.priority ?? "Medium",
                  assigned_manager: creator.assigned_manager ?? "",
                  notes: creator.notes ?? "",
                });
                setCreatorDialogOpen(true);
              }}
            >
              <Pencil className="size-4" /> Edit
            </Button>
            <Button variant="destructive" onClick={handleDeleteCreator}>
              <Trash2 className="size-4" /> Delete
            </Button>
          </div>
        )}
      </div>

      {/* Creator Edit Dialog */}
      <Dialog open={creatorDialogOpen} onOpenChange={setCreatorDialogOpen}>
        <DialogContent className="glass-strong max-h-[85vh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Edit {creator.creator_name}</DialogTitle>
            <DialogDescription>Update the creator&apos;s details.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreatorSubmit} className="grid gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Creator Name *</Label>
                <Input required value={creatorForm.creator_name} onChange={(e) => setCreatorForm((p) => ({ ...p, creator_name: e.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label>Creator Type</Label>
                <select value={creatorForm.creator_type} onChange={(e) => setCreatorForm((p) => ({ ...p, creator_type: e.target.value }))} className="h-8 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                  <option value="">—</option>
                  <option value="Individual">Individual</option>
                  <option value="Agency">Agency</option>
                  <option value="MCN">MCN</option>
                  <option value="Brand">Brand</option>
                  <option value="Studio">Studio</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="grid gap-2">
                <Label>Email</Label>
                <Input type="email" value={creatorForm.email} onChange={(e) => setCreatorForm((p) => ({ ...p, email: e.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label>Phone</Label>
                <Input value={creatorForm.phone_number} onChange={(e) => setCreatorForm((p) => ({ ...p, phone_number: e.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label>Niche</Label>
                <select value={creatorForm.niche} onChange={(e) => setCreatorForm((p) => ({ ...p, niche: e.target.value }))} className="h-8 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
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
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="grid gap-2">
                <Label>Instagram</Label>
                <Input value={creatorForm.instagram} onChange={(e) => setCreatorForm((p) => ({ ...p, instagram: e.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label>YouTube</Label>
                <Input value={creatorForm.youtube} onChange={(e) => setCreatorForm((p) => ({ ...p, youtube: e.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label>X (Twitter)</Label>
                <Input value={creatorForm.x_twitter} onChange={(e) => setCreatorForm((p) => ({ ...p, x_twitter: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="grid gap-2">
                <Label>City</Label>
                <Input value={creatorForm.city} onChange={(e) => setCreatorForm((p) => ({ ...p, city: e.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label>State</Label>
                <Input value={creatorForm.state} onChange={(e) => setCreatorForm((p) => ({ ...p, state: e.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label>Country</Label>
                <Input value={creatorForm.country} onChange={(e) => setCreatorForm((p) => ({ ...p, country: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="grid gap-2">
                <Label>Followers (Instagram)</Label>
                <Input type="number" min={0} value={creatorForm.followers_instagram} onChange={(e) => setCreatorForm((p) => ({ ...p, followers_instagram: e.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label>Followers (YouTube)</Label>
                <Input type="number" min={0} value={creatorForm.followers_youtube} onChange={(e) => setCreatorForm((p) => ({ ...p, followers_youtube: e.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label>Engagement Rate (%)</Label>
                <Input type="number" min={0} step="0.1" value={creatorForm.engagement_rate} onChange={(e) => setCreatorForm((p) => ({ ...p, engagement_rate: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="grid gap-2">
                <Label>Priority</Label>
                <select value={creatorForm.priority} onChange={(e) => setCreatorForm((p) => ({ ...p, priority: e.target.value }))} className="h-8 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>
              <div className="grid gap-2">
                <Label>Exclusive Mgmt Interest</Label>
                <select value={creatorForm.interested_in_exclusive_mgmt} onChange={(e) => setCreatorForm((p) => ({ ...p, interested_in_exclusive_mgmt: e.target.value }))} className="h-8 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                  <option value="Maybe">Maybe</option>
                </select>
              </div>
              <div className="grid gap-2">
                <Label>Assigned Manager</Label>
                <Input value={creatorForm.assigned_manager} onChange={(e) => setCreatorForm((p) => ({ ...p, assigned_manager: e.target.value }))} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Notes</Label>
              <Input value={creatorForm.notes} onChange={(e) => setCreatorForm((p) => ({ ...p, notes: e.target.value }))} />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setCreatorDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save changes"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Info Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="glass">
          <CardHeader><CardTitle>Contact &amp; Social</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Field label="Email" value={creator.email} />
            <Field label="Phone" value={creator.phone_number} />
            <Field label="Instagram" value={creator.instagram} />
            <Field label="YouTube" value={creator.youtube} />
            <Field label="X (Twitter)" value={creator.x_twitter} />
          </CardContent>
        </Card>
        <Card className="glass">
          <CardHeader><CardTitle>Location</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Field label="City" value={creator.city} />
            <Field label="State" value={creator.state} />
            <Field label="Country" value={creator.country} />
          </CardContent>
        </Card>
        <Card className="glass">
          <CardHeader><CardTitle>Audience</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Field label="Instagram Followers" value={fmtNum(creator.followers_instagram)} />
            <Field label="YouTube Followers" value={fmtNum(creator.followers_youtube)} />
            <div><p className="text-xs text-muted-foreground">Total Reach</p><p className="text-sm font-bold">{fmtNum((creator.followers_instagram ?? 0) + (creator.followers_youtube ?? 0))}</p></div>
            <Field label="Engagement Rate" value={creator.engagement_rate != null ? `${creator.engagement_rate}%` : "—"} />
            <Field label="Content Type" value={creator.primary_content_type} />
            <Field label="Languages" value={creator.languages} />
          </CardContent>
        </Card>
        <Card className="glass">
          <CardHeader><CardTitle>Management</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div><p className="text-xs text-muted-foreground">Priority</p><Badge className={PRIORITY_COLORS[creator.priority ?? ""] ?? "bg-muted text-muted-foreground"}>{creator.priority || "—"}</Badge></div>
            <Field label="Exclusive Mgmt" value={creator.interested_in_exclusive_mgmt} />
            <Field label="Manager" value={creator.assigned_manager} />
            <Field label="Rate Card" value={creator.rate_card_received} />
            <Field label="GST" value={creator.gst_available} />
            <Field label="Payment Details" value={creator.payment_details_received} />
          </CardContent>
        </Card>
      </div>

      {masterRow && (
        <Card className="glass">
          <CardHeader><CardTitle>Pipeline Status</CardTitle></CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            <Field label="Management Status" value={masterRow.management_status} />
            <Field label="Contract Status" value={masterRow.contract_status} />
            <Field label="Outreach Outcome" value={masterRow.outreach_outcome} />
            <Field label="First Contacted" value={fmtDate(masterRow.date_first_contacted)} />
            <Field label="Next Follow-up" value={fmtDate(masterRow.next_follow_up_date)} />
          </CardContent>
        </Card>
      )}

      {creator.notes && (
        <Card className="glass">
          <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
          <CardContent><p className="text-sm text-muted-foreground">{creator.notes}</p></CardContent>
        </Card>
      )}

      {/* Outreach Section */}
      <Card className="glass">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Megaphone className="size-4 text-muted-foreground" />
            <CardTitle>Outreach</CardTitle>
            <Badge variant="outline">{outreach.length}</Badge>
          </div>
          {isAdmin && (
            <Dialog open={outreachDialogOpen} onOpenChange={(open) => { setOutreachDialogOpen(open); if (!open) { setOutreachEditing(null); setOutreachForm({ contact_method: "Email", date_contacted: "", next_follow_up_date: "", current_status: "No Response", outcome: "Pending", notes: "" }); } }}>
              <DialogTrigger asChild>
                <Button size="sm" variant="secondary" className="glass"><Plus className="size-3" /> Add</Button>
              </DialogTrigger>
              <DialogContent className="glass-strong sm:max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{outreachEditing ? "Edit Outreach" : "Add Outreach"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleOutreachSubmit} className="grid gap-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <Label>Contact Method</Label>
                      <select value={outreachForm.contact_method} onChange={(e) => setOutreachForm((p) => ({ ...p, contact_method: e.target.value }))} className="h-8 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                        <option value="Email">Email</option>
                        <option value="Instagram">Instagram</option>
                        <option value="X (Twitter)">X (Twitter)</option>
                        <option value="WhatsApp">WhatsApp</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div className="grid gap-2">
                      <Label>Status</Label>
                      <select value={outreachForm.current_status} onChange={(e) => setOutreachForm((p) => ({ ...p, current_status: e.target.value }))} className="h-8 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                        <option value="No Response">No Response</option>
                        <option value="Awaiting Reply">Awaiting Reply</option>
                        <option value="Interested">Interested</option>
                        <option value="Not Interested">Not Interested</option>
                        <option value="Negotiating">Negotiating</option>
                        <option value="Signed">Signed</option>
                        <option value="On Hold">On Hold</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="grid gap-2"><Label>Date Contacted</Label><Input type="date" value={outreachForm.date_contacted} onChange={(e) => setOutreachForm((p) => ({ ...p, date_contacted: e.target.value }))} /></div>
                    <div className="grid gap-2"><Label>Next Follow-up</Label><Input type="date" value={outreachForm.next_follow_up_date} onChange={(e) => setOutreachForm((p) => ({ ...p, next_follow_up_date: e.target.value }))} /></div>
                  </div>
                  <div className="grid gap-2">
                    <Label>Outcome</Label>
                    <select value={outreachForm.outcome} onChange={(e) => setOutreachForm((p) => ({ ...p, outcome: e.target.value }))} className="h-8 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                      <option value="Pending">Pending</option>
                      <option value="Signed">Signed</option>
                      <option value="Rejected">Rejected</option>
                      <option value="No Response">No Response</option>
                    </select>
                  </div>
                  <div className="grid gap-2"><Label>Notes</Label><Input value={outreachForm.notes} onChange={(e) => setOutreachForm((p) => ({ ...p, notes: e.target.value }))} /></div>
                  <DialogFooter>
                    <Button type="button" variant="ghost" onClick={() => setOutreachDialogOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={saving}>{saving ? "Saving…" : outreachEditing ? "Save" : "Add"}</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </CardHeader>
        <CardContent className="space-y-1">
          {outreach.length === 0 && <p className="text-sm text-muted-foreground">No outreach records yet.</p>}
          {outreach.map((o) => (
            <div key={o.id} className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-accent/60">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{o.contact_method || "—"}</Badge>
                  <Badge className={OUTREACH_STATUS_COLORS[o.current_status ?? ""] ?? "bg-muted text-muted-foreground"}>{o.current_status || "—"}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {o.date_contacted ? `Contacted ${fmtDate(o.date_contacted)}` : ""}
                  {o.next_follow_up_date ? ` · Follow-up ${fmtDate(o.next_follow_up_date)}` : ""}
                  {o.outcome ? ` · ${o.outcome}` : ""}
                </p>
                {o.notes && <p className="mt-1 text-xs text-muted-foreground truncate max-w-md">{o.notes}</p>}
              </div>
              {isAdmin && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon"><MoreVertical className="size-4" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="glass-strong">
                    <DropdownMenuItem onClick={() => { setOutreachEditing(o); setOutreachForm({ contact_method: o.contact_method ?? "Email", date_contacted: o.date_contacted ?? "", next_follow_up_date: o.next_follow_up_date ?? "", current_status: o.current_status ?? "No Response", outcome: o.outcome ?? "Pending", notes: o.notes ?? "" }); setOutreachDialogOpen(true); }}>
                      <Pencil className="size-4" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onClick={() => handleDeleteOutreach(o)}>
                      <Trash2 className="size-4" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Contracts Section */}
      <Card className="glass">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="size-4 text-muted-foreground" />
            <CardTitle>Contracts</CardTitle>
            <Badge variant="outline">{contracts.length}</Badge>
          </div>
          {isAdmin && (
            <Dialog open={contractDialogOpen} onOpenChange={(open) => { setContractDialogOpen(open); if (!open) { setContractEditing(null); setContractForm({ contract_type: "Exclusive Management", contract_status: "Draft", start_date: "", end_date: "", exclusivity: "No", renewal_reminder: "", notes: "" }); } }}>
              <DialogTrigger asChild>
                <Button size="sm" variant="secondary" className="glass"><Plus className="size-3" /> Add</Button>
              </DialogTrigger>
              <DialogContent className="glass-strong sm:max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{contractEditing ? "Edit Contract" : "Add Contract"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleContractSubmit} className="grid gap-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div className="grid gap-2">
                      <Label>Contract Type</Label>
                      <select value={contractForm.contract_type} onChange={(e) => setContractForm((p) => ({ ...p, contract_type: e.target.value }))} className="h-8 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                        <option value="Exclusive Management">Exclusive Management</option>
                        <option value="Non-Exclusive Management">Non-Exclusive Management</option>
                        <option value="Brand Deal Only">Brand Deal Only</option>
                        <option value="Project-Based">Project-Based</option>
                        <option value="Ambassadorship">Ambassadorship</option>
                      </select>
                    </div>
                    <div className="grid gap-2">
                      <Label>Status</Label>
                      <select value={contractForm.contract_status} onChange={(e) => setContractForm((p) => ({ ...p, contract_status: e.target.value }))} className="h-8 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                        <option value="Draft">Draft</option>
                        <option value="Active">Active</option>
                        <option value="Renewed">Renewed</option>
                        <option value="Expired">Expired</option>
                        <option value="Terminated">Terminated</option>
                      </select>
                    </div>
                    <div className="grid gap-2">
                      <Label>Exclusivity</Label>
                      <select value={contractForm.exclusivity} onChange={(e) => setContractForm((p) => ({ ...p, exclusivity: e.target.value }))} className="h-8 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                        <option value="No">No</option>
                        <option value="Yes">Yes</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div className="grid gap-2"><Label>Start Date</Label><Input type="date" value={contractForm.start_date} onChange={(e) => setContractForm((p) => ({ ...p, start_date: e.target.value }))} /></div>
                    <div className="grid gap-2"><Label>End Date</Label><Input type="date" value={contractForm.end_date} onChange={(e) => setContractForm((p) => ({ ...p, end_date: e.target.value }))} /></div>
                    <div className="grid gap-2"><Label>Renewal Reminder</Label><Input type="date" value={contractForm.renewal_reminder} onChange={(e) => setContractForm((p) => ({ ...p, renewal_reminder: e.target.value }))} /></div>
                  </div>
                  <div className="grid gap-2"><Label>Notes</Label><Input value={contractForm.notes} onChange={(e) => setContractForm((p) => ({ ...p, notes: e.target.value }))} /></div>
                  <DialogFooter>
                    <Button type="button" variant="ghost" onClick={() => setContractDialogOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={saving}>{saving ? "Saving…" : contractEditing ? "Save" : "Add"}</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </CardHeader>
        <CardContent className="space-y-1">
          {contracts.length === 0 && <p className="text-sm text-muted-foreground">No contracts yet.</p>}
          {contracts.map((c) => (
            <div key={c.id} className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-accent/60">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{c.contract_type || "—"}</Badge>
                  <Badge className={CONTRACT_STATUS_COLORS[c.contract_status ?? ""] ?? "bg-muted text-muted-foreground"}>{c.contract_status || "—"}</Badge>
                  {c.exclusivity === "Yes" && <Badge className="bg-foreground/10 text-foreground text-xs">Exclusive</Badge>}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {c.start_date ? `${fmtDate(c.start_date)}` : ""}
                  {c.end_date ? ` → ${fmtDate(c.end_date)}` : ""}
                  {c.renewal_reminder ? ` · Renewal ${fmtDate(c.renewal_reminder)}` : ""}
                </p>
              </div>
              {isAdmin && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon"><MoreVertical className="size-4" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="glass-strong">
                    <DropdownMenuItem onClick={() => { setContractEditing(c); setContractForm({ contract_type: c.contract_type ?? "Exclusive Management", contract_status: c.contract_status ?? "Draft", start_date: c.start_date ?? "", end_date: c.end_date ?? "", exclusivity: c.exclusivity ?? "No", renewal_reminder: c.renewal_reminder ?? "", notes: c.notes ?? "" }); setContractDialogOpen(true); }}>
                      <Pencil className="size-4" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onClick={() => handleDeleteContract(c)}>
                      <Trash2 className="size-4" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Deals Section */}
      <Card className="glass">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Handshake className="size-4 text-muted-foreground" />
            <CardTitle>Deals</CardTitle>
            <Badge variant="outline">{deals.length}</Badge>
          </div>
          {isAdmin && (
            <Dialog open={dealDialogOpen} onOpenChange={(open) => { setDealDialogOpen(open); if (!open) { setDealEditing(null); setDealForm({ company_id: "", campaign: "", deal_value: "", agency_commission: "", campaign_status: "Pitched", invoice_status: "Not Sent", payment_status: "Pending", due_date: "", completion_date: "", notes: "" }); } }}>
              <DialogTrigger asChild>
                <Button size="sm" variant="secondary" className="glass"><Plus className="size-3" /> Add</Button>
              </DialogTrigger>
              <DialogContent className="glass-strong sm:max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{dealEditing ? "Edit Deal" : "Add Deal"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleDealSubmit} className="grid gap-4">
                  <div className="grid gap-2">
                    <Label>Company *</Label>
                    <select required value={dealForm.company_id} onChange={(e) => setDealForm((p) => ({ ...p, company_id: e.target.value }))} className="h-8 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                      <option value="">Select company</option>
                      {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="grid gap-2"><Label>Campaign *</Label><Input required value={dealForm.campaign} onChange={(e) => setDealForm((p) => ({ ...p, campaign: e.target.value }))} /></div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="grid gap-2"><Label>Deal Value ($)</Label><Input type="number" min={0} value={dealForm.deal_value} onChange={(e) => setDealForm((p) => ({ ...p, deal_value: e.target.value }))} /></div>
                    <div className="grid gap-2"><Label>Commission ($)</Label><Input type="number" min={0} value={dealForm.agency_commission} onChange={(e) => setDealForm((p) => ({ ...p, agency_commission: e.target.value }))} /></div>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div className="grid gap-2">
                      <Label>Campaign Status</Label>
                      <select value={dealForm.campaign_status} onChange={(e) => setDealForm((p) => ({ ...p, campaign_status: e.target.value }))} className="h-8 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                        <option value="Pitched">Pitched</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Confirmed">Confirmed</option>
                        <option value="Completed">Completed</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                    </div>
                    <div className="grid gap-2">
                      <Label>Invoice Status</Label>
                      <select value={dealForm.invoice_status} onChange={(e) => setDealForm((p) => ({ ...p, invoice_status: e.target.value }))} className="h-8 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                        <option value="Not Sent">Not Sent</option>
                        <option value="Sent">Sent</option>
                        <option value="Overdue">Overdue</option>
                      </select>
                    </div>
                    <div className="grid gap-2">
                      <Label>Payment Status</Label>
                      <select value={dealForm.payment_status} onChange={(e) => setDealForm((p) => ({ ...p, payment_status: e.target.value }))} className="h-8 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                        <option value="Pending">Pending</option>
                        <option value="Partial">Partial</option>
                        <option value="Paid">Paid</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="grid gap-2"><Label>Due Date</Label><Input type="date" value={dealForm.due_date} onChange={(e) => setDealForm((p) => ({ ...p, due_date: e.target.value }))} /></div>
                    <div className="grid gap-2"><Label>Completion Date</Label><Input type="date" value={dealForm.completion_date} onChange={(e) => setDealForm((p) => ({ ...p, completion_date: e.target.value }))} /></div>
                  </div>
                  <div className="grid gap-2"><Label>Notes</Label><Input value={dealForm.notes} onChange={(e) => setDealForm((p) => ({ ...p, notes: e.target.value }))} /></div>
                  <DialogFooter>
                    <Button type="button" variant="ghost" onClick={() => setDealDialogOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={saving}>{saving ? "Saving…" : dealEditing ? "Save" : "Add"}</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </CardHeader>
        <CardContent className="space-y-1">
          {deals.length === 0 && <p className="text-sm text-muted-foreground">No deals yet.</p>}
          {deals.map((d) => (
            <div key={d.id} className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-accent/60">
              <div className="min-w-0">
                <p className="text-sm font-medium">{d.campaign || "Untitled"}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className={DEAL_STATUS_COLORS[d.campaign_status ?? ""] ?? "bg-muted text-muted-foreground"}>{d.campaign_status || "—"}</Badge>
                  <Badge variant="outline">{d.payment_status || "—"}</Badge>
                  {d.deal_value != null && <span className="text-xs text-muted-foreground">${d.deal_value.toLocaleString()}</span>}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {d.due_date ? `Due ${fmtDate(d.due_date)}` : ""}
                  {d.completion_date ? ` · Done ${fmtDate(d.completion_date)}` : ""}
                </p>
              </div>
              {isAdmin && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon"><MoreVertical className="size-4" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="glass-strong">
                    <DropdownMenuItem onClick={() => { setDealEditing(d); setDealForm({ company_id: d.company_id ?? "", campaign: d.campaign ?? "", deal_value: d.deal_value != null ? String(d.deal_value) : "", agency_commission: d.agency_commission != null ? String(d.agency_commission) : "", campaign_status: d.campaign_status ?? "Pitched", invoice_status: d.invoice_status ?? "Not Sent", payment_status: d.payment_status ?? "Pending", due_date: d.due_date ?? "", completion_date: d.completion_date ?? "", notes: d.notes ?? "" }); setDealDialogOpen(true); }}>
                      <Pencil className="size-4" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onClick={() => handleDeleteDeal(d)}>
                      <Trash2 className="size-4" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value ?? "—"}</p>
    </div>
  );
}
