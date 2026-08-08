-- Provider-neutral crypto/fiat orchestration evidence model.
-- No quote, address, or completion is created without provider evidence.

create extension if not exists pgcrypto;

create table if not exists public.crypto_provider_capabilities (
  id uuid primary key default gen_random_uuid(),
  provider_code text not null,
  environment text not null check (environment in ('sandbox', 'testnet', 'production')),
  journey_type text not null check (journey_type in ('FIAT_TO_CRYPTO', 'CRYPTO_TO_FIAT', 'CRYPTO_TO_CRYPTO')),
  source_assets text[] not null default '{}',
  destination_assets text[] not null default '{}',
  networks text[] not null default '{}',
  custody_model text not null check (custody_model in ('NON_CUSTODIAL', 'PROVIDER_CUSTODIAL', 'PLATFORM_TEST_WALLETS')),
  status text not null check (status in ('AVAILABLE', 'UNAVAILABLE', 'DISABLED')),
  configured boolean not null default false,
  evidence_source text,
  evidence_checked_at timestamptz,
  provenance text not null check (provenance in ('LIVE', 'SANDBOX', 'TESTNET', 'UNAVAILABLE')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(provider_code, environment, journey_type)
);

create table if not exists public.crypto_payment_intents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  transfer_id uuid,
  journey_type text not null check (journey_type in ('FIAT_TO_CRYPTO', 'CRYPTO_TO_FIAT', 'CRYPTO_TO_CRYPTO')),
  provider_code text,
  source_asset text not null,
  destination_asset text not null,
  source_amount numeric not null check (source_amount > 0),
  destination_address text,
  destination_tag text,
  canonical_status text not null check (canonical_status in ('CREATED', 'AWAITING_QUOTE', 'QUOTED', 'AWAITING_DEPOSIT', 'FUNDS_DETECTED', 'SUBMITTED', 'COMPLETED', 'FAILED', 'UNKNOWN')),
  idempotency_key text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.crypto_provider_quotes (
  id uuid primary key default gen_random_uuid(),
  intent_id uuid not null references public.crypto_payment_intents(id) on delete cascade,
  provider_reference text not null,
  source_amount numeric not null,
  destination_amount numeric not null,
  provider_fee numeric,
  network_fee numeric,
  rate numeric,
  expires_at timestamptz not null,
  provenance text not null check (provenance in ('LIVE', 'SANDBOX', 'TESTNET')),
  raw_evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(intent_id, provider_reference)
);

create table if not exists public.crypto_deposit_instructions (
  id uuid primary key default gen_random_uuid(),
  intent_id uuid not null unique references public.crypto_payment_intents(id) on delete cascade,
  provider_reference text not null unique,
  network text not null,
  asset text not null,
  deposit_address text not null,
  destination_tag text,
  expires_at timestamptz,
  provenance text not null check (provenance in ('LIVE', 'SANDBOX', 'TESTNET')),
  created_at timestamptz not null default now()
);

create table if not exists public.crypto_orchestration_events (
  id uuid primary key default gen_random_uuid(),
  intent_id uuid not null references public.crypto_payment_intents(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null,
  canonical_status text not null,
  provider_reference text,
  evidence_source text not null,
  provenance text not null check (provenance in ('LIVE', 'SANDBOX', 'TESTNET', 'DERIVED', 'UNAVAILABLE')),
  evidence jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  unique(intent_id, event_type, provider_reference)
);

create index if not exists crypto_intents_user_created_idx on public.crypto_payment_intents(user_id, created_at desc);
create index if not exists crypto_events_intent_time_idx on public.crypto_orchestration_events(intent_id, occurred_at);

alter table public.crypto_provider_capabilities enable row level security;
alter table public.crypto_payment_intents enable row level security;
alter table public.crypto_provider_quotes enable row level security;
alter table public.crypto_deposit_instructions enable row level security;
alter table public.crypto_orchestration_events enable row level security;

grant select on public.crypto_provider_capabilities to authenticated;
grant select on public.crypto_payment_intents, public.crypto_provider_quotes, public.crypto_deposit_instructions, public.crypto_orchestration_events to authenticated;

create policy "authenticated read crypto capabilities" on public.crypto_provider_capabilities for select to authenticated using (true);
create policy "users read own crypto intents" on public.crypto_payment_intents for select to authenticated using (auth.uid() = user_id);
create policy "users read own crypto quotes" on public.crypto_provider_quotes for select to authenticated using (exists (select 1 from public.crypto_payment_intents i where i.id = intent_id and i.user_id = auth.uid()));
create policy "users read own crypto deposit instructions" on public.crypto_deposit_instructions for select to authenticated using (exists (select 1 from public.crypto_payment_intents i where i.id = intent_id and i.user_id = auth.uid()));
create policy "users read own crypto events" on public.crypto_orchestration_events for select to authenticated using (auth.uid() = user_id);

insert into public.crypto_provider_capabilities
  (provider_code, environment, journey_type, source_assets, destination_assets, networks, custody_model, status, configured, evidence_source, provenance)
values
  ('REGULATED_PROVIDER_REQUIRED', 'sandbox', 'FIAT_TO_CRYPTO', array['GBP'], array['RLUSD','USDC'], array['XRPL'], 'NON_CUSTODIAL', 'UNAVAILABLE', false, 'No regulated on-ramp provider configured', 'UNAVAILABLE'),
  ('REGULATED_PROVIDER_REQUIRED', 'sandbox', 'CRYPTO_TO_FIAT', array['RLUSD','USDC'], array['GBP'], array['XRPL'], 'NON_CUSTODIAL', 'UNAVAILABLE', false, 'No regulated off-ramp provider configured', 'UNAVAILABLE'),
  ('XRPL', 'testnet', 'CRYPTO_TO_CRYPTO', array['XRP','RLUSD'], array['XRP','RLUSD'], array['XRPL'], 'PLATFORM_TEST_WALLETS', 'AVAILABLE', true, 'XRPL Testnet JSON-RPC', 'TESTNET')
on conflict (provider_code, environment, journey_type) do update set
  source_assets = excluded.source_assets,
  destination_assets = excluded.destination_assets,
  networks = excluded.networks,
  custody_model = excluded.custody_model,
  status = excluded.status,
  configured = excluded.configured,
  evidence_source = excluded.evidence_source,
  provenance = excluded.provenance,
  updated_at = now();

-- Rollback:
-- drop table if exists public.crypto_orchestration_events;
-- drop table if exists public.crypto_deposit_instructions;
-- drop table if exists public.crypto_provider_quotes;
-- drop table if exists public.crypto_payment_intents;
-- drop table if exists public.crypto_provider_capabilities;
