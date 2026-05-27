# Maestro Automation Architecture

## Purpose

Define an implementation-ready Maestro automation architecture aligned to NexusPay screen flow, QA foundation definitions, defect register model, and governance evidence obligations.

## Alignment Principles

1. Reuse Sprint 007A QA foundation as authoritative source:
- src/testing/qaTestDefinitions.ts
- src/testing/qaExecutionLogger.ts
- src/testing/defectRegister.ts
- docs/QA_TEST_PLAN.md
2. Do not modify payment, routing, transfer, XRPL, treasury, or business logic.
3. Separate automation orchestration, evidence, and reporting concerns.

## Proposed Folder Structure

governance/automation/
- maestro/
- flows/
- common/
- launch-and-auth.yaml
- navigate-send.yaml
- execute-corridor-transfer.yaml
- validate-track.yaml
- validate-history.yaml
- validate-cross-screen.yaml
- validate-background-resume.yaml
- corridor/
- gbp-sar/
- amount-1.yaml
- amount-100.yaml
- amount-500.yaml
- amount-5000.yaml
- gbp-kwd/
- amount-1.yaml
- amount-100.yaml
- amount-500.yaml
- amount-5000.yaml
- gbp-aed/
- gbp-php/
- gbp-myr/
- gbp-inr/
- suite/
- corridor-full-suite.yaml
- lifecycle-suite.yaml
- stability-suite.yaml
- scripts/
- run-certification.ps1
- collect-logs.ps1
- collect-screenshots.ps1
- build-evidence-pack.ts
- create-defect-candidates.ts
- reporting/
- build-certification-report.ts
- build-founder-briefing.ts
- build-executive-summary.ts
- outputs/
- YYYY-MM-DD/
- run-<id>/
- screenshots/
- logs/
- evidence-pack.json
- certification-report.md
- founder-briefing.md
- executive-summary.md

## Test Structure

1. Common flow building blocks encapsulate navigation and reusable checks.
2. Corridor test flows bind:
- corridor identifier
- amount under test
- expected lifecycle checkpoints
3. Suite flows orchestrate matrix execution and aggregate result handling.

## Execution Flow

1. Pre-run:
- boot emulator profile
- ensure app installed and launched
- establish clean runtime state
2. Execute:
- run selected Maestro suite
- capture step-level screenshots and logs
- emit structured run events
3. Post-run:
- evaluate pass/fail rules from QA definitions
- generate evidence pack
- create defect candidates for failures
- generate founder and executive outputs

## Emulator Interaction Model

1. Standard emulator profile:
- Android Emulator Pixel 9
- fixed locale/timezone
- stable animation and transition settings
2. Controlled runtime:
- deterministic boot and app-launch sequence
- timeout and retry policy for unstable UI transitions
3. Health checks:
- startup readiness check
- in-run process heartbeat check
- post-run cleanup check

## Corridor Execution Model

Coverage matrix:
- Corridors: GBP->SAR, GBP->KWD, GBP->AED, GBP->PHP, GBP->MYR, GBP->INR
- Amounts: GBP 1, GBP 100, GBP 500, GBP 5000

Execution strategy:
1. Run corridor/amount permutations serially by default for deterministic evidence.
2. Optional parallel shard mode after baseline stability is proven.
3. Auto-tag each run with corridor, amount, test ID, and run ID.

## Screenshot Collection

1. Required checkpoint screenshots:
- route generated
- execution started
- settlement status visible
- payout completion status
- history update visible
- track completion visible
2. Failure screenshot capture:
- immediate failure frame
- contextual previous step frame

## Log Collection

1. Capture app and test runner logs.
2. Store timestamped structured logs per run.
3. Correlate logs with test ID and checkpoint ID.

## Evidence Collection

1. Build one evidence pack per run plus aggregate pack per suite.
2. Include:
- metadata (corridor, amount, test ID, device)
- timeline checkpoints
- duration metrics
- screenshot and log manifest
- classification PASS/WARNING/FAIL

## Reporting Flow

1. Per-run report generated first.
2. Suite-level certification report consolidates matrix outcomes.
3. Founder briefing and executive summary generated from certification report and defect delta.

## Defect Generation Flow

1. Failure detection maps to defect taxonomy and known defects.
2. New failure evidence appends observations to existing defect where applicable.
3. Non-matching failure signatures create candidate new defects with severity suggestion.
4. Defect creation output is reviewed by Automation Test Engineer before publication.

## NexusPay Architecture Fit

1. Automation validates existing UI routes and QA services without modifying business flows.
2. Evidence and defects align with current QA storage and Supabase sync model.
3. Governance outputs align with executive report and founder briefing discovery indexes.
