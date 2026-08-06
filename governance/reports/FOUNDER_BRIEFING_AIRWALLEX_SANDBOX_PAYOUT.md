# Founder Briefing: Airwallex Sandbox Payout Integration

## Plain-English Outcome

NexusPay now has a deployed Airwallex sandbox integration path for last-leg payouts. Airwallex is treated as a destination payout rail behind the NexusPay orchestration engine, not as a hardcoded one-off demo.

## What Was Proven

- Airwallex sandbox authentication works with the supplied credentials.
- A harmless Airwallex account capability read works.
- The Platform Administration screen now has a `Test Airwallex` button for read-only proof.
- A separate guarded action exists for sandbox payout certification so a normal connection test cannot accidentally submit a payout.
- Supabase migrations and Edge Functions are deployed.
- Webhook signature verification rejects unsigned events and accepts signed synthetic events.

## What Is Not Yet Certified

NexusPay has not yet completed a genuine Airwallex sandbox payout end to end.

The blocker is now Airwallex API permission/scope, not NexusPay deployment:

- Beneficiary validation returns HTTP `401`.
- Redacted Airwallex cause: `unauthorized`, `Insufficient permissions`.
- No beneficiary was created.
- No transfer was submitted.
- No real Airwallex webhook event exists yet because no transfer could be created.

## Business Value

This moves NexusPay closer to proving the full journey:

Sender bank via Yapily -> NexusPay orchestration -> settlement layer -> Airwallex destination payout.

The important improvement is that Airwallex is wired as a reusable provider rail with evidence, idempotency and audit records rather than a visual-only integration.

## Recommended Next Action

Request or enable Airwallex sandbox API permissions for beneficiary and transfer APIs, then rerun the guarded sandbox payout certification.

Until that is done, this should be described as:

`Airwallex sandbox integration deployed; end-to-end payout certification blocked by Airwallex API permissions.`
