# Crypto and Fiat Orchestration Phase 2 Implementation Report

Date: 2026-08-08

## Outcome

**PARTIAL PASS**: the provider-neutral orchestration foundation, security model, capability registry and app visibility are deployed. XRPL crypto-to-crypto evidence is available on Testnet. Fiat-to-crypto and crypto-to-fiat remain safely unavailable because NexusPay has not onboarded a regulated conversion provider.

## Implemented Architecture

- `crypto_provider_capabilities`: provider/environment/journey capability truth.
- `crypto_payment_intents`: user-owned idempotent orchestration requests.
- `crypto_provider_quotes`: provider quote references, economics, expiry and evidence.
- `crypto_deposit_instructions`: provider-generated address/tag records only.
- `crypto_orchestration_events`: immutable canonical timeline evidence.
- RLS limits users to their own intents, quotes, instructions and events.
- Writes are restricted to the service boundary; mobile clients receive read access only.
- `nexuspay-crypto-fiat-orchestration` authenticates every request and refuses quote creation without a configured non-custodial regulated provider.

## App Integration

Corporate personas, business/private users and Platform Administration can open **Crypto & Fiat Orchestration** through their existing navigation. The screen preserves each persona's shell and distinguishes:

- Bank funding to crypto: `UNAVAILABLE`.
- Crypto funding to bank payout: `UNAVAILABLE`.
- XRPL crypto wallet transfer: `TESTNET`, using platform test wallets.

No quote, deposit address, recipient amount or completion is fabricated.

## Deployment Evidence

- Migration: `20260808000100_crypto_fiat_orchestration_foundation.sql` applied to `gsekiwpqzushrmglncns`.
- Edge Function: `nexuspay-crypto-fiat-orchestration` deployed successfully.
- Authenticated capability query: PASS.
- Guarded fiat-to-crypto quote: HTTP 409, `PROVIDER_CAPABILITY_UNAVAILABLE`, `UNAVAILABLE`.
- XRPL capability record: `AVAILABLE`, `TESTNET`, `PLATFORM_TEST_WALLETS`.
- Unauthenticated function access: HTTP 401.
- Direct authenticated client write: HTTP 403.

## Preview Release

- Implementation commit: `35a0216b29eedc8380a973d71d5dc3317e1be46b`.
- Final funding-copy commit: `bbf205c07e44c9c55aee5b8fb2847256d85612e9`.
- Final OTA update group: `85e55a63-eec7-48e4-ba25-e9034f3e664b`.
- Final Android update: `019fe0bb-0ce3-71bf-ad55-60573e263db1`.
- Final iOS update: `019fe0bb-0ce3-7914-8f8c-a18d085a628b`.
- Dashboard: `https://expo.dev/accounts/nexuspay/projects/NexusPayOrchestrator/updates/85e55a63-eec7-48e4-ba25-e9034f3e664b`.

## Security Controls

- No private key, API secret or bearer token is stored in application tables or output.
- No client write policy exists for orchestration evidence tables.
- Idempotency is mandatory on payment intents.
- Deposit addresses must originate from a provider adapter and carry provider provenance.
- Production is not enabled.

## Next External Dependency

Complete commercial, compliance and sandbox onboarding with a regulated on/off-ramp provider. Only then should NexusPay implement the provider adapter, verify signed webhook/status evidence and enable quote/submission controls.
