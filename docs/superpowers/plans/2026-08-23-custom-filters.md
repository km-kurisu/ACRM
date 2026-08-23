# Custom Filters Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Admin-published workspace-wide and per-user personal saved filters, creatable in Settings, stackable (AND) and applicable to both the dashboard aggregates and the master data table via a shared picker and URL param.

**Architecture:** One pure evaluator (`src/lib/custom-filters.ts`) defines filter semantics and runs against creator rows in JS on every surface. Filters persist in a new `custom_filters` Postgres table (Supabase, no ORM). Server actions in `src/actions.ts` do CRUD plus a filter-aware `getDashboardOverview`. A self-contained client picker syncs selection to `?filters=<id1,id2,...>`; the dashboard server page resolves ids → conditions server-side, master data evaluates client-side.

**Tech Stack:** Next.js 16.3 App Router, React 19, TypeScript, Tailwind v4 + shadcn-style ui components, Supabase JS (service role), Clerk auth/RBAC, sonner toasts.

**Spec:** `docs/superpowers/specs/2026-08-23-custom-filters-design.md`

## Global Constraints

- Next.js 16.3: the `searchParams` page prop is a **Promise** — `const { filters } = await searchParams` (verified against `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/page.md`). Client components read it via `useSearchParams`.
- No test framework in this repo (spec decision). Per-task gate: `npx tsc --noEmit` clean. Final gate: `npm run lint`, `npm run build`, manual smoke checklist (Task 8).
- Data access via the shared service-role client `db` from `@/lib/server`; permissions enforced in server actions (`requireUser()` returns the Clerk user id, `requireAdmin()` throws for non-admins) — RLS is defense-in-depth only.
- No new npm dependencies. Reuse `@/components/ui/*`, `lucide-react` icons, `sonner` toasts, and the `glass` / `glass-strong` styling conventions.
- **Dirty working tree:** many unrelated modified files exist. Stage ONLY the exact paths listed in each task's commit step. Never `git add -A` / `git add .`
- No comments in code.
- All new/edited TS must compile: run `npx tsc --noEmit` after each task and before committing.

---

### Task 1: Filter domain module (types, registry, evaluator)

**Files:**
- Create: `src/lib/custom-filters.ts`

**Interfaces:**
- Consumes: nothing (pure module, no React/server imports).
- Produces (used by Tasks 3–7):
  - `type FilterFieldType = "text" | "number" | "enum" | "date"`
  - `type FilterVisibility = "org" | "personal"`
  - `type FilterCondition = { field: string; op: string; value?: string }`
  - `type CustomFilter = { id: string; name: string; visibility: FilterVisibility; conditions: FilterCondition[]; created_by: string; created_at: string; updated_at: string }`
  - `FILTERABLE_FIELDS: FieldDef[]`, `FIELD_MAP: Map<string, FieldDef>`
  - `OPS_BY_TYPE: Record<FilterFieldType, { op: string; label: string }[]>`
  - `matchesFilter(row: Record<string, unknown>, conditions: FilterCondition[]): boolean`
  - `validateConditions(conditions: FilterCondition[]): string | null` (null = valid)
  - `describeCondition(c: FilterCondition): string`, `describeFilter(conditions: FilterCondition[]): string[]`
  - `scopeConditions(conditions: FilterCondition[], scope: "all" | "master"): FilterCondition[]`

- [ ] **Step 1: Create `src/lib/custom-filters.ts`**

