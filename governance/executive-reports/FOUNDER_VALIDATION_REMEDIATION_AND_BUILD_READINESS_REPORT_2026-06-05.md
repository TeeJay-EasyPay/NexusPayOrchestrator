# Founder Validation Remediation and Build Readiness Report

Date: 2026-06-05  
Branch: `startup-v2-founder-validation-consumer-multi-account`  
Remediation commit: `68c092bf60eee654793fe2a730792b8f53b2c91c`  
Recommended APK build branch: `startup-v2-founder-validation-consumer-multi-account`

## Executive Summary

This workstream remediated the reproducibility gaps identified in the previous Founder Supabase readiness investigation by adding:

- A dedicated Founder Validation Supabase readiness SQL package.
- A non-secret EAS environment variable template for the Founder Validation build.

The app-side authentication routing did not require a code change. The Demo Workspace configuration error is caused by build-time environment variables not being embedded in the APK, not by a missing demo Supabase user. The app is already reading `EXPO_PUBLIC_DEMO_EMAIL` and `EXPO_PUBLIC_DEMO_PASSWORD` correctly through `src/state/AuthContext.tsx`.

The branch is now closer to immediate APK readiness, but the APK should not be generated until the remaining external provisioning steps are completed:

1. Create or confirm the Private User in Supabase Auth.
2. Replace private-user placeholders and run `supabase/founder-validation-readiness.sql` in Supabase SQL Editor.
3. Add the required EAS environment variables for the selected build environment.

## What Was Remediated

### Demo Workspace

Finding:

- The demo Supabase Auth user exists and authenticated successfully in the previous live probe:
  - Email: `demo@nexuspay.app`
  - User id: `4db7a3ef-bbd6-4782-bf0d-65e0200641fa`
- The APK configuration error is consistent with missing EAS build variables, not a code-level failure.

Remediation:

- Added `governance/automation/founder-validation-eas-env.example` with the exact variables needed by the Founder Validation APK.
- Confirmed code path remains:
  - `app/multi-account-preview.tsx` sets `accountScope = "demo"`.
  - `src/state/AuthContext.tsx` calls `enableDemoAccess()`.
  - `enableDemoAccess()` attempts Supabase sign-in only when both demo variables exist.
  - On success, the preview routes to `/`.

### Personal Account

Finding:

- The private-user env vars were missing:
  - `EXPO_PUBLIC_PRIVATE_USER_EMAIL`
  - `EXPO_PUBLIC_PRIVATE_USER_PASSWORD`
- No private Supabase Auth user id was available in branch state.

Remediation:

- Added EAS/local environment template entries for private-user credentials.
- Added SQL readiness script placeholders for the private Auth user:
  - `__PRIVATE_USER_ID__`
  - `__PRIVATE_USER_EMAIL__`
- The script refuses to run until these placeholders are replaced.
- The script seeds the Private User as display name `Private User` after the Auth user exists.

### Supabase Founder Validation Data

Finding:

- Previous live probe returned `404 Not Found` for:
  - `profiles`
  - `transfers`
  - `recipients`
  - `payment_methods`
  - `nexus_ai_settings`

Remediation:

- Added `supabase/founder-validation-readiness.sql`.
- The script creates all required tables, RLS policies, indexes, and minimum seed rows for both users.

## Files Changed

| File | Purpose |
|---|---|
| `supabase/founder-validation-readiness.sql` | Additive schema, RLS, and seed data package for Founder Validation. |
| `governance/automation/founder-validation-eas-env.example` | Non-secret EAS/local environment template for APK readiness. |

No app runtime code was changed in this remediation pass because the existing auth and routing logic already reads the required variables and routes correctly when variables exist.

## Supabase Changes

Created in `supabase/founder-validation-readiness.sql`:

- `profiles`
- `transfers`
- `recipients`
- `audit_logs`
- `payment_methods`
- `nexus_ai_settings`

RLS policies included:

- Users can read/insert/update their own profile.
- Users can read/insert/update/delete their own transfers.
- Users can read/insert/update/delete their own recipients.
- Users can read/insert their own audit logs.
- Users can read/insert/update/delete their own payment methods.
- Users can read/insert/update their own Nexus AI settings.

Seed data included:

| User | Profile | Nexus AI settings | Payment method | Recipient | Completed transfer |
|---|---:|---:|---:|---:|---:|
| Demo Workspace | Yes | Yes | Yes | Yes | Yes |
| Private User | Yes | Yes | Yes | Yes | Yes |

Important:

- The SQL script has been created and committed.
- It has not been applied to the live Supabase project from this session because applying it requires a confirmed private Auth user id and SQL Editor/admin access.

## Environment Variable Changes

Created template:

```text
governance/automation/founder-validation-eas-env.example
```

Required variables:

```text
EXPO_PUBLIC_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_ANON_KEY
EXPO_PUBLIC_DEMO_EMAIL
EXPO_PUBLIC_DEMO_PASSWORD
EXPO_PUBLIC_PRIVATE_USER_EMAIL
EXPO_PUBLIC_PRIVATE_USER_PASSWORD
```

