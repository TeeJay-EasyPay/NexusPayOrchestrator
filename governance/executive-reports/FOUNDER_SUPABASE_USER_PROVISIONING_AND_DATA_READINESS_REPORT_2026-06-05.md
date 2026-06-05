# Founder Supabase User Provisioning and Data Readiness Report

Date: 2026-06-05  
Branch under review: `startup-v2-founder-validation-consumer-multi-account`  
Latest reviewed commit: `43da67b32dfbae4d0c859aeb67c6be8d0d0f0a24`  
Investigation type: non-destructive readiness review

## Executive Summary

No, the Founder should not build the APK right now if the success criterion is access to both:

1. Demo Workspace
2. Personal Account

The Demo Workspace account is present and can authenticate against the target Supabase project. The Personal Account cannot be verified or used because the required private-user environment variables are missing from the local configuration reviewed.

Live Supabase data readiness is also incomplete. A non-destructive authenticated probe against the configured Supabase project authenticated the demo user successfully, then returned `404 Not Found` for the app tables checked through the Supabase REST API:

- `profiles`
- `transfers`
- `recipients`
- `nexus_ai_settings`
- `payment_methods`

This means the branch is account-routing ready in code, but Supabase provisioning/data readiness is not complete.

## Evidence Reviewed

- `app/multi-account-preview.tsx`
- `src/state/AuthContext.tsx`
- `src/state/AccountContext.tsx`
- `src/services/transferService.ts`
- `src/services/recipientService.ts`
- `src/services/nexusAISettingsService.ts`
- `src/lib/supabase.ts`
- `supabase/rls-security-foundation.sql`
- `supabase/payment-methods.sql`
- `docs/PROJECT_MAP.md`
- Founder Validation and account routing reports from 2026-06-04 and 2026-06-05
- Local `.env`, with secret values not reproduced in this report
- Target Supabase project reachability and demo sign-in probe
- Expo EAS environment variable documentation: https://docs.expo.dev/eas/environment-variables/

## Authentication Readiness

### Demo Workspace User

| Field | Finding |
|---|---|
| Email | `demo@nexuspay.app` |
| User id | `4db7a3ef-bbd6-4782-bf0d-65e0200641fa` |
| Account purpose | Demo Workspace / Corporate Experience |
| Authentication path | `app/multi-account-preview.tsx` -> `enableDemoAccess()` -> `signIn()` -> `/` |
| Account active? | Yes, sign-in succeeded |
| Can authenticate successfully? | Yes |

Evidence:

- `src/state/AuthContext.tsx` consumes `EXPO_PUBLIC_DEMO_EMAIL` and `EXPO_PUBLIC_DEMO_PASSWORD`.
- `app/multi-account-preview.tsx` sets `accountScope` to `demo`, calls `enableDemoAccess()`, then routes to `/`.
- Live probe result: `AUTH_OK user_id=4db7a3ef-bbd6-4782-bf0d-65e0200641fa email=demo@nexuspay.app`.

### Personal Account User

| Field | Finding |
|---|---|
| Email | Not configured locally |
| User id | Not available |
| Account purpose | Personal Account / Consumer Experience |
| Authentication path | `app/multi-account-preview.tsx` -> `enablePrivateUserAccess()` -> `signIn()` -> `/consumer` |
| Account active? | Not verified |
| Can authenticate successfully? | No evidence; cannot test without env vars |

Evidence:

- `src/state/AuthContext.tsx` requires `EXPO_PUBLIC_PRIVATE_USER_EMAIL` and `EXPO_PUBLIC_PRIVATE_USER_PASSWORD`.
- Local `.env` does not contain those variables.
- `enablePrivateUserAccess()` returns a configuration error when either private-user variable is missing.

## Environment Variable Readiness

| Variable | Consumed in | Feature depending on it | Local status | APK impact if missing |
|---|---|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | `src/lib/supabase.ts` | Supabase client | Present | Auth/data calls degrade to fallback placeholder and fail. |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | `src/lib/supabase.ts` | Supabase client | Present | Auth/data calls degrade to fallback placeholder and fail. |
| `EXPO_PUBLIC_DEMO_EMAIL` | `src/state/AuthContext.tsx` | Demo Workspace login | Present | Demo Workspace button shows configuration error. |
| `EXPO_PUBLIC_DEMO_PASSWORD` | `src/state/AuthContext.tsx` | Demo Workspace login | Present | Demo Workspace button shows configuration error. |
| `EXPO_PUBLIC_PRIVATE_USER_EMAIL` | `src/state/AuthContext.tsx` | Personal Account login | Missing locally | Personal Account button shows configuration error. |
| `EXPO_PUBLIC_PRIVATE_USER_PASSWORD` | `src/state/AuthContext.tsx` | Personal Account login | Missing locally | Personal Account button shows configuration error. |

