# Nium Sandbox Payout Integration Checkpoint

## Executive Result

**PARTIAL PASS - authenticated Nium sandbox discovery is integrated, but payout execution is awaiting a Nium customer and wallet.**

NexusPay now calls Nium through server-side Supabase Edge Functions. No Nium API key is shipped in the mobile bundle. The Send screen can select Nium Sandbox, retrieve current corridor requirements, display required recipient fields with format guidance, obtain an authenticated sandbox exchange-rate quote, and bind Nium to the canonical Route Plan. The app does not claim that Nium can execute a payout while `NIUM_CUSTOMER_HASH_ID` and `NIUM_WALLET_HASH_ID` are absent.

## Implemented

- Added authenticated Nium supported-corridor discovery using Nium V3.
- Added dynamic recipient requirements derived from `mandatoryDataRequirement`.
- Added guidance for bank account/IBAN, BIC/SWIFT, address, locality, postcode and identification fields.
- Added authenticated Nium sandbox GBP/destination-currency quote retrieval.
- Added Nium to the Send payout-provider selector and canonical Route Plan.
- Replaced the former mobile stub that fabricated payout references and `PAID_OUT` status.
- Added durable, idempotent beneficiary/remittance orchestration and status retrieval.
- Added `Test Nium` to Platform Administration with truthful `SANDBOX` provenance.
- Generalised saved-recipient provenance under existing recipient RLS.

## Deployed Evidence

| Check | Result | Provenance |
|---|---|---|
| Nium authentication | PASS | SANDBOX |
| Supported-corridor read | PASS | SANDBOX |
| Malaysia recipient schema | PASS | SANDBOX |
| GBP/MYR quote | PASS; quote reference returned | SANDBOX |
| Example rate during validation | 5.51 MYR per GBP | SANDBOX, time-sensitive |
| Payout guard | PASS; blocked before submission | DERIVED from secure configuration |
| Beneficiary creation | BLOCKED | NO DATA |
| Remittance creation/status | BLOCKED | NO DATA |
| Signed webhook | NOT CONFIGURED | NO DATA |

The guarded payout response was `NIUM_CUSTOMER_WALLET_NOT_CONFIGURED`. This is expected and safe. No provider reference or paid result was fabricated.

## Corridor Sweep

Current Nium sandbox LOCAL/INDIVIDUAL evidence was returned for Philippines, Malaysia, Singapore, United Arab Emirates, Saudi Arabia, Kuwait, Thailand, Indonesia and Vietnam. Qatar, Bahrain and Oman were not returned as LOCAL bank-payout corridors for this client profile. This is provider-account evidence, not a statement about Nium's entire commercial network.

## Security and Data

- Secrets: Supabase Edge Function secrets only.
- Database: additive `payout_provider_id`; existing recipient RLS remains in force.
- Durable records: existing provider intent, attempt/evidence and webhook tables.
- Idempotency: one intent per transfer/provider/environment and atomic submission claim.
- Production: disabled and untested.
- Webhooks: no Nium event is accepted as verified until official signature verification is configured.

## Remaining Work

1. Ask Nium to provision or approve a sandbox customer and wallet.
2. Fund the wallet using Nium's approved sandbox process.
3. Add `NIUM_CUSTOMER_HASH_ID` and `NIUM_WALLET_HASH_ID` to Supabase Edge secrets.
4. Certify beneficiary creation, remittance submission, lifecycle, duplicates and reconciliation.
5. Configure and certify signed webhooks if Nium enables them.

## Validation

- TypeScript: PASS.
- ESLint: no errors; existing warnings remain.
- Android Expo export: PASS.
- Migrations `20260810000100` and `20260810000200`: APPLIED.
- Edge deployment bundling: PASS for both affected functions.
- Local Deno check: not run because Deno is not installed.
