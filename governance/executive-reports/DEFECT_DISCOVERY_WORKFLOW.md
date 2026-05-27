# Defect Discovery Workflow

## Purpose

Define repeatable failure-to-defect workflow for automated QA and corridor certification runs.

## Workflow

Test Run
-> Failure Detection
-> Evidence Collection
-> Defect Creation
-> Severity Assignment
-> Reporting

## Detailed Flow

### 1. Test Run

1. Execute QA test definition from the Sprint 007A catalogue.
2. Capture run metadata: test ID, corridor, amount, device, run ID.
3. Emit checkpoint-level telemetry.

### 2. Failure Detection

1. Evaluate mandatory pass/fail criteria from QA definitions.
2. Detect non-terminal lifecycle states, hangs, or cross-screen mismatch.
3. Classify as FAIL or WARNING.

### 3. Evidence Collection

1. Generate evidence pack using approved architecture.
2. Ensure screenshots and logs include failure context.
3. Compute duration and checkpoint progression metrics.

### 4. Defect Creation

1. Attempt known-defect signature match:
- DEF-001 corridor hang signatures
- DEF-002 history/track mismatch signatures
- DEF-003 background/resume instability signatures
- DEF-004 synchronization inconsistency signatures
2. If matched:
- append observation to existing defect record.
3. If unmatched:
- create defect candidate with full evidence references.

## Defect Register Integration

Integration target:
- src/testing/defectRegister.ts

Operational behavior:
1. Use registerDefectObservation for matched existing defects.
2. Use upsertDefectRecord for validated new defects.
3. Keep firstSeen and status semantics aligned with current register model.

## Severity Assignment Rules

1. CRITICAL:
- execution hang, non-terminal completion, severe app instability, or blocked transfer completion.
2. HIGH:
- major cross-screen inconsistency or repeated lifecycle integrity breach.
3. MEDIUM:
- recoverable but significant quality degradation with operational impact.
4. LOW:
- minor issue with no transfer integrity impact.

## Reporting Outputs

For each failed run:

1. Defect discovery entry:
- run ID
- test ID
- classification
- linked evidence pack
- defect ID or candidate ID
2. Aggregated defect summary:
- new defects
- reopened defects
- recurring defects

## Governance Controls

1. No defect is published without evidence-pack linkage.
2. Severity changes require rationale recorded in report.
3. Weekly defect trend is included in founder and executive reporting outputs.
