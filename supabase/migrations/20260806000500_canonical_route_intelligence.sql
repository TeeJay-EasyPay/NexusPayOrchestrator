-- NexusPay canonical Route Intelligence V1
-- Versioned, user-owned route plans and immutable route decision events.

create extension if not exists pgcrypto;

create table if not exists public.route_plans (
  id uuid primary key,
  transfer_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_version integer not null check (plan_version > 0),
  status text not null check (status in ('CANDIDATE', 'APPROVED', 'EXECUTING', 'FAILED', 'SUPERSEDED', 'COMPLETED')),
  eligible boolean not null,
  rank integer,
  score numeric,
  funding_provider text,
  bridge_provider text,
  bridge_asset text,
  payout_provider text,
  source_currency text not null,
  destination_currency text not null,
  quote_expires_at timestamptz not null,
  approved_at timestamptz,
  completed_at timestamptz,
  parent_route_plan_id uuid references public.route_plans(id),
  failure_reason text,
  plan jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (transfer_id, plan_version, id)
);

create index if not exists route_plans_transfer_idx
  on public.route_plans(user_id, transfer_id, plan_version desc);

create index if not exists route_plans_status_idx
  on public.route_plans(user_id, status, updated_at desc);

create unique index if not exists route_plans_one_approved_version_idx
  on public.route_plans(user_id, transfer_id, plan_version)
  where status = 'APPROVED';

create table if not exists public.route_plan_events (
  id uuid primary key default gen_random_uuid(),
  route_plan_id uuid not null references public.route_plans(id) on delete cascade,
  transfer_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null,
  from_status text,
  to_status text,
  reason text,
  replacement_route_plan_id uuid references public.route_plans(id),
  event_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists route_plan_events_transfer_idx
  on public.route_plan_events(user_id, transfer_id, created_at);

alter table public.route_plans enable row level security;
alter table public.route_plan_events enable row level security;

grant select, insert, update on table public.route_plans to authenticated;
grant select, insert on table public.route_plan_events to authenticated;

drop policy if exists "route plans select own" on public.route_plans;
create policy "route plans select own" on public.route_plans
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "route plans insert own" on public.route_plans;
create policy "route plans insert own" on public.route_plans
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "route plans update own" on public.route_plans;
create policy "route plans update own" on public.route_plans
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "route plan events select own" on public.route_plan_events;
create policy "route plan events select own" on public.route_plan_events
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "route plan events insert own" on public.route_plan_events;
create policy "route plan events insert own" on public.route_plan_events
  for insert to authenticated with check (auth.uid() = user_id);

-- Rollback: drop route_plan_events first, then route_plans. No existing table is altered.
