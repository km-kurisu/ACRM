# Companies Tab, Creator Filters & UX Fixes — Design

Date: 2026-08-23
Status: Approved (user decisions Q1–Q3; remaining sections approved verbally via "start building")

## Goals

Seven changes, ordered by dependency:

1. **Companies tab** — new `/companies` page + nav entry: list companies, add/edit with full details, manage contacts, mark one contact as point-of-contact (POC).
2. **Company fields** — `last_contacted` (date) and `next_meeting` (date) columns on `companies`; contacts live in a new `company_contacts` child table (name required; role, email, phone optional; `is_poc` boolean).
3. **Companies in deals** — already exists (`deals.company_id`, picker on deals page); kept working, picker restyled for consistency.
4. **Creator filters** — reuse the custom-filters stack (picker + `matchesFilter`, client-side) on the Creators page.
5. **Remove add-creator dialog from Creators page** — page becomes browse + search + filter only; row click opens `/creators/[id]` where edit/delete live. Master Data add flow unchanged.
6. **Add-deal dialog creator picker** — replace checkbox wall with a multi-select dropdown (data model unchanged: `deal_creators` many-to-many stays).
7. **Dashboard layout** — Top Creators and Recent Outreach sit side-by-side in one `grid gap-6 lg:grid-cols-2` row below the donuts.

## Locked decisions

- Deal creators: **multi-select dropdown**, many-to-many preserved (Q1).
- Add-creator dialog removed **only from Creators page** (Q2). Edit/delete happen on the detail page; the Creators page keeps row links and loses its local Dialog/form/delete.
- Contacts: **child table + single POC flag** (Q3). Exactly one POC enforced at app level — saving a contact set where one has `is_poc` clears the flag on the others (normalize in server action before insert). A company may have zero contacts (then no POC).
- Company mutations are admin-gated (`requireAdmin`), lists open to authenticated users — same convention as every other entity.
- Deleting a company with referencing deals must NOT cascade-delete deals; check FK behavior, use restrict-or-error surfacing if schema cascades.

## Data model

```sql
alter table companies
  add column last_contacted date,
  add column next_meeting date;

create table public.company_contacts (
  id text primary key default gen_random_uuid()::text,
  company_id text not null references public.companies on delete cascade,
  name text not null,
  role text,
  email text,
  phone_number text,
  is_poc boolean not null default false,
  created_at timestamp with time zone not null default timezone('utc'::text, now())
);
alter table public.company_contacts enable row level security;
-- select: authenticated; insert/update/delete: admin role claim (existing policy style)
create index idx_company_contacts_company on public.company_contacts(company_id);
```

Conventions: text uuid-pk-as-text ids, timestamptz defaults, RLS style matching `deal_creators`.

## Server API (`src/actions.ts`)

- `listCompanies()` → `select("*, company_contacts(*)")` ordered `created_at desc`.
- `createCompany(input)` / `updateCompany(id, input)` accept `{ ...companyFields, contacts: ContactInput[] }`; insert company, then replace-all contacts (delete + insert, mirroring `updateDeal` link strategy); normalize POC before insert.
- `deleteCompany(id)` — guard against orphaning deals per FK reality.
- Types: `CompanyContact`, `CompanyWithContacts = CompanyRow & { company_contacts: CompanyContact[] }` in `src/lib/types.ts`.
- DDL appended to `db/schema.sql`; **must be applied to live Supabase before smoke test** (same manual step as custom filters).

## UI

- **Nav**: `Shell.tsx` NAV gains `{ href: "/companies", label: "Companies", icon: Building2 }` after Creators.
- **`/companies/page.tsx`** ("use client"): fetch `listCompanies()`; glass table (name, domain, industry, POC name, last contacted, next meeting, created); admin-only Add/Edit/Delete; Dialog with `CreatorFormFields`-style two-column grid: company fields section + contacts repeater rows (name/role/email/phone/POC radio + remove), "Add contact" button; POC selection is exclusive within dialog state; save disabled while name empty; delete confirm via `window.confirm`; toast on error/success like sibling pages.
- **Deals dialog**: creator picker becomes `DropdownMenu` + `DropdownMenuCheckboxItem` (pattern proven in `custom-filter-picker.tsx`), trigger button shows "3 creators selected"; company picker restyles to same dropdown pattern (single-select).
- **Creators page**: drop Dialog/CreatorFormFields usage + delete handler; add `CustomFilterPicker` + `useActiveFilterIds` + `matchesFilter` client-side (mirror master-data wiring, including "N of M shown" counter gated on active conditions); registry scope "all" fields apply naturally.
- **Dashboard**: wrap Top Creators + Recent Outreach cards in `<section className="grid gap-6 lg:grid-cols-2">`, each child fills one cell.

## Out of scope

Logo upload (logo stays a URL text field), contact-level history, company-scoped deal views, any settings integration.
