# OCC Phase 1 and Phase 2 Remediation

Date: 2026-06-19

## 1. KPI Fixes Completed

### Success Rate KPI

Status: Completed.

The OCC now loads recent execution sessions including terminal states from `execution_sessions`, instead of relying only on recoverable non-terminal sessions. Success Rate is calculated from genuine terminal executions:

```text
COMPLETED / (COMPLETED + FAILED)
```

If no terminal executions exist in the current 24-hour window, the KPI displays:

```text
Insufficient data
```

This prevents the previous misleading `0.00%` display when the underlying sample did not contain terminal execution data.

### Settlement Time KPI

Status: Completed.

Settlement Time now uses completed execution sessions from the recent execution-session sample. It calculates duration from genuine persisted timestamps:

```text
average(updated_at - created_at) for COMPLETED execution_sessions
```

If no completed execution sessions exist in the current 24-hour window, the KPI displays:

```text
Insufficient data
```

This removes the previous misleading fallback display.

## 2. Provenance Badges Added

Status: Completed.

Added reusable component:

```text
src/components/operations-v2/DataProvenanceBadge.tsx
```

Supported classifications:

- LIVE
- DERIVED
- SIMULATED
- MOCK
- FALLBACK

Current OCC mappings:

| OCC Area | Badge |
| --- | --- |
| QA Test Centre | LIVE |
| FX Feed Status | LIVE |
| Mission Control Status | DERIVED |
| Transfers 24h | DERIVED |
| Success Rate | DERIVED |
| Settlement Time | DERIVED |
| Active Transfers / Global Flow | DERIVED |
| Operational Health | DERIVED |
| Treasury Capacity | SIMULATED |
| Corridor Health | SIMULATED |
| Treasury & Liquidity | SIMULATED |
| Active Alerts | SIMULATED |
| Provider Sandbox | MOCK |
| Nexus AI fallback summary | FALLBACK |

## 3. Realtime Status Outcome

Decision: Option B - clearly label disabled realtime status.

Realtime subscription remains disabled because the existing code explicitly marks it as a diagnostic crash path. Rather than restoring a potentially unstable subscription during this provenance-focused remediation, the OCC now shows:

```text
Diagnostic Mode
Mission Control - Realtime Disabled
```

This prevents founders or operators from assuming realtime monitoring is active.

## 4. Components Modified

- `src/components/operations-v2/DataProvenanceBadge.tsx`
- `src/components/operations-v2/OperationsHeader.tsx`
- `src/components/operations-v2/MissionControlCard.tsx`
- `src/components/operations-v2/KpiGrid.tsx`
- `src/components/operations-v2/QATestCentreCard.tsx`
- `src/components/operations-v2/ProviderSandboxCard.tsx`
- `src/components/operations-v2/CorridorHealthCard.tsx`
- `src/components/operations-v2/TreasuryLiquidityCard.tsx`
- `src/components/operations-v2/ActiveAlertsCard.tsx`
- `src/components/operations-v2/GlobalFlowCard.tsx`
- `src/components/operations-v2/OperationalHealthCard.tsx`
- `src/components/operations-v2/NexusAISummaryCard.tsx`

## 5. Services Modified

- `src/services/execution/executionPersistenceService.ts`
  - Added `loadRecentExecutionSessions()` so OCC KPIs can access terminal executions.

- `src/services/execution/executionRealtimeService.ts`
  - Type-safe realtime helper adjustment for app TypeScript validation. Runtime behavior unchanged.

- `src/services/liveIntelligenceFeedService.ts`
  - Added compatibility service export used by existing AI context builder.

- `src/lib/simulatedRLusdWallet.ts`
  - Added compatibility balance export used by existing AI context builder.

- `src/lib/treasuryIntelligence.ts`
  - Added compatibility treasury signal export used by existing AI context builder.

- `src/services/intelligence/contextBuilder.ts`
  - Corrected type mismatches needed for validation.

## 6. Screens Modified

- `app/operations-v2.tsx`
  - Added founder visibility toggle:

```text
Show Data Sources
```

Default: ON.

When enabled, provenance badges are visible. When disabled, badges are hidden and the OCC keeps its normal layout.

## 7. Validation

Validation completed:

```text
npx tsc --noEmit
```

Result: PASS.

```text
npx eslint .
```

Result: PASS with warnings only, zero errors.

Focused lint validation on modified files:

```text
npx eslint app\operations-v2.tsx src\components\operations-v2\*.tsx src\hooks\useOperationsCommandCentre.ts src\utils\operationsCommandCentre.ts
```

Result: PASS.

Notes:

- Full lint warnings remain in unrelated existing files.
- Active OCC layout was not redesigned.
- Existing cards, ordering, metrics, and actions were preserved.
- The provenance layer is removable from view through the founder toggle.

## 8. Founder Testing Instructions

1. Open the corporate Operations Command Centre V2.
2. Confirm the header shows `Diagnostic Mode` and `Mission Control - Realtime Disabled`.
3. Confirm `Show Data Sources` is ON by default.
4. Confirm badges appear:
   - `DERIVED` on transfer and execution-derived KPIs.
   - `SIMULATED` on treasury, corridor health, and alert intelligence.
   - `LIVE` on QA Test Centre and FX Feed Status.
   - `MOCK` on Provider Sandbox.
   - `FALLBACK` on Nexus AI Mission Summary when local fallback is used.
5. Toggle `Show Data Sources` OFF and confirm the badges disappear without changing the OCC layout.
6. If there are no terminal execution sessions in the latest 24-hour window, confirm Success Rate displays `Insufficient data`.
7. If there are no completed execution sessions in the latest 24-hour window, confirm Settlement Time displays `Insufficient data`.
8. Run a transfer to generate execution-session telemetry, then refresh OCC and confirm terminal-session KPIs update from persisted execution data after completion/failure.
