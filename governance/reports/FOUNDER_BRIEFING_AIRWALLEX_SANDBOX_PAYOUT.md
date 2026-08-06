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

## Certification Update

NexusPay has now completed a genuine Airwallex sandbox provider payout from beneficiary validation through terminal `PAID` status.

- Airwallex beneficiary validation and creation passed.
- Transfer validation and creation passed.
- Airwallex confirmed dispatch and terminal sandbox payment.
- NexusPay stored the provider references, timestamps, attempts and redacted journey evidence.
- The Corporate payment tracker now displays named Airwallex stages after Yapily and any applicable XRPL settlement stage.

The remaining gap is actual Airwallex webhook delivery. NexusPay's webhook verification, invalid-signature rejection and duplicate protection are synthetically proven, but the terminal certification transfer did not arrive through a configured Airwallex webhook subscription.

## Business Value

This moves NexusPay closer to proving the full journey:

Sender bank via Yapily -> NexusPay orchestration -> settlement layer -> Airwallex destination payout.

The important improvement is that Airwallex is wired as a reusable provider rail with evidence, idempotency and audit records rather than a visual-only integration.

## Recommended Next Action

Configure and verify the real Airwallex sandbox webhook subscription, then retain one actual signed webhook event as final asynchronous evidence.

Until that is done, this should be described as:

`End-to-end Airwallex sandbox provider orchestration passed; actual webhook delivery remains pending.`
