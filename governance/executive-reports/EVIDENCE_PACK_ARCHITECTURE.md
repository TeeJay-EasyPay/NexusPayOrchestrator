# Evidence Pack Architecture

## Purpose

Define a standardized automatic evidence collection model for corridor certification and QA automation governance.

## Evidence Pack Objectives

1. Provide reproducible proof for PASS, WARNING, and FAIL outcomes.
2. Support defect creation and severity assignment.
3. Support founder and executive reporting confidence.

## Evidence Data Domains

1. Screenshots
2. Logs
3. Timestamps
4. Duration metrics
5. Failure states
6. Route information
7. Execution path information

## Collection Points

1. Pre-run metadata capture:
- run ID
- test ID
- corridor
- amount
- emulator/device profile
2. In-run lifecycle capture:
- route generated
- execution started
- settlement status
- payout status
- history state
- track state
3. Post-run result capture:
- classification
- total duration
- failure reason (if any)

## Output Structure

Each run produces:

outputs/<date>/run-<id>/
- screenshots/
- logs/
- metrics.json
- route-context.json
- execution-path.json
- evidence-pack.json

## Evidence Pack JSON Schema

1. metadata:
- runId
- testId
- timestampStart
- timestampEnd
- corridor
- amount
- device
2. outcome:
- status (PASS/WARNING/FAIL)
- reason
- severitySuggestion
3. checkpoints:
- ordered lifecycle checkpoint entries with timestamp and status
4. assets:
- screenshot manifest
- log manifest
5. metrics:
- totalDurationMs
- stageDurationsMs
6. route:
- provider
- rail
- fee
- receiveAmount
7. executionPath:
- milestone progression
- terminal state
8. defectLink:
- matchedDefectId or candidateDefectId

## Classification Output Format

### PASS

Definition:
All mandatory validations passed with complete evidence set.

Required minimum artifacts:
1. Mandatory checkpoint screenshots.
2. Full run log.
3. Duration and route context.

### WARNING

Definition:
Core transfer completed but non-critical anomaly detected.

Required minimum artifacts:
1. PASS artifacts.
2. Warning anomaly details.
3. Suggested remediation note.

### FAIL

Definition:
Mandatory validation failed or transfer did not reach required terminal state.

Required minimum artifacts:
1. Failure moment screenshot and previous step screenshot.
2. Full logs and failure signature.
3. Defect linkage data.

## Quality Gates

Evidence pack is valid only if:

1. metadata completeness is 100%.
2. mandatory checkpoint coverage is complete for result class.
3. log manifest and screenshot manifest are non-empty where required.
4. route and execution path context is present.

## Governance Integration

1. Evidence packs are referenced by certification report and defect workflow outputs.
2. Founder and executive summaries consume only validated evidence packs.
3. Compliance review checks evidence completeness and traceability.
