# Airwallex Sandbox Payout Integration Checkpoint

## Metadata

- Branch: `startup-v2-founder-validation-consumer-multi-account`
- Starting commit: `63c5cfcc4223801b8f77990af7618b58a0f46b81`
- Ending commit: see final delivery response; this checkpoint is included in that final commit
- Working tree status: deployment/certification updates in progress; unrelated `.idea/caches/deviceStreaming.xml` and historical untracked artifacts remain outside this work
- Environment tested: local Windows workspace, Airwallex sandbox API, linked Supabase project `gsekiwpqzushrmglncns`

## Executive Outcome

- Connectivity: PASS
- Beneficiary workflow: BLOCKED
- Transfer workflow: BLOCKED
- Webhooks: PARTIAL
- Sandbox simulation: BLOCKED
- NexusPay orchestration integration: PARTIAL
- Overall certification result: BLOCKED

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

- `supabase db push`: PASS
- Applied migrations:
  - `20260806000100_airwallex_last_leg_payout_provider.sql`
  - `20260806000200_airwallex_official_sandbox_host_and_blocked_scope.sql`
  - `20260806000300_airwallex_webhook_synthetic_verification_status.sql`
- Rollback: remove Airwallex route eligibility, redeploy previous Edge Function versions, keep any evidence records if migration has already been applied

## Test Evidence

- `.env` ignored by Git: PASS
- Airwallex variable-name inspection without values: PASS
- Local Airwallex authentication: PASS
- Airwallex `GET /api/v1/balances/current`: FAIL, HTTP `401`, redacted code `unauthorized`
- Airwallex `GET /api/v1/account_capabilities/funding_limits`: PASS, HTTP `200`
- Deployed `nexuspay-test-partner-connection`: PASS, HTTP `200`, `SUCCESS`, `LIVE`, 1 funding-limit record
- Guarded Airwallex sandbox payout certification: BLOCKED at `beneficiaries/validate`, HTTP `401`, redacted code `unauthorized`, message `Insufficient permissions`
- Duplicate-request safety: PASS at NexusPay intent layer; two repeated attempts for the same transfer produced one durable payout intent and no provider transfer reference
- Synthetic unsigned webhook: PASS, rejected with HTTP `400`
- Synthetic signed webhook: PASS, accepted and verified
- Synthetic duplicate webhook: PASS, event stored once by unique event id
- `npx tsc --noEmit`: PASS
- Targeted ESLint on changed app/src files: PASS
- `npx expo config --json`: PASS
- `deno check`: NOT RUN, Deno CLI is not installed locally
- `supabase functions list`: PASS, Airwallex-related functions active

## Live Sandbox Evidence

Redacted:

- Authentication timestamp: deployed read-only test recorded at `2026-08-06T16:19:42.047846+00:00`
- Harmless read result: account capability funding limits returned HTTP `200`
- Beneficiary ID/reference: not created; blocked by Airwallex insufficient API permissions
- Transfer ID/reference: not created; certification stopped before transfer submission
- Request ID: `npx-airwallex-duplicate-cert-20260806173` for duplicate test intent
- Status transitions: not available
- Final status: not certified
- Webhook IDs: synthetic verified event `evt_npx_synthetic_airwallex_001`; no actual Airwallex webhook event available because transfer creation is blocked

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

- Airwallex API key lacks beneficiary/transfer permission or account entitlement; `beneficiaries/validate` returns HTTP `401 unauthorized`, `Insufficient permissions`.
- Airwallex dynamic beneficiary schema may require additional country/corridor-specific fields.
- Actual Airwallex webhook delivery cannot be tested until a transfer can be created or a webhook subscription/test event is configured in Airwallex.
- Deno CLI is not installed locally; Edge Function checks relied on successful Supabase deployment and runtime smoke tests.

## Recommended Next Steps

1. Update the Airwallex sandbox API key/scopes to allow beneficiary validation/create and transfer validation/create.
2. Rerun guarded Airwallex sandbox payout certification.
3. Configure a real Airwallex webhook subscription against the deployed `nexuspay-provider-webhook` endpoint.
4. Rerun actual webhook delivery or Airwallex test-event delivery.
5. Ask ChatGPT/CIO to review architecture, security, payout safety, evidence and certification conclusion.

## Requested Reviewer Action

Review whether the provider-neutral architecture, idempotency model, evidence tables and Airwallex certification gates are sufficient before investor demonstration.
