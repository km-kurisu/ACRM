# Editable Dropdown Options Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Admins manage all 13 enum dropdowns (add/rename/remove values) from Settings → Dropdown Options; every form and filter picker reads options dynamically.

**Architecture:** New `dropdown_options` table seeded with today's lists; CHECK constraints dropped. Four server actions (list/add/rename/remove; remove blocks when referenced, rename cascades). A client hook serves options with static fallback; a shared native `EnumSelect` replaces hardcoded `<select>` arrays across five surfaces.

**Tech Stack:** Next.js 16 App Router, server actions (`src/actions.ts`, "use server"), Supabase service-role client, Radix UI, Tailwind 4, TypeScript strict.

**Spec:** `docs/superpowers/specs/2026-08-24-editable-dropdowns-design.md`

## Global Constraints

- No test framework exists: verification per task is `npx tsc --noEmit` then `npm run lint` (both must pass clean of NEW issues; two pre-existing warnings are known: unused `Company` import in actions.ts, `no-location-assign-relative-destination` in creators/[id]/page.tsx). Run `npm run build` at milestones noted.
- Repo convention: `"use client"` pages fetch via server actions from `@/actions`; admin checks server-side are `await requireAdmin()` from `@/lib/rbac-server`.
- DB errors surface through the existing `fail()` / `rows()` helpers pattern in actions.ts; UI errors via `toast.error(err.message)`.
- Do NOT run `db/schema.sql` against any database yourself — the user applies SQL manually. Task 12 hands this off.
- Never commit files outside the ones your task lists (working tree has unrelated dirty files).
- Managed fields (exact keys): `creator_type, niche, priority, interested_in_exclusive_mgmt, contact_method, current_status, outcome, contract_type, contract_status, exclusivity, campaign_status, invoice_status, payment_status`. Yes/No checkbox trio, presence statuses, team roles stay fixed.

---

### Task 1: Schema migration in db/schema.sql

**Files:**
- Modify: `db/schema.sql` (append at end of file)

**Interfaces:**
- Produces: table `public.dropdown_options` with columns `id uuid pk default gen_random_uuid()`, `field_key text not null`, `value text not null`, `sort_order integer not null default 0`, `created_at timestamptz not null default now()`; unique index on `(field_key, lower(value))`; RLS select-authenticated + insert/update/delete admin policies (same JWT pattern as other tables); seeded rows for all 13 fields; CHECK constraints dropped on the 12 constrained columns.

- [ ] **Step 1: Append the migration block to the end of `db/schema.sql`**

```sql

-- ------------------------------------------------------------
-- dropdown_options — admin-editable option lists for enum fields
-- Backed by src/lib/dropdown-options.ts (DEFAULT_OPTIONS mirrors seed)
-- ------------------------------------------------------------
create table if not exists public.dropdown_options (
    id uuid primary key default gen_random_uuid(),
    field_key text not null,
    value text not null,
    sort_order integer not null default 0,
    created_at timestamp with time zone not null default timezone('utc'::text, now())
);

create unique index if not exists idx_dropdown_options_field_value
    on public.dropdown_options (field_key, lower(value));

create index if not exists idx_dropdown_options_field
    on public.dropdown_options (field_key, sort_order);

alter table public.dropdown_options enable row level security;

create policy "dropdown_options select authenticated" on public.dropdown_options
    for select using (auth.uid() is not null);

create policy "dropdown_options insert admin" on public.dropdown_options
    for insert with check (
        auth.uid() is not null and
        (auth.jwt() -> 'metadata' ->> 'role') = 'admin'
    );

create policy "dropdown_options update admin" on public.dropdown_options
    for update using (
        auth.uid() is not null and
        (auth.jwt() -> 'metadata' ->> 'role') = 'admin'
    );

create policy "dropdown_options delete admin" on public.dropdown_options
    for delete using (
        auth.uid() is not null and
        (auth.jwt() -> 'metadata' ->> 'role') = 'admin'
    );

-- Seed current hardcoded values (order matches today's forms).
insert into public.dropdown_options (field_key, value, sort_order) values
    ('creator_type', 'Individual', 0),
    ('creator_type', 'Agency', 1),
    ('creator_type', 'MCN', 2),
    ('creator_type', 'Brand', 3),
    ('creator_type', 'Studio', 4),
    ('niche', 'Cosplay', 0),
    ('niche', 'Fan Art / Illustration', 1),
    ('niche', 'AMV Editing', 2),
    ('niche', 'Anime Commentary / Review', 3),
    ('niche', 'Voice Acting / Dubbing', 4),
    ('niche', 'Anime News', 5),
    ('niche', 'Figure Collecting', 6),
    ('niche', 'Manga Content', 7),
    ('niche', 'Gaming + Anime', 8),
    ('niche', 'Anime Merch Reviews', 9),
    ('priority', 'High', 0),
    ('priority', 'Medium', 1),
    ('priority', 'Low', 2),
    ('interested_in_exclusive_mgmt', 'Yes', 0),
    ('interested_in_exclusive_mgmt', 'No', 1),
    ('interested_in_exclusive_mgmt', 'Maybe', 2),
    ('contact_method', 'Email', 0),
    ('contact_method', 'Instagram', 1),
    ('contact_method', 'X (Twitter)', 2),
    ('contact_method', 'WhatsApp', 3),
    ('contact_method', 'Other', 4),
    ('current_status', 'No Response', 0),
    ('current_status', 'Awaiting Reply', 1),
    ('current_status', 'Interested', 2),
    ('current_status', 'Not Interested', 3),
    ('current_status', 'Negotiating', 4),
    ('current_status', 'Signed', 5),
    ('current_status', 'On Hold', 6),
    ('outcome', 'Pending', 0),
    ('outcome', 'Signed', 1),
    ('outcome', 'Rejected', 2),
    ('outcome', 'No Response', 3),
    ('contract_type', 'Exclusive Management', 0),
    ('contract_type', 'Non-Exclusive Management', 1),
    ('contract_type', 'Brand Deal Only', 2),
    ('contract_type', 'Project-Based', 3),
    ('contract_type', 'Ambassadorship', 4),
    ('contract_status', 'Draft', 0),
    ('contract_status', 'Active', 1),
    ('contract_status', 'Renewed', 2),
    ('contract_status', 'Expired', 3),
    ('contract_status', 'Terminated', 4),
    ('exclusivity', 'Yes', 0),
    ('exclusivity', 'No', 1),
    ('campaign_status', 'Pitched', 0),
    ('campaign_status', 'Confirmed', 1),
    ('campaign_status', 'In Progress', 2),
    ('campaign_status', 'Completed', 3),
    ('campaign_status', 'Cancelled', 4),
    ('invoice_status', 'Not Sent', 0),
    ('invoice_status', 'Sent', 1),
    ('invoice_status', 'Overdue', 2),
    ('payment_status', 'Pending', 0),
    ('payment_status', 'Partial', 1),
    ('payment_status', 'Paid', 2)
on conflict do nothing;

-- Values are now data, not constraints. creator_type never had one.
alter table public.creators  drop constraint if exists creators_niche_check;
alter table public.creators  drop constraint if exists creators_interested_in_exclusive_mgmt_check;
alter table public.creators  drop constraint if exists creators_priority_check;
alter table public.outreach  drop constraint if exists outreach_contact_method_check;
alter table public.outreach  drop constraint if exists outreach_current_status_check;
alter table public.outreach  drop constraint if exists outreach_outcome_check;
alter table public.contracts drop constraint if exists contracts_contract_type_check;
alter table public.contracts drop constraint if exists contracts_exclusivity_check;
alter table public.contracts drop constraint if exists contracts_contract_status_check;
alter table public.deals     drop constraint if exists deals_campaign_status_check;
alter table public.deals     drop constraint if exists deals_invoice_status_check;
alter table public.deals     drop constraint if exists deals_payment_status_check;
```

