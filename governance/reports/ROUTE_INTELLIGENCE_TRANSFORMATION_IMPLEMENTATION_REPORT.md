# Route Intelligence Transformation Implementation Report

## Executive Outcome

Status: **PARTIAL PASS - canonical architecture implemented; no route is currently evidence-complete.**

NexusPay now has one versioned Route Plan model for preview, comparison, approval, execution, tracking, and AI context. Demonstration route templates and independent scoring paths have been removed from active payment screens. The engine now refuses to approve the current routes because genuine Yapily payment initiation and executable XRPL/RLUSD market evidence are absent.

This is operationally honest and materially more auditable, but it is not production-ready route intelligence.

## What Changed

- Added `CanonicalRoutePlan` V1 with field-level source, provenance, observation time, confidence, and reason.
- Added one canonical route generator and one React hook shared by Corporate, Consumer, Send preview, Quote, and Routes.
- Added owner-scoped `route_plans` and immutable `route_plan_events` persistence.
- Bound approval and payout-provider execution to the exact persisted plan.
- Added route status and failover history to Corporate and Consumer tracking.
- Added one comparison component covering providers, FX, spread, fees, total cost, recipient estimate, ETA, risk, confidence, history, liquidity, capacity, compliance, and expiry.
- Changed Nexus AI route context to use canonical evidence and null unavailable costs rather than simulated operational/treasury signals.
- Replaced Consumer's 1.2-second automatic completion with the persisted resumable execution engine.
- Fixed Frankfurter V2 rate parsing and excluded compile-time FX fallbacks from route approval.
- Removed the nested Home transaction `FlatList` runtime warning encountered during emulator validation.

## Removed From Active Routing

- hard-coded Send RLUSD recommendation;
- static Quote route templates and compile-time quote FX table;
- independent settlement-orchestrator ranking;
- artificial AI route score and penalty table;
- demo provider route catalogue;
- execution-time payout provider reselection for canonical plans;
- Consumer timer-based completion and manual delivery override.

Deleted legacy modules:

- `src/lib/settlementOrchestrator.ts`
- `src/lib/aiRouteIntelligence.ts`
- `src/lib/providerIntegrationFramework.ts`

## Current Data Truth

### Live

- FX from the first responding live FX provider; emulator validation returned Frankfurter.

### Sandbox

- Yapily authentication/institution endpoint connectivity.
- Airwallex authentication, payout availability, and completed sandbox payout evidence.

### Testnet

- XRPL account/trustline balance lookup where available.

### Derived or Estimated

- Airwallex historical success and terminal duration from `execution_sessions`.
- Evidence confidence, evidence risk, rank, and score.
- Recipient amount from live FX before unavailable provider fees and spread.

### Unavailable

- genuine Yapily payment initiation and payment status;
- current selectable Yapily institution evidence in the latest test;
- Airwallex pre-transfer fee, spread, corridor-specific limit, liquidity, and capacity;
- total route cost while fees/spread are missing;
- executable RLUSD path quote, AMM/order-book depth, slippage, and network fee;
- an RLUSD settlement executor.

No unavailable value receives a favourable placeholder.

## Ranking and Execution Consistency

Only eligible plans are ranked. The direct route uses 35% availability, 15% live FX, 20% historical success, 10% historical latency, and 20% corridor/compliance evidence. Mandatory evidence gates apply before scoring.

The approved Route Plan ID/version is persisted before funding. The execution engine reads the provider ID from that plan. Any replacement must be recorded as failed plan -> reason -> replacement plan -> approved -> executing. Both Track experiences display those events.

## Validation Results

| Check | Result |
|---|---|
| TypeScript | PASS |
| ESLint | PASS, zero errors; existing warnings remain |
| Canonical route validation | PASS |
| Live FX, no route fallback FX | PASS |
| Repeat route recalculation | PASS; new IDs generated |
| Candidate persistence and transition events | PASS; 2 plans and 2 events |
| Anonymous Route Plan read isolation | PASS |
| Supabase migration parity | PASS; local and remote `20260806000500` |
| Tables/indexes | PASS; `route_plans` 5 indexes, `route_plan_events` 2 indexes |
| Expo public config | PASS |
| Android Expo export | PASS with existing `@noble/hashes` warning |
| Pixel 9 Corporate preview | PASS; UNAVAILABLE, SANDBOX, LIVE, and ESTIMATED visible |
| Pixel 9 runtime log | PASS after nested-list remediation |
| Yapily -> Airwallex | BLOCKED honestly; Yapily payment initiation unavailable |
| Yapily -> XRPL -> Airwallex | BLOCKED honestly; Yapily and RLUSD path evidence unavailable |
| Banking only | BLOCKED honestly at genuine funding capability |
| Failover execution | NOT EXECUTED; no second eligible route exists |
| Corporate/Consumer shared engine | PASS by implementation and build; terminal payment not run because eligibility failed |