EAS status:

- `eas.json` does not define inline `env` blocks.
- EAS cloud environment variables cannot be proven from repository state alone.
- Expo documentation supports creating EAS variables with `eas env:create --name ... --value ... --environment ... --visibility ...`.

## Demo Workspace Readiness

| Area | Finding |
|---|---|
| Auth user | Ready |
| Auth sign-in | Ready |
| Transaction count | Not available; live REST table probe returned `404 Not Found` for `transfers`. |
| Recipient count | Not available; live REST table probe returned `404 Not Found` for `recipients`. |
| Nexus AI settings | Not available; live REST table probe returned `404 Not Found` for `nexus_ai_settings`. |
| Profile data | Not available; live REST table probe returned `404 Not Found` for `profiles`. |
| Funding source data | Not available; live REST table probe returned `404 Not Found` for `payment_methods`. Current app funding UI remains mock-backed. |

Demo Workspace access is likely usable as a screen path because failed profile/audit/history reads are handled with fallback behavior in the app. Demo data readiness is not proven because the live tables were not available through REST.

## Personal Account Readiness

| Area | Finding |
|---|---|
| Auth user | Missing or not configured for this branch |
| Auth sign-in | Not ready |
| Transaction count | Not testable |
| Recipient count | Not testable |
| Nexus AI settings | Not testable |
| Profile data | Not testable |
| Funding source data | Not testable |

Personal Account is not ready for APK validation because the branch cannot authenticate a private user without `EXPO_PUBLIC_PRIVATE_USER_EMAIL` and `EXPO_PUBLIC_PRIVATE_USER_PASSWORD`.

## Data Availability Review

Live data probe summary:

| Table | Probe result for demo user |
|---|---|
| `profiles` | `404 Not Found` |
| `transfers` | `404 Not Found` |
| `recipients` | `404 Not Found` |
| `nexus_ai_settings` | `404 Not Found` |
| `payment_methods` | `404 Not Found` |

Interpretation:

- The target Supabase project is reachable.
- The demo Auth user exists and authenticates.
- The checked public tables are missing, not exposed, or not in the expected schema for the anon/authenticated REST API.
- The local SQL folder includes RLS policies for some tables, but the `rls-security-foundation.sql` file only applies policies if tables already exist. It does not create `profiles`, `transfers`, `recipients`, or `audit_logs`.
- `payment-methods.sql` creates `payment_methods`, but the live probe indicates it has not been applied to the target project or is not exposed through the expected REST path.
- No local migration exists for `nexus_ai_settings`.

## Account Isolation Review

### Confirmed in Code

| Requirement | Status | Evidence |
|---|---|---|
| Demo Workspace loads demo scope | Pass in code | `app/multi-account-preview.tsx` sets `accountScope` to `demo`. |
| Personal Account loads personal scope | Pass in code | `app/multi-account-preview.tsx` sets `accountScope` to `personal`. |
| Transfer history is user scoped | Pass in code | `src/services/transferService.ts` queries by `user_id`. |
| Transfer history is scope filtered | Pass in code | `src/services/transferService.ts` filters `selected_route.accountScope`. |
| Recipients are user scoped | Pass in code | `src/services/recipientService.ts` queries by `user_id`. |
| Recipient fallback is scope filtered | Pass in code | `src/services/recipientService.ts` filters transfer fallback by `selected_route.accountScope`. |
| AI local settings are user+scope keyed | Pass in code | `src/services/nexusAISettingsService.ts` uses `nexus-ai-settings:${userId}:${scope}`. |
| AI remote settings are user scoped | Partial | Remote query uses `user_id`; no remote `account_scope` column exists. |

### Not Confirmed in Live Supabase

Live account isolation cannot be fully validated because:

- Personal user credentials are missing.
- Live data tables returned `404 Not Found`.
- The live project cannot currently provide transaction, recipient, profile, AI settings, or funding-source counts for both users.

## Gap Analysis