```ts
export type FilterFieldType = "text" | "number" | "enum" | "date";
export type FilterVisibility = "org" | "personal";

export type FilterCondition = { field: string; op: string; value?: string };

export type CustomFilter = {
  id: string;
  name: string;
  visibility: FilterVisibility;
  conditions: FilterCondition[];
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type FieldDef = {
  field: string;
  label: string;
  type: FilterFieldType;
  group: string;
  scope: "all" | "master";
  options?: string[];
};

export const OPS_BY_TYPE: Record<FilterFieldType, { op: string; label: string }[]> = {
  text: [
    { op: "contains", label: "contains" },
    { op: "eq", label: "equals" },
    { op: "neq", label: "not equals" },
    { op: "empty", label: "is empty" },
    { op: "notEmpty", label: "is not empty" },
  ],
  number: [
    { op: "eq", label: "=" },
    { op: "neq", label: "≠" },
    { op: "gt", label: ">" },
    { op: "gte", label: "≥" },
    { op: "lt", label: "<" },
    { op: "lte", label: "≤" },
  ],
  enum: [
    { op: "is", label: "is" },
    { op: "isNot", label: "is not" },
  ],
  date: [
    { op: "on", label: "on" },
    { op: "before", label: "before" },
    { op: "after", label: "after" },
  ],
};

const YES_NO = ["Yes", "No"];

export const FILTERABLE_FIELDS: FieldDef[] = [
  { field: "creator_name", label: "Creator Name", type: "text", group: "Profile", scope: "all" },
  {
    field: "creator_type",
    label: "Creator Type",
    type: "enum",
    group: "Profile",
    scope: "all",
    options: ["Individual", "Agency", "MCN", "Brand", "Studio"],
  },
  { field: "instagram", label: "Instagram Handle", type: "text", group: "Profile", scope: "all" },
  { field: "youtube", label: "YouTube Channel", type: "text", group: "Profile", scope: "all" },
  { field: "x_twitter", label: "X (Twitter) Handle", type: "text", group: "Profile", scope: "all" },
  { field: "other_platforms", label: "Other Platforms", type: "text", group: "Profile", scope: "all" },
  { field: "email", label: "Email", type: "text", group: "Profile", scope: "all" },
  { field: "phone_number", label: "Phone Number", type: "text", group: "Profile", scope: "all" },
  { field: "city", label: "City", type: "text", group: "Profile", scope: "all" },
  { field: "state", label: "State", type: "text", group: "Profile", scope: "all" },
  { field: "country", label: "Country", type: "text", group: "Profile", scope: "all" },
  { field: "niche", label: "Niche", type: "text", group: "Profile", scope: "all" },
  { field: "primary_content_type", label: "Content Type", type: "text", group: "Profile", scope: "all" },
  { field: "languages", label: "Languages", type: "text", group: "Profile", scope: "all" },
  {
    field: "priority",
    label: "Priority",
    type: "enum",
    group: "Profile",
    scope: "all",
    options: ["High", "Medium", "Low"],
  },
  { field: "assigned_manager", label: "Assigned Manager", type: "text", group: "Profile", scope: "all" },
  {
    field: "interested_in_exclusive_mgmt",
    label: "Interested in Exclusive Mgmt",
    type: "enum",
    group: "Profile",
    scope: "all",
    options: ["Yes", "No", "Maybe"],
  },
  { field: "rate_card_received", label: "Rate Card Received", type: "enum", group: "Profile", scope: "all", options: YES_NO },
  { field: "gst_available", label: "GST Available", type: "enum", group: "Profile", scope: "all", options: YES_NO },
  {
    field: "payment_details_received",
    label: "Payment Details Received",
    type: "enum",
    group: "Profile",
    scope: "all",
    options: YES_NO,
  },
  { field: "followers_instagram", label: "Followers (Instagram)", type: "number", group: "Reach", scope: "all" },
  { field: "followers_youtube", label: "Followers (YouTube)", type: "number", group: "Reach", scope: "all" },
  { field: "engagement_rate", label: "Engagement Rate (%)", type: "number", group: "Reach", scope: "all" },
  { field: "total_reach", label: "Total Reach", type: "number", group: "Reach", scope: "master" },
  {
    field: "management_status",
    label: "Mgmt Status",
    type: "enum",
    group: "Pipeline",
    scope: "master",
    options: ["Prospect", "Contacted", "Negotiating", "Signed", "Rejected", "On Hold"],
  },
  {
    field: "outreach_outcome",
    label: "Outreach Outcome",
    type: "enum",
    group: "Pipeline",
    scope: "master",
    options: ["No Response", "Awaiting Reply", "Interested", "Not Interested", "Negotiating", "Signed", "On Hold"],
  },
  { field: "date_first_contacted", label: "First Contacted", type: "date", group: "Pipeline", scope: "master" },
  { field: "next_follow_up_date", label: "Next Follow-up", type: "date", group: "Pipeline", scope: "master" },
  {
    field: "contract_status",
    label: "Contract Status",
    type: "enum",
    group: "Pipeline",
    scope: "master",
    options: ["Draft", "Active", "Renewed", "Expired", "Terminated"],
  },
  { field: "notes", label: "Notes", type: "text", group: "System", scope: "all" },
  { field: "created_at", label: "Date Added", type: "date", group: "System", scope: "all" },
];

export const FIELD_MAP: Map<string, FieldDef> = new Map(FILTERABLE_FIELDS.map(f => [f.field, f]));

function conditionMatches(condition: FilterCondition, row: Record<string, unknown>): boolean {
  const def = FIELD_MAP.get(condition.field);
  if (!def) return true;
  const knownOp = OPS_BY_TYPE[def.type].some(o => o.op === condition.op);
  if (!knownOp) return true;

  const raw = row[condition.field];

  if (def.type === "text") {
    const s = raw == null ? "" : String(raw).trim();
    const v = String(condition.value ?? "").trim();
    switch (condition.op) {
      case "empty":
        return s === "";
      case "notEmpty":
        return s !== "";
      case "contains":
        return v === "" || s.toLowerCase().includes(v.toLowerCase());
      case "eq":
        return s.toLowerCase() === v.toLowerCase();
      case "neq":
        return s.toLowerCase() !== v.toLowerCase();
    }
  }

  if (def.type === "number") {
    if (raw == null || raw === "") return false;
    const n = Number(raw);
    const v = Number(condition.value);
    if (Number.isNaN(n) || Number.isNaN(v)) return false;
    switch (condition.op) {
      case "eq":
        return n === v;
      case "neq":
        return n !== v;
      case "gt":
        return n > v;
      case "gte":
        return n >= v;
      case "lt":
        return n < v;
      case "lte":
        return n <= v;
    }
  }

  if (def.type === "enum") {
    const s = raw == null ? "" : String(raw);
    const v = String(condition.value ?? "");
    return condition.op === "is" ? s === v : s !== v;
  }

  if (def.type === "date") {
    const ds = typeof raw === "string" ? raw.slice(0, 10) : "";
    const v = String(condition.value ?? "").slice(0, 10);
    if (!ds || !v) return false;
    switch (condition.op) {
      case "on":
        return ds === v;
      case "before":
        return ds < v;
      case "after":
        return ds > v;
    }
  }

  return true;
}

export function matchesFilter(row: Record<string, unknown>, conditions: FilterCondition[]): boolean {
  return conditions.every(c => conditionMatches(c, row));
}

export function validateConditions(conditions: FilterCondition[]): string | null {
  if (!Array.isArray(conditions) || conditions.length === 0) return "Add at least one condition";
  for (const c of conditions) {
    const def = FIELD_MAP.get(c.field);
    if (!def) return "Pick a field for every condition";
    if (!OPS_BY_TYPE[def.type].some(o => o.op === c.op)) return `Invalid operator for ${def.label}`;
    const needsValue = c.op !== "empty" && c.op !== "notEmpty";
    if (needsValue && String(c.value ?? "").trim() === "") return `Enter a value for ${def.label}`;
    if (needsValue && def.type === "number" && Number.isNaN(Number(c.value))) return `${def.label} needs a numeric value`;
  }
  return null;
}

export function describeCondition(c: FilterCondition): string {
  const def = FIELD_MAP.get(c.field);
  const label = def?.label ?? c.field;
  const opEntry = def ? OPS_BY_TYPE[def.type].find(o => o.op === c.op) : undefined;
  const opLabel = opEntry?.label ?? c.op;
  if (c.op === "empty" || c.op === "notEmpty") return `${label} ${opLabel}`;
  return `${label} ${opLabel} ${String(c.value ?? "")}`;
}

export function describeFilter(conditions: FilterCondition[]): string[] {
  return conditions.map(describeCondition);
}

export function scopeConditions(conditions: FilterCondition[], scope: "all" | "master"): FilterCondition[] {
  return conditions.filter(c => FIELD_MAP.get(c.field)?.scope === scope);
}
```

