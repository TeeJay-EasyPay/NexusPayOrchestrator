-- NexusPay Orchestrator
-- Airwallex sandbox last-leg payout provider
-- Additive only: provider metadata, durable payout intents, attempts, webhooks and evidence.

create extension if not exists pgcrypto;

create table if not exists public.provider_payout_intents (
  id uuid primary key default gen_random_uuid(),
  transfer_id text not null,
  provider_id text not null,
  environment text not null default 'sandbox' check (environment in ('development', 'sandbox', 'pilot', 'production')),
  idempotency_key text not null,
  provider_request_id text not null,
  provider_beneficiary_id text,
  provider_transfer_id text,
  canonical_status text not null default 'CREATED',
  provider_status text,
  source_currency text,
  transfer_currency text,
  transfer_amount numeric,
  fee_amount numeric,
  fee_currency text,
  amount_payer_pays numeric,
  amount_beneficiary_receives numeric,
  destination_country text,
  destination_currency text,
  beneficiary_summary text,
  error_category text,
  retryable boolean not null default false,
  evidence jsonb not null default '{}'::jsonb,
  requested_at timestamptz not null default now(),
  submitted_at timestamptz,
  completed_at timestamptz,
  failed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider_id, environment, provider_request_id),
  unique (transfer_id, provider_id, environment)
);

create table if not exists public.provider_payout_attempts (
  id uuid primary key default gen_random_uuid(),
  payout_intent_id uuid references public.provider_payout_intents(id) on delete cascade,
  provider_id text not null,
  environment text not null default 'sandbox',
  operation text not null,
  correlation_id text not null,
  provider_reference text,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  http_status integer,
  canonical_result text not null,
  retry_count integer not null default 0,
  redacted_error_code text,
  redacted_error_message text,
  status_transition text,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.provider_payout_evidence (
  id uuid primary key default gen_random_uuid(),
  payout_intent_id uuid references public.provider_payout_intents(id) on delete cascade,
  provider_id text not null,
  environment text not null default 'sandbox',
  evidence_type text not null,
  summary text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.provider_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider_id text not null,
  environment text not null default 'sandbox',
  event_id text not null,
  event_type text not null,
  provider_transfer_id text,
  canonical_status text,
  verified boolean not null default false,
  received_at timestamptz not null default now(),
  provider_created_at timestamptz,
  payload jsonb not null default '{}'::jsonb,
  processing_status text not null default 'RECEIVED',
  unique (provider_id, environment, event_id)
);

create index if not exists provider_payout_intents_transfer_idx
  on public.provider_payout_intents(transfer_id, provider_id, environment);

create index if not exists provider_payout_intents_provider_transfer_idx
  on public.provider_payout_intents(provider_transfer_id);

create index if not exists provider_payout_attempts_intent_idx
  on public.provider_payout_attempts(payout_intent_id, started_at desc);

create index if not exists provider_payout_evidence_intent_idx
  on public.provider_payout_evidence(payout_intent_id, created_at desc);

create index if not exists provider_webhook_events_transfer_idx
  on public.provider_webhook_events(provider_transfer_id, received_at desc);

alter table public.provider_payout_intents enable row level security;
alter table public.provider_payout_attempts enable row level security;
alter table public.provider_payout_evidence enable row level security;
alter table public.provider_webhook_events enable row level security;

drop policy if exists "provider payout intents readable" on public.provider_payout_intents;
create policy "provider payout intents readable" on public.provider_payout_intents for select to authenticated using (true);
drop policy if exists "provider payout attempts readable" on public.provider_payout_attempts;
create policy "provider payout attempts readable" on public.provider_payout_attempts for select to authenticated using (true);
drop policy if exists "provider payout evidence readable" on public.provider_payout_evidence;
create policy "provider payout evidence readable" on public.provider_payout_evidence for select to authenticated using (true);
drop policy if exists "provider webhook events readable" on public.provider_webhook_events;
create policy "provider webhook events readable" on public.provider_webhook_events for select to authenticated using (true);

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
  'airwallex',
  'Airwallex',
  'Payment Network',
  'last_leg',
  'https://www.airwallex.com',
  'Testing',
  'sandbox',
  true,
  false,
  true,
  'https://api.sandbox.airwallex.com',
  array['PH', 'MY', 'SG', 'AE', 'SA', 'QA', 'KW', 'BH', 'OM'],
  62,
  'Sandbox Client API credentials are stored as Supabase Edge Function secrets. Read-only authentication/capability checks are implemented; payout certification remains sandbox-only.'
)
on conflict (id) do update set
  provider_name = excluded.provider_name,
  provider_category = excluded.provider_category,
  partner_type = excluded.partner_type,
  website = excluded.website,
  status = excluded.status,
  environment = excluded.environment,
  sandbox_enabled = excluded.sandbox_enabled,
  production_enabled = excluded.production_enabled,
  api_configured = excluded.api_configured,
  sandbox_url = excluded.sandbox_url,
  supported_countries = excluded.supported_countries,
  readiness_score = greatest(public.partner_providers.readiness_score, excluded.readiness_score),
  notes = excluded.notes,
  updated_at = now();

