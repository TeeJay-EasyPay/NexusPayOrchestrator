# Testing Director Certification Plan - Sprint 005

## Purpose

Define the certification strategy and evidence plan for Sprint 005 execution continuity remediation.

## Scope Boundary

This document is planning only.

No implementation activity is approved by this plan.

## Certification Goal

Re-certify execution continuity reliability with reproducible evidence and deterministic terminal-state outcomes before any corridor confidence upgrades.

## Current Baseline

- PASS: GBP -> PHP, GBP -> MYR
- FAIL: GBP -> KWD
- UNKNOWN: AED, SAR, QAR, BHD, OMR, SGD, THB, IDR, VND

## Certification Strategy

### Phase 1: Sentinel Corridor Re-Certification

Sentinel corridor:
- GBP -> KWD

Objective:
Validate that remediation design resolves non-terminal continuity behavior under controlled interruption/resume scenarios.

### Phase 2: Expanded Corridor Sequence

Execute re-certification for each currently UNKNOWN corridor only after sentinel acceptance criteria are met.

Proposed order:
1. AED
2. SAR
3. QAR
4. BHD
5. OMR
6. SGD
7. THB
8. IDR
9. VND

## Test Scenario Matrix

Required scenario groups per corridor:
1. Nominal end-to-end completion.
2. Pre-payout interruption with deterministic resume.
3. Mid-lifecycle callback delay/reorder conditions.
4. Duplicate event and retry idempotency behavior.
5. Terminal failure path with accurate reason classification.

## Evidence Requirements

Each certification run must include:
- Correlation ID and run metadata.
- Full lifecycle checkpoint sequence.
- Resume decision and terminal-state proof.
- Provider interaction timeline.
- Final PASS/FAIL decision rationale.

Evidence quality rules:
- Reproducible execution conditions.
- Time-synchronized logs.
- No missing terminal-state records.

## PASS/FAIL Policy

PASS:
- Deterministic terminal-state resolution proven.
- Resume behavior matches CTO design contract.
- No duplicate payout behavior.

FAIL:
- Any non-terminal persisted execution state.
- Ambiguous or conflicting terminal-state outcomes.
- Missing or non-reproducible evidence.

UNKNOWN:
- Only permitted when planned run is not yet executed.
- Not permitted when evidence is incomplete after execution; that case is FAIL due evidence quality breach.

## Entry and Exit Criteria

Entry criteria:
1. CTO design package approved for testing.
2. Evidence trace schema finalized.
3. Test harness and telemetry capture readiness confirmed.

Exit criteria:
1. Sentinel corridor final classification complete.
2. All UNKNOWN corridors reclassified PASS or FAIL.
3. Certification report submitted with complete evidence appendix.

## Risks and Controls

High risk:
- Flaky runtime environments reducing reproducibility.
Control:
- Fixed scenario seeds and controlled execution windows.

Medium risk:
- Evidence drift across corridor runs.
Control:
- Single evidence template and checkpoint completeness checklist.

## Reporting Cadence

- Daily technical checkpoint to CTO and Chief Orchestrator.
- Weekly founder checkpoint summary through governance action workflow.

## Deliverables

1. Sentinel certification report pack (GBP -> KWD).
2. Expanded corridor re-certification matrix with outcomes.
3. Final Sprint 005 certification summary and recommendations.

## References

- [CTO_REMEDIATION_DESIGN_SPRINT_005.md](CTO_REMEDIATION_DESIGN_SPRINT_005.md)
- [CORRIDOR_CERTIFICATION_REPORT.md](CORRIDOR_CERTIFICATION_REPORT.md)
- [../founder-briefings/FOUNDER_ACTION_REGISTER.md](../founder-briefings/FOUNDER_ACTION_REGISTER.md)
- [../sprint-archives/SPRINT_005_EXECUTION_CONTINUITY_REMEDIATION_AND_RECERTIFICATION.md](../sprint-archives/SPRINT_005_EXECUTION_CONTINUITY_REMEDIATION_AND_RECERTIFICATION.md)