- [ ] **Step 2: Verify no other file changed**

Run: `git diff --stat`
Expected: only `db/schema.sql` modified.

- [ ] **Step 3: Commit**

```bash
git add db/schema.sql
git commit -m "schema: dropdown_options table, seeds and check-constraint drops"
```

---

### Task 2: Dropdown constants module

**Files:**
- Create: `src/lib/dropdown-options.ts`

**Interfaces:**
- Produces (used by Tasks 3–11):
  - `type DropdownFieldKey` — union of the 13 field keys
  - `DROPDOWN_FIELDS: Record<DropdownFieldKey, { table: string; column: string }>`
  - `DROPDOWN_FIELD_KEYS: DropdownFieldKey[]`
  - `FIELD_LABELS: Record<DropdownFieldKey, string>`
  - `AUTOMATION_FIELDS: DropdownFieldKey[]`
  - `DEFAULT_OPTIONS: Record<DropdownFieldKey, string[]>`

- [ ] **Step 1: Create `src/lib/dropdown-options.ts`**

```ts
export const DROPDOWN_FIELDS = {
  creator_type: { table: "creators", column: "creator_type" },
  niche: { table: "creators", column: "niche" },
  priority: { table: "creators", column: "priority" },
  interested_in_exclusive_mgmt: { table: "creators", column: "interested_in_exclusive_mgmt" },
  contact_method: { table: "outreach", column: "contact_method" },
  current_status: { table: "outreach", column: "current_status" },
  outcome: { table: "outreach", column: "outcome" },
  contract_type: { table: "contracts", column: "contract_type" },
  contract_status: { table: "contracts", column: "contract_status" },
  exclusivity: { table: "contracts", column: "exclusivity" },
  campaign_status: { table: "deals", column: "campaign_status" },
  invoice_status: { table: "deals", column: "invoice_status" },
  payment_status: { table: "deals", column: "payment_status" },
} as const;

export type DropdownFieldKey = keyof typeof DROPDOWN_FIELDS;

export const DROPDOWN_FIELD_KEYS = Object.keys(DROPDOWN_FIELDS) as DropdownFieldKey[];

export const FIELD_LABELS: Record<DropdownFieldKey, string> = {
  creator_type: "Creator Type",
  niche: "Niche",
  priority: "Priority",
  interested_in_exclusive_mgmt: "Exclusive Mgmt Interest",
  contact_method: "Contact Method",
  current_status: "Current Status (Outreach)",
  outcome: "Outcome (Outreach)",
  contract_type: "Contract Type",
  contract_status: "Contract Status",
  exclusivity: "Exclusivity",
  campaign_status: "Campaign Status",
  invoice_status: "Invoice Status",
  payment_status: "Payment Status",
};

// Dashboard logic keys off canonical strings of these fields
// (Signed detection, pipeline buckets, donut chart order).
export const AUTOMATION_FIELDS: DropdownFieldKey[] = ["contract_status", "current_status", "campaign_status"];

export const DEFAULT_OPTIONS: Record<DropdownFieldKey, string[]> = {
  creator_type: ["Individual", "Agency", "MCN", "Brand", "Studio"],
  niche: [
    "Cosplay",
    "Fan Art / Illustration",
    "AMV Editing",
    "Anime Commentary / Review",
    "Voice Acting / Dubbing",
    "Anime News",
    "Figure Collecting",
    "Manga Content",
    "Gaming + Anime",
    "Anime Merch Reviews",
  ],
  priority: ["High", "Medium", "Low"],
  interested_in_exclusive_mgmt: ["Yes", "No", "Maybe"],
  contact_method: ["Email", "Instagram", "X (Twitter)", "WhatsApp", "Other"],
  current_status: ["No Response", "Awaiting Reply", "Interested", "Not Interested", "Negotiating", "Signed", "On Hold"],
  outcome: ["Pending", "Signed", "Rejected", "No Response"],
  contract_type: [
    "Exclusive Management",
    "Non-Exclusive Management",
    "Brand Deal Only",
    "Project-Based",
    "Ambassadorship",
  ],
  contract_status: ["Draft", "Active", "Renewed", "Expired", "Terminated"],
  exclusivity: ["Yes", "No"],
  campaign_status: ["Pitched", "Confirmed", "In Progress", "Completed", "Cancelled"],
  invoice_status: ["Not Sent", "Sent", "Overdue"],
  payment_status: ["Pending", "Partial", "Paid"],
};
```

