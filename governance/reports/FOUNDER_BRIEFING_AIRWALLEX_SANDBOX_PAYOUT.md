# Founder Briefing: Airwallex Sandbox Payout Integration

## Plain-English Outcome

NexusPay now has a local implementation path for Airwallex as a last-leg payout provider. This means Airwallex is treated as a destination payout rail behind the NexusPay orchestration engine, not as a hardcoded one-off demo.

## What Was Proven

- Airwallex sandbox authentication works with the supplied credentials.
- A harmless Airwallex account capability read works.
- The Platform Administration screen now has a `Test Airwallex` button for read-only proof.
- A separate guarded action exists for sandbox payout certification so a normal connection test cannot accidentally submit a payout.

## What Is Not Yet Certified

NexusPay has not yet completed a genuine Airwallex sandbox payout end to end.

The blocker is deployment infrastructure, not the mobile UI:

- Supabase database migration could not be applied because the remote DB connection timed out and requested `SUPABASE_DB_PASSWORD`.
- Supabase Edge Function deployment could not complete because the project is currently reported as `INACTIVE`.

## Business Value

This moves NexusPay closer to proving the full journey:

Sender bank via Yapily -> NexusPay orchestration -> settlement layer -> Airwallex destination payout.

The important improvement is that Airwallex is wired as a reusable provider rail with evidence, idempotency and audit records rather than a visual-only integration.

## Recommended Next Action

Reactivate or restore access to the Supabase project, provide the database password if required, then rerun:

- database migration
- Edge Function deployment
- Airwallex read-only test from Platform Administration
- Airwallex sandbox payout certification

Until that is done, this should be described as:

`Airwallex sandbox integration implemented locally; end-to-end payout certification blocked by Supabase deployment state.`
