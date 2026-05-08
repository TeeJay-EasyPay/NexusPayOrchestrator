-- NexusPay Orchestrator
-- Route operational events ledger
--
-- Purpose:
-- Persist simulated and future live route degradation/failover events so the
-- Operations Command Centre can display orchestration reactions over time.
--
-- Run in Supabase SQL Editor. Safe to re-run.

create table if not exists public.route_operational_events (
  id uuid primary key default gen_random_uuid(),
  transaction_id text not null,
  route_id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,

  provider text not null,
  corridor text,
  rail text not null,
  event_type text not null,
  severity text not null check (severity in ('INFO', 'WATCH', 'DEGRADED', 'FAILOVER')),
  status text not null check (status in ('OPEN', 'RESOLVED', 'SIMULATED')) default 'SIMULATED',

  message text not null,
  recommendation text not null,
  degradation_score integer not null,
  failover_recommended boolean not null default false,
  preferred_action text not null,
  event_payload jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),

  constraint route_operational_events_unique_route_event
    unique (transaction_id, route_id, user_id, event_type)
);

create index if not exists route_operational_events_user_id_idx
  on public.route_operational_events(user_id);

create index if not exists route_operational_events_transaction_id_idx
  on public.route_operational_events(transaction_id);

create index if not exists route_operational_events_route_id_idx
  on public.route_operational_events(route_id);

create index if not exists route_operational_events_severity_idx
  on public.route_operational_events(severity);

create index if not exists route_operational_events_created_at_idx
  on public.route_operational_events(created_at desc);

alter table public.route_operational_events enable row level security;

drop policy if exists "Users can read own route operational events" on public.route_operational_events;
drop policy if exists "Users can insert own route operational events" on public.route_operational_events;
drop policy if exists "Users can update own route operational events" on public.route_operational_events;

create policy "Users can read own route operational events"
  on public.route_operational_events
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own route operational events"
  on public.route_operational_events
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own route operational events"
  on public.route_operational_events
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Verification:
-- select tablename, rowsecurity
-- from pg_tables
-- where schemaname = 'public'
--   and tablename = 'route_operational_events';
