# Airwallex Sandbox Payout Integration Checkpoint

## Metadata

- Branch: `startup-v2-founder-validation-consumer-multi-account`
- Starting commit: `63c5cfcc4223801b8f77990af7618b58a0f46b81`
- Ending commit: see final delivery response; this checkpoint is included in that final commit
- Working tree status: deployment/certification updates in progress; unrelated `.idea/caches/deviceStreaming.xml` and historical untracked artifacts remain outside this work
- Environment tested: local Windows workspace, Airwallex sandbox API, linked Supabase project `gsekiwpqzushrmglncns`

## Executive Outcome

- Connectivity: PASS
- Beneficiary workflow: PASS
- Transfer workflow: PASS
- Webhooks: PARTIAL
- Sandbox simulation: PASS
- NexusPay orchestration integration: PASS for the provider leg
- Overall certification result: PARTIAL PASS

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
- `supabase/migrations/20260806000400_execution_sessions_user_persistence_policies.sql`

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
- Airwallex `GET /api/v1/balances/current`: PASS, HTTP `200` after the Founder expanded API scope
- Airwallex `GET /api/v1/account_capabilities/funding_limits`: PASS, HTTP `200`
- Deployed `nexuspay-test-partner-connection`: PASS, HTTP `200`, `SUCCESS`, `LIVE`, 1 funding-limit record
- Guarded Airwallex sandbox payout certification: PASS through beneficiary validation/create, transfer validation/create, `SENT`, and `PAID`
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
- Beneficiary ID/reference: `5aec04ef-d1eb-48f0-a113-e3178c3751e2`
- Transfer ID/reference: `04d2e3d3-b896-45b1-a12c-15a00ec9fce0`
- Request ID: `npx-airwallex-lifecycle-1786038054520`
- Status transitions: `SCHEDULED` -> `SENT` -> `PAID`; the provider may internally expose `PROCESSING` while dispatch is underway
- Final status: Airwallex `PAID`; NexusPay `PAID_OUT`
- Evidence ID: `045450e5-c53b-4113-ae38-40151defc0a4`
- Webhook IDs: synthetic verified event `evt_npx_synthetic_airwallex_001`; no actual Airwallex webhook event was received for the terminal certification transfer

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

- Airwallex dynamic beneficiary schema may require additional country/corridor-specific fields.
- Actual Airwallex webhook subscription/delivery remains to be configured or confirmed in the Airwallex dashboard.
- Deno CLI is not installed locally; Edge Function checks relied on successful Supabase deployment and runtime smoke tests.

## Malaysia Corridor Remediation

Founder testing identified a genuine Airwallex beneficiary validation failure on the MYR/Maybank corridor. Database evidence showed HTTP `400 validation_failed` for missing `beneficiary.bank_details.swift_code` and `beneficiary.address.state`.

- Corrected beneficiary schema: PASS.
- Non-retryable validation handling: PASS; HTTP 400 errors now stop without three identical submissions.
- Provider identity in Corporate Track: PASS; Airwallex is named before a result is returned.
- Sandbox transition order: PASS using `SCHEDULED -> PROCESSING -> SENT -> PAID`.
- Durable reconciliation: PASS; verification advances the existing Airwallex reference and does not create a duplicate transfer.
- Fresh MYR evidence: NexusPay `d9f60fb2-08a4-495a-848b-68c7cbbcd8f9`; Airwallex `debd10ac-ec53-4c97-a681-67b158f0a8f0`; terminal provider `PAID`; canonical `PAID_OUT`.

## Recommended Next Steps

1. Configure a real Airwallex webhook subscription against the deployed `nexuspay-provider-webhook` endpoint.
2. Rerun actual webhook delivery or Airwallex test-event delivery.
3. Complete the ordinary Corporate payment emulator acceptance journey and retain screenshots.
4. Ask ChatGPT/CIO to review architecture, security, payout safety, evidence and certification conclusion.

## Requested Reviewer Action

Review whether the provider-neutral architecture, idempotency model, evidence tables and Airwallex certification gates are sufficient before investor demonstration.

## Ordinary Corporate Payment Acceptance Update

- Emulator: Pixel 9
- NexusPay transfer: `3fe90106-00bf-48e4-9d51-7c7ad136af6f`
- Airwallex beneficiary: `1324cf01-9aa6-46d0-ba1d-97f68509ab54`
- Airwallex transfer: `4321958d-d473-49e1-93c6-514a4c55c317`
- Airwallex terminal status: `PAID`
- NexusPay canonical status: `PAID_OUT`
- Corporate UI evidence: named Airwallex dispatch, paid, and verification rows rendered in the execution state machine.
- XRPL qualification: this specific payment entered XRPL processing but completed after route failover with bridge settlement skipped. It is not evidence of a successful three-provider terminal path.
- Execution persistence: owner-scoped RLS policies deployed and authenticated CRUD certification passed.
- Preview OTA group: `c9bfc785-86eb-4f17-9652-e9148cc187c7`
