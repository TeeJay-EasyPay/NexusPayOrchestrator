# Founder Validation SQL Package Remediation Report

Date: 2026-06-05  
Branch: `startup-v2-founder-validation-consumer-multi-account`  
SQL remediation commit: `9ca2c195b1d4fae4e8fb7894307c887b342001d8`  
File remediated: `supabase/founder-validation-readiness.sql`

## Executive Summary

The Founder Validation SQL package has been corrected. The script no longer contains self-referential placeholder checks that always fail after real values are inserted.

The package now accepts the actual Founder Validation Private User values:

- Private User ID: `b5d0a4f3-8038-469e-8bfc-1ff45f43719b`
- Private User Email: `private.user@nexuspay.app`

The Founder can now execute `supabase/founder-validation-readiness.sql` without manual editing, provided the Demo Workspace Auth user and Private User Auth user exist in Supabase Auth.

## Root Cause

The original SQL package was designed with placeholders:

```sql
__PRIVATE_USER_ID__
__PRIVATE_USER_EMAIL__
```

After the real Founder Validation values were inserted, the placeholder validation checks were also changed to those same real values. That made the validation self-referential.

Defective pattern:

```sql
private_user_id_text := 'b5d0a4f3-8038-469e-8bfc-1ff45f43719b';

if private_user_id_text = 'b5d0a4f3-8038-469e-8bfc-1ff45f43719b' then
  raise exception ...
end if;
```

This condition was always true and forced the script to fail before schema creation or seed data could run.

## Exact SQL Defect

Two validation blocks were defective:

1. The initial Auth-user validation block near the top of the script.
2. The Founder Validation seed-data block before profile/settings/payment/recipient/transfer inserts.

Both blocks compared the configured private user id/email against the same configured private user id/email. The email value was also uppercase in the failed script, while Supabase Auth normally stores emails lowercase.

## Validation Logic Analysis

### Previous Logic

- Treated the actual Founder Validation ID as if it were still a placeholder.
- Treated the actual Founder Validation email as if it were still a placeholder.
- Failed before any table, policy, or seed statement could apply.

### Corrected Logic

- Declares the real private user id as a `uuid` constant.
- Declares the real private user email as lowercase text.
- Confirms the demo Auth user exists by id.
- Confirms the private Auth user exists by id and case-insensitive email match.
- Raises only if one of the required Auth users is actually missing or mismatched.

Corrected private-user values:

```sql
private_user_id constant uuid := 'b5d0a4f3-8038-469e-8bfc-1ff45f43719b';
private_user_email constant text := 'private.user@nexuspay.app';
```

Corrected Auth check:

```sql
select exists(
  select 1
  from auth.users
  where id = private_user_id
    and lower(email) = lower(private_user_email)
)
into private_exists;
```

## Files Changed

| File | Change |
|---|---|
| `supabase/founder-validation-readiness.sql` | Removed self-referential placeholder validation, inserted real private-user values, normalized email handling, hardened payment method seed re-runs, and added profile column compatibility. |

## What Was Corrected

- Removed `__PRIVATE_USER_ID__` / `__PRIVATE_USER_EMAIL__` placeholder checks after real values were known.
- Removed the failing self-comparison against `b5d0a4f3-8038-469e-8bfc-1ff45f43719b`.
- Removed the failing self-comparison against `PRIVATE.USER@NEXUSPAY.APP`.
- Replaced uppercase email with `private.user@nexuspay.app`.
- Made the private Auth-user email validation case-insensitive.
- Added `alter table ... add column if not exists` compatibility for `profiles.display_name`, `profiles.account_purpose`, and `profiles.updated_at`.
- Added `payment_methods_user_reference_idx` for re-runnable payment method seed data.
- Changed Founder Validation payment-method seed rows to non-primary methods so they do not conflict with an existing primary method.
- Changed payment-method seed behavior from `on conflict do nothing` to `on conflict (user_id, reference) do update`.

## Validation Results

| Check | Result | Evidence |
|---|---:|---|
| Self-referential placeholder checks removed | Pass | `rg "__PRIVATE_USER\|PRIVATE.USER\|Replace\|private_user_id_text"` returned no matches. |
| Actual private user id present | Pass | `b5d0a4f3-8038-469e-8bfc-1ff45f43719b` appears in identity constants and verification queries. |
| Actual private email present | Pass | `private.user@nexuspay.app` appears in identity constants. |
| Required table creation present | Pass | Script creates `profiles`, `transfers`, `recipients`, `payment_methods`, and `nexus_ai_settings`. |
| RLS creation present | Pass | Script enables RLS and recreates own-user policies for required tables. |
| Demo seed data present | Pass | Script seeds Demo profile, Nexus AI settings, payment method, recipient, and completed transfer. |
| Personal seed data present | Pass | Script seeds Private User profile, Nexus AI settings, payment method, recipient, and completed transfer. |
| Re-run safety | Pass | Tables/indexes use `if not exists`, policies are dropped/recreated, and seed rows use conflict handling. |
| SQL live execution | Not run from Codex | Requires Supabase SQL Editor/admin execution. Static remediation indicates the earlier failure condition is removed. |

## Remaining Risks

- The script will still intentionally fail if either Auth user is missing from `auth.users`.
- The script has not been executed from this Codex session because Supabase SQL Editor/admin execution is outside the current tool access.
- If the live Supabase project has incompatible pre-existing table column types, additional migration handling may be required. The previous probe indicated these tables were missing, so this risk is low for the Founder Validation path.

## Can the Founder Execute Without Manual Editing?

Yes.

The SQL package now contains the actual Founder Validation values and no longer requires replacing placeholders before execution.

Required precondition:

- `demo@nexuspay.app` exists with id `4db7a3ef-bbd6-4782-bf0d-65e0200641fa`.
- `private.user@nexuspay.app` exists with id `b5d0a4f3-8038-469e-8bfc-1ff45f43719b`.

## Founder Recommendation

Execute the corrected script in Supabase SQL Editor:

```text
supabase/founder-validation-readiness.sql
```

After execution, use the verification result set at the bottom of the script to confirm both Demo Workspace and Private User have:

- profile
- Nexus AI settings
- payment method
- recipient
- completed transfer

Then proceed with the EAS environment variable check and APK build readiness validation.
