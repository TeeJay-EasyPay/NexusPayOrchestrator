# XRPL Testnet and RLUSD Phase 1 Implementation Report

## Executive Result

**PASS - genuine XRPL Testnet RLUSD settlement was submitted, validated and persisted through NexusPay.**

This is Testnet orchestration, not a production or real-money conversion. Yapily sandbox GBP is not commercially converted into RLUSD in Phase 1.

## Architecture Delivered

- Backend source and destination wallets funded with Testnet XRP.
- Both wallets configured with trustlines to Ripple's official Testnet RLUSD issuer.
- Wallet seeds held only in Supabase Edge Function secrets.
- Authenticated `nexuspay-xrpl-testnet` Edge Function for status, path quoting, signing, submission and reconciliation.
- Current ledger balance, reserve, fee and `ripple_path_find` evidence used by the canonical route engine.
- One persisted transaction per transfer and approved Route Plan through a unique idempotency key.
- Mobile execution and tracking consume the backend transaction result; device-side signing and the demonstration GBP/XRP rate were removed.

## Validated Evidence

- Source wallet: `rsBSbqDWhzymGNqfFynketFS9rtJRPX8vs`
- Destination wallet: `rwCjU76vKHQwJNZzR7XuAWkBwwWCgRWhK4`
- Asset delivered: `1 RLUSD` on XRPL Testnet
- Transaction: `FDAB8727AF32E4E749EC594EB0CAAC884A401F1191B30976FE8232DD21E732A0`
- Result: `tesSUCCESS`
- Validated ledger: `19713706`
- Recorded network fee: `0.000012 XRP`
- Transfer ID: `746bc675-5608-4c5a-a4d6-ea295e571948`
- Route Plan ID: `4fa4e4d3-da32-4831-921f-b352f86c54a8`
- Duplicate certification request: returned the same database record and transaction hash.

## Route Behavior

- A £10 Malaysia request was eligible using live GBP/USD reference sizing plus current XRPL Testnet path evidence.
- A £100 request was unavailable because the current Testnet wallet/path could not fund that amount.
- `LIVE` identifies the fiat reference feed.
- `TESTNET` identifies XRPL ledger and path evidence.
- `DERIVED` identifies calculated sizing, capacity and policy score.
- `UNAVAILABLE` remains visible for missing commercial conversion cost, depth or unsupported amounts.

## Security Validation

- Anonymous transaction reads returned no rows.
- The owning authenticated user could read the persisted transaction.
- Direct authenticated transaction insertion was rejected by RLS (`42501`).
- Service-role writes occur only inside the deployed Edge Function.
- No seed or provider secret is stored in mobile code or the metadata tables.

## Validation

- Supabase migration `20260807000300`: applied locally/remotely.
- Edge Function deployment: pass.
- Authenticated backend status and path quote: pass.
- On-ledger RLUSD settlement: pass.
- Duplicate-request protection: pass.
- TypeScript: pass.
- Expo lint: pass with zero errors; pre-existing warnings remain.
- Canonical route validation: pass.
- Pixel 9 backend diagnostic screen: pass.
- Local Deno check: unavailable because Deno is not installed; Supabase deployment bundling passed.

## Remaining Limitations

- No real GBP-to-RLUSD on-ramp or executable commercial conversion quote exists yet.
- Testnet order-book liquidity and faucet assets have no monetary value and may change without notice.
- A complete Yapily to XRPL to Airwallex user journey still combines sandbox/testnet legs rather than movement of one real monetary asset between providers.
- Phase 2 requires a regulated conversion/off-ramp provider, compliance design and commercial onboarding.

## Release

- Implementation commit: `23efefdec43839a2bcf13e9fef7b94e65384f367`
- Preview OTA update group: `ab4b010d-bcd2-4b8c-ae1c-32d2d28b37e8`
- Android update: `019fdd41-66c1-7815-9fff-954456104097`
- iOS update: `019fdd41-66c1-7afe-beef-9e865a5e7450`