Note: `DEFAULT_OPTIONS` must exactly mirror the Task 1 seed (keys, values, order). Double-check each array against the SQL block before committing.

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/dropdown-options.ts
git commit -m "add dropdown field registry and default option lists"
```

---

### Task 3: Server actions for dropdown management

**Files:**
- Modify: `src/actions.ts` (insert a new section between the "// ---------- Custom filters ----------" section's end and EOF is wrong — insert BEFORE the "// ---------- Presence ----------" section)

**Interfaces:**
- Consumes: `DROPDOWN_FIELD_KEYS`, `DROPDOWN_FIELDS`, `DEFAULT_OPTIONS`, `DropdownFieldKey` from `@/lib/dropdown-options` (Task 2); existing `requireAdmin`, `requireUser`, `rows`, `fail`, `revalidateAll`.
- Produces (used by Tasks 4–5):
  - `listDropdownOptions(): Promise<Record<DropdownFieldKey, string[]>>`
  - `createDropdownOption(fieldKey: string, rawValue: string): Promise<void>`
  - `renameDropdownOption(fieldKey: string, oldValue: string, newValue: string): Promise<void>`
  - `deleteDropdownOption(fieldKey: string, value: string): Promise<void>`
- Errors thrown as `Error` with readable messages (toasted by callers).

- [ ] **Step 1: Add import to `src/actions.ts`**

Extend the existing type-import block near the top (after line importing types from `@/lib/types`):

```ts
import {
  DEFAULT_OPTIONS,
  DROPDOWN_FIELD_KEYS,
  DROPDOWN_FIELDS,
  type DropdownFieldKey,
} from "@/lib/dropdown-options";
```

- [ ] **Step 2: Insert the section above `// ---------- Presence ----------`**

