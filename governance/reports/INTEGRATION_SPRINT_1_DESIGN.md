# Integration Sprint 1 Design

## Executive Summary

Integration Sprint 1 moves NexusPay from simulated partner readiness toward real external infrastructure connectivity.

Yapily is the first live integration, but the implementation is deliberately not Yapily-centric. The platform now has reusable partner metadata, capability, corridor, connection-test and readiness structures that can support future first-leg, last-leg, settlement, wallet and FX partners.

Secrets are not stored in React Native, Expo, client environment variables or database data fields. Yapily credentials are configured as Supabase Edge Function secrets and consumed only by backend code.

## Architecture

The integration boundary is:

1. Mobile Platform Administration screen requests a partner connection test.
2. Supabase Edge Function authenticates the user.
3. Edge Function reads provider secrets from Supabase Secrets.
4. Edge Function calls the partner API.
5. Result is persisted in `partner_connection_tests`.
6. Provider readiness and operational health are derived from persisted test records.

The mobile application receives only test metadata and readiness results.

## Database

Migration:

`supabase/migrations/20260625000100_integration_sprint_1_partner_framework.sql`

Added or enhanced:

- `partner_providers`
- `partner_capabilities`
- `partner_supported_corridors`
- `partner_connection_tests`
- `partner_connection_status`
- `partner_credentials_metadata`

The database stores only credential metadata:

- configured state
- environment
- credential reference
- last updated timestamp
- non-sensitive notes

No API secret values are stored in database tables.

## Partner Abstraction

New resolver:

`src/services/partnerCapabilityResolver.ts`

The orchestration layer can request capabilities such as:

- `OPEN_BANKING_COLLECTION`
- `INSTITUTION_DISCOVERY`
- `INTERNATIONAL_PAYOUT`
- `SETTLEMENT`
- `FX_QUOTE`

The payout routing engine now routes through the capability resolver instead of calculating partner selection directly inside payout routing.

## Security Model

Yapily credentials are stored as Supabase Edge Function secrets:

- `YAPILY_APPLICATION_UUID`
- `YAPILY_APPLICATION_SECRET`
- `YAPILY_BASE_URL`

The application never receives or displays these values.

The deployed Edge Function requires an authenticated Supabase user and uses the Supabase service role only inside the backend function to persist test outcomes.

## Yapily Implementation

Implemented:

- backend-only Yapily authentication
- backend-only institution discovery endpoint check
- response latency measurement
- HTTP status capture
- institution count capture
- test result persistence
- provider connection status update
- provider readiness update
- capability provenance promotion to `LIVE` after successful validation

Smoke test result:

- Provider: Yapily
- Status: `SUCCESS`
- Readiness: `LIVE`
- HTTP status: `200`
- Response time: `173ms`
- Institution rows returned by the current Yapily application configuration: `0`

Interpretation:

Yapily authentication and API reachability are live. The attached application currently returns no institution rows from the institutions endpoint, so the next milestone should confirm Yapily application/institution configuration with the provider.

## Platform Administration UI

Enhanced:

- Partner Ecosystem
- Provider Configuration
- Corridor Management
- Platform Administration home
- Platform Health

Provider Configuration now shows:

- partner type
- readiness score
- sandbox URL
- supported countries
- credential reference
- capabilities
- latest connection test
- response time
- institution count
- `Test Connection` action

## Operations Command Centre

OCC health now includes `Partner APIs` as part of the shared platform health model.

Source:

`partner_connection_tests`

Provenance:

- `LIVE` when a partner connection test succeeds
- `DERIVED` when the latest test exists but fails
- `NO_DATA` when no connection tests exist

## Orchestration Changes

The payout routing engine now delegates selection to the partner capability resolver.

Current execution behavior is preserved:

- If a real provider adapter is available and credentialed, it may execute.
- Otherwise the existing mock sandbox fallback remains active.
- Send screens remain provider-agnostic and do not reference Yapily directly.

## Future Expansion Opportunities

Recommended next milestones:

1. Add a partner adapter interface for Edge Functions so every provider test and execution path shares one server-side contract.
2. Add TrueLayer and Banked as alternate open banking collection providers.
3. Add Nium, Thunes and Tranglo backend connectivity tests using the same connection-test framework.
4. Add webhook health telemetry per partner.
5. Add environment-specific readiness gates for sandbox, pilot and production.
6. Add partner incident states and SLA history.
7. Add secure credential rotation metadata.
8. Add provider-specific capability payload schemas while keeping orchestration capability-first.
