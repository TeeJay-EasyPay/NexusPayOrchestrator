-- NexusPay Orchestrator
-- Founder Validation Supabase readiness package
--
-- Purpose:
-- Create the minimum schema, RLS policies, and seed data required for
-- Founder Validation of:
--   1. Demo Workspace / Corporate Experience
--   2. Personal Account / Consumer Experience
--
-- Safe to re-run: yes.
--
-- Before running:
-- 1. Confirm the demo Auth user exists:
--      demo@nexuspay.app
--      4db7a3ef-bbd6-4782-bf0d-65e0200641fa
-- 2. Create the private Auth user in Supabase Authentication > Users.
-- 3. Confirm the private Auth user exists:
--      private.user@nexuspay.app
--      b5d0a4f3-8038-469e-8bfc-1ff45f43719b
--
-- This script does not create Supabase Auth users or passwords.
-- Auth users must be created through Supabase Auth/admin tooling.

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- Required Founder Validation identities
-- -----------------------------------------------------------------------------
do $$
declare
  demo_user_id constant uuid := '4db7a3ef-bbd6-4782-bf0d-65e0200641fa';
  private_user_id constant uuid := 'b5d0a4f3-8038-469e-8bfc-1ff45f43719b';
  private_user_email constant text := 'private.user@nexuspay.app';
  demo_exists boolean;
  private_exists boolean;