```ts
// ---------- Dropdown options ----------

function assertDropdownField(fieldKey: string): asserts fieldKey is DropdownFieldKey {
  if (!(fieldKey in DROPDOWN_FIELDS)) throw new Error("Unknown dropdown field");
}

function normalizeOptionValue(rawValue: string): string {
  const value = rawValue.trim();
  if (!value) throw new Error("Value cannot be empty");
  if (value.length > 120) throw new Error("Value must be 120 characters or fewer");
  return value;
}

// Case-insensitive uniqueness within one field. `allowExact` exempts the
// option being renamed from clashing with itself (case-only renames).
async function assertNoDuplicate(
  fieldKey: DropdownFieldKey,
  value: string,
  allowExact?: string
) {
  const existing = await rows<{ value: string }>(
    db.from("dropdown_options").select("value").eq("field_key", fieldKey)
  );
  const clash = existing.some(
    (r) => r.value !== allowExact && r.value.toLowerCase() === value.toLowerCase()
  );
  if (clash) throw new Error(`"${value}" already exists`);
}

export async function listDropdownOptions(): Promise<Record<DropdownFieldKey, string[]>> {
  await requireUser();
  const data = await rows<{ field_key: string; value: string }>(
    db.from("dropdown_options").select("field_key, value").order("sort_order").order("value")
  );
  const result = Object.fromEntries(DROPDOWN_FIELD_KEYS.map((k) => [k, []])) as Record<
    DropdownFieldKey,
    string[]
  >;
  for (const row of data) {
    const key = row.field_key as DropdownFieldKey;
    if (!(key in result)) continue;
    result[key].push(row.value);
  }
  return result;
}

export async function createDropdownOption(fieldKey: string, rawValue: string) {
  await requireAdmin();
  assertDropdownField(fieldKey);
  const value = normalizeOptionValue(rawValue);
  await assertNoDuplicate(fieldKey, value);

  const latest = await rows<{ sort_order: number }>(
    db.from("dropdown_options").select("sort_order").eq("field_key", fieldKey).order("sort_order", { ascending: false }).limit(1)
  );
  const nextOrder = (latest[0]?.sort_order ?? -1) + 1;

  const { error } = await db.from("dropdown_options").insert({ field_key: fieldKey, value, sort_order: nextOrder });
  if (error) fail(error);
  revalidateAll();
  revalidatePath("/settings/dropdowns");
}

export async function renameDropdownOption(fieldKey: string, oldValue: string, newValue: string) {
  await requireAdmin();
  assertDropdownField(fieldKey);
  const value = normalizeOptionValue(newValue);
  await assertNoDuplicate(fieldKey, value, oldValue);

  // Cascade first so a failed update leaves option list and data consistent.
  // (Supabase update takes one values object; the column is dynamic.)
  const { table, column } = DROPDOWN_FIELDS[fieldKey];
  if (value !== oldValue) {
    const { error: cascadeError } = await db
      .from(table)
      .update({ [column]: value })
      .eq(column, oldValue);
    if (cascadeError) fail(cascadeError);
  }
  const { error } = await db
    .from("dropdown_options")
    .update({ value })
    .eq("field_key", fieldKey)
    .eq("value", oldValue);
  if (error) fail(error);
  revalidateAll();
  revalidatePath("/settings/dropdowns");
}

export async function deleteDropdownOption(fieldKey: string, value: string) {
  await requireAdmin();
  assertDropdownField(fieldKey);

  const { table, column } = DROPDOWN_FIELDS[fieldKey];
  const { count, error } = await db
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq(column, value);
  if (error) fail(error);
  if ((count ?? 0) > 0) throw new Error(`Cannot remove "${value}" — ${count} record(s) still use it`);

  const { error: deleteError } = await db
    .from("dropdown_options")
    .delete()
    .eq("field_key", fieldKey)
    .eq("value", value);
  if (deleteError) fail(deleteError);
  revalidateAll();
  revalidatePath("/settings/dropdowns");
}
```

Notes:
- The Supabase client in `src/lib/server.ts` is untyped, so `db.from(variableString)` and `.update({ [column]: value })` compile fine (same head-count pattern already used by `deleteCompany`).
- Case-only renames ("Pitched" → "pitched"): `assertNoDuplicate(..., allowExact)` exempts the renamed row itself; the cascade `.eq(column, oldValue)` is exact-case so it updates precisely the rows holding the old spelling.

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit && npm run lint`
Expected: no new errors; only the two known pre-existing warnings.

- [ ] **Step 4: Commit**

```bash
git add src/actions.ts
git commit -m "actions: list/create/rename/delete dropdown options"
```

---

### Task 4: Client hook + shared EnumSelect component

**Files:**
- Create: `src/lib/use-dropdown-options.ts`
- Create: `src/components/enum-select.tsx`

**Interfaces:**
- Consumes: `listDropdownOptions` (Task 3); `DEFAULT_OPTIONS`, `DropdownFieldKey` (Task 2).
- Produces:
  - `useDropdownOptions(): { options: Record<DropdownFieldKey, string[]>; loaded: boolean; reload: () => Promise<void> }` — module-level cache shared across all mounts; falls back to `DEFAULT_OPTIONS`.
  - `pickOption(list: string[], preferred: string): string` — preferred if present, else first entry, else preferred unchanged.
  - `EnumSelect` props: `{ id?: string; value: string; onChange: (v: string) => void; options: string[]; allowBlank?: boolean; className?: string; disabled?: boolean; ariaLabel?: string }` — native `<select>` styled like every other form select; renders the out-of-list current value as an extra leading option instead of silently blanking.

- [ ] **Step 1: Create `src/lib/use-dropdown-options.ts`**

```ts
"use client";

import { useCallback, useEffect, useState } from "react";
import { listDropdownOptions } from "@/actions";
import { DEFAULT_OPTIONS, type DropdownFieldKey } from "@/lib/dropdown-options";

type OptionsMap = Record<DropdownFieldKey, string[]>;

let cache: OptionsMap | null = null;

export function useDropdownOptions() {
  const [options, setOptions] = useState<OptionsMap>(cache ?? DEFAULT_OPTIONS);
  const [loaded, setLoaded] = useState(cache != null);

  const reload = useCallback(async () => {
    try {
      const data = await listDropdownOptions();
      cache = data;
      setOptions(data);
    } catch {
      /* keep serving defaults */
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!cache) void reload();
  }, [reload]);

  return { options, loaded, reload };
}

export function pickOption(list: string[], preferred: string): string {
  if (list.length === 0) return preferred;
  return list.includes(preferred) ? preferred : list[0];
}
```

- [ ] **Step 2: Create `src/components/enum-select.tsx`**

```tsx
"use client";

const SELECT_CLASS =
  "h-8 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

