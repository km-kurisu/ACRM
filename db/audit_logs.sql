-- Audit log migration for existing AniCRM databases.
-- Safe to run repeatedly.

create table if not exists public.audit_logs (
    id text primary key default gen_random_uuid()::text,
    actor_id text references public.users(id) on delete set null,
    actor_name text not null default 'Unknown user',
    action text not null check (action in ('create', 'update', 'delete', 'import')),
    entity_type text not null,
    entity_id text,
    entity_label text,
    changes jsonb not null default '{}'::jsonb,
    workspace_id uuid not null default '00000000-0000-0000-0000-000000000001' references public.workspaces(id) on delete cascade,
    created_at timestamp with time zone not null default timezone('utc'::text, now())
);

alter table public.audit_logs
    add column if not exists workspace_id uuid;

update public.audit_logs
set workspace_id = '00000000-0000-0000-0000-000000000001'
where workspace_id is null;

alter table public.audit_logs
    alter column workspace_id set default '00000000-0000-0000-0000-000000000001';

alter table public.audit_logs
    alter column workspace_id set not null;

do $$
begin
    if not exists (select 1 from pg_constraint where conname = 'audit_logs_workspace_id_fkey') then
        alter table public.audit_logs
            add constraint audit_logs_workspace_id_fkey
            foreign key (workspace_id) references public.workspaces(id) on delete cascade;
    end if;
end $$;

alter table public.audit_logs enable row level security;

drop policy if exists "audit_logs select admin" on public.audit_logs;
create policy "audit_logs select admin" on public.audit_logs
    for select using (
        auth.uid() is not null and
        (auth.jwt() -> 'metadata' ->> 'role') = 'admin'
    );

create index if not exists idx_audit_logs_created_at on public.audit_logs (created_at desc);
create index if not exists idx_audit_logs_entity_type on public.audit_logs (entity_type, created_at desc);
create index if not exists idx_audit_logs_actor_id on public.audit_logs (actor_id, created_at desc);
create index if not exists idx_audit_logs_workspace on public.audit_logs (workspace_id, created_at desc);
