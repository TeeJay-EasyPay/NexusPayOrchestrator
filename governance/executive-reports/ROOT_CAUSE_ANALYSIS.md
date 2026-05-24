# ROOT_CAUSE_ANALYSIS

## Executive Summary

CTO analysis reviewed [governance/CORRIDOR_VALIDATION_REPORT.md](../executive-reports/CORRIDOR_VALIDATION_REPORT.md), corridor and payout mappings, execution state-machine design, and track-screen execution triggering.

Most corridor mappings and payout simulation paths are structurally valid. The likely technical failure mode for the observed GBP -> KWD in-motion stall is runtime execution continuity loss before payout execution begins, resulting in a persisted non-terminal state that is not deterministically reconciled to a terminal state.

## Findings

### Finding 1: Corridor mapping does not show a deterministic KWD-specific hard block
Observation:
- KWD is explicitly present in corridor catalog in [src/data/corridors.ts](../../src/data/corridors.ts).
- KWD is explicitly supported in payout directory in [src/services/payout/payoutPartnerDirectory.ts](../../src/services/payout/payoutPartnerDirectory.ts).
- Payout selection logic in [src/services/payout/payoutRoutingEngine.ts](../../src/services/payout/payoutRoutingEngine.ts) can select a supported partner or fallback.
- Adapter fallback in [src/services/payout/payoutAdapter.ts](../../src/services/payout/payoutAdapter.ts) executes mock payout if real provider path is unavailable.

Impact:
A static mapping defect alone is unlikely to explain observed payout-not-started for KWD.

Recommendation:
Focus root cause on runtime execution-state progression and recovery behavior, not only mapping tables.

Decision Required:
Approve root-cause scope shift toward execution continuity and state reconciliation.

### Finding 2: Execution can remain non-terminal if interrupted before payout step completes
Observation:
Execution engine in [src/services/execution/executionEngine.ts](../../src/services/execution/executionEngine.ts) progresses through route authorization and optional bridge settlement before payout execution. If runtime is interrupted mid-lifecycle, persisted session can reflect non-terminal state with payout status NOT_STARTED.

Impact:
Operational view can show perpetual in-motion transfer until an explicit successful continuation run reaches COMPLETED or FAILED terminal state.

Recommendation:
Treat interrupted lifecycle continuity as primary root-cause candidate.

Decision Required:
Approve this as primary technical hypothesis for remediation planning.

### Finding 3: Recovery path exists in engine but is not explicitly consumed by track execution call
Observation:
- Engine supports resume semantics via optional resume snapshot input in [src/services/execution/executionEngine.ts](../../src/services/execution/executionEngine.ts).
- Track execution call in [app/track.tsx](../../app/track.tsx) invokes runTransferExecution without supplying resumeFromSnapshot.

Impact:
Recovery is best-effort via fresh execution invocation rather than explicit checkpoint-driven resume, increasing risk of non-deterministic behavior after interruption.

Recommendation:
Prioritize deterministic resume strategy in remediation options.

Decision Required:
Approve deterministic resume design as remediation candidate.

### Finding 4: Runtime dependency concentration before payout step increases stall exposure
Observation:
Bridge settlement and early-state telemetry persistence occur before payout initiation in [src/services/execution/executionEngine.ts](../../src/services/execution/executionEngine.ts), with track UI defaulting to in-motion while no terminal state exists in [app/track.tsx](../../app/track.tsx).

Impact:
Users can observe prolonged in-motion + payout-not-started if progression halts before payout execution step is reached.

Recommendation:
Add stronger guardrails around pre-payout timeout/failure-to-terminal transitions.

Decision Required:
Approve pre-payout guardrail strengthening for next sprint.

## Evidence