export function EnumSelect({
  id,
  value,
  onChange,
  options,
  allowBlank = false,
  className,
  disabled,
  ariaLabel,
}: {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  allowBlank?: boolean;
  className?: string;
  disabled?: boolean;
  ariaLabel?: string;
}) {
  const showStale = value !== "" && !options.includes(value);
  return (
    <select
      id={id}
      aria-label={ariaLabel}
      disabled={disabled}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={className ?? SELECT_CLASS}
    >
      {allowBlank && <option value="">—</option>}
      {showStale && <option value={value}>{value}</option>}
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}
```

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit && npm run lint`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/lib/use-dropdown-options.ts src/components/enum-select.tsx
git commit -m "add dropdown options hook and shared EnumSelect"
```

---

### Task 5: Settings → Dropdown Options management UI

**Files:**
- Modify: `src/app/settings/layout.tsx` (SECTIONS array, line 10-16)
- Create: `src/app/settings/dropdowns/page.tsx`
- Create: `src/app/settings/dropdowns/dropdowns-manager.tsx`

**Interfaces:**
- Consumes: all four actions (Task 3); hook (Task 4); `FIELD_LABELS`, `AUTOMATION_FIELDS`, `DROPDOWN_FIELD_KEYS`, `DEFAULT_OPTIONS` (Task 2).
- Produces: working admin screen at `/settings/dropdowns`.

- [ ] **Step 1: Add nav entry in `src/app/settings/layout.tsx`**

Change the lucide-react import (line 6) to include `SlidersHorizontal`:

```ts
import { Settings, Users, Palette, Bell, ShieldCheck, ListFilter, SlidersHorizontal } from "lucide-react";
```

Add to `SECTIONS` right after the Team Members entry:

```ts
  { href: "/settings/dropdowns", label: "Dropdown Options", icon: SlidersHorizontal, adminOnly: true },
```

(`adminOnly` locking already works — layout disables non-admin clicks.)

- [ ] **Step 2: Create `src/app/settings/dropdowns/page.tsx`**

```tsx
import { requireAdmin } from "@/lib/rbac-server";
import DropdownsManager from "./dropdowns-manager";

export default async function DropdownsSettingsPage() {
  await requireAdmin();
  return <DropdownsManager />;
}
```

- [ ] **Step 3: Create `src/app/settings/dropdowns/dropdowns-manager.tsx`**

```tsx
"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { Check, Pencil, Plus, X } from "lucide-react";
import {
  createDropdownOption,
  deleteDropdownOption,
  renameDropdownOption,
} from "@/actions";
import { useDropdownOptions } from "@/lib/use-dropdown-options";
import {
  AUTOMATION_FIELDS,
  DEFAULT_OPTIONS,
  DROPDOWN_FIELD_KEYS,
  FIELD_LABELS,
  type DropdownFieldKey,
} from "@/lib/dropdown-options";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

function FieldCard({
  fieldKey,
  values,
  onChanged,
}: {
  fieldKey: DropdownFieldKey;
  values: string[];
  onChanged: () => void;
}) {
  const [adding, setAdding] = useState("");
  const [renamingFrom, setRenamingFrom] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [busy, setBusy] = useState(false);

  async function run(action: () => Promise<void>, successMessage: string) {
    setBusy(true);
    try {
      await action();
      toast.success(successMessage);
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  function confirmRename(original: string) {
    void run(() => renameDropdownOption(fieldKey, original, renameDraft), "Value renamed").then(
      () => setRenamingFrom(null)
    );
  }

  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle className="text-base">{FIELD_LABELS[fieldKey]}</CardTitle>
        {AUTOMATION_FIELDS.includes(fieldKey) && (
          <CardDescription>Used by dashboard automation — renames affect pipeline grouping.</CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        {values.length === 0 && <p className="text-sm text-muted-foreground">No values yet.</p>}
        {values.map((value) =>
          renamingFrom === value ? (
            <div key={value} className="flex items-center gap-2">
              <Input
                autoFocus
                value={renameDraft}
                onChange={(e) => setRenameDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    confirmRename(value);
                  }
                }}
                className="h-8"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={busy}
                aria-label={`Confirm rename of ${value}`}
                onClick={() => confirmRename(value)}
              >
                <Check className="size-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Cancel rename"
                onClick={() => setRenamingFrom(null)}
              >
                <X className="size-4" />
              </Button>
            </div>
          ) : (
            <div key={value} className="flex items-center justify-between gap-2">
              <span className="min-w-0 truncate text-sm">{value}</span>
              <span className="flex shrink-0 items-center">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Rename ${value}`}
                  onClick={() => {
                    setRenamingFrom(value);
                    setRenameDraft(value);
                  }}
                >
                  <Pencil className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove ${value}`}
                  disabled={busy}
                  onClick={() => void run(() => deleteDropdownOption(fieldKey, value), "Value removed")}
                >
                  <X className="size-4" />
                </Button>
              </span>
            </div>
          )
        )}
        <form
          className="flex items-center gap-2 pt-2"
          onSubmit={(e) => {
            e.preventDefault();
            const draft = adding;
            if (!draft.trim()) return;
            void run(async () => {
              await createDropdownOption(fieldKey, draft);
              setAdding("");
            }, "Value added");
          }}
        >
          <Input
            placeholder="Add a value…"
            value={adding}
            onChange={(e) => setAdding(e.target.value)}
            className="h-8"
          />
          <Button type="submit" variant="secondary" size="sm" disabled={busy || !adding.trim()}>
            <Plus className="size-4" /> Add
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function DropdownsManager() {
  const { options, reload } = useDropdownOptions();

  return (
    <div>
      <h2 className="text-2xl font-bold tracking-tight">Dropdown Options</h2>
      <p className="mt-1 text-muted-foreground">
        Edit, add, or remove the choices offered across the CRM&apos;s status and type menus.
        Removing a value still in use is blocked until records are reassigned; renaming updates
        those records automatically.
      </p>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {DROPDOWN_FIELD_KEYS.map((key) => (
          <FieldCard
            key={key}
            fieldKey={key}
            values={options[key] ?? DEFAULT_OPTIONS[key]}
            onChanged={() => void reload()}
          />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit && npm run lint && npm run build`
Expected: clean build; `/settings/dropdowns` route appears in output listing.

- [ ] **Step 5: Commit**

```bash
git add src/app/settings/layout.tsx src/app/settings/dropdowns
git commit -m "settings: admin-managed dropdown options screen"
```

---

### Task 6: Dynamic options in creator-form.tsx

**Files:**
- Modify: `src/components/creator-form.tsx`

**Interfaces:**
- Consumes: `useDropdownOptions` (Task 4); `EnumSelect` (Task 4).
- Produces: `CreatorFormFields` signature unchanged (hook is internal); its four selects now render dynamic options.

- [ ] **Step 1: Add imports**

```ts
import { EnumSelect } from "@/components/enum-select";
import { useDropdownOptions } from "@/lib/use-dropdown-options";
```

- [ ] **Step 2: Call the hook inside `CreatorFormFields`**

At the top of the `CreatorFormFields` function body:

```ts
const dd = useDropdownOptions();
```

- [ ] **Step 3: Replace the four selects**

Replace the Creator Type `<select id="c-type">…</select>` block (currently lines ~184-196) with:

```tsx
<EnumSelect
  id="c-type"
  value={values.creator_type}
  onChange={(v) => set({ creator_type: v })}
  options={dd.options.creator_type}
  allowBlank
/>
```

Replace Niche `<select id="c-niche">` (~256-273):

```tsx
<EnumSelect
  id="c-niche"
  value={values.niche}
  onChange={(v) => set({ niche: v })}
  options={dd.options.niche}
  allowBlank
/>
```

Replace Priority `<select id="c-priority">` (~323-332):

```tsx
<EnumSelect
  id="c-priority"
  value={values.priority}
  onChange={(v) => set({ priority: v })}
  options={dd.options.priority}
/>
```

Replace Exclusive Mgmt Interest `<select id="c-exclusive">` (~336-345):

```tsx
<EnumSelect
  id="c-exclusive"
  value={values.interested_in_exclusive_mgmt}
  onChange={(v) => set({ interested_in_exclusive_mgmt: v })}
  options={dd.options.interested_in_exclusive_mgmt}
/>
```

Keep `LANGUAGE_OPTIONS` and the three Yes/No checkboxes untouched.

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit && npm run lint`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add src/components/creator-form.tsx
git commit -m "creators form reads dynamic dropdown options"
```

---

### Task 7: Dynamic options in deals page

**Files:**
- Modify: `src/app/deals/page.tsx`

**Interfaces:**
- Consumes: `useDropdownOptions`, `pickOption` (Task 4); `EnumSelect` (Task 4).
- Produces: deal dialog selects dynamic; fresh-form defaults validated against loaded lists.

- [ ] **Step 1: Imports and hook**

Add imports:

```ts
import { EnumSelect } from "@/components/enum-select";
import { pickOption, useDropdownOptions } from "@/lib/use-dropdown-options";
```

Inside `DealsPage()` (after `const isAdmin = …`):

```ts
const dd = useDropdownOptions();
```

- [ ] **Step 2: Fresh-form helper**

Directly under the hook add:

```ts
function freshForm(): DealForm {
  return {
    ...EMPTY,
    campaign_status: pickOption(dd.options.campaign_status, EMPTY.campaign_status),
    invoice_status: pickOption(dd.options.invoice_status, EMPTY.invoice_status),
    payment_status: pickOption(dd.options.payment_status, EMPTY.payment_status),
  };
}
```

Find every site that starts a NEW deal form (search `setForm(EMPTY)` and any `{ ...EMPTY` spread used for creation — e.g. reset paths around lines 100-130 and the "Add deal" trigger) and switch it to `setForm(freshForm())`. Edit prefill sites that read from an existing deal row stay untouched.

- [ ] **Step 3: Replace the three selects**

Campaign status (`d-campaign-status`, lines ~296-307):

```tsx
<EnumSelect
  id="d-campaign-status"
  value={form.campaign_status}
  onChange={(v) => set({ campaign_status: v })}
  options={dd.options.campaign_status}
/>
```

Invoice status (`d-invoice`, ~311-320):

```tsx
<EnumSelect
  id="d-invoice"
  value={form.invoice_status}
  onChange={(v) => set({ invoice_status: v })}
  options={dd.options.invoice_status}
/>
```

Payment status (`d-payment`, ~324-333):

```tsx
<EnumSelect
  id="d-payment"
  value={form.payment_status}
  onChange={(v) => set({ payment_status: v })}
  options={dd.options.payment_status}
/>
```

Leave `PAYMENT_COLORS` and table badges untouched.

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit && npm run lint`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add src/app/deals/page.tsx
git commit -m "deals dialog reads dynamic dropdown options"
```

---

### Task 8: Dynamic options in outreach page

**Files:**
- Modify: `src/app/outreach/page.tsx`

**Interfaces:**
- Consumes: same as Task 7.
- Produces: outreach dialog selects dynamic.

- [ ] **Step 1: Imports, hook, fresh-form helper**

Imports:

```ts
import { EnumSelect } from "@/components/enum-select";
import { pickOption, useDropdownOptions } from "@/lib/use-dropdown-options";
```

Inside `OutreachPage()` after `isAdmin`:

```ts
const dd = useDropdownOptions();

function freshForm(): OutreachForm {
  return {
    ...EMPTY,
    contact_method: pickOption(dd.options.contact_method, EMPTY.contact_method),
    current_status: pickOption(dd.options.current_status, EMPTY.current_status),
    outcome: pickOption(dd.options.outcome, EMPTY.outcome),
  };
}
```

Switch `resetForm()` (line ~94-97) to `setForm(freshForm())`.

- [ ] **Step 2: Replace the three selects**

Contact method (`o-method`, lines ~198-209):

```tsx
<EnumSelect
  id="o-method"
  value={form.contact_method}
  onChange={(v) => set({ contact_method: v })}
  options={dd.options.contact_method}
/>
```

Current status (`o-status`, ~213-226):

```tsx
<EnumSelect
  id="o-status"
  value={form.current_status}
  onChange={(v) => set({ current_status: v })}
  options={dd.options.current_status}
/>
```

Outcome (`o-outcome`, ~241-251):

```tsx
<EnumSelect
  id="o-outcome"
  value={form.outcome}
  onChange={(v) => set({ outcome: v })}
  options={dd.options.outcome}
/>
```

Edit prefill (line ~327-335) keeps reading the record's own values.

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit && npm run lint`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/app/outreach/page.tsx
git commit -m "outreach dialog reads dynamic dropdown options"
```

---

### Task 9: Dynamic options in contracts page

**Files:**
- Modify: `src/app/contracts/page.tsx`

**Interfaces:**
- Consumes: same as Tasks 7-8.
- Produces: contract dialog selects dynamic. Note: exclusivity previously listed No before Yes; the seeded order is Yes then No — accepted cosmetic change per spec.

- [ ] **Step 1: Imports, hook, fresh-form helper**

Imports:

```ts
import { EnumSelect } from "@/components/enum-select";
import { pickOption, useDropdownOptions } from "@/lib/use-dropdown-options";
```

Inside `ContractsPage()` after `isAdmin`:

```ts
const dd = useDropdownOptions();

function freshForm(): ContractForm {
  return {
    ...EMPTY,
    contract_type: pickOption(dd.options.contract_type, EMPTY.contract_type),
    contract_status: pickOption(dd.options.contract_status, EMPTY.contract_status),
    exclusivity: pickOption(dd.options.exclusivity, EMPTY.exclusivity),
  };
}
```

(The form state type is named `ContractForm` in this file — confirm exact name at the top of the file; the EMPTY constant sits beside it around lines 44-52.) Switch the reset/new-form path(s) using `EMPTY` to `freshForm()`.

- [ ] **Step 2: Replace the three selects**

Contract type (`ct-type`, lines ~201-212):

```tsx
<EnumSelect
  id="ct-type"
  value={form.contract_type}
  onChange={(v) => set({ contract_type: v })}
  options={dd.options.contract_type}
/>
```

Contract status (`ct-status`, ~216-227):

```tsx
<EnumSelect
  id="ct-status"
  value={form.contract_status}
  onChange={(v) => set({ contract_status: v })}
  options={dd.options.contract_status}
/>
```

Exclusivity (`ct-exclusivity`, ~231-239):

```tsx
<EnumSelect
  id="ct-exclusivity"
  value={form.exclusivity}
  onChange={(v) => set({ exclusivity: v })}
  options={dd.options.exclusivity}
/>
```

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit && npm run lint`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/app/contracts/page.tsx
git commit -m "contracts dialog reads dynamic dropdown options"
```

---

### Task 10: Dynamic options in creator detail dialogs

**Files:**
- Modify: `src/app/creators/[id]/page.tsx`

**Interfaces:**
- Consumes: `useDropdownOptions`, `pickOption` (Task 4); `EnumSelect` (Task 4).
- Produces: all nine selects across the outreach/contract/deal dialogs dynamic.

- [ ] **Step 1: Imports and hook**

Add imports alongside existing ones:

```ts
import { EnumSelect } from "@/components/enum-select";
import { pickOption, useDropdownOptions } from "@/lib/use-dropdown-options";
```

Inside `CreatorDetailPage()` after `isAdmin` (line ~78):

```ts
const dd = useDropdownOptions();
```

- [ ] **Step 2: Collapse duplicated fresh-form literals into helpers**

Below the hook, add three helpers mirroring the literal defaults currently duplicated at lines 208 & 464 (outreach), 251 & 566 (contract), 296 & 665 (deal):

```ts
function freshOutreachForm() {
  return {
    contact_method: pickOption(dd.options.contact_method, "Email"),
    date_contacted: "",
    next_follow_up_date: "",
    current_status: pickOption(dd.options.current_status, "No Response"),
    outcome: pickOption(dd.options.outcome, "Pending"),
    notes: "",
  };
}

function freshContractForm() {
  return {
    contract_type: pickOption(dd.options.contract_type, "Exclusive Management"),
    contract_status: pickOption(dd.options.contract_status, "Draft"),
    start_date: "",
    end_date: "",
    exclusivity: pickOption(dd.options.exclusivity, "No"),
    renewal_reminder: "",
    notes: "",
  };
}

function freshDealForm() {
  return {
    company_id: "",
    campaign: "",
    deal_value: "",
    agency_commission: "",
    campaign_status: pickOption(dd.options.campaign_status, "Pitched"),
    invoice_status: pickOption(dd.options.invoice_status, "Not Sent"),
    payment_status: pickOption(dd.options.payment_status, "Pending"),
    due_date: "",
    completion_date: "",
    notes: "",
  };
}
```

Replace the six new-form literal callsites (lines 208, 251, 296, and the `if (!open)` reset arms inside the Dialog `onOpenChange` handlers at 464, 566, 665) with `setOutreachForm(freshOutreachForm())` / `setContractForm(freshContractForm())` / `setDealForm(freshDealForm())` respectively. Leave the edit-prefill sites (542, 641, 750) untouched — they read the record's own values.

- [ ] **Step 3: Replace the nine selects with EnumSelect**

Mapping (all inside JSX; keep surrounding grid wrappers intact):

| Select id | options prop |
|---|---|
| `o-method` (~477) | `dd.options.contact_method` |
| `o-status` (~487) | `dd.options.current_status` |
| `o-outcome` (~504) | `dd.options.outcome` |
| `ct-type` (~579) | `dd.options.contract_type` |
| `ct-status` (~589) | `dd.options.contract_status` |
| `ct-exclusivity` (~599) | `dd.options.exclusivity` |
| `d-campaign-status` (~690) | `dd.options.campaign_status` |
| `d-invoice` (~700) | `dd.options.invoice_status` |
| `d-payment` (~708) | `dd.options.payment_status` |

Each replacement follows the same shape, e.g. for `o-method`:

```tsx
<EnumSelect
  id="o-method"
  value={outreachForm.contact_method}
  onChange={(v) => setOutreachForm((f) => ({ ...f, contact_method: v }))}
  options={dd.options.contact_method}
/>
```

Adapt the value/onChange names to each dialog's state variable (`outreachForm`/`setOutreachForm`, `contractForm`/`setContractForm`, `dealForm`/`setDealForm`) and matching key. Preserve each original select's `id`.

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit && npm run lint`
Expected: clean except the one known pre-existing warning in this file.

- [ ] **Step 5: Commit**

```bash
git add "src/app/creators/[id]/page.tsx"
git commit -m "creator detail dialogs read dynamic dropdown options"
```

---

### Task 11: Dynamic enum options in filter dialog

**Files:**
- Modify: `src/app/settings/filters/filter-dialog.tsx`

**Interfaces:**
- Consumes: `useDropdownOptions` (Task 4).
- Produces: managed enum fields offer live DB options; unmanaged enum fields (management_status, YES_NO trio, etc.) keep their static `def.options` because they have no `dropdown_options` entry.

- [ ] **Step 1: Wire the hook and swap the value picker source**

Add import:

```ts
import { useDropdownOptions } from "@/lib/use-dropdown-options";
```

In `FilterDialog`, add `const dd = useDropdownOptions();` beside the existing state hooks (~line 58).

Replace the value-picker branch (lines ~180-203):

```tsx
{needsValue &&
  (() => {
    const dynamic =
      def && def.field in dd.options ? dd.options[def.field as keyof typeof dd.options] : undefined;
    const opts = dynamic ?? def?.options;
    return opts ? (
      <select
        aria-label="Value"
        className={`${SELECT_CLASS} w-40`}
        value={c.value ?? ""}
        onChange={(e) => patch(i, { value: e.target.value })}
      >
        <option value="">Select…</option>
        {opts.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    ) : (
      <Input
        aria-label="Value"
        className="w-40"
        type={def?.type === "number" ? "number" : def?.type === "date" ? "date" : "text"}
        value={c.value ?? ""}
        onChange={(e) => patch(i, { value: e.target.value })}
      />
    );
  })()}
```

The `field in dd.options` guard is what keeps unmanaged enums (e.g. `rate_card_received`) on their static lists while managed ones go live.

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit && npm run lint`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/app/settings/filters/filter-dialog.tsx
git commit -m "filter dialog offers live dropdown options for managed enums"
```

---

### Task 12: Full verification and DB handoff

**Files:**
- No code changes expected.

- [ ] **Step 1: Full gates**

Run: `npx tsc --noEmit && npm run lint && npm run build`
Expected: build completes; route `/settings/dropdowns` present; zero new lint warnings.

- [ ] **Step 2: Grep for leftover hardcoded lists**

Run: `grep -rn "Ambassadorship\|Anime Merch Reviews" src/ --include=*.tsx --include=*.ts`
Expected hits ONLY: `src/lib/dropdown-options.ts` (defaults) and none in form files. If a form still hardcodes, fix it before continuing.

- [ ] **Step 3: Hand off manual DB step to the user**

Tell the user explicitly:

> Apply `db/schema.sql` in the Supabase SQL editor (it is idempotent — safe on the live database). After it runs: the Dropdown Options screen goes live, CHECK constraints are gone, and all lists are editable.

Do NOT execute the SQL yourself.

- [ ] **Step 4: Final commit if anything was touched**

Only if Step 2 forced edits:

```bash
git add -A src/
git commit -m "fix remaining hardcoded dropdown lists"
```
