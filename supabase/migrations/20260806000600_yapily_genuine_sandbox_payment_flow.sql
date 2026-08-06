-- Genuine Yapily sandbox payment authorisation and initiation evidence.
-- Provider tokens are encrypted by Edge Functions and never exposed through RLS.

alter table public.open_banking_payment_flows
  add column if not exists provider_state text,
  add column if not exists callback_token_hash text,
  add column if not exists callback_received_at timestamptz,
  add column if not exists payment_idempotency_id text,
  add column if not exists payment_request jsonb,
  add column if not exists provider_payment_id text,
  add column if not exists provider_payment_status text,
  add column if not exists provider_status_updated_at timestamptz,
  add column if not exists provider_tracing_id text,
  add column if not exists failure_code text,
  add column if not exists failure_reason text;

create unique index if not exists open_banking_payment_idempotency_uidx
  on public.open_banking_payment_flows(provider_id, payment_idempotency_id)
  where payment_idempotency_id is not null;

create unique index if not exists open_banking_provider_payment_uidx
  on public.open_banking_payment_flows(provider_id, provider_payment_id)
  where provider_payment_id is not null;

create unique index if not exists open_banking_flow_step_key_uidx
  on public.open_banking_payment_flow_steps(flow_id, step_key);

create table if not exists public.open_banking_provider_tokens (
  flow_id uuid primary key references public.open_banking_payment_flows(id) on delete cascade,
  provider_id text not null,
  token_ciphertext text not null,
  token_iv text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.open_banking_provider_tokens enable row level security;
revoke all on table public.open_banking_provider_tokens from anon, authenticated;

alter table public.partner_capabilities
  drop constraint if exists partner_capabilities_provenance_check;
alter table public.partner_capabilities
  add constraint partner_capabilities_provenance_check
  check (provenance in ('LIVE', 'SANDBOX', 'TESTNET', 'DERIVED', 'SIMULATED', 'FALLBACK', 'NO_DATA', 'DIAGNOSTIC', 'DISABLED'));

update public.partner_capabilities
set
  enabled = true,
  readiness_status = 'Testing',
  provenance = 'SANDBOX',
  notes = 'Direct Yapily sandbox payment authorisation, payment creation and status retrieval are implemented; validation requires an end-user sandbox consent.',
  updated_at = now()
where provider_id = 'yapily'
  and capability_code = 'PAYMENT_INITIATION'
  and environment = 'sandbox';

-- Rollback:
-- 1. Set Yapily PAYMENT_INITIATION back to enabled=false/readiness Future/provenance NO_DATA.
-- 2. Drop open_banking_provider_tokens and the three indexes above.
-- 3. Drop the added open_banking_payment_flows columns only after confirming no audit evidence is required.