Latest validation persistence transfer: `d8588802-334d-43d8-9268-04083fd6c256` (two QA plans closed as `SUPERSEDED`; anonymous read blocked).

## Database and Rollback

Migration: `supabase/migrations/20260806000500_canonical_route_intelligence.sql`.

It creates `route_plans` and `route_plan_events`, indexes status/transfer access, enforces one approved plan per transfer/version, enables RLS, and grants only owner-scoped authenticated access. It is additive. Rollback drops events first, then plans.

## Remaining Risks

1. Route calculation and approval are centralised but still run in the authenticated application, not a trusted server-signed decision service.
2. Yapily's current flow creates synthetic sandbox payment/consent references after a real institution query; it must not be presented as genuine payment initiation.
3. Airwallex corridor support is configured database evidence and validated at payout time, not a complete pre-transfer quote.
4. XRPL currently executes testnet XRP in legacy flows, not RLUSD.
5. No eligible alternate route exists, so genuine failover cannot yet be certified.
6. Existing legacy transfers remain supported for recovery and do not contain Route Plan V1.

## Recommendations Before Investor Demonstrations

1. Implement Yapily payment authorisation redirect, consent callback, payment creation, and status retrieval using an institution that returns usable sandbox capability.
2. Move Route Plan generation/approval to a server-side function and sign or hash the approved plan for execution verification.
3. Add a provider preflight/quote contract for fees, spread, ETA, limits, and beneficiary/corridor validation.
4. Implement real RLUSD trustline/path/depth/slippage/fee evidence and an RLUSD executor before enabling that candidate.
5. Add a second evidence-backed payout route and certify persisted failover.
6. Demonstrate the current UI as an evidence transparency control, not as production-ready dynamic optimisation.

## Release Decision

No OTA should be described as production-ready. The code is suitable for a preview of the canonical evidence model, but new payment approval is intentionally blocked until the first leg is genuine.

## Files Changed

- `app/consumer/send.tsx`
- `app/consumer/track.tsx`
- `app/index.tsx`
- `app/quote.tsx`
- `app/routes.tsx`
- `app/send.tsx`
- `app/track.tsx`
- `governance/automation/scripts/validateCanonicalRouteIntelligence.ts`
- `governance/cdlo/CDLO_OPERATIONS.md`
- `governance/founder-briefings/FOUNDER_BRIEFING_INDEX.md`
- `governance/founder-briefings/briefings/FOUNDER_BRIEFING_ROUTE_INTELLIGENCE_TRANSFORMATION_2026-08-06.md`
- `governance/governance-core/DECISION_REGISTER.md`
- `governance/governance-core/GOVERNANCE_INDEX.md`
- `governance/governance-core/ROUTE_INTELLIGENCE_ARCHITECTURE_V1.md`
- `governance/implementation-log/IMPLEMENTATION_LOG.md`
- `governance/reports/ROUTE_INTELLIGENCE_TRANSFORMATION_IMPLEMENTATION_REPORT.md`
- `package.json`
- `src/components/consumer/ConsumerShell.tsx`
- `src/components/operations-v2/DataProvenanceBadge.tsx`
- `src/components/routes/RoutePlanComparison.tsx`
- `src/components/routes/RoutePlanHistory.tsx`
- `src/hooks/useCanonicalRouteQuotes.ts`
- `src/lib/aiRouteIntelligence.ts` (removed)
- `src/lib/fxFeed.ts`
- `src/lib/providerIntegrationFramework.ts` (removed)
- `src/lib/settlementOrchestrator.ts` (removed)
- `src/lib/supabase.ts`
- `src/lib/supabaseStorage.ts`
- `src/services/execution/executionEngine.ts`
- `src/services/intelligence/contextBuilder.ts`
- `src/services/intelligence/contextTypes.ts`
- `src/services/payout/payoutAdapter.ts`
- `src/services/routeIntelligenceService.ts`
- `src/services/routePlanService.ts`
- `src/state/TransferContext.tsx`
- `src/types/routePlan.ts`
- `src/types/transfer.ts`
- `src/utils/operationsCommandCentre.ts`
- `supabase/migrations/20260806000500_canonical_route_intelligence.sql`
