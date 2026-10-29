-- Workspace migration for existing AniCRM databases.
-- Safe to run repeatedly. Apply after the base schema is installed.
-- Adds workspace membership, Writers Den, and workspace scoping.

insert into public.workspaces (id, name) values
    ('00000000-0000-0000-0000-000000000001', 'Default'),
    ('00000000-0000-0000-0000-000000000002', 'Writers Den')
on conflict do nothing;

create table if not exists public.workspace_members (
    user_id text not null references public.users(id) on delete cascade,
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    created_at timestamp with time zone not null default timezone('utc'::text, now()),
    primary key (user_id, workspace_id)
);

alter table public.workspace_members enable row level security;

drop policy if exists "workspace_members select own or admin" on public.workspace_members;
create policy "workspace_members select own or admin" on public.workspace_members
    for select using (
        auth.uid()::text = user_id or
        (auth.jwt() -> 'metadata' ->> 'role') = 'admin'
    );

create index if not exists idx_workspace_members_workspace
    on public.workspace_members (workspace_id);

do $$
declare
    t text;
    default_workspace constant text := '00000000-0000-0000-0000-000000000001';
begin
    foreach t in array array[
        'creators', 'companies', 'deals', 'outreach', 'contracts',
        'custom_filters', 'audit_logs'
    ] loop
        if to_regclass('public.' || t) is not null then
            execute format('alter table public.%I add column if not exists workspace_id uuid', t);
            execute format('update public.%I set workspace_id = %L where workspace_id is null', t, default_workspace);
            execute format('alter table public.%I alter column workspace_id set default %L', t, default_workspace);
            execute format('alter table public.%I alter column workspace_id set not null', t);
            if not exists (select 1 from pg_constraint where conname = t || '_workspace_id_fkey') then
                execute format(
                    'alter table public.%I add constraint %I foreign key (workspace_id) references public.workspaces(id) on delete cascade',
                    t,
                    t || '_workspace_id_fkey'
                );
            end if;
        end if;
    end loop;
end $$;

create index if not exists idx_creators_workspace on public.creators (workspace_id, created_at desc);
create index if not exists idx_companies_workspace on public.companies (workspace_id, created_at desc);
create index if not exists idx_deals_workspace on public.deals (workspace_id, created_at desc);
create index if not exists idx_outreach_workspace on public.outreach (workspace_id, created_at desc);
create index if not exists idx_contracts_workspace on public.contracts (workspace_id, created_at desc);

do $$
begin
    if to_regclass('public.custom_filters') is not null then
        execute 'create index if not exists idx_custom_filters_workspace on public.custom_filters (workspace_id, created_at desc)';
    end if;
    if to_regclass('public.audit_logs') is not null then
        execute 'create index if not exists idx_audit_logs_workspace on public.audit_logs (workspace_id, created_at desc)';
    end if;
end $$;

insert into public.workspace_members (user_id, workspace_id)
select id, '00000000-0000-0000-0000-000000000001'
from public.users
on conflict do nothing;

insert into public.workspace_members (user_id, workspace_id)
select id, '00000000-0000-0000-0000-000000000002'
from public.users
where role = 'admin'
on conflict do nothing;
