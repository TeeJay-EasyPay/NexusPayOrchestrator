# Founder Validation Account Routing and Data Scope Report

Date: 2026-06-05  
Branch: `startup-v2-founder-validation-consumer-multi-account`  
Implementation commit: `4a3f6b2938c140d027218e8d55d6f74d5fe1ade2`  
Recommended APK build branch: `startup-v2-founder-validation-consumer-multi-account`

## Executive Summary

Founder Validation account selection now separates the Demo Workspace and Personal Account authentication paths.

- Demo Workspace keeps using the existing demo Supabase credentials and routes to `/`.
- Personal Account now uses a separate private-user Supabase credential pair and routes to `/consumer`.
- Recipient fallback loading now respects the active account scope before deriving recipients from completed transfers.
- No real credentials were added to source code.
- No production branch was merged or modified.

## Files Modified

| File | Change |
|---|---|
| `src/state/AuthContext.tsx` | Added `EXPO_PUBLIC_PRIVATE_USER_EMAIL` / `EXPO_PUBLIC_PRIVATE_USER_PASSWORD` based private-user access helper. |
| `app/multi-account-preview.tsx` | Changed Personal Account button from demo access to private-user access while preserving `accountScope = "personal"`. |
| `src/services/recipientService.ts` | Filtered transfer-derived recipient fallback by `selected_route.accountScope`. |

## Startup and Account Routing

### Demo Workspace

Evidence:

- `app/multi-account-preview.tsx:46` sets `accountScope` to `demo`.
- `app/multi-account-preview.tsx:47` calls `enableDemoAccess()`.
- `app/multi-account-preview.tsx:54` routes to `/`.
- `src/state/AuthContext.tsx:473` keeps the existing demo access function.

Required environment:

- `EXPO_PUBLIC_DEMO_EMAIL`
- `EXPO_PUBLIC_DEMO_PASSWORD`

Expected result:

```text
NexusPay Multi-Account Preview
  -> Demo Workspace
  -> Corporate Experience
```

### Personal Account

Evidence:

- `app/multi-account-preview.tsx:73` sets `accountScope` to `personal`.
- `app/multi-account-preview.tsx:74` calls `enablePrivateUserAccess()`.
- `app/multi-account-preview.tsx:81` routes to `/consumer`.
- `src/state/AuthContext.tsx:498` implements private-user access with environment-backed credentials.

Required environment:

- `EXPO_PUBLIC_PRIVATE_USER_EMAIL`
- `EXPO_PUBLIC_PRIVATE_USER_PASSWORD`

Expected result:

```text
NexusPay Multi-Account Preview
  -> Personal Account
  -> Consumer Experience
```

## Supabase Data Scope Review

### Authentication

No Supabase migration was required for authentication. Founder Validation requires two Supabase Auth users to exist in the target project:

- Demo user matching `EXPO_PUBLIC_DEMO_EMAIL`.
- Private user matching `EXPO_PUBLIC_PRIVATE_USER_EMAIL`.

Passwords must be supplied only through the APK build environment. They are not committed to source.

### Transfers

Evidence:

- `src/services/transferService.ts:133` resolves the active account scope.
- `src/services/transferService.ts:136` persists the scope into the selected route payload.
- `src/services/transferService.ts:181` queries transfers by authenticated `user_id`.
- `src/services/transferService.ts:193` reads `selected_route.accountScope`.
- `src/services/transferService.ts:195` filters completed transfers by active account scope.

Result:

- Separate Supabase users isolate transfer data through `user_id`.
- Existing `accountScope` filtering adds a second branch-local validation guard.

### Recipients

Evidence:

- `src/services/recipientService.ts:183` resolves scope when saving recipients.
- `src/services/recipientService.ts:253` resolves scope when loading recipients.
- `src/services/recipientService.ts:258` queries saved recipients by authenticated `user_id`.
- `src/services/recipientService.ts:265` falls back to transfers if no scoped recipient rows exist.
- `src/services/recipientService.ts:155` now reads transfer row scope in fallback.
- `src/services/recipientService.ts:158` now excludes transfer-derived recipients from other scopes.