Primary artifacts reviewed:
- [governance/CORRIDOR_VALIDATION_REPORT.md](../executive-reports/CORRIDOR_VALIDATION_REPORT.md)
- [src/data/corridors.ts](../../src/data/corridors.ts)
- [src/services/payout/payoutPartnerDirectory.ts](../../src/services/payout/payoutPartnerDirectory.ts)
- [src/services/payout/payoutRoutingEngine.ts](../../src/services/payout/payoutRoutingEngine.ts)
- [src/services/payout/payoutAdapter.ts](../../src/services/payout/payoutAdapter.ts)
- [src/services/payout/mockPayoutProvider.ts](../../src/services/payout/mockPayoutProvider.ts)
- [src/services/execution/executionEngine.ts](../../src/services/execution/executionEngine.ts)
- [src/services/execution/executionPersistenceService.ts](../../src/services/execution/executionPersistenceService.ts)
- [app/track.tsx](../../app/track.tsx)
- [src/lib/xrplSettlement.ts](../../src/lib/xrplSettlement.ts)

Reference context:
- [docs/PROJECT_MAP.md](../../docs/PROJECT_MAP.md)
- [docs/BUILD_OPERATIONS_INSIGHTS_AUDIT.md](../../docs/BUILD_OPERATIONS_INSIGHTS_AUDIT.md)
- [docs/corridor-intelligence-expansion-report.md](../../docs/corridor-intelligence-expansion-report.md)

## Components Affected

- Execution state machine orchestration: [src/services/execution/executionEngine.ts](../../src/services/execution/executionEngine.ts)
- Execution persistence/recovery surface: [src/services/execution/executionPersistenceService.ts](../../src/services/execution/executionPersistenceService.ts)
- Track-screen runtime trigger and session hydration behavior: [app/track.tsx](../../app/track.tsx)
- Payout routing and adapter layer (secondary review): [src/services/payout/payoutRoutingEngine.ts](../../src/services/payout/payoutRoutingEngine.ts), [src/services/payout/payoutAdapter.ts](../../src/services/payout/payoutAdapter.ts)

## Affected Files

Primary:
- [app/track.tsx](../../app/track.tsx)
- [src/services/execution/executionEngine.ts](../../src/services/execution/executionEngine.ts)
- [src/services/execution/executionPersistenceService.ts](../../src/services/execution/executionPersistenceService.ts)

Secondary:
- [src/services/payout/payoutAdapter.ts](../../src/services/payout/payoutAdapter.ts)
- [src/services/payout/payoutRoutingEngine.ts](../../src/services/payout/payoutRoutingEngine.ts)
- [src/services/payout/payoutPartnerDirectory.ts](../../src/services/payout/payoutPartnerDirectory.ts)

## Technical Risk Assessment

- High: Non-terminal execution states can accumulate and degrade operational trust.
- Medium: Corridor-specific confidence degrades when observed behavior diverges from mapped support.
- Medium: Recovery ambiguity increases likelihood of repeated user retries and duplicate perceived failures.

## Remediation Options (No Implementation)

Option A: Deterministic resume-first execution strategy
- Always resume from persisted snapshot when non-terminal session exists.
- Pros: Strong continuity and reduced stall probability.
- Cons: Additional state-reconciliation complexity.

Option B: Pre-payout terminal guardrail enforcement
- Enforce bounded retry/timeout transition to explicit FAILED terminal state if payout step cannot begin within policy window.
- Pros: Eliminates indefinite in-motion ambiguity.
- Cons: May increase surfaced failures that require retry UX.

Option C: Corridor-level execution certification gate
- Require automated corridor completion checks before corridor status is considered production-ready.
- Pros: Prevents confidence gaps after corridor expansion.
- Cons: Requires test harness investment.

## Recommendations

1. Prioritize Option A and Option B as paired remediation path for next sprint.
2. Add Option C as governance quality gate for future corridor rollouts.
3. Revalidate GBP -> KWD first as sentinel corridor for recovery/terminal-state reliability.

## Risks

- High: Continued unresolved stalls may impact production reliability perception.
- Medium: Operational dashboards may overstate in-motion backlog if sessions do not transition terminally.
- Medium: Expansion velocity risk if corridor rollout lacks execution certification.

## Next Actions

1. Submit this analysis to Chief Orchestrator for executive action planning.
2. Define remediation sprint scope focused on execution continuity and terminal-state certainty.
3. Require Testing Director re-validation plan tied to remediation acceptance criteria.
