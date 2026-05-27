# Automated Corridor Certification Design

## Purpose

Define full automated certification coverage for required corridors and amounts with lifecycle and cross-screen validation rules.

## Certification Scope

### Corridors

1. GBP->SAR
2. GBP->KWD
3. GBP->AED
4. GBP->PHP
5. GBP->MYR
6. GBP->INR

### Amounts

1. GBP 1
2. GBP 100
3. GBP 500
4. GBP 5000

### Total Corridor Tests

24 corridor certification tests (6 corridors x 4 amounts).

## Mandatory Validation Set

Each certification test validates:

1. Route generation
2. Transfer initiation
3. Execution progression
4. Settlement completion
5. Payout completion
6. Transaction history update
7. Track screen completion
8. Cross-screen consistency

## Test Composition Model

For each corridor/amount combination:

1. Execute base transfer orchestration flow.
2. Capture lifecycle checkpoints.
3. Validate history and track convergence.
4. Record duration, evidence, and result classification.

## Certification Matrix

| Corridor | Amount | Test ID Pattern | Critical Checks |
|---|---|---|---|
| GBP->SAR | 1 | QA-CORRIDOR-GBP-SAR-0001 | Hang detection, lifecycle completion, history/track consistency |
| GBP->SAR | 100 | QA-CORRIDOR-GBP-SAR-0100 | Hang detection, lifecycle completion, history/track consistency |
| GBP->SAR | 500 | QA-CORRIDOR-GBP-SAR-0500 | Hang detection, lifecycle completion, history/track consistency |
| GBP->SAR | 5000 | QA-CORRIDOR-GBP-SAR-5000 | Hang detection, lifecycle completion, history/track consistency |
| GBP->KWD | 1 | QA-CORRIDOR-GBP-KWD-0001 | Lifecycle completion, continuity stability, history/track consistency |
| GBP->KWD | 100 | QA-CORRIDOR-GBP-KWD-0100 | Lifecycle completion, continuity stability, history/track consistency |
| GBP->KWD | 500 | QA-CORRIDOR-GBP-KWD-0500 | Lifecycle completion, continuity stability, history/track consistency |
| GBP->KWD | 5000 | QA-CORRIDOR-GBP-KWD-5000 | Lifecycle completion, continuity stability, history/track consistency |
| GBP->AED | 1 | QA-CORRIDOR-GBP-AED-0001 | Route validity and full completion checks |
| GBP->AED | 100 | QA-CORRIDOR-GBP-AED-0100 | Route validity and full completion checks |
| GBP->AED | 500 | QA-CORRIDOR-GBP-AED-0500 | Route validity and full completion checks |
| GBP->AED | 5000 | QA-CORRIDOR-GBP-AED-5000 | Route validity and full completion checks |
| GBP->PHP | 1 | QA-CORRIDOR-GBP-PHP-0001 | Baseline consistency and full lifecycle checks |
| GBP->PHP | 100 | QA-CORRIDOR-GBP-PHP-0100 | Baseline consistency and full lifecycle checks |
| GBP->PHP | 500 | QA-CORRIDOR-GBP-PHP-0500 | Baseline consistency and full lifecycle checks |
| GBP->PHP | 5000 | QA-CORRIDOR-GBP-PHP-5000 | Baseline consistency and full lifecycle checks |
| GBP->MYR | 1 | QA-CORRIDOR-GBP-MYR-0001 | Baseline consistency and full lifecycle checks |
| GBP->MYR | 100 | QA-CORRIDOR-GBP-MYR-0100 | Baseline consistency and full lifecycle checks |
| GBP->MYR | 500 | QA-CORRIDOR-GBP-MYR-0500 | Baseline consistency and full lifecycle checks |
| GBP->MYR | 5000 | QA-CORRIDOR-GBP-MYR-5000 | Baseline consistency and full lifecycle checks |
| GBP->INR | 1 | QA-CORRIDOR-GBP-INR-0001 | Route validity and full completion checks |
| GBP->INR | 100 | QA-CORRIDOR-GBP-INR-0100 | Route validity and full completion checks |
| GBP->INR | 500 | QA-CORRIDOR-GBP-INR-0500 | Route validity and full completion checks |
| GBP->INR | 5000 | QA-CORRIDOR-GBP-INR-5000 | Route validity and full completion checks |

## Classification Rules

1. PASS:
- all mandatory validations are satisfied.
2. WARNING:
- transfer succeeds but non-critical divergence is observed (for example recoverable timing drift).
3. FAIL:
- any mandatory validation fails or transfer hangs/does not reach terminal completion.

## Cross-Screen Consistency Rules

Cross-screen consistency is valid when:

1. history status and track status both indicate completed terminal state.
2. amount and corridor metadata align between route, history, and track views.
3. lifecycle progression ordering is consistent with expected milestone sequence.

## Result Artefacts

Each test run emits:

1. Certification decision (PASS/WARNING/FAIL).
2. Evidence pack reference.
3. Defect linkage or defect candidate if failed.
4. Duration and checkpoint timing metrics.

## Integration with Existing QA Foundation

1. Test IDs and pass/fail rules map to src/testing/qaTestDefinitions.ts.
2. Execution outcomes map to src/testing/qaExecutionLogger.ts.
3. Failure and observations map to src/testing/defectRegister.ts.