| Gap | Severity | Impact |
|---|---:|---|
| Missing `EXPO_PUBLIC_PRIVATE_USER_EMAIL` | Blocker | Personal Account cannot authenticate. |
| Missing `EXPO_PUBLIC_PRIVATE_USER_PASSWORD` | Blocker | Personal Account cannot authenticate. |
| Personal Supabase Auth user not verified | Blocker | Founder cannot prove Personal Account access. |
| Live `profiles` table unavailable | High | Profile upsert/readiness cannot be verified. |
| Live `transfers` table unavailable | High | Transfer history/readiness cannot be verified. |
| Live `recipients` table unavailable | High | Recipient readiness cannot be verified. |
| Live `nexus_ai_settings` table unavailable | Medium | Nexus AI settings will rely on fallback or fail depending on path. |
| Live `payment_methods` table unavailable | Medium | Funding-source persistence is unavailable; current UI remains mock-backed. |
| `eas.json` has no inline env config | Medium | EAS build depends on cloud env setup not visible in repo. |
| Local `.env` contains a public OpenAI key variable | Security risk | Public client variables are embedded into app bundles; OpenAI API keys should live in Supabase secrets/Edge Function only. |

## Required Remediation

### 1. Create or Confirm Supabase Auth Users

In Supabase Dashboard:

1. Open the target project: `gsekiwpqzushrmglncns`.
2. Go to Authentication -> Users.
3. Confirm the existing demo user:
   - Email: `demo@nexuspay.app`
   - User id: `4db7a3ef-bbd6-4782-bf0d-65e0200641fa`
4. Create or confirm the private validation user:
   - Email: choose the value that will be used for `EXPO_PUBLIC_PRIVATE_USER_EMAIL`.
   - Password: choose the value that will be used for `EXPO_PUBLIC_PRIVATE_USER_PASSWORD`.
   - Mark email as confirmed if email confirmation is enabled.
5. Record the private user id for seed statements below.

Do not store the private password in source code.

### 2. Configure EAS Environment Variables

Per Expo EAS documentation, use EAS environment variables for remote builds.

For the `preview` environment:

```bash
eas env:create --name EXPO_PUBLIC_SUPABASE_URL --value https://gsekiwpqzushrmglncns.supabase.co --environment preview --visibility plaintext
eas env:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value <supabase-anon-key> --environment preview --visibility plaintext
eas env:create --name EXPO_PUBLIC_DEMO_EMAIL --value demo@nexuspay.app --environment preview --visibility plaintext
eas env:create --name EXPO_PUBLIC_DEMO_PASSWORD --value <demo-password> --environment preview --visibility sensitive
eas env:create --name EXPO_PUBLIC_PRIVATE_USER_EMAIL --value <private-user-email> --environment preview --visibility plaintext
eas env:create --name EXPO_PUBLIC_PRIVATE_USER_PASSWORD --value <private-user-password> --environment preview --visibility sensitive
```

For the `production` environment, repeat only if the Founder APK is built with the production profile:

```bash
eas env:create --name EXPO_PUBLIC_SUPABASE_URL --value https://gsekiwpqzushrmglncns.supabase.co --environment production --visibility plaintext
eas env:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value <supabase-anon-key> --environment production --visibility plaintext
eas env:create --name EXPO_PUBLIC_DEMO_EMAIL --value demo@nexuspay.app --environment production --visibility plaintext
eas env:create --name EXPO_PUBLIC_DEMO_PASSWORD --value <demo-password> --environment production --visibility sensitive
eas env:create --name EXPO_PUBLIC_PRIVATE_USER_EMAIL --value <private-user-email> --environment production --visibility plaintext
eas env:create --name EXPO_PUBLIC_PRIVATE_USER_PASSWORD --value <private-user-password> --environment production --visibility sensitive
```

Verification:

```bash
eas env:list --environment preview
eas env:pull --environment preview --path .env.preview.local
```

### 3. Apply Core Founder Validation Schema

Run this in Supabase SQL Editor before APK validation. It is additive and non-destructive.

```sql
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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
```

Then run the existing repository scripts:

```sql
-- Paste and run supabase/payment-methods.sql
-- Paste and run supabase/rls-security-foundation.sql
```

Add RLS for `nexus_ai_settings`:

```sql
alter table public.nexus_ai_settings enable row level security;

drop policy if exists "Users can read own nexus ai settings" on public.nexus_ai_settings;
drop policy if exists "Users can insert own nexus ai settings" on public.nexus_ai_settings;
drop policy if exists "Users can update own nexus ai settings" on public.nexus_ai_settings;

create policy "Users can read own nexus ai settings"
  on public.nexus_ai_settings
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own nexus ai settings"
  on public.nexus_ai_settings
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own nexus ai settings"
  on public.nexus_ai_settings
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

### 4. Seed Founder Validation Rows

Replace `<private-user-id>` and `<private-user-email>` after creating the private Auth user.

```sql
insert into public.profiles (id, email, updated_at)
values
  ('4db7a3ef-bbd6-4782-bf0d-65e0200641fa', 'demo@nexuspay.app', now()),
  ('<private-user-id>', '<private-user-email>', now())
