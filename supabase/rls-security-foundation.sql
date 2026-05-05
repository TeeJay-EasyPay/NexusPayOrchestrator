-- NexusPay Orchestrator
-- Supabase Row Level Security foundation
--
-- Purpose:
-- Protect user-owned data at the database layer so one authenticated user
-- cannot read, insert, update, or delete another user's records.
--
-- How to run:
-- 1. Open Supabase Dashboard
-- 2. Go to SQL Editor
-- 3. Paste this script
-- 4. Run it once
--
-- Safe to re-run: yes. Existing policies with these names are dropped first.

-- -----------------------------------------------------------------------------
-- PROFILES
-- -----------------------------------------------------------------------------
do $$
begin
  if to_regclass('public.profiles') is not null then
    alter table public.profiles enable row level security;

    drop policy if exists "Users can read own profile" on public.profiles;
    drop policy if exists "Users can insert own profile" on public.profiles;
    drop policy if exists "Users can update own profile" on public.profiles;

    create policy "Users can read own profile"
      on public.profiles
      for select
      to authenticated
      using (auth.uid() = id);

    create policy "Users can insert own profile"
      on public.profiles
      for insert
      to authenticated
      with check (auth.uid() = id);

    create policy "Users can update own profile"
      on public.profiles
      for update
      to authenticated
      using (auth.uid() = id)
      with check (auth.uid() = id);
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- TRANSFERS
-- This is the table currently used by transferService.ts for transaction history.
-- -----------------------------------------------------------------------------
do $$
begin
  if to_regclass('public.transfers') is not null then
    alter table public.transfers enable row level security;

    drop policy if exists "Users can read own transfers" on public.transfers;
    drop policy if exists "Users can insert own transfers" on public.transfers;
    drop policy if exists "Users can update own transfers" on public.transfers;
    drop policy if exists "Users can delete own transfers" on public.transfers;

    create policy "Users can read own transfers"
      on public.transfers
      for select
      to authenticated
      using (auth.uid() = user_id);

    create policy "Users can insert own transfers"
      on public.transfers
      for insert
      to authenticated
      with check (auth.uid() = user_id);

    create policy "Users can update own transfers"
      on public.transfers
      for update
      to authenticated
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);

    create policy "Users can delete own transfers"
      on public.transfers
      for delete
      to authenticated
      using (auth.uid() = user_id);
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- TRANSACTIONS
-- Kept for compatibility if a transactions table exists or is added later.
-- -----------------------------------------------------------------------------
do $$
begin
  if to_regclass('public.transactions') is not null then
    alter table public.transactions enable row level security;

    drop policy if exists "Users can read own transactions" on public.transactions;
    drop policy if exists "Users can insert own transactions" on public.transactions;
    drop policy if exists "Users can update own transactions" on public.transactions;
    drop policy if exists "Users can delete own transactions" on public.transactions;

    create policy "Users can read own transactions"
      on public.transactions
      for select
      to authenticated
      using (auth.uid() = user_id);

    create policy "Users can insert own transactions"
      on public.transactions
      for insert
      to authenticated
      with check (auth.uid() = user_id);

    create policy "Users can update own transactions"
      on public.transactions
      for update
      to authenticated
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);

    create policy "Users can delete own transactions"
      on public.transactions
      for delete
      to authenticated
      using (auth.uid() = user_id);
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- RECIPIENTS
-- -----------------------------------------------------------------------------
do $$
begin
  if to_regclass('public.recipients') is not null then
    alter table public.recipients enable row level security;

    drop policy if exists "Users can read own recipients" on public.recipients;
    drop policy if exists "Users can insert own recipients" on public.recipients;
    drop policy if exists "Users can update own recipients" on public.recipients;
    drop policy if exists "Users can delete own recipients" on public.recipients;

    create policy "Users can read own recipients"
      on public.recipients
      for select
      to authenticated
      using (auth.uid() = user_id);

    create policy "Users can insert own recipients"
      on public.recipients
      for insert
      to authenticated
      with check (auth.uid() = user_id);

    create policy "Users can update own recipients"
      on public.recipients
      for update
      to authenticated
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);

    create policy "Users can delete own recipients"
      on public.recipients
      for delete
      to authenticated
      using (auth.uid() = user_id);
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- XRPL IDENTITIES
-- -----------------------------------------------------------------------------
do $$
begin
  if to_regclass('public.xrpl_identities') is not null then
    alter table public.xrpl_identities enable row level security;

    drop policy if exists "Users can read own XRPL identity" on public.xrpl_identities;
    drop policy if exists "Users can insert own XRPL identity" on public.xrpl_identities;
    drop policy if exists "Users can update own XRPL identity" on public.xrpl_identities;
    drop policy if exists "Users can delete own XRPL identity" on public.xrpl_identities;

    create policy "Users can read own XRPL identity"
      on public.xrpl_identities
      for select
      to authenticated
      using (auth.uid() = user_id);

    create policy "Users can insert own XRPL identity"
      on public.xrpl_identities
      for insert
      to authenticated
      with check (auth.uid() = user_id);

    create policy "Users can update own XRPL identity"
      on public.xrpl_identities
      for update
      to authenticated
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);

    create policy "Users can delete own XRPL identity"
      on public.xrpl_identities
      for delete
      to authenticated
      using (auth.uid() = user_id);
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- AUDIT LOGS
-- -----------------------------------------------------------------------------
do $$
begin
  if to_regclass('public.audit_logs') is not null then
    alter table public.audit_logs enable row level security;

    drop policy if exists "Users can read own audit logs" on public.audit_logs;
    drop policy if exists "Users can insert own audit logs" on public.audit_logs;

    create policy "Users can read own audit logs"
      on public.audit_logs
      for select
      to authenticated
      using (auth.uid() = user_id);

    create policy "Users can insert own audit logs"
      on public.audit_logs
      for insert
      to authenticated
      with check (auth.uid() = user_id);
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- VERIFICATION QUERY
-- Run this separately after the script if you want to inspect enabled RLS tables.
-- -----------------------------------------------------------------------------
-- select
--   schemaname,
--   tablename,
--   rowsecurity
-- from pg_tables
-- where schemaname = 'public'
--   and tablename in (
--     'profiles',
--     'transfers',
--     'transactions',
--     'recipients',
--     'xrpl_identities',
--     'audit_logs'
--   )
-- order by tablename;
