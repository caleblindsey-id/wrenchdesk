-- 069: vendors table — Synergy a80vm master, synced daily by Compass
-- See engine/scripts/sync_synergy_vendors.py in the Compass repo for the sync job.
-- Read-only inside CallBoard. Powers the parts-queue vendor picker (round 3).

create extension if not exists pg_trgm;

create table public.vendors (
  code int primary key,
  name text not null,
  synced_at timestamptz not null default now()
);

create index vendors_name_trgm on public.vendors using gin (name gin_trgm_ops);

alter table public.vendors enable row level security;

create policy "Authenticated read vendors"
  on public.vendors for select to authenticated using (true);

comment on table public.vendors is 'Synced daily from Synergy a80vm. Read-only — see engine/scripts/sync_synergy_vendors.py in Compass repo.';