- [ ] **Step 2: Verify compilation**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/custom-filters.ts
git commit -m "add custom filter domain module"
```

---

### Task 2: Database schema for custom_filters

**Files:**
- Modify: `db/schema.sql` (append at end of file)

**Interfaces:**
- Consumes: existing `public.users(id)` (text Clerk ids) and the RLS idioms `auth.uid() is not null` / `(auth.jwt() -> 'metadata' ->> 'role') = 'admin'` / `(auth.jwt() ->> 'sub')`.
- Produces: table `public.custom_filters` consumed by Task 3's server actions.

- [ ] **Step 1: Append to `db/schema.sql`**

```sql

-- ------------------------------------------------------------
-- custom_filters — saved creator filters (workspace-wide or personal)
-- ------------------------------------------------------------
create table if not exists public.custom_filters (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    visibility text not null default 'personal' check (visibility in ('org', 'personal')),
    conditions jsonb not null default '[]',
    created_by text not null references public.users(id) on delete cascade,
    created_at timestamp with time zone not null default timezone('utc'::text, now()),
    updated_at timestamp with time zone not null default timezone('utc'::text, now())
);

alter table public.custom_filters enable row level security;

create policy "custom_filters select authenticated" on public.custom_filters
    for select using (
        auth.uid() is not null and (
            visibility = 'org' or
            created_by = (auth.jwt() ->> 'sub')
        )
    );

create policy "custom_filters insert owner-or-admin" on public.custom_filters
    for insert with check (
        auth.uid() is not null and (
            (visibility = 'org' and (auth.jwt() -> 'metadata' ->> 'role') = 'admin') or
            (visibility = 'personal' and created_by = (auth.jwt() ->> 'sub'))
        )
    );

create policy "custom_filters update owner-or-admin" on public.custom_filters
    for update using (
        auth.uid() is not null and (
            (visibility = 'org' and (auth.jwt() -> 'metadata' ->> 'role') = 'admin') or
            (visibility = 'personal' and created_by = (auth.jwt() ->> 'sub'))
        )
    );

create policy "custom_filters delete owner-or-admin" on public.custom_filters
    for delete using (
        auth.uid() is not null and (
            (visibility = 'org' and (auth.jwt() -> 'metadata' ->> 'role') = 'admin') or
            (visibility = 'personal' and created_by = (auth.jwt() ->> 'sub'))
        )
    );

create index if not exists idx_custom_filters_created_by on public.custom_filters (created_by);
```

- [ ] **Step 2: Apply to the local database**

Run the appended statements against the Supabase instance (SQL editor or psql), same as previous schema changes in this repo — there is no migration tooling.

- [ ] **Step 3: Commit**

```bash
git add db/schema.sql
git commit -m "add custom_filters table with RLS"
```

---

### Task 3: Server actions — CRUD + filter-aware dashboard overview

**Files:**
- Modify: `src/actions.ts`

**Interfaces:**
- Consumes: Task 1 types/helpers (`CustomFilter`, `FilterCondition`, `FilterVisibility`, `matchesFilter`, `validateConditions`, `scopeConditions`); existing `rows`, `fail`, `requireUser`, `requireAdmin`, `ensureUserRow`, `db`.
- Produces (used by Tasks 4–7):
  - `listCustomFilters(): Promise<CustomFilter[]>` — org filters + caller's personal filters
  - `createCustomFilter(input: { name: string; visibility: FilterVisibility; conditions: FilterCondition[] }): Promise<void>`
  - `updateCustomFilter(id: string, input: { name: string; visibility: FilterVisibility; conditions: FilterCondition[] }): Promise<void>`
  - `deleteCustomFilter(id: string): Promise<void>`
  - `getDashboardOverview(filter?: FilterCondition[]): Promise<DashboardOverview>` — unchanged return shape

- [ ] **Step 1: Add the import**

In `src/actions.ts`, add below the existing type-import from `@/lib/types` (line 8):

```ts
import {
  matchesFilter,
  scopeConditions,
  validateConditions,
  type CustomFilter,
  type FilterCondition,
  type FilterVisibility,
} from "@/lib/custom-filters";
```

(Line 8 keeps its current form: `import type { Creator, Company, Deal, Outreach, Contract, CreatorSummary, CompanySummary } from "@/lib/types";`)

- [ ] **Step 2: Add the Custom Filters CRUD section**

Insert after the Notification preferences section (end of file, after `updateNotificationPreferences`):

```ts
// ---------- Custom filters ----------

