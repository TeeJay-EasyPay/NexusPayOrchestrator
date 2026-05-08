-- NexusPay Orchestrator
-- Treasury liquidity snapshot ledger
--
-- Purpose:
-- Persist the treasury intelligence seen at route-evaluation time so each
-- transfer has an auditable liquidity/routing decision record.
--
-- Run in Supabase SQL Editor. Safe to re-run.

create table if not exists public.treasury_liquidity_snapshots (
  id uuid primary key default gen_random_uuid(),
  transaction_id text not null,
  route_id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,

  corridor text not null,
  recipient_currency text not null,
  provider text not null,
  rail text not null,
  bridge_asset text,

  corridor_liquidity_depth text not null,
  corridor_pressure text not null,
  corridor_capacity_score integer not null,
  corridor_preferred_rail text,
  corridor_preferred_bridge_asset text,
  corridor_insight text not null,

  partner_liquidity_depth text not null,
  partner_pressure text not null,
  partner_capacity_score integer not null,
  partner_settlement_capacity text not null,
  partner_insight text not null,

  rail_liquidity_depth text not null,
  rail_pressure text not null,
  rail_capacity_score integer not null,
  rail_settlement_capacity text not null,
  rail_insight text not null,

  treasury_score integer not null,
  treasury_pressure_penalty integer not null,
  liquidity_recommendation text not null,
  decision_factors jsonb not null default '[]'::jsonb,
  snapshot_payload jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),

  constraint treasury_liquidity_snapshots_unique_route_snapshot
    unique (transaction_id, route_id, user_id)
);

create index if not exists treasury_liquidity_snapshots_user_id_idx
  on public.treasury_liquidity_snapshots(user_id);

create index if not exists treasury_liquidity_snapshots_transaction_id_idx
  on public.treasury_liquidity_snapshots(transaction_id);

create index if not exists treasury_liquidity_snapshots_provider_idx
  on public.treasury_liquidity_snapshots(provider);

create index if not exists treasury_liquidity_snapshots_corridor_idx
  on public.treasury_liquidity_snapshots(corridor);

create index if not exists treasury_liquidity_snapshots_created_at_idx
  on public.treasury_liquidity_snapshots(created_at desc);

alter table public.treasury_liquidity_snapshots enable row level security;

drop policy if exists "Users can read own treasury liquidity snapshots" on public.treasury_liquidity_snapshots;
drop policy if exists "Users can insert own treasury liquidity snapshots" on public.treasury_liquidity_snapshots;
drop policy if exists "Users can update own treasury liquidity snapshots" on public.treasury_liquidity_snapshots;

create policy "Users can read own treasury liquidity snapshots"
  on public.treasury_liquidity_snapshots
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own treasury liquidity snapshots"
  on public.treasury_liquidity_snapshots
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own treasury liquidity snapshots"
  on public.treasury_liquidity_snapshots
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Verification:
-- select tablename, rowsecurity
-- from pg_tables
-- where schemaname = 'public'
--   and tablename = 'treasury_liquidity_snapshots';
