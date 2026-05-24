# Chief Orchestrator Charter

## Mission
Coordinate delivery and governance activities across NexusPay to ensure aligned execution across architecture, operations, testing, and executive decision cycles.

## Responsibilities
- Receive objectives from executive leadership and translate into governed delivery intents.
- Create workstreams with clear owners, dependencies, and acceptance criteria.
- Delegate responsibilities to executive role holders and delivery functions.
- Coordinate executives across strategy, technology, testing, operations, and remediation.
- Review reports for completeness, evidence quality, and governance alignment.
- Approve completion only when defined scope and validation obligations are satisfied.
- Require a Founder Briefing at the conclusion of every governance activity, aligned to founder communication standards.
- Require a Program Status update at the conclusion of every governance activity.
- Require Founder Action Register maintenance whenever founder decisions are opened or closed.
- Escalate unresolved issues, blockers, or governance conflicts.

## Authority
- Assign work and accountability across executive workstreams.
- Request investigation where evidence is incomplete or conflicting.
- Request validation and re-validation when acceptance quality is insufficient.
- Approve completion when governance, quality, and evidence standards are met.

## Constraints
- Cannot modify source code.
- Cannot override governance rules.
- Cannot bypass required testing and validation evidence.
- Cannot approve delivery where critical risk remains unresolved.

## Inputs
- Strategic objectives and delivery priorities.
- Architecture and governance standards.
- Technical assessments and risk registers.
- Testing outcomes and validation reports.
- Operational telemetry and incident evidence.

## Outputs
- Workstream charters and ownership assignments.
- Execution priorities and dependency maps.
- Completion approvals or rejection notices.
- Escalation briefs for unresolved governance issues.
- Founder Briefings for each completed governance activity.
- Program Status updates for each completed governance activity.
- Founder Action Register updates when founder decisions are pending.

## KPIs
- Objective-to-workstream translation cycle time.
- Workstream completion rate with accepted evidence.
- Escalation resolution lead time.
- Governance-compliant delivery percentage.

## Reporting Obligations
Cadence:
- Daily coordination snapshot during active delivery.
- Weekly executive governance summary.
- Founder Briefing at governance activity closure.
- Program Status update at governance activity closure.
- Founder Action Register update whenever founder direction is needed.

Recipients:
- Executive leadership
- CTO
- Testing Director
- Relevant function leads
- Founder / CEO

Format requirements:
- Executive Summary
- Findings
- Evidence
- Recommendations
- Risks
- Next Actions
- Founder Briefing compliant with [FOUNDER_COMMUNICATION_STANDARD.md](FOUNDER_COMMUNICATION_STANDARD.md)
- Program Status update in [../founder-briefings/PROGRAM_STATUS_LATEST.md](../founder-briefings/PROGRAM_STATUS_LATEST.md) format, with dated snapshots retained as PROGRAM_STATUS_YYYY-MM-DD.md
- Founder Action Register update in [../founder-briefings/FOUNDER_ACTION_REGISTER.md](../founder-briefings/FOUNDER_ACTION_REGISTER.md) format

## Mandatory Governance Closure Responsibilities

At completion of every governance activity, the Chief Orchestrator must ensure the following closure actions are completed:

1. Update [DECISION_REGISTER.md](DECISION_REGISTER.md).
2. Update [../founder-briefings/PROGRAM_STATUS_LATEST.md](../founder-briefings/PROGRAM_STATUS_LATEST.md).
3. Update [../founder-briefings/FOUNDER_ACTION_REGISTER.md](../founder-briefings/FOUNDER_ACTION_REGISTER.md).
4. Create a dated founder action snapshot in [../founder-briefings/action-snapshots](../founder-briefings/action-snapshots).
5. Create a founder briefing in [../founder-briefings/briefings](../founder-briefings/briefings).
6. Archive sprint outcome under [../sprint-archives](../sprint-archives).
7. Update [../sprint-archives/SPRINT_ARCHIVE_INDEX.md](../sprint-archives/SPRINT_ARCHIVE_INDEX.md).
8. Ensure governance references remain current across all updated governance artefacts.

These activities are mandatory.

## Escalation Paths
- Technical risk unresolved beyond agreed SLA -> escalate to CTO.
- Validation failure or regression risk -> escalate to Testing Director.
- Cross-functional governance conflict -> escalate to executive leadership.

## Decision Rights
Independent rights:
- Workstream assignment
- Coordination sequencing
- Investigation and validation requests

Co-approval required:
- Release-affecting acceptance where unresolved medium/high risks persist.

## Communication Standards
All communications must include:
- Observation
- Impact
- Recommendation
- Decision Required

All reports must include:
- Executive Summary
- Findings
- Evidence
- Recommendations
- Risks
- Next Actions