begin
  select exists(select 1 from auth.users where id = demo_user_id)
    into demo_exists;

  select exists(
    select 1
    from auth.users
    where id = private_user_id
      and lower(email) = lower(private_user_email)
  )
    into private_exists;

  if not demo_exists then
    raise exception 'Demo Auth user is missing: %', demo_user_id;
  end if;

  if not private_exists then
    raise exception 'Private Auth user is missing or email does not match: %, %', private_user_id, private_user_email;
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- Core tables used by the Founder Validation branch
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  account_purpose text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists display_name text,
  add column if not exists account_purpose text,
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.transfers (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  sender_currency text not null default 'GBP',
  sender_amount numeric not null default 0,
  recipient_country text not null default 'Destination',
  recipient_currency text not null default 'PHP',
  recipient_name text not null default 'Recipient',
  payout_method text not null default 'BANK',
  payout_provider text,
  selected_route jsonb,
  status text not null default 'PENDING',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists transfers_user_id_idx
  on public.transfers(user_id);

create index if not exists transfers_created_at_idx
  on public.transfers(created_at desc);

create table if not exists public.recipients (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  first_name text,
  middle_name text,
  surname text,
  country text not null,
  currency text not null,
  payout_method text not null,
  bank_name text,
  bank_code text,
  account_number text,
  mobile_wallet_provider text,
  mobile_number text,
  is_favorite boolean not null default false,
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists recipients_user_id_idx
  on public.recipients(user_id);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  entity_type text,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_user_id_idx
  on public.audit_logs(user_id);

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

create unique index if not exists payment_methods_user_reference_idx
  on public.payment_methods(user_id, reference);

create table if not exists public.nexus_ai_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  master_enabled boolean not null default true,
  home_enabled boolean not null default true,
  route_enabled boolean not null default true,
  tracking_enabled boolean not null default false,
  corridor_enabled boolean not null default true,
  treasury_enabled boolean not null default false,
  market_enabled boolean not null default false,
  sensitivity text not null default 'balanced'
    check (sensitivity in ('conservative', 'balanced', 'aggressive')),
  updated_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.transfers enable row level security;
alter table public.recipients enable row level security;
alter table public.audit_logs enable row level security;
alter table public.payment_methods enable row level security;
alter table public.nexus_ai_settings enable row level security;

drop policy if exists "Users can read own profile" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;

create policy "Users can read own profile"
  on public.profiles for select to authenticated
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert to authenticated
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "Users can read own transfers" on public.transfers;
drop policy if exists "Users can insert own transfers" on public.transfers;
drop policy if exists "Users can update own transfers" on public.transfers;
drop policy if exists "Users can delete own transfers" on public.transfers;

create policy "Users can read own transfers"
  on public.transfers for select to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own transfers"
  on public.transfers for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own transfers"
  on public.transfers for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own transfers"
  on public.transfers for delete to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can read own recipients" on public.recipients;
drop policy if exists "Users can insert own recipients" on public.recipients;
drop policy if exists "Users can update own recipients" on public.recipients;
drop policy if exists "Users can delete own recipients" on public.recipients;

create policy "Users can read own recipients"
  on public.recipients for select to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own recipients"
  on public.recipients for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own recipients"
  on public.recipients for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own recipients"
  on public.recipients for delete to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can read own audit logs" on public.audit_logs;
drop policy if exists "Users can insert own audit logs" on public.audit_logs;

create policy "Users can read own audit logs"
  on public.audit_logs for select to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own audit logs"
  on public.audit_logs for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can read own payment methods" on public.payment_methods;
drop policy if exists "Users can insert own payment methods" on public.payment_methods;
drop policy if exists "Users can update own payment methods" on public.payment_methods;
drop policy if exists "Users can delete own payment methods" on public.payment_methods;

create policy "Users can read own payment methods"
  on public.payment_methods for select to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own payment methods"
  on public.payment_methods for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own payment methods"
  on public.payment_methods for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own payment methods"
  on public.payment_methods for delete to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can read own nexus ai settings" on public.nexus_ai_settings;
drop policy if exists "Users can insert own nexus ai settings" on public.nexus_ai_settings;
drop policy if exists "Users can update own nexus ai settings" on public.nexus_ai_settings;

create policy "Users can read own nexus ai settings"
  on public.nexus_ai_settings for select to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own nexus ai settings"
  on public.nexus_ai_settings for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own nexus ai settings"
  on public.nexus_ai_settings for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- Founder Validation seed data
-- -----------------------------------------------------------------------------
do $$
declare
  demo_user_id constant uuid := '4db7a3ef-bbd6-4782-bf0d-65e0200641fa';
  demo_email constant text := 'demo@nexuspay.app';
  private_user_id constant uuid := 'b5d0a4f3-8038-469e-8bfc-1ff45f43719b';
  private_user_email constant text := 'private.user@nexuspay.app';
begin
  insert into public.profiles (id, email, display_name, account_purpose, updated_at)
  values
    (demo_user_id, demo_email, 'Demo Workspace', 'Founder Validation Corporate Experience', now()),
    (private_user_id, private_user_email, 'Private User', 'Founder Validation Personal Account', now())
  on conflict (id) do update
  set email = excluded.email,
      display_name = excluded.display_name,
      account_purpose = excluded.account_purpose,
      updated_at = now();

  insert into public.nexus_ai_settings (
    user_id,
    master_enabled,
    home_enabled,
    route_enabled,
    tracking_enabled,
    corridor_enabled,
    treasury_enabled,
    market_enabled,
    sensitivity,
    updated_at
  )
  values
    (demo_user_id, true, true, true, false, true, false, false, 'balanced', now()),
    (private_user_id, true, true, true, false, true, false, false, 'balanced', now())
  on conflict (user_id) do update
  set master_enabled = excluded.master_enabled,
      home_enabled = excluded.home_enabled,
      route_enabled = excluded.route_enabled,
      tracking_enabled = excluded.tracking_enabled,
      corridor_enabled = excluded.corridor_enabled,
      treasury_enabled = excluded.treasury_enabled,
      market_enabled = excluded.market_enabled,
      sensitivity = excluded.sensitivity,
      updated_at = now();

  insert into public.payment_methods (
    user_id,
    type,
    label,
    subtitle,
    provider,
    reference,
    status,
    is_primary,
    last4,
    funding_limit_gbp
  )
  values
    (demo_user_id, 'CARD', 'Demo corporate card', 'Founder validation demo funding', 'Demo Bank', 'demo-card-founder-validation', 'ACTIVE', false, '4242', 5000),
    (private_user_id, 'CARD', 'Personal debit card', 'Founder validation personal funding', 'Personal Bank', 'personal-card-founder-validation', 'ACTIVE', false, '1111', 1000)
  on conflict (user_id, reference) do update
  set label = excluded.label,
      subtitle = excluded.subtitle,
      provider = excluded.provider,
      status = excluded.status,
      last4 = excluded.last4,
      funding_limit_gbp = excluded.funding_limit_gbp,
      updated_at = now();

  insert into public.recipients (
    id,
    user_id,
    name,
    first_name,
    surname,
    country,
    currency,
    payout_method,
    bank_name,
    account_number,
    is_favorite,
    last_used_at,
    updated_at
  )
  values
    (
      demo_user_id || '-demo-ph-bank-founder-demo',
      demo_user_id,
      'Demo Corporate Recipient',
      'Demo',
      'Recipient',
      'Philippines',
      'PHP',
      'BANK',
      'Demo Bank',
      '0000123456',
      true,
      now(),
      now()
    ),
    (
      private_user_id || '-personal-ph-bank-founder-personal',
      private_user_id,
      'Personal Family Recipient',
      'Personal',
      'Recipient',
      'Philippines',
      'PHP',
      'BANK',
      'Personal Bank',
      '0000654321',
      true,
      now(),
      now()
    )
  on conflict (id) do update
  set last_used_at = now(),
      updated_at = now();

  insert into public.transfers (
    id,
    user_id,
    sender_currency,
    sender_amount,
    recipient_country,
    recipient_currency,
    recipient_name,
    payout_method,
    payout_provider,
    selected_route,
    status,
    completed_at,
    updated_at
  )
  values
    (
      'founder-demo-transfer-001',
      demo_user_id,
      'GBP',
      250,
      'Philippines',
      'PHP',
      'Demo Corporate Recipient',
      'BANK',
      'Demo Bank',
      jsonb_build_object(
        'id', 'founder-demo-route',
        'name', 'Demo Corporate Route',
        'accountScope', 'demo',
        'recipientSnapshot', jsonb_build_object(
          'name', 'Demo Corporate Recipient',
          'country', 'Philippines',
          'currency', 'PHP',
          'payoutMethod', 'BANK',
          'bankName', 'Demo Bank',
          'accountNumber', '0000123456'
        )
      ),
      'COMPLETED',
      now(),
      now()
    ),
    (
      'founder-personal-transfer-001',
      private_user_id,
      'GBP',
      75,
      'Philippines',
      'PHP',
      'Personal Family Recipient',
      'BANK',
      'Personal Bank',
      jsonb_build_object(
        'id', 'founder-personal-route',
        'name', 'Personal Stable Route',
        'accountScope', 'personal',
        'recipientSnapshot', jsonb_build_object(
          'name', 'Personal Family Recipient',
          'country', 'Philippines',
          'currency', 'PHP',
          'payoutMethod', 'BANK',
          'bankName', 'Personal Bank',
          'accountNumber', '0000654321'
        )
      ),
      'COMPLETED',
      now(),
      now()
    )
  on conflict (id) do update
  set selected_route = excluded.selected_route,
      updated_at = now();
end $$;

-- -----------------------------------------------------------------------------
-- Verification queries
-- -----------------------------------------------------------------------------
select
  id,
  email,
  raw_user_meta_data ->> 'display_name' as auth_display_name,
  confirmed_at,
  banned_until
from auth.users
where id in (
  '4db7a3ef-bbd6-4782-bf0d-65e0200641fa',
  'b5d0a4f3-8038-469e-8bfc-1ff45f43719b'
)
order by email;

select 'profiles' as table_name, id::text as owner_id, count(*) from public.profiles
where id in ('4db7a3ef-bbd6-4782-bf0d-65e0200641fa', 'b5d0a4f3-8038-469e-8bfc-1ff45f43719b')
group by id
union all
select 'transfers', user_id::text, count(*) from public.transfers
where user_id in ('4db7a3ef-bbd6-4782-bf0d-65e0200641fa', 'b5d0a4f3-8038-469e-8bfc-1ff45f43719b')
group by user_id
union all
select 'recipients', user_id::text, count(*) from public.recipients
where user_id in ('4db7a3ef-bbd6-4782-bf0d-65e0200641fa', 'b5d0a4f3-8038-469e-8bfc-1ff45f43719b')
group by user_id
union all
select 'payment_methods', user_id::text, count(*) from public.payment_methods
where user_id in ('4db7a3ef-bbd6-4782-bf0d-65e0200641fa', 'b5d0a4f3-8038-469e-8bfc-1ff45f43719b')
group by user_id
union all
select 'nexus_ai_settings', user_id::text, count(*) from public.nexus_ai_settings
where user_id in ('4db7a3ef-bbd6-4782-bf0d-65e0200641fa', 'b5d0a4f3-8038-469e-8bfc-1ff45f43719b')
group by user_id
order by table_name, owner_id;