on conflict (id) do update
set email = excluded.email,
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
  ('4db7a3ef-bbd6-4782-bf0d-65e0200641fa', true, true, true, false, true, false, false, 'balanced', now()),
  ('<private-user-id>', true, true, true, false, true, false, false, 'balanced', now())
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
  ('4db7a3ef-bbd6-4782-bf0d-65e0200641fa', 'CARD', 'Demo corporate card', 'Founder validation demo funding', 'Demo Bank', 'demo-card-founder-validation', 'ACTIVE', true, '4242', 5000),
  ('<private-user-id>', 'CARD', 'Personal debit card', 'Founder validation personal funding', 'Personal Bank', 'personal-card-founder-validation', 'ACTIVE', true, '1111', 1000)
on conflict do nothing;
```

Optional seed recipients:

```sql
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
    '4db7a3ef-bbd6-4782-bf0d-65e0200641fa-demo-ph-bank-founder-demo',
    '4db7a3ef-bbd6-4782-bf0d-65e0200641fa',
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
    '<private-user-id>-personal-ph-bank-founder-personal',
    '<private-user-id>',
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
```

Optional seed completed transfers:

```sql
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
    '4db7a3ef-bbd6-4782-bf0d-65e0200641fa',
    'GBP',
    250,
    'Philippines',
    'PHP',
    'Demo Corporate Recipient',
    'BANK',
    'Demo Bank',
    '{"id":"founder-demo-route","name":"Demo Corporate Route","accountScope":"demo","recipientSnapshot":{"name":"Demo Corporate Recipient","country":"Philippines","currency":"PHP","payoutMethod":"BANK","bankName":"Demo Bank","accountNumber":"0000123456"}}'::jsonb,
    'COMPLETED',
    now(),
    now()
  ),
  (
    'founder-personal-transfer-001',
    '<private-user-id>',
    'GBP',
    75,
    'Philippines',
    'PHP',
    'Personal Family Recipient',
    'BANK',
    'Personal Bank',
    '{"id":"founder-personal-route","name":"Personal Stable Route","accountScope":"personal","recipientSnapshot":{"name":"Personal Family Recipient","country":"Philippines","currency":"PHP","payoutMethod":"BANK","bankName":"Personal Bank","accountNumber":"0000654321"}}'::jsonb,
    'COMPLETED',
    now(),
    now()
  )
on conflict (id) do update
set updated_at = now();
```

### 5. Verify After Remediation

Run these queries in Supabase SQL Editor:

```sql
select id, email, confirmed_at, banned_until
from auth.users
where email in ('demo@nexuspay.app', '<private-user-email>');

select 'profiles' as table_name, user_id::text, count(*)
from (
  select id as user_id from public.profiles
) rows
group by user_id
union all
select 'transfers', user_id::text, count(*) from public.transfers group by user_id
union all
select 'recipients', user_id::text, count(*) from public.recipients group by user_id
union all
select 'nexus_ai_settings', user_id::text, count(*) from public.nexus_ai_settings group by user_id
union all
select 'payment_methods', user_id::text, count(*) from public.payment_methods group by user_id
order by table_name, user_id;
```

Then perform physical-device validation:

```text
Launch APK
  -> NexusPay Multi-Account Preview
  -> Demo Workspace
  -> Corporate Experience

Launch APK
  -> NexusPay Multi-Account Preview
  -> Personal Account
  -> Consumer Experience
```

## Founder Recommendation

Do not build the next Founder Validation APK until:

1. Private-user environment variables exist in EAS for the selected build environment.
2. The private Supabase Auth user has been created and confirmed.
3. The target Supabase project has the required public tables and RLS policies applied.
4. At least profile and Nexus AI settings rows exist for both users.
5. Optional but recommended: seed one recipient and one completed transfer for each user so the Founder can see account-specific data immediately.

Once those items are complete, build from:

```text
startup-v2-founder-validation-consumer-multi-account
```

Recommended reviewed commit:

```text
43da67b32dfbae4d0c859aeb67c6be8d0d0f0a24
```

## Plain-English Answer

Can the Founder build an APK right now and successfully access both Demo Workspace and Personal Account?

No.

Exactly what is missing:

1. The Personal Account email/password environment variables are missing.
2. The Personal Account Supabase Auth user is not verified from this branch.
3. The live Supabase data tables required for profile, transfers, recipients, Nexus AI settings, and funding sources are not available through the target project REST API.
4. EAS cloud environment variable readiness is not visible in the repo and must be configured before a remote APK build.
