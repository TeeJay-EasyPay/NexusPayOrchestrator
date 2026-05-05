-- NexusPay Orchestrator
-- Saved payment methods + RLS foundation
--
-- Run in Supabase SQL Editor.
-- Safe to re-run.

create table if not exists public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('CARD', 'OPEN_BANKING')),
  label text not null,
  subtitle text not null,
  provider text not null,
  reference text not null,
  status text not null check (status in ('ACTIVE', 'CONNECTED', 'NEEDS_REAUTH')),
  is_primary boolean not null default false,
  last4 text,
  funding_limit_gbp numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists payment_methods_user_id_idx
  on public.payment_methods(user_id);

create unique index if not exists payment_methods_one_primary_per_user_idx
  on public.payment_methods(user_id)
  where is_primary = true;

alter table public.payment_methods enable row level security;

drop policy if exists "Users can read own payment methods" on public.payment_methods;
drop policy if exists "Users can insert own payment methods" on public.payment_methods;
drop policy if exists "Users can update own payment methods" on public.payment_methods;
drop policy if exists "Users can delete own payment methods" on public.payment_methods;

create policy "Users can read own payment methods"
  on public.payment_methods
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own payment methods"
  on public.payment_methods
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own payment methods"
  on public.payment_methods
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own payment methods"
  on public.payment_methods
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- Optional verification:
-- select tablename, rowsecurity from pg_tables where schemaname = 'public' and tablename = 'payment_methods';
