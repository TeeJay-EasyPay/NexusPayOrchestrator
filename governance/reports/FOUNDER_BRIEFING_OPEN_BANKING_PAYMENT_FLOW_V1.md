# Founder Briefing: Open Banking Payment Flow V1

Date: 2026-06-25

## Summary

Open Banking Payment Flow V1 adds a visible Yapily-backed funding journey to NexusPay transfer tracking.

When a sender chooses a bank account funding source, NexusPay now creates a backend Open Banking flow, records each step in Supabase, and displays the step-by-step evidence on the Track screen.

## What This Proves

- NexusPay can call Yapily from the secure backend boundary.
- Yapily credentials remain in Supabase secrets and are not exposed to the app.
- Each sender-visible Open Banking step is stored as evidence.
- Corporate and private sender experiences can both display the Open Banking flow.
- The transfer execution timeline can include the funding leg before route execution, payout and settlement proof.

## What Is Live

- Backend Yapily authentication.
- Yapily institution discovery endpoint call.
- HTTP status, response time and institution-count telemetry.
- Supabase storage of the payment flow and ordered flow steps.

## What Is Sandbox

- The selected bank/institution when Yapily returns no institution records.
- The payment request reference.
- The consent reference.
- The authorisation URL.
- The final "ready for execution" payment-flow step.

This is intentional for V1. NexusPay is not yet submitting a production Open Banking payment instruction or moving funds through Yapily.

## What The Sender Can See

The sender can see:

- Yapily provider selection.
- Credential metadata loaded from Supabase secrets.
- Institution discovery result.
- Selected sandbox institution.
- Sandbox payment authorisation preparation.
- Sandbox consent reference.
- Ready-for-execution status.

## Validation Result

An authenticated backend smoke test was run after deployment.

- Transfer reference: `SMOKE-OB-20260625215359`
- Flow reference: `d8ae3d7d-bb52-4a6d-b1c2-bf58fd70d706`
- Provider: `yapily`
- Flow status: `READY_FOR_EXECUTION`
- Flow provenance: `SANDBOX`
- Steps recorded: `7`
- Yapily institution discovery HTTP status: `200`
- Institution count returned by Yapily: `0`

The result confirms that the backend can authenticate with Yapily and store the flow evidence. It also confirms that the current Yapily sandbox/application setup does not yet return institutions, so V1 correctly labels the journey as sandbox rather than live payment execution.

## Business Value

This turns Open Banking from a hidden technical test into a visible operational journey. A Founder, operator or sender can now see which parts are live, which parts are sandbox, and exactly how the funding leg progresses before payout execution.

## Next Step

Open Banking Payment Flow V2 should wire certified Yapily payment initiation once the required sandbox institution/payment-initiation configuration is available. At that point, the sandbox authorisation steps can be replaced with live Yapily payment request and consent lifecycle events.
