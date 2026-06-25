-- Open Banking Payment Flow V1
-- Stores the backend-authenticated Yapily sandbox flow and step-by-step evidence.

create table if not exists public.open_banking_payment_flows (
  id uuid primary key default gen_random_uuid(),
  transfer_id text not null,
  user_id uuid references auth.users(id) on delete set null,
  provider_id text not null default 'yapily',
  environment text not null default 'sandbox',
  institution_id text,
  institution_name text,
  payment_request_id text,
  consent_id text,
  authorization_url text,
  status text not null default 'CREATED',
  amount numeric not null default 0,
  currency text not null default 'GBP',
  funding_reference text,
  provenance text not null default 'SANDBOX',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.open_banking_payment_flow_steps (
  id uuid primary key default gen_random_uuid(),
  flow_id uuid not null references public.open_banking_payment_flows(id) on delete cascade,
  transfer_id text not null,
  user_id uuid references auth.users(id) on delete set null,
  step_key text not null,
  label text not null,
  status text not null default 'PENDING',
  provider text not null default 'Yapily',
  provenance text not null default 'SANDBOX',
  sequence integer not null,
  response_time_ms integer,
  http_status integer,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.transfers
  add column if not exists funding_method text,
  add column if not exists funding_status text,
  add column if not exists funding_reference text,
  add column if not exists funding_authorised_at timestamptz,
  add column if not exists open_banking_flow_id uuid references public.open_banking_payment_flows(id) on delete set null,
  add column if not exists open_banking_provider text,
  add column if not exists open_banking_status text;

create index if not exists idx_open_banking_payment_flows_transfer_id
  on public.open_banking_payment_flows(transfer_id);

create index if not exists idx_open_banking_payment_flows_user_id
  on public.open_banking_payment_flows(user_id);

create index if not exists idx_open_banking_payment_flow_steps_flow_id
  on public.open_banking_payment_flow_steps(flow_id);

create index if not exists idx_open_banking_payment_flow_steps_transfer_id
  on public.open_banking_payment_flow_steps(transfer_id);

alter table public.open_banking_payment_flows enable row level security;
alter table public.open_banking_payment_flow_steps enable row level security;

drop policy if exists "Users can read own open banking flows" on public.open_banking_payment_flows;
create policy "Users can read own open banking flows"
  on public.open_banking_payment_flows for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own open banking flows" on public.open_banking_payment_flows;
create policy "Users can insert own open banking flows"
  on public.open_banking_payment_flows for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own open banking flows" on public.open_banking_payment_flows;
create policy "Users can update own open banking flows"
  on public.open_banking_payment_flows for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can read own open banking flow steps" on public.open_banking_payment_flow_steps;
create policy "Users can read own open banking flow steps"
  on public.open_banking_payment_flow_steps for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own open banking flow steps" on public.open_banking_payment_flow_steps;
create policy "Users can insert own open banking flow steps"
  on public.open_banking_payment_flow_steps for insert
  with check (auth.uid() = user_id);
