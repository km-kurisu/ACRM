# Custom Filters — Design Spec

Date: 2026-08-23
Status: Approved (design discussion 2026-08-23)

## Problem

The dashboard and master data pages show all data with no structured filtering.
Users need reusable, named filters ("High-priority gaming creators", "Followers
over 10k") that admins can publish workspace-wide and users can keep private,
applied on both the dashboard aggregates and the master data table.

## Goals

- Admins create org-wide ("workspace") custom filters in Settings; every user
  can apply them.
- Any user can create personal filters visible only to themselves.
- Applying a filter narrows dashboard stats/charts/lists AND master data rows.
- Filtered views are URL-addressable (`?filter=<id>`).

## Non-goals

- Filtering on entities other than creators (deals/outreach/contracts are only
  affected through their link to matching creators).
- Adding pickers to `/creators`, `/deals`, `/outreach`, `/contracts` (the picker
  component will be reusable for these later).
- OR logic between conditions, nested groups, or ad-hoc unsaved filters.
- SQL-level filter translation.

## Data model

New table appended to `db/schema.sql`:

```sql
create table if not exists public.custom_filters (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    visibility text not null default 'personal'
        check (visibility in ('org', 'personal')),
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

create policy "custom_filters insert admin-or-owner" on public.custom_filters
    for insert with check (
        auth.uid() is not null and (
            (visibility = 'org' and (auth.jwt() -> 'metadata' ->> 'role') = 'admin')
            or (visibility = 'personal' and created_by = (auth.jwt() ->> 'sub'))
        )
    );

create policy "custom_filters update admin-or-owner" on public.custom_filters
    for update using (
        auth.uid() is not null and (
            (visibility = 'org' and (auth.jwt() -> 'metadata' ->> 'role') = 'admin')
            or (visibility = 'personal' and created_by = (auth.jwt() ->> 'sub'))
        )
    );

create policy "custom_filters delete admin-or-owner" on public.custom_filters
    for delete using (
        auth.uid() is not null and (
            (visibility = 'org' and (auth.jwt() -> 'metadata' ->> 'role') = 'admin')
            or (visibility = 'personal' and created_by = (auth.jwt() ->> 'sub'))
        )
    );
```

This mirrors existing policies in `db/schema.sql` (`auth.uid()` authenticated
check; admin via `auth.jwt() -> 'metadata' ->> 'role'`; per-user via
`auth.jwt() ->> 'sub'`). Existing deployments run the SQL manually (repo has no
migration tooling). The server uses the service-role key, so permission rules
are enforced twice: in the server actions and here in RLS.

## Condition model

A filter's `conditions` is a JSON array of `{ field, op, value }`, AND-combined
(a row matches when every condition matches). An empty array matches everything
but the UI requires at least one complete condition to save.

Operators by field type:

| Type | Operators | Value input |
|---|---|---|
| Text | contains · equals · not equals · is empty · is not empty | text |
| Number | = · ≠ · > · ≥ · < · ≤ | number |
| Enum-like | is · is not | select of known values |
| Date (`created_at`) | on · before · after | date (yyyy-mm-dd) |

Semantics:
- `contains`: case-insensitive substring on stringified value.
- `is empty` / `is not empty`: null or empty string.
- Number comparisons parse values with `Number(...)`; non-numeric stored value
  fails the condition rather than throwing.
- Dates compare as `yyyy-mm-dd` strings against the date part.
- Unknown field or unknown op for its type → condition evaluates to `true`
  (skipped), never throws.

### Field registry

All `Creator` columns (src/lib/types.ts) plus the derived columns exposed by
`MasterDataRow`: `total_reach`, `management_status`, `date_first_contacted`,
`next_follow_up_date`, `outreach_outcome`, `contract_status`. Each entry:
`{ field, label, type, options?, group }` where group ∈ Profile / Reach /
Pipeline / System, rendered as opt-groups in selects.

Enum option sources (static lists): niche, creator_type, priority
(High/Medium/Low), interested_in_exclusive_mgmt (Yes/No/Maybe),
rate_card_received/gst_available/payment_details_received (Yes/No),
management_status (Prospect/Contacted/Negotiating/Signed/Rejected/On Hold),
contract_status (Draft/Active/Renewed/Expired/Terminated), outreach_outcome
(No Response/Awaiting Reply/Interested/Not Interested/Negotiating/Signed/On
Hold), primary_content_type.

## Server actions (src/actions.ts)

Following existing patterns (`rows()` helper, `fail()`, `requireAdmin()`):

- `listCustomFilters(): Promise<CustomFilter[]>` — org rows + own personal rows
  (requireUser).
- `createCustomFilter(input: { name, visibility, conditions })` — admin required
  when `visibility = 'org'`; any user for `'personal'`. Sets `created_by`.
- `updateCustomFilter(id, input)` — same permission rule (admins for org,
  owner for personal); bumps `updated_at`.
- `deleteCustomFilter(id)` — same permission rule.
- `getDashboardOverview(filter?: FilterCondition[] | null)` — extended signature
  (see below). Passing conditions directly (not an id) keeps the action pure;
  the page resolves id → conditions.

Validation on write: name trimmed non-empty; conditions array with ≥ 1 entry;
every entry has field present in registry, op valid for its type, and a value
present unless op is `is empty`/`is not empty`. Invalid input throws with a
readable message (toasted client-side).

Type definitions live in `src/lib/custom-filters.ts`.

## Shared evaluator (src/lib/custom-filters.ts)

Pure module, no React/server imports:

- Types: `FilterCondition`, `FilterVisibility`, `CustomFilter`.
- `FILTERABLE_FIELDS`: the registry above.
- `matchesFilter(row: Record<string, unknown>, conditions: FilterCondition[]):
  boolean` — the single source of truth for filter semantics, used by the
  dashboard aggregation and the master data table alike.

## Settings UI

- `src/app/settings/layout.tsx`: add nav section `{ href: "/settings/filters",
  label: "Custom Filters", icon: Filter }` — **no** `adminOnly` flag (all users
  manage personal filters there).
- `src/app/settings/filters/page.tsx` (client): lists visible filters —
  workspace ones badged "Workspace", personal unbadged — showing name, readable
  condition chips (e.g. `niche is Gaming`, `followers_instagram ≥ 10000`),
  created date. Row actions: Edit, Delete (confirm dialog). "New Filter"
  button.
- Create/Edit dialog (existing Dialog + form patterns): Name input; condition
  builder rows `[Field ▾] [Operator ▾] [Value] [✕]` — operator options derive
  from field type, value control derives from operator (number input / text
  input / enum select / date input); "+ Add condition"; Save disabled until
  valid. Admin-only extra: "Visible to: Only me / Everyone (workspace)" select.
  Non-admins always save personal.
- Non-admins see only their own filters in the list and cannot edit/delete
  workspace rows (UI hides actions; server actions + RLS enforce regardless).

## Applying filters

Shared picker component `src/components/CustomFilterPicker.tsx` (client):
Select listing "All data" plus saved filters grouped Workspace / My filters.
Selection writes `?filter=<id>` to the URL (`useRouter` + `useSearchParams`);
"All data" removes the param.

### Dashboard (server component)

`src/app/dashboard/page.tsx` awaits `searchParams` (verify exact Next.js 16
convention against `node_modules/next/dist/docs/` before implementing — this
install may differ from older conventions). Resolves the filter id against
`listCustomFilters()`; unknown/deleted ids fall back to no filter. Passes the
matched filter's conditions into `getDashboardOverview(conditions)`.

Inside `getDashboardOverview`:
1. When a filter is active, fetch creators with `select *` (filters may target
   any column); evaluate `matchesFilter` over them → matching creator id set.
2. Pipeline donut counts only matching creators.
3. Follow-ups-in-7-days and Recent Outreach restricted to outreach rows whose
   `creator_id` is in the set.
4. Total deals / revenue / commission include only deals linked (via
   `deal_creators`) to ≥ 1 matching creator; deal status chart likewise.
5. Top Creators built from matching creators only.

UI: an active-filter chip next to the page title shows the filter name with a
one-click clear (removes the param). The picker sits in the header area.

### Master data (client component)

`src/app/master-data/page.tsx` renders the same picker beside the existing
search input. Rows are filtered by `matchesFilter` first, then the existing
free-text search applies to the result. When a filter is active, show
"N of M shown" near the toolbar. Selection reads/writes the same
`?filter=<id>` param so both surfaces share deep links.

## Error handling

- Stale or unknown `?filter=` id → silently unfiltered, picker resets to
  "All data".
- Malformed/stale conditions (unknown field/op) → skipped during evaluation;
  pages render normally.
- Action failures surface via existing `toast.error(err.message)` pattern.
- Direct action calls bypassing UI are rejected by `requireAdmin()` /
  ownership checks and RLS.

## Testing & verification

No test framework in the repo. Verification:

1. `npx tsc --noEmit`
2. `npm run lint`
3. `npm run build`
4. Manual smoke: create personal + workspace filters in Settings → apply on
   dashboard (stats change accordingly) → apply on master data (rows narrow,
   count shown) → delete a filter while it is applied elsewhere → graceful
   fallback to All data → non-admin account sees only own filters and cannot
   mutate workspace ones.

## Open implementation notes

- Confirm Next.js 16 `searchParams` prop shape (Promise vs object) from
  `node_modules/next/dist/docs/` per AGENTS.md before touching the dashboard
  page.
- Confirm Clerk-JWT claim names (`sub`, `metadata.role`) match what existing
  policies rely on; mirror exactly.
