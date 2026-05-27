# NexusPay QA Test Plan

## Purpose

This QA framework standardizes NexusPay validation for corridor reliability, execution lifecycle integrity, background/resume stability, and cross-screen state synchronization in Expo Android development builds and emulator environments.

## Test Strategy

- Use structured test definitions from `src/testing/qaTestDefinitions.ts` to enforce repeatable scenarios.
- Prioritize high-risk and critical flows: Saudi corridor execution stability, lifecycle completion, and UI synchronization.
- Execute corridor tests across fixed transfer amounts (`GBP 1`, `GBP 100`, `GBP 500`, `GBP 5000`) for deterministic comparisons.
- Capture every run in the QA execution logger for trend visibility and repeatability.
- Use seeded and continuously updated defect register as source of truth for defect lifecycle.

## Test Execution Process

1. Select test definitions from the QA catalog.
2. Execute flow in development build or Android emulator.
3. Record result via `logQAExecution` or specialized runners:
   - `executeBackgroundResumeStabilityTest`
   - `executeTransferLifecycleValidation`
4. Review QA Test Centre metrics on Operations Command Centre.
5. Review and triage defect register entries.

## Defect Management Process

- Defects are tracked in `src/testing/defectRegister.ts`.
- Initial defects (`DEF-001` to `DEF-004`) are seeded automatically.
- Automated failures append evidence through `registerDefectObservation`.
- Defect status values:
  - `OPEN`
  - `IN_PROGRESS`
  - `MONITORING`
  - `RESOLVED`
- Defect register is persisted locally and synchronized to Supabase (`qa_defect_register`) when available.

## Severity Definitions

- `CRITICAL`: Blocks transfer completion, causes app instability, or creates major lifecycle mismatch in production-like flow.
- `HIGH`: Significant functional degradation with no full blocker but high user impact.
- `MEDIUM`: Functional inconsistency with workaround and moderate risk.
- `LOW`: Minor issue with low operational impact.

## Pass/Fail Criteria

- A test **passes** when all expected lifecycle, route, and UI criteria in the test definition are met.
- A test **fails** when any critical step is missing, execution hangs, state diverges across screens, or post-resume behavior is unstable.
- Pass/fail outcomes are immutable execution records in `qaExecutionLogger`.

## Regression Testing Approach

- Regression suite is mapped per defect in `qaTestDefinitions` (`regressionCoverage`).
- Defects requiring mandatory regression:
  - `DEF-001`: Corridor hang conditions.
  - `DEF-002`: History/Track completion mismatch.
  - `DEF-003`: Background/resume stability.
  - `DEF-004`: State synchronization consistency.
- Every release candidate must run full regression suite before approval.

## Corridor Testing Approach

### Covered Corridors

- `GBP->SAR`
- `GBP->KWD`
- `GBP->AED`
- `GBP->PHP`
- `GBP->MYR`
- `GBP->INR`

### Covered Amounts

- `GBP 1`
- `GBP 100`
- `GBP 500`
- `GBP 5000`

### Mandatory Corridor Assertions

- Route generated successfully.
- Execution starts and progresses.
- Settlement and payout complete.
- Transfer appears in history.
- Track screen reaches completion state.

## Background/Resume Stability Approach

- Execute `QA-BG-RESUME-001` workflow:
  1. Launch app.
  2. Background app for configured duration.
  3. Resume app.
  4. Execute transfer.
  5. Verify state and lifecycle continuity.
- Failures are logged automatically and linked to `DEF-003`.

## Transfer Lifecycle Validation Approach

- Execute `QA-LIFECYCLE-001` and verify milestones:
  - Funding Selected
  - Route Generated
  - Execution Started
  - Settlement Completed
  - Payout Completed
  - History Updated
  - Track Screen Updated
- Missing milestones trigger automated defect observation linkage to `DEF-002` or `DEF-004`.

## Reporting and Visibility

- Operations Command Centre includes `QA Test Centre` card for:
  - Total tests executed
  - Passed
  - Failed
  - Open defects
  - Last test result
- QA metrics are suitable for release gate checks and sprint defect trend analysis.
