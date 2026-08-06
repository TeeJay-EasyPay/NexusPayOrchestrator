# Airwallex Sandbox Payout Integration Checkpoint

## Metadata

- Branch: `startup-v2-founder-validation-consumer-multi-account`
- Starting commit: `63c5cfcc4223801b8f77990af7618b58a0f46b81`
- Ending commit: pending
- Working tree status: local implementation complete; unrelated `.idea/caches/deviceStreaming.xml` remains modified and is not part of this work
- Environment tested: local Windows workspace, Airwallex sandbox API, Supabase CLI

## Executive Outcome

- Connectivity: PARTIAL PASS
- Beneficiary workflow: BLOCKED
- Transfer workflow: BLOCKED
- Webhooks: BLOCKED
- Sandbox simulation: BLOCKED
- NexusPay orchestration integration: PARTIAL
- Overall certification result: implementation-ready locally, not certified end to end

## Architecture

Airwallex was implemented as a last-leg payout provider behind the existing payout adapter model.

The mobile app does not hold Airwallex credentials. It calls `nexuspay-submit-payout`; that Edge Function performs Airwallex authentication, provider calls, idempotency, status mapping and redacted evidence capture.

New provider-neutral persistence:

- `provider_payout_intents`
- `provider_payout_attempts`
- `provider_payout_evidence`
- `provider_webhook_events`

Key decisions:

- Airwallex is `sandbox` only.
- Normal `Test Airwallex` is read-only.
- Payout certification is a separate guarded action.
- Unknown provider outcome is not treated as safely failed.
- Webhooks are not certified unless Airwallex signature verification succeeds.

## Files Changed

Backend:

- `supabase/functions/nexuspay-test-partner-connection/index.ts`
- `supabase/functions/nexuspay-submit-payout/index.ts`
- `supabase/functions/nexuspay-provider-webhook/index.ts`

Mobile:

- `app/platform-providers.tsx`
- `src/services/platformAdministrationService.ts`
- `src/services/payout/payoutAdapter.ts`
- `src/services/payout/payoutPartnerDirectory.ts`
- `src/services/payout/payoutTypes.ts`
- `src/services/payout/providers/airwallexSandboxProvider.ts`

Database:

- `supabase/migrations/20260806000100_airwallex_last_leg_payout_provider.sql`

Governance:

- `governance/implementation-log/IMPLEMENTATION_LOG.md`
- `governance/reports/FOUNDER_BRIEFING_AIRWALLEX_SANDBOX_PAYOUT.md`
- `governance/reports/AIRWALLEX_SANDBOX_PAYOUT_INTEGRATION_CHECKPOINT.md`
- `governance/governance-core/DECISION_REGISTER.md`
- `governance/cdlo/CDLO_OPERATIONS.md`

## Database

Migration is additive only. It creates payout intent, attempt, evidence and webhook event tables with readable RLS policies and service-role write paths through Edge Functions.

Deployment status:

- `supabase db push`: BLOCKED
- Error: remote DB login role creation timed out and requested `SUPABASE_DB_PASSWORD`
- Rollback: remove Airwallex route eligibility, redeploy previous Edge Function versions, keep any evidence records if migration has already been applied

## Test Evidence

- `.env` ignored by Git: PASS
- Airwallex variable-name inspection without values: PASS
- Local Airwallex authentication: PASS
- Airwallex `GET /api/v1/balances/current`: FAIL, HTTP `401`
- Airwallex `GET /api/v1/account_capabilities/funding_limits`: PASS, HTTP `200`
- `npx tsc --noEmit`: PASS
- Targeted ESLint on changed app/src files: PASS
- `deno --version`: FAIL, Deno not installed locally
- `supabase db push`: BLOCKED
- `supabase functions deploy nexuspay-test-partner-connection`: BLOCKED, Supabase project reported `INACTIVE`

## Live Sandbox Evidence

Redacted:

- Authentication timestamp: recorded during local diagnostic on 2026-08-06
- Harmless read result: account capability funding limits returned HTTP `200`
- Beneficiary ID/reference: not created
- Transfer ID/reference: not created
- Request ID: not issued to Airwallex transfer API
- Status transitions: not available
- Final status: not certified
- Webhook IDs: not configured

## Security Review

- `.env` remains ignored.
- Airwallex secret values were not committed.
- Airwallex credentials are referenced only as server-side variables.
- Supabase secrets were updated from `.env` without printing values.
- Mobile code calls Supabase Edge Functions only.
- Payout idempotency uses one durable Airwallex `request_id` per NexusPay transfer.
- Banking details are masked in UI-facing and evidence summaries.
- Webhook endpoint rejects unsigned Airwallex events unless `AIRWALLEX_WEBHOOK_SECRET` validates the signature.

## Remaining Risks and Blockers

- Supabase project `gsekiwpqzushrmglncns` is reported as `INACTIVE`.
- Database migration has not been applied remotely.
- Edge Functions have not been deployed.
- Airwallex beneficiary and transfer scopes are unproven.
- Airwallex dynamic beneficiary schema may require additional country/corridor-specific fields.
- Webhook subscription and signing secret are not configured.

## Recommended Next Steps

1. Restore Supabase project active status.
2. Provide or configure `SUPABASE_DB_PASSWORD` for migration deployment.
3. Deploy `nexuspay-test-partner-connection`, `nexuspay-submit-payout` and `nexuspay-provider-webhook`.
4. Run `Test Airwallex` from Platform Administration.
5. Run guarded Airwallex sandbox payout certification.
6. Configure Airwallex webhook subscription and `AIRWALLEX_WEBHOOK_SECRET`.
7. Ask ChatGPT/CIO to review architecture, security, payout safety, evidence and certification conclusion.

## Requested Reviewer Action

Review whether the provider-neutral architecture, idempotency model, evidence tables and Airwallex certification gates are sufficient before investor demonstration.