type CustomFilterRecord = {
  id: string;
  name: string;
  visibility: string;
  conditions: unknown;
  created_by: string;
  created_at: string;
  updated_at: string;
};

function normalizeFilter(row: CustomFilterRecord): CustomFilter {
  return {
    id: row.id,
    name: row.name,
    visibility: row.visibility === "org" ? "org" : "personal",
    conditions: Array.isArray(row.conditions) ? (row.conditions as FilterCondition[]) : [],
    created_by: row.created_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function assertCanEditFilter(row: CustomFilterRecord) {
  if (row.visibility === "org") {
    await requireAdmin();
    return;
  }
  const userId = await requireUser();
  if (row.created_by !== userId) throw new Error("You can only modify your own filters");
}

export async function listCustomFilters(): Promise<CustomFilter[]> {
  await requireUser();
  const data = await rows<CustomFilterRecord>(
    db.from("custom_filters").select("*").order("created_at", { ascending: false })
  );
  return data.map(normalizeFilter);
}

export async function createCustomFilter(input: {
  name: string;
  visibility: FilterVisibility;
  conditions: FilterCondition[];
}) {
  const userId = await requireUser();
  const name = input.name.trim();
  if (!name) throw new Error("Name is required");
  const validationError = validateConditions(input.conditions);
  if (validationError) throw new Error(validationError);
  if (input.visibility === "org") await requireAdmin();

  await ensureUserRow(userId);
  const { error } = await db.from("custom_filters").insert({
    name,
    visibility: input.visibility,
    conditions: input.conditions,
    created_by: userId,
  });
  if (error) fail(error);
}

export async function updateCustomFilter(
  id: string,
  input: { name: string; visibility: FilterVisibility; conditions: FilterCondition[] }
) {
  const name = input.name.trim();
  if (!name) throw new Error("Name is required");
  const validationError = validateConditions(input.conditions);
  if (validationError) throw new Error(validationError);

  const { data, error: fetchError } = await db.from("custom_filters").select("*").eq("id", id).single();
  if (fetchError || !data) throw new Error("Filter not found");
  const existing = data as CustomFilterRecord;
  await assertCanEditFilter(existing);
  if (input.visibility === "org" && existing.visibility !== "org") await requireAdmin();

  const { error } = await db
    .from("custom_filters")
    .update({ name, visibility: input.visibility, conditions: input.conditions, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) fail(error);
}

export async function deleteCustomFilter(id: string) {
  const { data, error: fetchError } = await db.from("custom_filters").select("*").eq("id", id).single();
  if (fetchError || !data) throw new Error("Filter not found");
  await assertCanEditFilter(data as CustomFilterRecord);
  const { error } = await db.from("custom_filters").delete().eq("id", id);
  if (error) fail(error);
}
```

No `revalidatePath` calls needed: consumers are either dynamic (`/dashboard`) or client-refetched (`/master-data`, settings list, picker).

- [ ] **Step 3: Make `getDashboardOverview` filter-aware**

Replace the function signature line:

```ts
export async function getDashboardOverview(): Promise<DashboardOverview> {
```

with:

```ts
export async function getDashboardOverview(filter?: FilterCondition[]): Promise<DashboardOverview> {
```

Immediately after the opening brace, insert:

```ts
  const scoped = scopeConditions(filter ?? [], "all");
  const active = scoped.length > 0 ? scoped : null;
```

Replace the creators fetch:

```ts
  const creators = await rows<Creator>(
    db.from("creators").select("id, creator_name, followers_instagram, followers_youtube, engagement_rate")
  );
```

with:

```ts
  const creators = active
    ? await rows<Creator>(db.from("creators").select("*"))
    : await rows<Creator>(
        db.from("creators").select("id, creator_name, followers_instagram, followers_youtube, engagement_rate")
      );
  const matchingIds = active
    ? new Set(creators.filter(c => matchesFilter(c as unknown as Record<string, unknown>, active)).map(c => c.id))
    : null;
  const included = (id: string) => !matchingIds || matchingIds.has(id);
```

In the pipeline loop, make the first statement inside `for (const c of creators) {`:

```ts
    if (!included(c.id)) continue;
```

After `const contractsByCreator = groupByCreator(contracts);` insert:

```ts
  const visibleOutreach = matchingIds
    ? outreach.filter(o => o.creator_id != null && matchingIds.has(o.creator_id))
    : outreach;
```

and change the follow-ups loop header from `for (const row of outreach) {` to `for (const row of visibleOutreach) {`.

After the `dealCreators` fetch + `groupByCreator` calls region (directly above the `for (const d of deals)` loop), insert:

```ts
  const dealIds = matchingIds
    ? new Set(dealCreators.filter(dc => matchingIds.has(dc.creator_id)).map(dc => dc.deal_id))
    : null;
```

and make the first statement inside `for (const d of deals) {`:

```ts
    if (dealIds && !dealIds.has(d.id)) continue;
```

Change `const recentOutreach = await listOutreach();` to:

```ts
  const allOutreach = await listOutreach();
  const recentOutreach = matchingIds
    ? allOutreach.filter(o => o.creators != null && matchingIds.has(o.creators.id))
    : allOutreach;
```

Change the `topCreators` mapping to:

```ts
  const topCreators = creators
    .filter(c => included(c.id))
    .map((c) => ({
      id: c.id,
      creator_name: c.creator_name,
      total_deal_value: dealValuesByCreator.get(c.id) ?? 0,
      total_followers: (c.followers_instagram ?? 0) + (c.followers_youtube ?? 0),
      engagement_rate: c.engagement_rate ?? 0,
    }));
```

Change the returned `creatorsCount` to:

```ts
    creatorsCount: matchingIds ? matchingIds.size : creators.length,
```

- [ ] **Step 4: Verify compilation**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/actions.ts
git commit -m "add custom filter actions and filtered dashboard overview"
```

---

### Task 4: URL param helpers + filter picker component

**Files:**
- Create: `src/lib/filter-url.ts`
- Create: `src/components/custom-filter-picker.tsx`

**Interfaces:**
- Consumes: `listCustomFilters` from `@/actions` (Task 3), `parseFilterIds` from `@/lib/filter-url`.
- Produces:
  - From `src/lib/filter-url.ts` (usable in server AND client): `parseFilterIds(raw: string | string[] | null | undefined): string[]`
  - From `src/components/custom-filter-picker.tsx` (client-only): `useActiveFilterIds(): string[]` hook and `CustomFilterPicker` component (self-fetching dropdown, checkbox multi-select writing `?filters=<ids>`).

- [ ] **Step 1: Create `src/lib/filter-url.ts`**

```ts
export function parseFilterIds(raw: string | string[] | null | undefined): string[] {
  const value = Array.isArray(raw) ? raw.join(",") : raw ?? "";
  const seen = new Set<string>();
  for (const part of value.split(",")) {
    const id = part.trim();
    if (id) seen.add(id);
  }
  return [...seen];
}
```

- [ ] **Step 2: Create `src/components/custom-filter-picker.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ListFilter } from "lucide-react";
import { listCustomFilters } from "@/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { CustomFilter } from "@/lib/custom-filters";
import { parseFilterIds } from "@/lib/filter-url";

export function useActiveFilterIds(): string[] {
  const searchParams = useSearchParams();
  return parseFilterIds(searchParams.get("filters"));
}

function applySelection(ids: string[], pathname: string, queryString: string, replace: ReturnType<typeof useRouter>["replace"]) {
  const params = new URLSearchParams(queryString);
  if (ids.length > 0) params.set("filters", ids.join(","));
  else params.delete("filters");
  const qs = params.toString();
  replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
}

function FilterRow({
  filter,
  checked,
  onToggle,
}: {
  filter: CustomFilter;
  checked: boolean;
  onToggle: (id: string, checked: boolean) => void;
}) {
  return (
    <DropdownMenuCheckboxItem
      checked={checked}
      onSelect={(e) => e.preventDefault()}
      onCheckedChange={() => onToggle(filter.id, !checked)}
    >
      <span className="truncate">{filter.name}</span>
    </DropdownMenuCheckboxItem>
  );
}

export function CustomFilterPicker() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const active = useActiveFilterIds();
  const [filters, setFilters] = useState<CustomFilter[]>([]);

  useEffect(() => {
    listCustomFilters()
      .then(setFilters)
      .catch(() => setFilters([]));
  }, []);

  function toggle(id: string, checked: boolean) {
    applySelection(
      checked ? [...active, id] : active.filter((x) => x !== id),
      pathname,
      searchParams.toString(),
      router.replace
    );
  }

  function clearAll() {
    applySelection([], pathname, searchParams.toString(), router.replace);
  }

  const workspace = filters.filter((f) => f.visibility === "org");
  const mine = filters.filter((f) => f.visibility === "personal");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary" className="glass shrink-0">
          <ListFilter className="size-4" />
          Filters
          {active.length > 0 && <Badge className="ml-1 h-5 min-w-5 px-1 tabular-nums">{active.length}</Badge>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="glass-strong max-h-80 w-64 overflow-y-auto">
        {filters.length === 0 && (
          <p className="px-2 py-6 text-center text-xs text-muted-foreground">
            No custom filters yet. Create one under Settings → Custom Filters.
          </p>
        )}
        {workspace.length > 0 && <DropdownMenuLabel>Workspace</DropdownMenuLabel>}
        {workspace.map((f) => (
          <FilterRow key={f.id} filter={f} checked={active.includes(f.id)} onToggle={toggle} />
        ))}
        {workspace.length > 0 && mine.length > 0 && <DropdownMenuSeparator />}
        {mine.length > 0 && <DropdownMenuLabel>My filters</DropdownMenuLabel>}
        {mine.map((f) => (
          <FilterRow key={f.id} filter={f} checked={active.includes(f.id)} onToggle={toggle} />
        ))}
        {active.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={clearAll}>Clear all</DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

- [ ] **Step 3: Verify compilation**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/filter-url.ts src/components/custom-filter-picker.tsx
git commit -m "add custom filter picker and url helpers"
```

---

### Task 5: Apply filters on the dashboard

**Files:**
- Modify: `src/app/dashboard/page.tsx`

**Interfaces:**
- Consumes: `parseFilterIds` (Task 4), `CustomFilterPicker` (Task 4), `listCustomFilters` + `getDashboardOverview(conditions)` (Task 3).
- Produces: dashboard rendering narrowed by `?filters=`; removable per-filter chips.

- [ ] **Step 1: Update imports and page signature**

Add imports:

Add `X` to the existing lucide-react import at the top of the file:

```ts
import {
  Users,
  Megaphone,
  Handshake,
  FileText,
  CircleX,
  CalendarClock,
  Briefcase,
  Wallet,
  Percent,
  ArrowRight,
  X,
} from "lucide-react";
```

Then add these imports below it:

```ts
import { listCustomFilters } from "@/actions";
import { CustomFilterPicker } from "@/components/custom-filter-picker";
import { parseFilterIds } from "@/lib/filter-url";
import type { CustomFilter } from "@/lib/custom-filters";
```

Change the component signature to accept searchParams (Next.js 16 promise prop):

```ts
export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const activeIds = parseFilterIds(params.filters);
  let visibleFilters: CustomFilter[] = [];
  try {
    visibleFilters = await listCustomFilters();
  } catch {
    visibleFilters = [];
  }
  const selected = visibleFilters.filter((f) => activeIds.includes(f.id));
  const conditions = selected.flatMap((f) => f.conditions);
  const overview = await getDashboardOverview(conditions);
```

- [ ] **Step 2: Header with picker and removable chips**

Replace the title block:

```tsx
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-muted-foreground">Creator &amp; brand deal pipeline overview.</p>
      </div>
```

with:

```tsx
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-muted-foreground">Creator &amp; brand deal pipeline overview.</p>
          {selected.length > 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {selected.map((f) => (
                <Link
                  key={f.id}
                  href={hrefWithout(activeIds, f.id)}
                  className="inline-flex items-center gap-1 rounded-full border bg-background/60 px-2.5 py-0.5 text-xs transition-colors hover:bg-accent"
                  title="Remove filter"
                >
                  {f.name}
                  <X className="size-3" />
                </Link>
              ))}
            </div>
          )}
        </div>
        <CustomFilterPicker />
      </div>
```

Add above the component (module scope):

```ts
function hrefWithout(activeIds: string[], removedId: string) {
  const remaining = activeIds.filter((id) => id !== removedId);
  return remaining.length > 0 ? `/dashboard?filters=${remaining.join(",")}` : "/dashboard";
}
```

- [ ] **Step 3: Verify compilation**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/dashboard/page.tsx
git commit -m "apply stacked custom filters on dashboard"
```

---

### Task 6: Apply filters on master data

**Files:**
- Modify: `src/app/master-data/page.tsx`

**Interfaces:**
- Consumes: `CustomFilterPicker`, `useActiveFilterIds` (Task 4); `matchesFilter`, `type CustomFilter` from `@/lib/custom-filters`; `listCustomFilters` (Task 3).
- Produces: master data rows narrowed by the same `?filters=` param; "N of M shown" counter.

- [ ] **Step 1: Split the page into a Suspense wrapper and inner component**

`useSearchParams` (via the picker/hook) requires a Suspense boundary on this statically rendered client page. Rename `export default function MasterDataPage() {` to `function MasterDataInner() {` and append at the end of the file:

```tsx
export default function MasterDataPage() {
  return (
    <React.Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading…</div>}>
      <MasterDataInner />
    </React.Suspense>
  );
}
```

- [ ] **Step 2: Wire state and filtering inside `MasterDataInner`**

Add imports (the file already imports `React, { useState }` — keep that style):

```tsx
import { listCustomFilters } from "@/actions";
import { CustomFilterPicker, useActiveFilterIds } from "@/components/custom-filter-picker";
import { matchesFilter, type CustomFilter } from "@/lib/custom-filters";
```

Inside `MasterDataInner`, after the existing state declarations add:

```tsx
  const activeIds = useActiveFilterIds();
  const [savedFilters, setSavedFilters] = useState<CustomFilter[]>([]);

  React.useEffect(() => {
    listCustomFilters()
      .then(setSavedFilters)
      .catch(() => setSavedFilters([]));
  }, []);

  const activeConditions = React.useMemo(
    () => savedFilters.filter((f) => activeIds.includes(f.id)).flatMap((f) => f.conditions),
    [savedFilters, activeIds]
  );
```

Replace the existing `filtered` computation:

```tsx
  const filtered = query.trim()
    ? rows.filter((r) =>
        [r.creator_name, r.creator_type, r.email, r.niche, r.city, r.country, r.assigned_manager].some((v) =>
          (v ?? "").toLowerCase().includes(query.toLowerCase())
        )
      )
    : rows;
```

with:

```tsx
  const customFiltered =
    activeConditions.length > 0
      ? rows.filter((r) => matchesFilter(r as unknown as Record<string, unknown>, activeConditions))
      : rows;
  const filtered = query.trim()
    ? customFiltered.filter((r) =>
        [r.creator_name, r.creator_type, r.email, r.niche, r.city, r.country, r.assigned_manager].some((v) =>
          (v ?? "").toLowerCase().includes(query.toLowerCase())
        )
      )
    : customFiltered;
```

- [ ] **Step 3: Add picker and count to the toolbar**

In the CardHeader search row, after the existing hint span (`Scroll right to see all columns`) add:

```tsx
            {activeIds.length > 0 && loaded && (
              <span className="hidden text-xs text-muted-foreground md:inline">
                {filtered.length} of {rows.length} shown
              </span>
            )}
            <div className="ml-auto">
              <CustomFilterPicker />
            </div>
```

Also update the empty-state message: change `"No creators match your search."` to

```tsx
{loaded && rows.length === 0 ? "No creators yet. Add your first one!" : activeConditions.length > 0 ? "No creators match the active filters." : "No creators match your search."}
```

- [ ] **Step 4: Verify compilation**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/master-data/page.tsx
git commit -m "apply stacked custom filters on master data"
```

---

### Task 7: Settings section — create/edit/delete filters

**Files:**
- Modify: `src/app/settings/layout.tsx`
- Create: `src/app/settings/filters/page.tsx`
- Create: `src/app/settings/filters/filter-dialog.tsx`

**Interfaces:**
- Consumes: `createCustomFilter` / `updateCustomFilter` / `deleteCustomFilter` / `listCustomFilters` (Task 3); `FILTERABLE_FIELDS`, `FIELD_MAP`, `OPS_BY_TYPE`, `validateConditions`, `describeFilter`, types from Task 1; `useRole` from `@/lib/rbac`.
- Produces: `/settings/filters` page (nav entry "Custom Filters", visible to all roles).

- [ ] **Step 1: Add the nav entry**

In `src/app/settings/layout.tsx`, extend the lucide import:

```ts
import { Settings, Users, Palette, Bell, ShieldCheck, ListFilter } from "lucide-react";
```

Extend `SECTIONS`:

```ts
const SECTIONS = [
  { href: "/settings", label: "General", icon: Settings },
  { href: "/settings/team", label: "Team Members", icon: Users, adminOnly: true },
  { href: "/settings/appearance", label: "Appearance", icon: Palette },
  { href: "/settings/filters", label: "Custom Filters", icon: ListFilter },
  { href: "/settings/notifications", label: "Notifications", icon: Bell },
];
```

- [ ] **Step 2: Create `src/app/settings/filters/filter-dialog.tsx`**

```tsx
"use client";

import React, { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { createCustomFilter, updateCustomFilter } from "@/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  FIELD_MAP,
  FILTERABLE_FIELDS,
  OPS_BY_TYPE,
  validateConditions,
  type CustomFilter,
  type FilterCondition,
  type FilterVisibility,
} from "@/lib/custom-filters";

const SELECT_CLASS =
  "h-8 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

function emptyDraft(): FilterCondition {
  return { field: "", op: "", value: "" };
}

export function FilterDialog({
  open,
  onOpenChange,
  initial,
  isAdmin,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: CustomFilter | null;
  isAdmin: boolean;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [visibility, setVisibility] = useState<FilterVisibility>("personal");
  const [conditions, setConditions] = useState<FilterCondition[]>([emptyDraft()]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(initial?.name ?? "");
    setVisibility(initial?.visibility ?? "personal");
    const restored = (initial?.conditions ?? []).map((c) => ({
      field: c.field,
      op: c.op,
      value: c.value == null ? "" : String(c.value),
    }));
    setConditions(restored.length > 0 ? restored : [emptyDraft()]);
  }, [open, initial]);

  const validationError = validateConditions(conditions);
  const groups = [...new Set(FILTERABLE_FIELDS.map((f) => f.group))];

  function patch(index: number, next: Partial<FilterCondition>) {
    setConditions((prev) =>
      prev.map((c, i) => {
        if (i !== index) return c;
        const merged = { ...c, ...next };
        if (next.field && next.field !== c.field) {
          const def = FIELD_MAP.get(next.field);
          const allowed = def ? OPS_BY_TYPE[def.type] : [];
          if (!allowed.some((o) => o.op === merged.op)) merged.op = allowed[0]?.op ?? "";
        }
        return merged;
      })
    );
  }

  function removeAt(index: number) {
    setConditions((prev) => (prev.length === 1 ? [emptyDraft()] : prev.filter((_, i) => i !== index)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const error = validateConditions(conditions);
    if (error) {
      toast.error(error);
      return;
    }
    setSaving(true);
    try {
      const payload = { name: name.trim(), visibility, conditions };
      if (initial) {
        await updateCustomFilter(initial.id, payload);
        toast.success(`Updated ${payload.name}`);
      } else {
        await createCustomFilter(payload);
        toast.success(`Created ${payload.name}`);
      }
      onOpenChange(false);
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{initial ? `Edit ${initial.name}` : "New Custom Filter"}</DialogTitle>
          <DialogDescription>Conditions combine with AND — a creator must match every one.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="cf-name">Name *</Label>
              <Input
                id="cf-name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="High-priority gaming creators"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cf-visibility">Visible to</Label>
              <select
                id="cf-visibility"
                className={SELECT_CLASS}
                value={visibility}
                onChange={(e) => setVisibility(e.target.value as FilterVisibility)}
              >
                <option value="personal">Only me</option>
                {isAdmin && <option value="org">Everyone (workspace)</option>}
              </select>
            </div>
          </div>

          <div className="grid gap-2">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Conditions</p>
            {conditions.map((c, i) => {
              const def = c.field ? FIELD_MAP.get(c.field) : undefined;
              const ops = def ? OPS_BY_TYPE[def.type] : [];
              const needsValue = c.op !== "empty" && c.op !== "notEmpty" && c.op !== "";
              return (
                <div key={i} className="flex flex-wrap items-center gap-2">
                  <select
                    aria-label="Field"
                    className={`${SELECT_CLASS} w-44`}
                    value={c.field}
                    onChange={(e) => patch(i, { field: e.target.value })}
                  >
                    <option value="">Select field…</option>
                    {groups.map((g) => (
                      <optgroup key={g} label={g}>
                        {FILTERABLE_FIELDS.filter((f) => f.group === g).map((f) => (
                          <option key={f.field} value={f.field}>
                            {f.label}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  <select
                    aria-label="Operator"
                    className={`${SELECT_CLASS} w-32`}
                    value={c.op}
                    onChange={(e) => patch(i, { op: e.target.value })}
                    disabled={!def}
                  >
                    {!def && <option value="">—</option>}
                    {ops.map((o) => (
                      <option key={o.op} value={o.op}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  {needsValue &&
                    (def?.options ? (
                      <select
                        aria-label="Value"
                        className={`${SELECT_CLASS} w-40`}
                        value={c.value ?? ""}
                        onChange={(e) => patch(i, { value: e.target.value })}
                      >
                        <option value="">Select…</option>
                        {def.options.map((o) => (
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
                    ))}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove condition ${i + 1}`}
                    onClick={() => removeAt(i)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              );
            })}
            <Button
              type="button"
              variant="outline"
              className="w-fit"
              onClick={() => setConditions((prev) => [...prev, emptyDraft()])}
            >
              <Plus className="size-4" /> Add condition
            </Button>
            {validationError && <p className="text-xs text-destructive">{validationError}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !name.trim() || validationError !== null}>
              {saving ? "Saving…" : initial ? "Save changes" : "Create filter"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 3: Create `src/app/settings/filters/page.tsx`**

```tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteCustomFilter, listCustomFilters } from "@/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { describeFilter, type CustomFilter } from "@/lib/custom-filters";
import { useRole } from "@/lib/rbac";
import { FilterDialog } from "./filter-dialog";

export default function CustomFiltersSettingsPage() {
  const role = useRole();
  const isAdmin = role === "admin";
  const [filters, setFilters] = useState<CustomFilter[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CustomFilter | null>(null);

  const refresh = useCallback(async () => {
    try {
      setFilters(await listCustomFilters());
    } catch {
      toast.error("Could not load filters");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function handleDelete(filter: CustomFilter) {
    if (!window.confirm(`Delete filter "${filter.name}"? This cannot be undone.`)) return;
    try {
      await deleteCustomFilter(filter.id);
      toast.success(`Deleted ${filter.name}`);
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle>Custom Filters</CardTitle>
        <CardDescription>Saved creator filters for the dashboard and master data views.</CardDescription>
        <CardAction>
          <Button
            variant="secondary"
            className="glass"
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="size-4" /> New Filter
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="grid gap-3">
        {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!loading && filters.length === 0 && (
          <p className="text-sm text-muted-foreground">No filters yet. Create your first one.</p>
        )}
        {filters.map((f) => (
          <div
            key={f.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-background/40 p-3"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium">{f.name}</span>
                {f.visibility === "org" && <Badge className="bg-muted text-muted-foreground">Workspace</Badge>}
              </div>
              <p className="mt-1 truncate text-xs text-muted-foreground">
                {describeFilter(f.conditions).join(" AND ")}
              </p>
            </div>
            {(f.visibility === "personal" || isAdmin) && (
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Edit ${f.name}`}
                  onClick={() => {
                    setEditing(f);
                    setDialogOpen(true);
                  }}
                >
                  <Pencil className="size-4" />
                </Button>
                <Button variant="ghost" size="icon" aria-label={`Delete ${f.name}`} onClick={() => handleDelete(f)}>
                  <Trash2 className="size-4" />
                </Button>
              </div>
            )}
          </div>
        ))}
      </CardContent>
      <FilterDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initial={editing}
        isAdmin={isAdmin}
        onSaved={refresh}
      />
    </Card>
  );
}
```

- [ ] **Step 4: Verify compilation**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/settings/layout.tsx src/app/settings/filters/page.tsx src/app/settings/filters/filter-dialog.tsx
git commit -m "add custom filters settings section"
```

