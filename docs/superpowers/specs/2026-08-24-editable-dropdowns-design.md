# Editable Dropdown Options — Design Spec

Date: 2026-08-24
Status: Approved (design discussion 2026-08-24)

## Problem

Every status/type dropdown in the CRM is a hardcoded list duplicated up to
five times per field (two form locations, custom-filters registry, schema
CHECK constraints, color maps). Admins cannot add, rename, or remove values
without code changes; renaming a value in one place silently desyncs the
others.

The 13 managed fields: `creator_type`, `niche`, `priority`,
`interested_in_exclusive_mgmt` (creators), `contact_method`, `current_status`,
`outcome` (outreach), `contract_type`, `contract_status`, `exclusivity`
(contracts), `campaign_status`, `invoice_status`, `payment_status` (deals).

## Goals

- Admins manage all values for the 13 fields from **Settings → Dropdown
  Options**: add, rename (edit), remove.
- Renaming a value cascades to every existing record using it.
- Removing a value still referenced by records is blocked with a count of
  referencing rows.
- All forms, dialogs, and filter value pickers read options dynamically;
  hardcoded arrays become fallback defaults.

## Non-goals

- The Yes/No checkbox trio (`rate_card_received`, `gst_available`,
  `payment_details_received`) stays fixed.
- Presence statuses, team roles, and platform lists (Pages page) stay fixed.
- Drag-reordering of option values (new values append; seeded order preserved
  via `sort_order`).
- Making dashboard automation logic dynamic (see Trade-offs).

## Decisions (from design discussion)

1. **Block-if-in-use**: removing a value referenced by any row throws an
   error naming the count; admin must reassign records first.
2. **Rename cascades**: editing a value runs one targeted UPDATE over the
   owning table so data stays consistent.
3. **Storage = dedicated table** (not a JSONB blob): per-option rows make
   usage checks, cascades, ordering, and uniqueness straightforward.

## Data model (db/schema.sql, idempotent)

```sql
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
```

Seed inserts: every current value of all 13 fields with its present UI order
as `sort_order` (0-based). Idempotent via the unique index + `on conflict do
nothing`.

Constraint drops (auto-named single-column CHECKs):

