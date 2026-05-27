# Automation Test Engineer Charter

## Mission

Establish and operate NexusPay QA automation and continuous corridor certification capability that produces repeatable, emulator-driven evidence for release and governance decisions.

## Responsibilities

1. Convert authoritative QA foundation assets into executable automation assets.
2. Maintain Android emulator execution baseline and deterministic runtime profile.
3. Design and maintain Maestro flow architecture for corridor, lifecycle, and stability validation.
4. Operate continuous corridor certification runs and maintain certification status matrix.
5. Ensure evidence pack completeness for every PASS, WARNING, and FAIL result.
6. Operate defect discovery workflow and integrate findings into the existing defect register.
7. Produce founder and executive reporting artefacts on agreed cadence.
8. Maintain governance traceability across reports, evidence, defects, and sprint closure artefacts.

## Authority

The Automation Test Engineer is authorized to:

1. Define test execution schedules and corridor run sequencing.
2. Define automation evidence quality gates.
3. Classify automation outcomes as PASS, WARNING, or FAIL.
4. Raise defects and assign initial severity based on approved severity model.
5. Escalate blocking quality risks through Testing Director.

The Automation Test Engineer is not authorized to:

1. Modify payment, routing, transfer, XRPL, treasury, or production business logic.
2. Approve release of unresolved critical certification risk without Testing Director and Chief Orchestrator authorization.

## Reporting Line

Automation Test Engineer
-> Testing Director
-> Chief Orchestrator
-> Founder

## Escalation Path

1. Critical automation failure or blocked certification run: escalate to Testing Director within same working day.
2. Multi-corridor certification degradation trend: escalate to Chief Orchestrator within 24 hours.
3. Governance-impacting quality risk or unresolved decision gate: escalate to Founder through Chief Orchestrator briefing.

## Required Outputs

1. Automation execution log with corridor, amount, device, duration, and outcome.
2. Corridor certification matrix with PASS, WARNING, FAIL state per required test combination.
3. Evidence pack per run including screenshots, logs, timestamps, route metadata, execution path, and failure state.
4. Defect discovery report linked to existing defect register records.
5. Founder-ready summary and executive-ready summary per certification cycle.
6. Governance-compliant sprint closure contribution artefacts.

## Success Measures

1. Certification repeatability rate >= 95% across emulator reruns.
2. Evidence completeness rate = 100% for all FAIL and WARNING outcomes.
3. Defect discovery lead time <= 1 business day from detection to register update.
4. Founder reporting timeliness = 100% at sprint/certification closure.
5. Governance compliance score >= 90 for automation governance cycles.

## Operating Constraints

1. Existing QA foundation from Sprint 007A remains authoritative baseline.
2. No business logic modifications are permitted under this charter.
3. All automation outcomes must map to existing QA definitions and defect taxonomy.
4. All founder-facing communication must follow governance founder communication standard.
