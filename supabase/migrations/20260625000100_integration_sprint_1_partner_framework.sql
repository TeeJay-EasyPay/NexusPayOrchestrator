-- NexusPay Orchestrator
-- Integration Sprint 1
-- Partner abstraction, readiness and connection-test framework

create extension if not exists pgcrypto;

alter table public.partner_providers
  add column if not exists partner_type text,
  add column if not exists environment text not null default 'sandbox',
  add column if not exists sandbox_url text,
  add column if not exists production_url text,
  add column if not exists supported_countries text[] not null default '{}',
  add column if not exists last_successful_test_at timestamptz,
  add column if not exists readiness_score integer not null default 0 check (readiness_score >= 0 and readiness_score <= 100);

create table if not exists public.partner_capabilities (
  id uuid primary key default gen_random_uuid(),
  provider_id text not null references public.partner_providers(id) on delete cascade,
  capability_code text not null,
  capability_name text not null,
  capability_type text not null,
  environment text not null default 'sandbox' check (environment in ('development', 'sandbox', 'pilot', 'production')),
  enabled boolean not null default false,
  readiness_status text not null default 'Not Started',
  provenance text not null default 'DERIVED' check (provenance in ('LIVE', 'DERIVED', 'SIMULATED', 'FALLBACK', 'NO_DATA', 'DIAGNOSTIC', 'DISABLED')),
  last_validated_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider_id, capability_code, environment)
);

create table if not exists public.partner_supported_corridors (
  id uuid primary key default gen_random_uuid(),
  provider_id text not null references public.partner_providers(id) on delete cascade,
  corridor_code text not null,
  source_country text not null,
  destination_country text not null,
  source_currency text not null,
  destination_currency text not null,
  capability_code text,
  environment text not null default 'sandbox' check (environment in ('development', 'sandbox', 'pilot', 'production')),
  readiness_status text not null default 'Not Started',
  provenance text not null default 'DERIVED' check (provenance in ('LIVE', 'DERIVED', 'SIMULATED', 'FALLBACK', 'NO_DATA', 'DIAGNOSTIC', 'DISABLED')),
  last_validated_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider_id, corridor_code, environment)
);

