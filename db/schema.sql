-- ============================================================
-- Anime Creator Agency CRM — Supabase schema
-- Run this in the Supabase SQL editor (or `supabase db push`)
-- Mirrors the workbook: Master Data / Outreach / Confirmed /
-- Brand Deals / Lists, with Clerk-managed auth (org-based RBAC).
-- ============================================================

-- Used for UUID-ish id generation
create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- users — mirror of Clerk users, populated by /api/clerk-sync
-- ------------------------------------------------------------
create table if not exists public.users (
    id text primary key,
    full_name text not null default '',
    email text,
    image_url text,
    username text,
    initials text not null default '',
    role text not null default 'member' check (role in ('admin', 'member', 'viewer')),
    status text not null default 'Invited',
    created_at timestamp with time zone not null default timezone('utc'::text, now()),
    updated_at timestamp with time zone not null default timezone('utc'::text, now())
);

-- ------------------------------------------------------------
-- creators — Master Data sheet
-- ------------------------------------------------------------
create table if not exists public.creators (
    id text primary key default gen_random_uuid()::text,
    creator_name text not null,
    creator_username text,
    instagram text,
    youtube text,
    x_twitter text,
    other_platforms text,
    email text,
    phone_number text,
    city text,
    state text,
    country text,
    niche text check (niche in ('Cosplay','Fan Art / Illustration','AMV Editing','Anime Commentary / Review','Voice Acting / Dubbing','Anime News','Figure Collecting','Manga Content','Gaming + Anime','Anime Merch Reviews')),
    followers_instagram numeric(15,2) not null default 0,
    followers_youtube numeric(15,2) not null default 0,
    engagement_rate numeric(6,4) default 0,
    primary_content_type text,
    languages text,
    interested_in_exclusive_mgmt text check (interested_in_exclusive_mgmt in ('Yes','No','Maybe')),
    rate_card_received text check (rate_card_received in ('Yes','No')),
    gst_available text check (gst_available in ('Yes','No')),
    payment_details_received text check (payment_details_received in ('Yes','No')),
    priority text check (priority in ('High','Medium','Low')),
    assigned_manager text,
    notes text,
    owner_id text references public.users(id) on delete set null,
    created_at timestamp with time zone not null default timezone('utc'::text, now())
);

-- ------------------------------------------------------------
-- outreach — Outreach sheet (one row per creator, follow-ups)
-- ------------------------------------------------------------
create table if not exists public.outreach (
    id text primary key default gen_random_uuid()::text,
    creator_id text not null references public.creators(id) on delete cascade,
    contact_method text check (contact_method in ('Email','Instagram','X (Twitter)','WhatsApp','Other')),
    date_contacted date,
    next_follow_up_date date,
    follow_up_1 date,
    follow_up_2 date,
    follow_up_3 date,
    current_status text check (current_status in ('No Response','Awaiting Reply','Interested','Not Interested','Negotiating','Signed','On Hold')),
    outcome text check (outcome in ('Pending','Signed','Rejected','No Response')),
    notes text,
    created_at timestamp with time zone not null default timezone('utc'::text, now())
);

-- ------------------------------------------------------------
-- contracts — Confirmed sheet (presence = creator is Signed)
-- ------------------------------------------------------------
create table if not exists public.contracts (
    id text primary key default gen_random_uuid()::text,
    creator_id text not null references public.creators(id) on delete cascade,
    contract_type text check (contract_type in ('Exclusive Management','Non-Exclusive Management','Brand Deal Only','Project-Based','Ambassadorship')),
    start_date date,
    end_date date,
    exclusivity text check (exclusivity in ('Yes','No')),
    renewal_reminder date,
    contract_status text check (contract_status in ('Draft','Active','Renewed','Expired','Terminated')),
    notes text,
    created_at timestamp with time zone not null default timezone('utc'::text, now())
);

-- ------------------------------------------------------------
-- companies — normalized "Brand" from Brand Deals + Master Data
-- ------------------------------------------------------------
create table if not exists public.companies (
    id text primary key default gen_random_uuid()::text,
    name text not null,
    domain text,
    logo text,
    industry text,
    notes text,
    owner_id text references public.users(id) on delete set null,
    created_at timestamp with time zone not null default timezone('utc'::text, now())
);

-- ------------------------------------------------------------
-- deals — Brand Deals sheet
-- ------------------------------------------------------------
create table if not exists public.deals (
    id text primary key default gen_random_uuid()::text,
    creator_id text not null references public.creators(id) on delete cascade,
    company_id text not null references public.companies(id) on delete cascade,
    campaign text not null default '',
    deal_value numeric(12,2) not null default 0,
    agency_commission numeric(12,2) not null default 0,
    campaign_status text check (campaign_status in ('Pitched','Confirmed','In Progress','Completed','Cancelled')),
    invoice_status text check (invoice_status in ('Not Sent','Sent','Overdue')),
    payment_status text check (payment_status in ('Pending','Partial','Paid')),
    due_date date,
    completion_date date,
    notes text,
    created_at timestamp with time zone not null default timezone('utc'::text, now())
);

-- ------------------------------------------------------------
-- Row Level Security
-- All authenticated users in the Clerk org share one agency's
-- dataset (creators/outreach/contracts/deals/companies). RLS
-- grants full access to every logged-in user; membership/RBAC
-- is enforced at the UI layer by the Clerk org role.
-- ------------------------------------------------------------
alter table public.users enable row level security;
alter table public.creators enable row level security;
alter table public.outreach enable row level security;
alter table public.contracts enable row level security;
alter table public.companies enable row level security;
alter table public.deals enable row level security;