Required EAS configuration commands:

```bash
eas env:create --name EXPO_PUBLIC_SUPABASE_URL --value https://gsekiwpqzushrmglncns.supabase.co --environment preview --visibility plaintext
eas env:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value <supabase-anon-key> --environment preview --visibility plaintext
eas env:create --name EXPO_PUBLIC_DEMO_EMAIL --value demo@nexuspay.app --environment preview --visibility plaintext
eas env:create --name EXPO_PUBLIC_DEMO_PASSWORD --value <demo-password> --environment preview --visibility sensitive
eas env:create --name EXPO_PUBLIC_PRIVATE_USER_EMAIL --value <private-user-email> --environment preview --visibility plaintext
eas env:create --name EXPO_PUBLIC_PRIVATE_USER_PASSWORD --value <private-user-password> --environment preview --visibility sensitive
```

If the APK is built with the `production` EAS profile, repeat the same values for `--environment production`.

## Validation Results

| Check | Result | Evidence |
|---|---:|---|
| Branch check | Pass | Current branch is `startup-v2-founder-validation-consumer-multi-account`. |
| Demo auth code path | Pass | `enableDemoAccess()` uses `EXPO_PUBLIC_DEMO_EMAIL` and `EXPO_PUBLIC_DEMO_PASSWORD`; sign-in is attempted only when both exist. |
| Personal auth code path | Pass | `enablePrivateUserAccess()` uses `EXPO_PUBLIC_PRIVATE_USER_EMAIL` and `EXPO_PUBLIC_PRIVATE_USER_PASSWORD`; `/consumer` routing remains intact. |
| Account scope separation | Pass | Preview sets `demo` before `/` and `personal` before `/consumer`; transfer and recipient services filter by user/scope. |
| SQL readiness asset | Pass | Script contains required tables, RLS policies, seed rows, and verification queries. |
| Secret scan on new assets | Pass | New assets contain placeholders only; no real passwords, OpenAI keys, or Supabase secret keys. |
| ESLint on app/account/consumer touched surface | Pass | `npx eslint app\multi-account-preview.tsx src\state\AuthContext.tsx src\state\AccountContext.tsx src\services\transferService.ts src\services\recipientService.ts src\services\nexusAISettingsService.ts app\consumer\...` returned exit code 0. |
| Full TypeScript | Baseline fail | `npx tsc --noEmit` still fails on pre-existing `/operations`, operations helper export, Supabase realtime overload, and disconnected intelligence context errors outside this remediation. |
| Live Supabase schema application | Not completed | Requires private Auth user id and Supabase SQL/admin access. |
| EAS environment mutation | Not completed | Requires EAS account/project access and secret values. |

## Remaining Risks

- APK will still show configuration errors if EAS variables are not configured before build.
- Personal Account cannot be proven until the private Supabase Auth user is created/confirmed.
- Live Supabase data remains unready until `supabase/founder-validation-readiness.sql` is applied with the real private user id/email.
- Consumer screens still include static Founder Validation data in several views; the new seed data supports service-backed paths, not a full production personal account model.
- Full TypeScript remains blocked by known unrelated repo debt.

## Exact External Steps Still Required

1. In Supabase Authentication, create or confirm:
   - Display name: `Private User`
   - Email: chosen `EXPO_PUBLIC_PRIVATE_USER_EMAIL`
   - Password: chosen `EXPO_PUBLIC_PRIVATE_USER_PASSWORD`
   - Email confirmed: yes

2. Copy the private user id from Supabase Auth.

3. In `supabase/founder-validation-readiness.sql`, replace:
   - `__PRIVATE_USER_ID__`
   - `__PRIVATE_USER_EMAIL__`

4. Run the SQL script in Supabase SQL Editor.

5. Configure EAS variables for the build environment using the template in:
   - `governance/automation/founder-validation-eas-env.example`

6. Build APK from:
   - `startup-v2-founder-validation-consumer-multi-account`

## Founder Recommendation

Do not build the APK until the external Supabase Auth user, SQL readiness script, and EAS variables are applied.

Once those steps are complete, the branch is the correct APK branch:

```text
startup-v2-founder-validation-consumer-multi-account
```

Use remediation commit:

```text
68c092bf60eee654793fe2a730792b8f53b2c91c
```

## Plain-English Answer

If the Founder builds an APK from this branch now, will Demo Workspace work?

Not guaranteed. The demo Auth user exists, but the APK will still fail if the EAS build environment does not include `EXPO_PUBLIC_DEMO_EMAIL` and `EXPO_PUBLIC_DEMO_PASSWORD`.

If the Founder builds an APK from this branch now, will Personal Account work?

No. The Private User still needs to be created/confirmed in Supabase Auth, the private-user EAS variables must be added, and the Founder Validation SQL package must be applied.

Exactly what remains:

1. Configure EAS env vars.
2. Create/confirm Private User in Supabase Auth.
3. Apply `supabase/founder-validation-readiness.sql` after replacing placeholders.
4. Rebuild the APK from this branch.