insert into public.partner_credentials_metadata (provider_id, environment, configured, credential_reference, last_updated, notes)
values
  ('airwallex', 'sandbox', true, 'supabase-secrets:AIRWALLEX_CLIENT_ID,AIRWALLEX_API_KEY,AIRWALLEX_BASE_URL(optional)', now(), 'Metadata only. Secret values are stored in Supabase Edge Function secrets, not database fields or mobile code.')
on conflict (provider_id, environment) do update set
  configured = excluded.configured,
  credential_reference = excluded.credential_reference,
  last_updated = excluded.last_updated,
  notes = excluded.notes;

insert into public.partner_capabilities (provider_id, capability_code, capability_name, capability_type, environment, enabled, readiness_status, provenance, notes)
values
  ('airwallex', 'API_AUTHENTICATION', 'API Authentication', 'payout', 'sandbox', true, 'Testing', 'DERIVED', 'Validated by backend connection test.'),
  ('airwallex', 'ACCOUNT_CAPABILITIES_READ', 'Account Capability Read', 'payout', 'sandbox', true, 'Testing', 'DERIVED', 'Uses harmless funding-limits read endpoint as scoped-key proof.'),
  ('airwallex', 'BENEFICIARY_VALIDATION', 'Beneficiary Validation', 'payout', 'sandbox', true, 'Testing', 'NO_DATA', 'Must pass Airwallex beneficiary validation before certification.'),
  ('airwallex', 'TRANSFER_VALIDATION', 'Transfer Validation', 'payout', 'sandbox', true, 'Testing', 'NO_DATA', 'Must pass Airwallex transfer validation before certification.'),
  ('airwallex', 'TRANSFER_CREATION', 'Transfer Creation', 'payout', 'sandbox', true, 'Testing', 'NO_DATA', 'Sandbox-only last-leg payout submission.'),
  ('airwallex', 'TRANSFER_WEBHOOKS', 'Transfer Webhooks', 'payout', 'sandbox', false, 'Not configured', 'NO_DATA', 'Webhook endpoint verifies signatures when AIRWALLEX_WEBHOOK_SECRET is configured.')
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
  ('airwallex', 'GB-PH-PHP', 'United Kingdom', 'Philippines', 'GBP', 'PHP', 'TRANSFER_CREATION', 'sandbox', 'Testing', 'DERIVED', 'Eligible for sandbox validation only; not production-certified.'),
  ('airwallex', 'GB-MY-MYR', 'United Kingdom', 'Malaysia', 'GBP', 'MYR', 'TRANSFER_CREATION', 'sandbox', 'Testing', 'DERIVED', 'Eligible for sandbox validation only; not production-certified.'),
  ('airwallex', 'GB-SG-SGD', 'United Kingdom', 'Singapore', 'GBP', 'SGD', 'TRANSFER_CREATION', 'sandbox', 'Testing', 'DERIVED', 'Eligible for sandbox validation only; not production-certified.')
on conflict (provider_id, corridor_code, environment) do update set
  readiness_status = excluded.readiness_status,
  provenance = excluded.provenance,
  notes = excluded.notes,
  updated_at = now();
