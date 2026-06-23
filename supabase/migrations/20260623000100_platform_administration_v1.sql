-- NexusPay Orchestrator
-- Platform Administration Framework V1
-- Additive and safe to re-run

create extension if not exists pgcrypto;

create table if not exists public.partner_providers (
  id text primary key,
  provider_name text not null,
  provider_category text not null,
  website text,
  contact_name text,
  contact_email text,
  status text not null default 'Not Started' check (status in ('Not Started', 'Researching', 'Contacted', 'Sandbox Requested', 'Sandbox Active', 'Testing', 'Pilot', 'Production', 'Paused')),
  sandbox_enabled boolean not null default false,
  production_enabled boolean not null default false,
  api_configured boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.partner_corridors (
  id uuid primary key default gen_random_uuid(),
  provider_id text not null references public.partner_providers(id) on delete cascade,
  corridor_name text not null,
  source_country text not null,
  destination_country text not null,
  source_currency text not null,
  destination_currency text not null,
  status text not null default 'Researching',
  sandbox_readiness text not null default 'Not Started',
  production_readiness text not null default 'Not Started',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider_id, corridor_name)
);

create table if not exists public.partner_credentials_metadata (
  id uuid primary key default gen_random_uuid(),
  provider_id text not null references public.partner_providers(id) on delete cascade,
  environment text not null check (environment in ('development', 'sandbox', 'pilot', 'production')),
  configured boolean not null default false,
  credential_reference text,
  last_updated timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  unique (provider_id, environment)
);

create table if not exists public.partner_connection_status (
  id uuid primary key default gen_random_uuid(),
  provider_id text not null references public.partner_providers(id) on delete cascade,
  environment text not null check (environment in ('development', 'sandbox', 'pilot', 'production')),
  status text not null default 'Not Started',
  last_checked_at timestamptz,
  last_result text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider_id, environment)
);

create table if not exists public.partner_notes (
  id uuid primary key default gen_random_uuid(),
  provider_id text not null references public.partner_providers(id) on delete cascade,
  note text not null,
  created_by text,
  created_at timestamptz not null default now()
);

alter table public.partner_providers enable row level security;
alter table public.partner_corridors enable row level security;
alter table public.partner_credentials_metadata enable row level security;
alter table public.partner_connection_status enable row level security;
alter table public.partner_notes enable row level security;

drop policy if exists "partner providers readable" on public.partner_providers;
create policy "partner providers readable" on public.partner_providers for select to authenticated using (true);
drop policy if exists "partner providers writable" on public.partner_providers;
create policy "partner providers writable" on public.partner_providers for all to authenticated using (true) with check (true);

drop policy if exists "partner corridors readable" on public.partner_corridors;
create policy "partner corridors readable" on public.partner_corridors for select to authenticated using (true);
drop policy if exists "partner corridors writable" on public.partner_corridors;
create policy "partner corridors writable" on public.partner_corridors for all to authenticated using (true) with check (true);

drop policy if exists "partner credential metadata readable" on public.partner_credentials_metadata;
create policy "partner credential metadata readable" on public.partner_credentials_metadata for select to authenticated using (true);
drop policy if exists "partner credential metadata writable" on public.partner_credentials_metadata;
create policy "partner credential metadata writable" on public.partner_credentials_metadata for all to authenticated using (true) with check (true);

drop policy if exists "partner connection status readable" on public.partner_connection_status;
create policy "partner connection status readable" on public.partner_connection_status for select to authenticated using (true);
drop policy if exists "partner connection status writable" on public.partner_connection_status;
create policy "partner connection status writable" on public.partner_connection_status for all to authenticated using (true) with check (true);

drop policy if exists "partner notes readable" on public.partner_notes;
create policy "partner notes readable" on public.partner_notes for select to authenticated using (true);
drop policy if exists "partner notes writable" on public.partner_notes;
create policy "partner notes writable" on public.partner_notes for all to authenticated using (true) with check (true);