Result:

- Saved recipients remain user-owned.
- Transfer-derived fallback recipients no longer mix demo and personal scopes.

### Nexus AI Settings

Evidence:

- `src/services/nexusAISettingsService.ts:33` keys local settings as `nexus-ai-settings:${userId}:${scope}`.
- `src/services/nexusAISettingsService.ts:78` reads remote settings by `user_id`.
- `src/services/nexusAISettingsService.ts:149` updates remote settings by `user_id`.

Result:

- With separate Supabase Auth users, remote Nexus AI settings are separated by user.
- Local fallback settings are separated by user and account scope.
- Future production multi-account work should add an explicit remote account-scope column if one Supabase user owns multiple account profiles.

## Supabase Setup Required

For Founder Validation APK testing, configure the target Supabase project with:

1. Existing demo Auth user:
   - Email equals `EXPO_PUBLIC_DEMO_EMAIL`.
   - Password equals `EXPO_PUBLIC_DEMO_PASSWORD`.

2. Private validation Auth user:
   - Email equals `EXPO_PUBLIC_PRIVATE_USER_EMAIL`.
   - Password equals `EXPO_PUBLIC_PRIVATE_USER_PASSWORD`.

3. Existing RLS policies remain active:
   - `supabase/rls-security-foundation.sql:63` reads own transfers by `auth.uid() = user_id`.
   - `supabase/rls-security-foundation.sql:69` inserts own transfers by `auth.uid() = user_id`.
   - `supabase/rls-security-foundation.sql:144` reads own recipients by `auth.uid() = user_id`.
   - `supabase/rls-security-foundation.sql:150` inserts own recipients by `auth.uid() = user_id`.

No seed file containing credentials should be committed.

## Validation Results

| Check | Result | Evidence |
|---|---:|---|
| Current branch | Pass | `startup-v2-founder-validation-consumer-multi-account` |
| Implementation commit | Pass | `4a3f6b2938c140d027218e8d55d6f74d5fe1ade2` |
| ESLint on touched and consumer files | Pass | `npx eslint app\multi-account-preview.tsx src\state\AuthContext.tsx src\services\recipientService.ts ...` returned exit code 0. |
| Secret scan for hardcoded credentials | Pass | `rg "EXPO_PUBLIC_[A-Z_]*(PASSWORD\|EMAIL)\|password:" app src -n` found env references and function parameters only. |
| Route reachability search | Pass | `/multi-account-preview`, `/`, and `/consumer` route references are present. |
| Transfer scope review | Pass | Completed transfer loads filter by stored `accountScope`. |
| Recipient fallback scope review | Pass | Transfer-derived recipients now filter by stored `accountScope`. |
| Full TypeScript check | Baseline fail | `npx tsc --noEmit` still fails on pre-existing operations, realtime, and intelligence context errors outside this change set. |
| APK generation | Not run | Explicitly out of scope. |

## Risks and Outstanding Issues

- APK build environment must include all four env vars; otherwise Personal Account will show a configuration error instead of logging in.
- Supabase Auth must contain a private validation user before APK testing.
- Consumer screens currently use branch validation/static consumer data in several surfaces; Supabase-backed private history will only appear where the existing services are connected.
- Full TypeScript remains blocked by pre-existing repository issues outside this implementation.
- Remote Nexus AI settings are user-separated, not account-profile separated, because the current table path uses `user_id` only.

## Founder Recommendation

Proceed to a new Founder Validation APK build from:

```text
startup-v2-founder-validation-consumer-multi-account
```

Use commit:

```text
4a3f6b2938c140d027218e8d55d6f74d5fe1ade2
```

Before building, confirm the EAS/Expo build profile supplies:

```text
EXPO_PUBLIC_DEMO_EMAIL
EXPO_PUBLIC_DEMO_PASSWORD
EXPO_PUBLIC_PRIVATE_USER_EMAIL
EXPO_PUBLIC_PRIVATE_USER_PASSWORD
```

The branch is ready for APK generation once the private Supabase Auth user and build environment variables are confirmed.