```sql
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

(`creator_type` has no CHECK today.) Existing deployments re-run the SQL file
manually, as with prior migrations.

## Field registry (src/actions.ts)

```ts
const DROPDOWN_FIELDS: Record<string, { table: string; column: string }> = {
  creator_type:                   { table: "creators",  column: "creator_type" },
  niche:                          { table: "creators",  column: "niche" },
  priority:                       { table: "creators",  column: "priority" },
  interested_in_exclusive_mgmt:   { table: "creators",  column: "interested_in_exclusive_mgmt" },
  contact_method:                 { table: "outreach",  column: "contact_method" },
  current_status:                 { table: "outreach",  column: "current_status" },
  outcome:                        { table: "outreach",  column: "outcome" },
  contract_type:                  { table: "contracts", column: "contract_type" },
  contract_status:                { table: "contracts", column: "contract_status" },
  exclusivity:                    { table: "contracts", column: "exclusivity" },
  campaign_status:                { table: "deals",     column: "campaign_status" },
  invoice_status:                 { table: "deals",     column: "invoice_status" },
  payment_status:                 { table: "deals",     column: "payment_status" },
};
```

Unknown `fieldKey` inputs throw. This map is also exported as a type-level
list for the client (`DropdownFieldKey` union) and reused by
`DEFAULT_OPTIONS` seeding.

## Server actions (src/actions.ts)

Following existing patterns (`rows()`, `fail()`, `requireAdmin()`):

- `listDropdownOptions(): Promise<Record<string, string[]>>` — requireUser;
  one select ordered by `sort_order, value`; grouped into the record shape.
- `createDropdownOption(fieldKey, value)` — requireAdmin; trim; reject empty
  or >120 chars; case-insensitive duplicate check against that field's rows;
  inserts with `sort_order = max + 1`.
- `renameDropdownOption(fieldKey, oldValue, newValue)` — requireAdmin; same
  validation (newValue must not collide case-insensitively unless equal to
  oldValue); updates the option row AND cascades
  `update(table).set(column, newValue).eq(column, oldValue)` using the
  registry map.
- `deleteDropdownOption(fieldKey, value)` — requireAdmin; counts rows in the
  owning table where `column = value`; if > 0 throws
  `"Cannot remove — N record(s) still use \"value\""`; else deletes.

All mutations call `revalidateAll()` plus
`revalidatePath("/settings/dropdowns")`.

## Client consumption (src/lib/use-dropdown-options.ts)

New client module:

- Exports `DEFAULT_OPTIONS`: the current hardcoded lists (same order as the
  seed) — doubles as while-loading/failure fallback and documentation of the
  seed source.
- `useDropdownOptions()` hook: fetches `listDropdownOptions()` once, caches
  at module level (shared across pages/mounts); returns
  `{ options: Record<string, string[]>, reload }`. While loading or on error
  it serves `DEFAULT_OPTIONS`.

Callers pass `options[field] ?? DEFAULT_OPTIONS[field]` into selects. Rewired
surfaces:

| File | Fields |
|---|---|
| `src/components/creator-form.tsx` | creator_type, niche, priority, interested_in_exclusive_mgmt |
| `src/app/deals/page.tsx` | campaign_status, invoice_status, payment_status |
| `src/app/outreach/page.tsx` | contact_method, current_status, outcome |
| `src/app/contracts/page.tsx` | contract_type, contract_status, exclusivity |
| `src/app/creators/[id]/page.tsx` (all dialogs) | the outreach/contract/deal sets above |
| `src/app/settings/filters/filter-dialog.tsx` | enum field value pickers |

`custom-filters.ts` keeps its static `options` as the fallback; the filter
dialog merges dynamic options when available (union preserving static first,
extras appended). Filter *matching* compares strings and needs no change.
Form defaults (e.g. new deal starts "Pitched") remain the canonical seed
strings — if an admin removed that value, the form falls back to the first
available option.

Badge color maps (`src/lib/colors.ts`, `PAYMENT_COLORS`) are untouched:
unknown values already render with the muted fallback class.

## Settings UI

- `src/app/settings/layout.tsx`: append nav section
  `{ href: "/settings/dropdowns", label: "Dropdown Options", icon: ListFilter, adminOnly: true }`
  (matches Team Members pattern; non-admins see a locked link).
- `src/app/settings/dropdowns/page.tsx`: server component starting with
  `await requireAdmin()` (Team page pattern).
- `src/app/settings/dropdowns/dropdowns-manager.tsx` (client): one card per
  field (13 total, labeled with human names), each listing its values as rows
  with inline Rename (input + save/cancel) and Remove buttons, plus an
  add-value input at the bottom. Remove/rename failures surface via
  `toast.error(err.message)` — the block-if-in-use message includes the
  referencing count. Cards for `contract_status`, `current_status`, and
  `campaign_status` show a muted note: "Used by dashboard automation —
  renames affect pipeline grouping."

## Trade-offs (accepted)

- Dashboard logic keys off canonical strings: `contract_status === "Active"`
  drives Signed; pipeline buckets compare `current_status` names; the donut
  iterates `DEAL_STATUS_ORDER`. Renamed/removed system values fall into
  generic buckets ("Contacted"/"Prospect") or drop off the chart. Documented
  in the UI note above rather than made dynamic (scope control).
- Renames lose their badge color mapping until someone extends the color map
  (falls back to muted styling, which is the existing behavior for unknowns).

## Testing & verification

No test framework in the repo. Verification:

1. `npx tsc --noEmit`
2. `npm run lint`
3. `npm run build`
4. Run `db/schema.sql` against a fresh database — idempotent, seeds 13 fields,
   drops constraints cleanly; run again to confirm no errors.
5. Manual smoke: add a niche → appears in creator form + filters dialog;
   rename a campaign_status in use → deals update; try removing an in-use
   value → blocked with count; remove an unused value → gone everywhere;
   non-admin has no Dropdown Options access (locked nav + server-side
   requireAdmin).

## Open implementation notes

- Confirm exact auto-generated constraint names on a live database before
  relying on the `drop constraint if exists` list (Postgres names them
  `<table>_<column>_check`; verify with `\d creators` etc.).
- Supabase `.insert().select("id").single()` pattern used elsewhere applies
  where created ids are needed (not needed here — actions return void).