---

### Task 8: Full verification + smoke test

**Files:**
- None created; fixes may touch any file from Tasks 1–7.

**Interfaces:**
- Consumes: everything built so far.
- Produces: green build and a completed manual smoke checklist.

- [ ] **Step 1: Lint**

Run: `npm run lint`
Expected: no errors (fix any findings in the touched files only).

- [ ] **Step 2: Production build**

Run: `npm run build`
Expected: succeeds. If `useSearchParams` bailout errors appear for `/master-data`, confirm the Suspense wrapper from Task 6 Step 1 is present.

- [ ] **Step 3: Manual smoke checklist (dev server, two browser profiles: one admin, one member)**

1. Settings → Custom Filters visible for BOTH roles; member sees no workspace badge option.
2. Admin creates org filter "High priority" (`priority is High`) and a personal one; member creates a personal filter "Big on IG" (`followers_instagram ≥ 10000`).
3. Member's picker shows Workspace: High priority; My filters: Big on IG. Checking both narrows master data rows; counter shows "N of M shown"; text search still composes on top.
4. Same selection on dashboard shrinks stat cards, both donuts, Top Creators, Recent Outreach; one chip per filter appears; clicking a chip ✕ removes just that filter.
5. Deep link `/dashboard?filters=<id1>,<id2>` restores the stacked selection after reload.
6. Delete a filter in Settings while it is active in another tab → other tab falls back gracefully (unknown ids ignored).
7. Member cannot see Edit/Delete on workspace filters and gets an error toast if forcing the action; admin can edit/delete both kinds.

- [ ] **Step 4: Fix anything found, re-run gates, commit fixes**

```bash
git add <only the files fixed>
git commit -m "fix custom filters smoke test findings"
```

(If nothing was found, skip this step.)
