-- NexusPay Orchestrator
-- Multi-Entity Value Orchestration Demonstrator
-- Migration: 20260617000100_multi_entity_value_orchestration
-- Safe to re-run

create extension if not exists pgcrypto;

create table if not exists public.participants (
  id text primary key,
  participant_type text not null check (participant_type in ('CORPORATE', 'INDIVIDUAL', 'BUSINESS')),
  name text not null,
  country text not null,
  bank_name text not null,
  account_last4 text not null,
  currency text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.payout_batches (
  id uuid primary key default gen_random_uuid(),
  sender_participant_id text not null references public.participants(id) on delete restrict,
  total_value numeric not null check (total_value >= 0),
  status text not null default 'CREATED',
  created_at timestamptz not null default now()
);

create table if not exists public.batch_transfers (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.payout_batches(id) on delete cascade,
  sender_participant_id text not null references public.participants(id) on delete restrict,
  recipient_participant_id text not null references public.participants(id) on delete restrict,
  amount numeric not null check (amount > 0),
  status text not null default 'CREATED' check (status in ('CREATED', 'ROUTING', 'IN_PROGRESS', 'DELIVERED')),
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  participant_id text not null references public.participants(id) on delete cascade,
  title text not null,
  message text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists payout_batches_sender_idx on public.payout_batches(sender_participant_id);
create index if not exists batch_transfers_batch_idx on public.batch_transfers(batch_id);
create index if not exists batch_transfers_recipient_idx on public.batch_transfers(recipient_participant_id);
create index if not exists notifications_participant_idx on public.notifications(participant_id);
create index if not exists notifications_read_idx on public.notifications(read);

alter table public.participants enable row level security;
alter table public.payout_batches enable row level security;
alter table public.batch_transfers enable row level security;
alter table public.notifications enable row level security;

-- Demo-oriented permissive read for authenticated users.
-- Write operations remain controlled by app-level persona routing.
drop policy if exists "participants readable" on public.participants;
create policy "participants readable"
  on public.participants for select to authenticated
  using (true);

drop policy if exists "participants writable" on public.participants;
create policy "participants writable"
  on public.participants for insert to authenticated
  with check (true);

drop policy if exists "batches readable" on public.payout_batches;
create policy "batches readable"
  on public.payout_batches for select to authenticated
  using (true);

drop policy if exists "batches writable" on public.payout_batches;
create policy "batches writable"
  on public.payout_batches for insert to authenticated
  with check (true);

drop policy if exists "batches updatable" on public.payout_batches;
create policy "batches updatable"
  on public.payout_batches for update to authenticated
  using (true)
  with check (true);

drop policy if exists "batch transfers readable" on public.batch_transfers;
create policy "batch transfers readable"
  on public.batch_transfers for select to authenticated
  using (true);

drop policy if exists "batch transfers writable" on public.batch_transfers;
create policy "batch transfers writable"
  on public.batch_transfers for insert to authenticated
  with check (true);

drop policy if exists "batch transfers updatable" on public.batch_transfers;
create policy "batch transfers updatable"
  on public.batch_transfers for update to authenticated
  using (true)
  with check (true);

drop policy if exists "notifications readable" on public.notifications;
create policy "notifications readable"
  on public.notifications for select to authenticated
  using (true);

drop policy if exists "notifications writable" on public.notifications;
create policy "notifications writable"
  on public.notifications for insert to authenticated
  with check (true);

drop policy if exists "notifications updatable" on public.notifications;
create policy "notifications updatable"
  on public.notifications for update to authenticated
  using (true)
  with check (true);

insert into public.participants (id, participant_type, name, country, bank_name, account_last4, currency)
values
  ('nexus-manufacturing-ltd', 'CORPORATE', 'Nexus Manufacturing Ltd', 'United Kingdom', 'Nexus Treasury Bank', '1000', 'GBP'),
  ('anne-santos', 'INDIVIDUAL', 'Anne Santos', 'Philippines', 'BDO Unibank', '8421', 'PHP'),
  ('james-rahman', 'INDIVIDUAL', 'James Rahman', 'Malaysia', 'Maybank', '3157', 'MYR'),
  ('sarah-khan', 'INDIVIDUAL', 'Sarah Khan', 'UAE', 'Emirates NBD', '9912', 'AED'),
  ('alpha-trading-llc', 'BUSINESS', 'Alpha Trading LLC', 'UAE', 'ADCB', '1134', 'AED'),
  ('manila-services-inc', 'BUSINESS', 'Manila Services Inc', 'Philippines', 'BDO', '5588', 'PHP'),
  ('kuala-lumpur-logistics', 'BUSINESS', 'Kuala Lumpur Logistics', 'Malaysia', 'CIMB', '7744', 'MYR')
on conflict (id) do update set
  participant_type = excluded.participant_type,
  name = excluded.name,
  country = excluded.country,
  bank_name = excluded.bank_name,
  account_last4 = excluded.account_last4,
  currency = excluded.currency;