create table if not exists public.partner_connection_tests (
  id uuid primary key default gen_random_uuid(),
  provider_id text not null references public.partner_providers(id) on delete cascade,
  environment text not null default 'sandbox' check (environment in ('development', 'sandbox', 'pilot', 'production')),
  test_type text not null default 'capability_check',
  status text not null check (status in ('SUCCESS', 'FAILED', 'SKIPPED')),
  readiness text not null default 'NO_DATA',
  response_time_ms integer,
  http_status integer,
  institution_count integer,
  capability_count integer,
  response_summary text,
  error_code text,
  error_message text,
  tested_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists partner_capabilities_provider_idx
  on public.partner_capabilities(provider_id, environment);

create index if not exists partner_supported_corridors_provider_idx
  on public.partner_supported_corridors(provider_id, environment);

create index if not exists partner_connection_tests_provider_idx
  on public.partner_connection_tests(provider_id, environment, tested_at desc);

alter table public.partner_capabilities enable row level security;
alter table public.partner_supported_corridors enable row level security;
alter table public.partner_connection_tests enable row level security;

drop policy if exists "partner capabilities readable" on public.partner_capabilities;
create policy "partner capabilities readable" on public.partner_capabilities for select to authenticated using (true);
drop policy if exists "partner capabilities writable" on public.partner_capabilities;
create policy "partner capabilities writable" on public.partner_capabilities for all to authenticated using (true) with check (true);

drop policy if exists "partner supported corridors readable" on public.partner_supported_corridors;
create policy "partner supported corridors readable" on public.partner_supported_corridors for select to authenticated using (true);
drop policy if exists "partner supported corridors writable" on public.partner_supported_corridors;
create policy "partner supported corridors writable" on public.partner_supported_corridors for all to authenticated using (true) with check (true);

drop policy if exists "partner connection tests readable" on public.partner_connection_tests;
create policy "partner connection tests readable" on public.partner_connection_tests for select to authenticated using (true);
drop policy if exists "partner connection tests writable" on public.partner_connection_tests;
create policy "partner connection tests writable" on public.partner_connection_tests for all to authenticated using (true) with check (true);

update public.partner_providers set
  partner_type = case
    when provider_category = 'Open Banking' then 'first_leg'
    when provider_category in ('Payment Network', 'Wallet / Local Payout') then 'last_leg'
    when provider_category = 'Settlement Network' then 'settlement'
    else 'infrastructure'
  end,
  sandbox_url = case
    when id = 'yapily' then 'https://api.yapily.com'
    when id = 'truelayer' then 'https://api.truelayer-sandbox.com'
    else sandbox_url
  end,
  production_url = case
    when id = 'yapily' then 'https://api.yapily.com'
    else production_url
  end,
  supported_countries = case
    when id in ('yapily', 'truelayer') then array['GB']
    when id in ('coins-ph', 'gcash', 'maya') then array['PH']
    when id = 'nium' then array['GB', 'MY', 'PH']
    when id = 'tranglo' then array['GB', 'PH', 'MY']
    else supported_countries
  end,
  readiness_score = case
    when id = 'yapily' then 70
    when sandbox_enabled and api_configured then 55
    when sandbox_enabled then 40
    else 10
  end,
  updated_at = now();

insert into public.partner_providers (
  id,
  provider_name,
  provider_category,
  partner_type,
  website,
  status,
  environment,
  sandbox_enabled,
  production_enabled,
  api_configured,
  sandbox_url,
  supported_countries,
  readiness_score,
  notes
)
values (
  'banked',
  'Banked',
  'Open Banking',
  'first_leg',
  'https://www.banked.com',
  'Researching',
  'sandbox',
  false,
  false,
  false,
  null,
  array['GB'],
  10,
  'Future open banking first-leg provider candidate.'
)
on conflict (id) do update set
  provider_name = excluded.provider_name,
  provider_category = excluded.provider_category,
  partner_type = excluded.partner_type,
  website = excluded.website,
  supported_countries = excluded.supported_countries,
  notes = excluded.notes,
  updated_at = now();

insert into public.partner_capabilities (provider_id, capability_code, capability_name, capability_type, environment, enabled, readiness_status, provenance, notes)
values
  ('yapily', 'OPEN_BANKING_AUTH', 'Open Banking Authentication', 'collection', 'sandbox', true, 'Testing', 'DERIVED', 'Uses Supabase Secrets for Yapily application UUID and secret.'),
  ('yapily', 'INSTITUTION_DISCOVERY', 'Institution Discovery', 'collection', 'sandbox', true, 'Testing', 'DERIVED', 'Lightweight Yapily institutions endpoint capability test.'),
  ('yapily', 'ACCOUNT_INFORMATION', 'Account Information', 'collection', 'sandbox', true, 'Sandbox Active', 'DERIVED', 'Future consent and account data capability.'),
  ('yapily', 'PAYMENT_INITIATION', 'Payment Initiation', 'collection', 'sandbox', false, 'Future', 'NO_DATA', 'Not implemented in Sprint 1.'),
  ('truelayer', 'OPEN_BANKING_AUTH', 'Open Banking Authentication', 'collection', 'sandbox', false, 'Researching', 'NO_DATA', 'Future first-leg provider candidate.'),
  ('banked', 'OPEN_BANKING_AUTH', 'Open Banking Authentication', 'collection', 'sandbox', false, 'Researching', 'NO_DATA', 'Future first-leg provider candidate.'),
  ('nium', 'INTERNATIONAL_PAYOUT', 'International Payout', 'payout', 'sandbox', true, 'Testing', 'DERIVED', 'Future last-leg payout provider.'),
  ('thunes', 'INTERNATIONAL_PAYOUT', 'International Payout', 'payout', 'sandbox', false, 'Researching', 'NO_DATA', 'Future last-leg payout provider.'),
  ('tranglo', 'INTERNATIONAL_PAYOUT', 'International Payout', 'payout', 'sandbox', true, 'Sandbox Active', 'DERIVED', 'Future last-leg payout provider.'),
  ('ripple', 'SETTLEMENT', 'Settlement Network', 'settlement', 'sandbox', true, 'Testing', 'DERIVED', 'Future settlement rail provider.')
on conflict (provider_id, capability_code, environment) do update set
  capability_name = excluded.capability_name,
  capability_type = excluded.capability_type,
  enabled = excluded.enabled,
  readiness_status = excluded.readiness_status,
  provenance = excluded.provenance,
  notes = excluded.notes,
  updated_at = now();

insert into public.partner_supported_corridors (provider_id, corridor_code, source_country, destination_country, source_currency, destination_currency, capability_code, environment, readiness_status, provenance, notes)
values
  ('yapily', 'GB-OPEN-BANKING', 'United Kingdom', 'United Kingdom', 'GBP', 'GBP', 'INSTITUTION_DISCOVERY', 'sandbox', 'Testing', 'DERIVED', 'First-leg UK account collection and institution discovery.'),
  ('tranglo', 'GB-PH', 'United Kingdom', 'Philippines', 'GBP', 'PHP', 'INTERNATIONAL_PAYOUT', 'sandbox', 'Sandbox Active', 'DERIVED', 'Last-leg Philippines payout candidate.'),
  ('nium', 'GB-MY', 'United Kingdom', 'Malaysia', 'GBP', 'MYR', 'INTERNATIONAL_PAYOUT', 'sandbox', 'Testing', 'DERIVED', 'Last-leg Malaysia payout candidate.'),
  ('thunes', 'GB-MULTI', 'United Kingdom', 'Multi-market', 'GBP', 'MULTI', 'INTERNATIONAL_PAYOUT', 'sandbox', 'Researching', 'NO_DATA', 'Future multi-market payout candidate.')
on conflict (provider_id, corridor_code, environment) do update set
  readiness_status = excluded.readiness_status,
  provenance = excluded.provenance,
  notes = excluded.notes,
  updated_at = now();

insert into public.partner_credentials_metadata (provider_id, environment, configured, credential_reference, last_updated, notes)
values
  ('yapily', 'sandbox', true, 'supabase-secrets:YAPILY_APPLICATION_UUID,YAPILY_APPLICATION_SECRET', now(), 'Metadata only. Secret values are stored in Supabase Edge Function secrets, not database fields or mobile code.')
on conflict (provider_id, environment) do update set
  configured = excluded.configured,
  credential_reference = excluded.credential_reference,
  last_updated = excluded.last_updated,
  notes = excluded.notes;