create policy "users select own org" on public.users for select using (auth.uid() is not null);
create policy "users update own org" on public.users for update using (auth.uid() is not null);

-- ------------------------------------------------------------
-- workspaces — multi-workspace support (future-proofing)
-- ------------------------------------------------------------
create table if not exists public.workspaces (
    id uuid primary key default gen_random_uuid(),
    name text not null default 'default',
    created_at timestamp with time zone not null default timezone('utc'::text, now())
);

-- Seed default workspace
insert into public.workspaces (id, name) values
    ('00000000-0000-0000-0000-000000000001', 'default')
on conflict do nothing;

-- ------------------------------------------------------------
-- user_status — presence tracking per workspace
-- ------------------------------------------------------------
create table if not exists public.user_status (
    user_id text not null references public.users(id) on delete cascade,
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    status_override text check (status_override in ('active', 'inactive', 'invisible')),
    last_active_at timestamp with time zone not null default timezone('utc'::text, now()),
    updated_at timestamp with time zone not null default timezone('utc'::text, now()),
    primary key (user_id, workspace_id)
);

-- ------------------------------------------------------------
-- RLS for new tables
-- ------------------------------------------------------------
alter table public.workspaces enable row level security;
alter table public.user_status enable row level security;

create policy "workspaces select authenticated" on public.workspaces
    for select using (auth.uid() is not null);

create policy "user_status select authenticated" on public.user_status
    for select using (auth.uid() is not null);

create policy "user_status insert own" on public.user_status
    for insert with check (auth.uid()::text = user_id);

create policy "user_status update own" on public.user_status
    for update using (auth.uid()::text = user_id);

-- ------------------------------------------------------------
-- Update existing RLS policies for RBAC
-- ------------------------------------------------------------

-- Update creators policies
drop policy if exists "creators full access" on public.creators;

create policy "creators select authenticated" on public.creators
    for select using (auth.uid() is not null);

create policy "creators insert admin" on public.creators
    for insert with check (
        auth.uid() is not null and
        (auth.jwt() -> 'metadata' ->> 'role') = 'admin'
    );

create policy "creators update admin" on public.creators
    for update using (
        auth.uid() is not null and
        (auth.jwt() -> 'metadata' ->> 'role') = 'admin'
    );

create policy "creators delete admin" on public.creators
    for delete using (
        auth.uid() is not null and
        (auth.jwt() -> 'metadata' ->> 'role') = 'admin'
    );

-- Update outreach policies
drop policy if exists "outreach full access" on public.outreach;

create policy "outreach select authenticated" on public.outreach
    for select using (auth.uid() is not null);

create policy "outreach insert admin" on public.outreach
    for insert with check (
        auth.uid() is not null and
        (auth.jwt() -> 'metadata' ->> 'role') = 'admin'
    );

create policy "outreach update admin" on public.outreach
    for update using (
        auth.uid() is not null and
        (auth.jwt() -> 'metadata' ->> 'role') = 'admin'
    );

create policy "outreach delete admin" on public.outreach
    for delete using (
        auth.uid() is not null and
        (auth.jwt() -> 'metadata' ->> 'role') = 'admin'
    );

-- Update contracts policies
drop policy if exists "contracts full access" on public.contracts;

create policy "contracts select authenticated" on public.contracts
    for select using (auth.uid() is not null);

create policy "contracts insert admin" on public.contracts
    for insert with check (
        auth.uid() is not null and
        (auth.jwt() -> 'metadata' ->> 'role') = 'admin'
    );

create policy "contracts update admin" on public.contracts
    for update using (
        auth.uid() is not null and
        (auth.jwt() -> 'metadata' ->> 'role') = 'admin'
    );

create policy "contracts delete admin" on public.contracts
    for delete using (
        auth.uid() is not null and
        (auth.jwt() -> 'metadata' ->> 'role') = 'admin'
    );

-- Update companies policies
drop policy if exists "companies full access" on public.companies;

create policy "companies select authenticated" on public.companies
    for select using (auth.uid() is not null);

create policy "companies insert admin" on public.companies
    for insert with check (
        auth.uid() is not null and
        (auth.jwt() -> 'metadata' ->> 'role') = 'admin'
    );

create policy "companies update admin" on public.companies
    for update using (
        auth.uid() is not null and
        (auth.jwt() -> 'metadata' ->> 'role') = 'admin'
    );

create policy "companies delete admin" on public.companies
    for delete using (
        auth.uid() is not null and
        (auth.jwt() -> 'metadata' ->> 'role') = 'admin'
    );

-- Update deals policies
drop policy if exists "deals full access" on public.deals;

create policy "deals select authenticated" on public.deals
    for select using (auth.uid() is not null);

create policy "deals insert admin" on public.deals
    for insert with check (
        auth.uid() is not null and
        (auth.jwt() -> 'metadata' ->> 'role') = 'admin'
    );

create policy "deals update admin" on public.deals
    for update using (
        auth.uid() is not null and
        (auth.jwt() -> 'metadata' ->> 'role') = 'admin'
    );

create policy "deals delete admin" on public.deals
    for delete using (
        auth.uid() is not null and
        (auth.jwt() -> 'metadata' ->> 'role') = 'admin'
    );

-- ------------------------------------------------------------
-- Indexes for the derived columns the dashboard reads
-- ------------------------------------------------------------
create index if not exists idx_creators_name on public.creators (lower(creator_name));
create index if not exists idx_outreach_creator on public.outreach (creator_id);
create index if not exists idx_contracts_creator on public.contracts (creator_id);
create index if not exists idx_deals_creator on public.deals (creator_id);
create index if not exists idx_deals_company on public.deals (company_id);
