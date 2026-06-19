# Health Consistency Remediation Report

Date: 2026-06-19

# Executive Summary

Completed Health Consistency Remediation Phases 1-3 for Home Dashboard, Operations Command Centre, and Nexus AI summary language.

The platform now has a shared health calculation service at `src/services/platformHealthService.ts`. Home and OCC consume the same health status model for Platform, Network, Liquidity, AI, Market, and Settlement Health. Misleading Home badges such as `Markets Open`, `Liquidity Strong`, and `Network Healthy` were removed and replaced with provenance-aware status cards. OCC no longer treats diagnostic mode, disabled AI, unavailable AI output, or missing telemetry as confirmed `OFFLINE` outages.

# Files Changed

- `app/index.tsx`
- `app/live-intelligence-feeds.tsx`
- `app/routes.tsx`
- `src/components/intelligence/AICorridorIntelligenceCard.tsx`
- `src/components/navigation/AppDropdownMenu.tsx`
- `src/components/operations-v2/DataProvenanceBadge.tsx`
- `src/components/operations-v2/NexusAISummaryCard.tsx`
- `src/components/operations-v2/OperationalHealthCard.tsx`
- `src/components/operations-v2/TreasuryLiquidityCard.tsx`
- `src/components/operations/OperationsCommandCentre.tsx`
- `src/lib/aiRouteIntelligence.ts`
- `src/lib/corridorHealth.ts`
- `src/lib/routeOperationalState.ts`
- `src/lib/settlementOrchestrator.ts`
- `src/lib/treasuryIntelligence.ts`
- `src/services/intelligence/executiveInsightService.ts`
- `src/services/liveIntelligenceFeedService.ts`
- `src/services/nexusAIService.ts`
- `src/services/platformHealthService.ts`
- `src/utils/operationsCommandCentre.ts`
- `governance/reports/OCC_HOME_CONSISTENCY_AUDIT.md`
- `governance/reports/HEALTH_CONSISTENCY_REMEDIATION_REPORT.md`

# Health Model Design

New service:

`src/services/platformHealthService.ts`

Supported domains:
- Platform Health
- Network Health
- Liquidity Health
- AI Health
- Market Health
- Settlement Health

Each health object contains:
- `status`
- `provenance`
- `confidence`
- `lastUpdated`
- `reason`
- `source`

Supported statuses:
- `HEALTHY`
- `DEGRADED`
- `OFFLINE`
- `NO_DATA`
- `DIAGNOSTIC`
- `DISABLED`

Supported provenance:
- `LIVE`
- `DERIVED`
- `SIMULATED`
- `FALLBACK`
- `NO_DATA`

Important rule change:
`OFFLINE` is now reserved for confirmed outages. Missing telemetry, disabled services, diagnostic realtime state, and unavailable AI output are represented as `NO_DATA`, `DISABLED`, `DIAGNOSTIC`, or `FALLBACK`.

# Phase 1 - Health Presentation Cleanup

Completed:
- Removed hardcoded Home status badges:
  - `Markets Open`
  - `Liquidity Strong`
  - `Network Healthy`
- Replaced Home health badges with shared health status/provenance indicators.
- Replaced static Home `Treasury Capacity 91%`, `Liquidity Coverage 98%`, and `XRPL Network Health 99.98%` with shared health statuses.
- Expanded provenance badge support to include:
  - `NO_DATA`
  - `DIAGNOSTIC`
  - `DISABLED`
- Updated OCC operational health to count and display:
  - Healthy
  - Degraded
  - No Data
  - Diagnostic / Disabled
- Removed misleading red/offline styling for diagnostic and no-data states.

# Phase 2 - Single Source Of Truth Health Engine

Completed:
- Created `platformHealthService`.
- OCC `buildOperationsInsights()` now builds service health from `buildPlatformHealthSnapshot()`.
- Home loads `loadPlatformHealthSnapshot()` and displays the same health domains.
- Home Nexus AI telemetry now uses shared health statuses and provenance instead of independent optimistic calculations.
- OCC Mission Control chips now include provenance detail from the shared health snapshot.

Current domain behavior:

| Domain | Source | Current Logic | Offline Policy |
| --- | --- | --- | --- |
| Platform Health | Realtime status and execution sessions | `Live` -> `HEALTHY`; diagnostic realtime -> `DIAGNOSTIC` | Does not report offline for diagnostic mode |
| Network Health | `route_operational_events` | No events -> `NO_DATA`; warnings/critical events -> `DEGRADED`; otherwise `HEALTHY` | Simulated alerts do not create confirmed offline state |
| Liquidity Health | `treasury_liquidity_snapshots` profile-derived records | No snapshots -> `NO_DATA`; high/critical pressure -> `DEGRADED`; otherwise `HEALTHY` | Simulated liquidity pressure does not create confirmed offline state |
| AI Health | AI setting and summary state | Disabled -> `DISABLED`; loading -> `DEGRADED`; summary -> `HEALTHY`; absent summary -> `NO_DATA` | Missing summary is not offline |
| Market Health | Fixed market-window feed | Feed present + open market -> `HEALTHY`; no open market or no feed -> `NO_DATA` | Closed fixed windows are not degradation |
| Settlement Health | `execution_sessions` | Terminal sessions absent -> `NO_DATA`; failures greater than completions -> `DEGRADED`; otherwise `HEALTHY` | No terminal sessions are not offline |

# Phase 3 - Terminology Changes

NexusPay is now presented as an orchestration platform rather than a treasury business in the remediated user-facing surfaces.

Terminology replacements applied:

| Previous | Replacement |
| --- | --- |
| Treasury Capacity | Corridor Liquidity Capacity |
| Treasury & Liquidity | Corridor Liquidity |
| Treasury liquidity intelligence | Corridor liquidity intelligence |
| Treasury intelligence pending | Corridor liquidity intelligence pending |
| Treasury | Route Capacity |
| Treasury pressure | Corridor liquidity pressure |
| Treasury utilisation | Route capacity utilisation |
| Treasury preferred | Route preferred |
| Treasury approved | Route approved |
| Treasury watch | Corridor liquidity watch |
| Treasury constrained | Route constrained |
| Treasury liquidity score | Route capacity score |
| treasury monitoring | route capacity monitoring |
| treasury controls | route capacity controls |

Internal schema and type names such as `treasury_liquidity_snapshots`, `treasuryScore`, and `TreasuryLiquiditySnapshotRow` remain in place because they are existing persisted contracts. They should be migrated in a later schema-safe refactor.

# Remaining Simulated Elements

- `treasury_liquidity_snapshots` still contain profile-derived corridor liquidity records.
- Route operational events may still have `status: "SIMULATED"`.
- `getLiveTreasuryFeeds()` still returns static corridor feed rows. They are not live operational liquidity data.
- Provider sandbox remains mock by design.
- Home payment methods still come from `mockPaymentMethods`.
- Some route intelligence scores still originate from static corridor/provider profiles.

These are now surfaced with `SIMULATED`, `MOCK`, `FALLBACK`, or `NO_DATA` provenance where they affect Home/OCC health presentation.

# Remaining Live Elements

- External FX feed calls via Frankfurter and configured fallback providers.
- Supabase reads from:
  - `execution_sessions`
  - `route_operational_events`
  - `treasury_liquidity_snapshots`
  - `transfers`
- Nexus AI Edge Function invocation path for Home summaries, with fallback handling when unavailable.

# Validation

Completed:
- `npx tsc --noEmit`: passed.
- `npx eslint .`: passed with zero errors.

Known lint warnings remain in unrelated legacy files:
- Existing unused variables in legacy Operations Command Centre component.
- Existing React hook dependency warnings.
- Existing array-style warnings in older service/type files.
- Existing import ordering warnings in mock provider index.

# Recommendations

Immediate:
- Keep all health presentation routed through `platformHealthService`.
- Do not add new health labels directly inside screens.
- Treat `OFFLINE` as confirmed outage only.

Near term:
- Persist `PlatformHealthSnapshot` records for auditability and freshness tracking.
- Replace static `getLiveTreasuryFeeds()` rows with a renamed live/simulated corridor liquidity feed service.
- Add source badges to remaining non-OCC intelligence screens that display simulated route capacity.

Strategic:
- Rename internal treasury schema/type contracts once a migration plan is ready.
- Integrate real provider health checks, settlement rail telemetry, liquidity network capacity, banking calendars, and AI service health checks.
- Add automated tests asserting that Home and OCC display the same shared health domains.
