"use client";

import React from "react";
import { Creator } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

export type CreatorFormValues = {
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

export const EMPTY_CREATOR_FORM: CreatorFormValues = {
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

type CreatorFormSource = Pick<
  Creator,
  | "creator_name"
  | "creator_type"
  | "instagram"
  | "youtube"
  | "x_twitter"
  | "other_platforms"
  | "email"
  | "phone_number"
  | "city"
  | "state"
  | "country"
  | "niche"
  | "followers_instagram"
  | "followers_youtube"
  | "engagement_rate"
  | "primary_content_type"
  | "languages"
  | "interested_in_exclusive_mgmt"
  | "rate_card_received"
  | "gst_available"
  | "payment_details_received"
  | "priority"
  | "assigned_manager"
  | "notes"
>;

export function creatorFormFromRow(row: CreatorFormSource): CreatorFormValues {
  return {
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
  };
}

export function toCreatorPayload(form: CreatorFormValues): Partial<Creator> {
  return {
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
}

const LANGUAGE_OPTIONS = [
  "English", "Hindi", "Japanese", "Korean", "Chinese (Mandarin)", "Spanish", "Portuguese",
  "French", "German", "Italian", "Russian", "Arabic", "Thai", "Vietnamese", "Indonesian",
  "Tagalog", "Bengali", "Tamil", "Telugu", "Marathi", "Gujarati", "Punjabi", "Urdu",
];

const SELECT_CLASS =
  "h-8 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid gap-2">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{children}</p>
    </div>
  );
}

export function CreatorFormFields({
  values,
  onChange,
}: {
  values: CreatorFormValues;
  onChange: (v: Partial<CreatorFormValues>) => void;
}) {
  const set = onChange;
  return (
    <>
      {/* Basic Info */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="c-name">Creator Name *</Label>
          <Input id="c-name" required value={values.creator_name} onChange={(e) => set({ creator_name: e.target.value })} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="c-type">Creator Type</Label>
          <select
            id="c-type"
            value={values.creator_type}
            onChange={(e) => set({ creator_type: e.target.value })}
            className={SELECT_CLASS}
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
          <Input id="c-email" type="email" value={values.email} onChange={(e) => set({ email: e.target.value })} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="c-phone">Phone Number</Label>
          <Input id="c-phone" value={values.phone_number} onChange={(e) => set({ phone_number: e.target.value })} />
        </div>
      </div>

      {/* Location */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="grid gap-2">
          <Label htmlFor="c-city">City</Label>
          <Input id="c-city" value={values.city} onChange={(e) => set({ city: e.target.value })} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="c-state">State</Label>
          <Input id="c-state" value={values.state} onChange={(e) => set({ state: e.target.value })} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="c-country">Country</Label>
          <Input id="c-country" value={values.country} onChange={(e) => set({ country: e.target.value })} />
        </div>
      </div>

      {/* Social Media */}
      <SectionHeading>Social Media</SectionHeading>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="c-ig">Instagram</Label>
          <Input id="c-ig" value={values.instagram} onChange={(e) => set({ instagram: e.target.value })} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="c-yt">YouTube</Label>
          <Input id="c-yt" value={values.youtube} onChange={(e) => set({ youtube: e.target.value })} />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="c-x">X (Twitter)</Label>
          <Input id="c-x" value={values.x_twitter} onChange={(e) => set({ x_twitter: e.target.value })} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="c-other">Other Platforms</Label>
          <Input id="c-other" value={values.other_platforms} onChange={(e) => set({ other_platforms: e.target.value })} />
        </div>
      </div>

      {/* Content & Niche */}
      <SectionHeading>Content &amp; Niche</SectionHeading>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="grid gap-2">
          <Label htmlFor="c-niche">Niche</Label>
          <select
            id="c-niche"
            value={values.niche}
            onChange={(e) => set({ niche: e.target.value })}
            className={SELECT_CLASS}
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
          <Input id="c-content" value={values.primary_content_type} onChange={(e) => set({ primary_content_type: e.target.value })} />
        </div>
      </div>
      <div className="grid gap-2">
        <Label>Languages</Label>
        <div className="flex flex-wrap gap-x-4 gap-y-2 rounded-md border border-input bg-background p-3">
          {LANGUAGE_OPTIONS.map((lang) => (
            <Label key={lang} className="flex items-center gap-1.5 text-sm font-normal">
              <Checkbox
                checked={values.languages.split(", ").filter(Boolean).includes(lang)}
                onCheckedChange={(checked) => {
                  const current = values.languages.split(", ").filter(Boolean);
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
      <SectionHeading>Metrics</SectionHeading>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="grid gap-2">
          <Label htmlFor="c-followers">Followers (Instagram)</Label>
          <Input id="c-followers" type="number" min={0} value={values.followers_instagram} onChange={(e) => set({ followers_instagram: e.target.value })} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="c-youtubers">Followers (YouTube)</Label>
          <Input id="c-youtubers" type="number" min={0} value={values.followers_youtube} onChange={(e) => set({ followers_youtube: e.target.value })} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="c-engagement">Engagement Rate (%)</Label>
          <Input id="c-engagement" type="number" min={0} step="0.1" value={values.engagement_rate} onChange={(e) => set({ engagement_rate: e.target.value })} />
        </div>
      </div>

      {/* Management */}
      <SectionHeading>Management</SectionHeading>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="grid gap-2">
          <Label htmlFor="c-priority">Priority</Label>
          <select
            id="c-priority"
            value={values.priority}
            onChange={(e) => set({ priority: e.target.value })}
            className={SELECT_CLASS}
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
            value={values.interested_in_exclusive_mgmt}
            onChange={(e) => set({ interested_in_exclusive_mgmt: e.target.value })}
            className={SELECT_CLASS}
          >
            <option value="Yes">Yes</option>
            <option value="No">No</option>
            <option value="Maybe">Maybe</option>
          </select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="c-manager">Assigned Manager</Label>
          <Input id="c-manager" value={values.assigned_manager} onChange={(e) => set({ assigned_manager: e.target.value })} />
        </div>
      </div>

      {/* Documents & Notes */}
      <SectionHeading>Documents &amp; Notes</SectionHeading>
      <div className="grid gap-3 rounded-lg border border-border/40 p-4 sm:grid-cols-3">
        <Label className="flex items-center gap-2 text-sm font-normal">
          <Checkbox checked={values.rate_card_received} onCheckedChange={(v) => set({ rate_card_received: !!v })} />
          Rate Card Received
        </Label>
        <Label className="flex items-center gap-2 text-sm font-normal">
          <Checkbox checked={values.gst_available} onCheckedChange={(v) => set({ gst_available: !!v })} />
          GST Available
        </Label>
        <Label className="flex items-center gap-2 text-sm font-normal">
          <Checkbox checked={values.payment_details_received} onCheckedChange={(v) => set({ payment_details_received: !!v })} />
          Payment Details Received
        </Label>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="c-notes">Notes</Label>
        <Input id="c-notes" value={values.notes} onChange={(e) => set({ notes: e.target.value })} />
      </div>
    </>
  );
}
