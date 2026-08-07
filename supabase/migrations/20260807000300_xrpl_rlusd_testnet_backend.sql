-- NexusPay XRPL/RLUSD Testnet backend evidence.
-- Wallet seeds remain in Supabase Edge Function secrets and are never stored here.

create extension if not exists pgcrypto;

create table if not exists public.xrpl_testnet_wallets (
  address text primary key,
  wallet_role text not null unique check (wallet_role in ('SOURCE', 'DESTINATION')),
  network text not null default 'testnet' check (network = 'testnet'),
  rlusd_issuer text not null,
  xrp_balance numeric,
  rlusd_balance numeric,
  trustline_active boolean not null default false,
  last_ledger_index bigint,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.xrpl_testnet_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  transfer_id uuid not null,
  route_plan_id uuid references public.route_plans(id),
  idempotency_key text not null unique,
  tx_hash text unique,
  source_address text not null,
  destination_address text not null,
  asset text not null check (asset = 'RLUSD'),
  amount_rlusd numeric not null check (amount_rlusd > 0),
  network_fee_xrp numeric,
  ledger_index bigint,
  engine_result text,
  canonical_status text not null check (canonical_status in ('PREPARED', 'SUBMITTED', 'VALIDATED', 'FAILED', 'UNKNOWN')),
  validated boolean not null default false,
  failure_reason text,
  evidence jsonb not null default '{}'::jsonb,
  submitted_at timestamptz,
  validated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists xrpl_testnet_transactions_user_transfer_idx
  on public.xrpl_testnet_transactions(user_id, transfer_id, created_at desc);

create index if not exists xrpl_testnet_transactions_status_idx
  on public.xrpl_testnet_transactions(canonical_status, updated_at desc);

alter table public.xrpl_testnet_wallets enable row level security;
alter table public.xrpl_testnet_transactions enable row level security;

grant select on table public.xrpl_testnet_wallets to authenticated;
grant select on table public.xrpl_testnet_transactions to authenticated;

drop policy if exists "authenticated read XRPL testnet wallet evidence" on public.xrpl_testnet_wallets;
create policy "authenticated read XRPL testnet wallet evidence" on public.xrpl_testnet_wallets
  for select to authenticated using (true);

drop policy if exists "users read own XRPL testnet transactions" on public.xrpl_testnet_transactions;
create policy "users read own XRPL testnet transactions" on public.xrpl_testnet_transactions
  for select to authenticated using (auth.uid() = user_id);

-- Rollback:
-- drop table if exists public.xrpl_testnet_transactions;
-- drop table if exists public.xrpl_testnet_wallets;
