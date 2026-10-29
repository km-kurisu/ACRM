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
    created_at timestamp with time zone not null default timezone('utc'::text, now())
);

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
