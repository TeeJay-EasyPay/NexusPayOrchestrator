-- NexusPay Orchestrator
-- Transaction-specific audit/event ledger
--
-- Purpose:
-- Persist every completed orchestration step for a specific transfer so failed
-- transfers still show the exact steps completed before failure.
--
-- Run in Supabase SQL Editor. Safe to re-run.

create table if not exists public.transaction_audit_logs (
  id uuid primary key default gen_random_uuid(),
  transaction_id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null,
  status text not null check (status in ('PENDING', 'SUCCESS', 'FAILED', 'INFO')),
  message text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists transaction_audit_logs_user_id_idx
  on public.transaction_audit_logs(user_id);

create index if not exists transaction_audit_logs_transaction_id_idx
  on public.transaction_audit_logs(transaction_id);

create index if not exists transaction_audit_logs_created_at_idx
  on public.transaction_audit_logs(created_at desc);

alter table public.transaction_audit_logs enable row level security;

drop policy if exists "Users can read own transaction audit logs" on public.transaction_audit_logs;
drop policy if exists "Users can insert own transaction audit logs" on public.transaction_audit_logs;

create policy "Users can read own transaction audit logs"
  on public.transaction_audit_logs
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own transaction audit logs"
  on public.transaction_audit_logs
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Verification:
-- select tablename, rowsecurity
-- from pg_tables
-- where schemaname = 'public'
--   and tablename = 'transaction_audit_logs';