insert into public.partner_providers (id, provider_name, provider_category, website, status, sandbox_enabled, production_enabled, api_configured, notes)
values
  ('thunes', 'Thunes', 'Payment Network', 'https://www.thunes.com', 'Researching', false, false, false, 'Global payout network candidate.'),
  ('tranglo', 'Tranglo', 'Payment Network', 'https://www.tranglo.com', 'Sandbox Active', true, false, true, 'Candidate for UK to Philippines corridor testing.'),
  ('nium', 'Nium', 'Payment Network', 'https://www.nium.com', 'Testing', true, false, true, 'Candidate for UK to Malaysia corridor testing.'),
  ('yapily', 'Yapily', 'Open Banking', 'https://www.yapily.com', 'Sandbox Active', true, false, true, 'Open banking connectivity candidate.'),
  ('truelayer', 'TrueLayer', 'Open Banking', 'https://truelayer.com', 'Researching', false, false, false, 'Open banking alternative under review.'),
  ('ripple', 'Ripple', 'Settlement Network', 'https://ripple.com', 'Testing', true, false, true, 'XRPL/RLUSD settlement candidate.'),
  ('coins-ph', 'Coins.ph', 'Wallet / Local Payout', 'https://coins.ph', 'Contacted', false, false, false, 'Philippines wallet and payout candidate.'),
  ('gcash', 'GCash', 'Wallet / Local Payout', 'https://www.gcash.com', 'Researching', false, false, false, 'Philippines wallet payout candidate.'),
  ('maya', 'Maya', 'Wallet / Local Payout', 'https://www.maya.ph', 'Researching', false, false, false, 'Philippines wallet payout candidate.')
on conflict (id) do update set
  provider_name = excluded.provider_name,
  provider_category = excluded.provider_category,
  website = excluded.website,
  status = excluded.status,
  sandbox_enabled = excluded.sandbox_enabled,
  production_enabled = excluded.production_enabled,
  api_configured = excluded.api_configured,
  notes = excluded.notes,
  updated_at = now();

insert into public.partner_corridors (provider_id, corridor_name, source_country, destination_country, source_currency, destination_currency, status, sandbox_readiness, production_readiness, notes)
values
  ('tranglo', 'UK -> Philippines', 'United Kingdom', 'Philippines', 'GBP', 'PHP', 'Sandbox Active', 'Active', 'Not Started', 'Primary Philippines payout corridor candidate.'),
  ('nium', 'UK -> Malaysia', 'United Kingdom', 'Malaysia', 'GBP', 'MYR', 'Testing', 'Testing', 'Not Started', 'Primary Malaysia payout corridor candidate.'),
  ('ripple', 'UK -> XRPL Settlement', 'United Kingdom', 'XRPL', 'GBP', 'RLUSD', 'Testing', 'Testing', 'Not Started', 'Settlement rail candidate.'),
  ('coins-ph', 'UK -> Philippines Wallet', 'United Kingdom', 'Philippines', 'GBP', 'PHP', 'Contacted', 'Not Started', 'Not Started', 'Wallet payout route candidate.'),
  ('thunes', 'UK -> Multi-market', 'United Kingdom', 'Multi-market', 'GBP', 'MULTI', 'Researching', 'Not Started', 'Not Started', 'Multi-market network coverage candidate.')
on conflict (provider_id, corridor_name) do update set
  status = excluded.status,
  sandbox_readiness = excluded.sandbox_readiness,
  production_readiness = excluded.production_readiness,
  notes = excluded.notes,
  updated_at = now();

insert into public.partner_credentials_metadata (provider_id, environment, configured, credential_reference, last_updated, notes)
select id, 'sandbox', sandbox_enabled, case when api_configured then concat('supabase-secret:', id, '-sandbox') else null end, now(), 'Metadata only. No API secrets stored in database.'
from public.partner_providers
on conflict (provider_id, environment) do update set
  configured = excluded.configured,
  credential_reference = excluded.credential_reference,
  last_updated = excluded.last_updated,
  notes = excluded.notes;

insert into public.partner_connection_status (provider_id, environment, status, last_checked_at, last_result)
select id, 'sandbox', status, now(), case when sandbox_enabled then 'Sandbox metadata configured' else 'No sandbox connection recorded' end
from public.partner_providers
on conflict (provider_id, environment) do update set
  status = excluded.status,
  last_checked_at = excluded.last_checked_at,
  last_result = excluded.last_result,
  updated_at = now();
