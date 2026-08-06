# NexusPay Governance Decision Register

## Purpose

This register is the permanent governance decision memory for NexusPay.

Objectives:
- Preserve executive decisions
- Support auditability
- Improve traceability
- Reduce repeated investigations
- Provide historical context for future executives and AI agents

Governance authority precedence:
1. Governance documents under [governance/GOVERNANCE_INDEX.md](GOVERNANCE_INDEX.md)
2. Architecture authority documents referenced by the governance index
3. Historical reports as informational context

## Standard Decision Record Template

Each decision entry must include:

- Decision ID
- Title
- Date
- Decision Owner
- Participating Roles
- Background
- Decision
- Rationale
- Alternatives Considered
- Risks
- Expected Outcome
- Status
- Follow-up Actions
- Reference Documents

## Decision Records

---

## Decision ID
D-014

## Title
Airwallex Client API Selected For Sandbox Last-Leg Payout Proof

## Date
2026-08-06

## Decision Owner
Founder

## Participating Roles
- Codex Lead Implementation Agent
- NexusPay CTO
- Operations Intelligence Director
- QA Director

## Background
NexusPay needs a destination payout rail to move beyond source-rail and settlement demonstrations. The Founder created an Airwallex self-service sandbox account and supplied scoped sandbox credentials through local environment configuration.

## Decision
Implement Airwallex as a sandbox-only last-leg payout provider behind NexusPay's provider-neutral payout adapter and Edge Function boundary. Do not represent this as production payment readiness.

## Rationale
Airwallex provides Client API resources for authentication, account capability checks, beneficiaries, transfers, transfer status retrieval and sandbox transfer simulation. This makes it suitable for proving a destination payout leg while keeping secrets server-side.

## Alternatives Considered
- Continue using mock payout providers only.
- Hardcode Airwallex directly into the execution engine.
- Treat candidate providers such as Nium or Tranglo as configured without live connectivity evidence.

## Risks
- Dynamic beneficiary requirements may vary by country and currency.
- Webhook certification depends on configuring a real Airwallex webhook subscription and signing secret.

## Expected Outcome
NexusPay can progress from a visual/demo last-leg payout to a certifiable Airwallex sandbox payout rail with durable idempotency, evidence capture and explicit certification status.

## Status
Approved and deployed for sandbox use. Terminal Airwallex provider certification passed at `PAID`; actual Airwallex webhook delivery remains pending.

## Follow-up Actions
1. Configure a verified Airwallex sandbox webhook subscription.
2. Rerun actual Airwallex webhook delivery or Airwallex test-event delivery.
3. Complete and retain the ordinary Corporate payment emulator acceptance evidence.

## Reference Documents
- [Airwallex Sandbox Payout Integration Checkpoint](../reports/AIRWALLEX_SANDBOX_PAYOUT_INTEGRATION_CHECKPOINT.md)
- [Founder Briefing: Airwallex Sandbox Payout Integration](../reports/FOUNDER_BRIEFING_AIRWALLEX_SANDBOX_PAYOUT.md)

---

## Decision ID
D-001

## Title
Creation of NexusPay Digital Governance Framework

## Date
2026-05-24

## Decision Owner
Chief Orchestrator

## Participating Roles
- Chief Orchestrator
- Chief Technology Officer
- Testing Director

## Background
NexusPay required a formal governance operating model with explicit role authority, decision rights, constraints, escalation paths, and standardized communication/reporting expectations.

## Decision
Establish the Digital Governance Framework as the authoritative governance model and adopt role charters plus a reusable executive charter template.

## Rationale
A formal governance framework is required to ensure evidence-based decisions, clear accountability, and non-overlapping authority across orchestration, technology, and testing functions.

## Alternatives Considered
- Continue with informal role coordination without formal charters.
- Use a single consolidated governance memo instead of role-specific charters.

## Risks
- Medium: Governance overhead if reporting cadence is not operationally integrated.
- Low: Role boundary ambiguity if charters are not kept current.

## Expected Outcome
Governance decisions become repeatable, auditable, and role-aligned, with standardized reporting and escalation mechanisms.

## Status
Approved and Active

## Follow-up Actions
1. Use the charter template for future executive role expansion.
2. Maintain a centralized decision register for governance traceability.
3. Include governance-compliance checks in future governance reports.

## Reference Documents
- [governance/GOVERNANCE_INDEX.md](GOVERNANCE_INDEX.md)
- [governance/EXECUTIVE_CHARTER_TEMPLATE.md](EXECUTIVE_CHARTER_TEMPLATE.md)
- [governance/CHIEF_ORCHESTRATOR_CHARTER.md](CHIEF_ORCHESTRATOR_CHARTER.md)
- [governance/CHIEF_TECHNOLOGY_OFFICER_CHARTER.md](CHIEF_TECHNOLOGY_OFFICER_CHARTER.md)
- [governance/TESTING_DIRECTOR_CHARTER.md](TESTING_DIRECTOR_CHARTER.md)
- [governance/executive-charters-report.md](../governance-history/executive-charters-report.md)

---

## Decision ID
D-002

## Title
Execution of Governance Pilot

## Date
2026-05-24

## Decision Owner
Chief Orchestrator

## Participating Roles
- Testing Director
- Chief Technology Officer
- Chief Orchestrator

## Background
A reported corridor reliability concern required a controlled governance pilot to validate current execution behavior and produce role-separated evidence before any remediation decisions.

## Decision
Execute a three-phase governance pilot: Testing Director validation, CTO root-cause analysis, and Chief Orchestrator executive recommendation.

## Rationale
A phased pilot produces structured, role-specific evidence and prevents premature technical changes without governance review.

## Alternatives Considered
- Proceed directly to remediation without governance pilot.
- Run a single combined analysis report without role-phase separation.

## Risks
- Medium: Delayed remediation if pilot evidence collection is incomplete.
- Medium: Confidence gaps if pilot outputs are not consolidated into clear next actions.

## Expected Outcome
A clear governance-approved problem statement, risk posture, and recommended direction for next sprint planning.

## Status
Completed

## Follow-up Actions
1. Preserve pilot outcomes as reference baseline for subsequent investigations.
2. Track unresolved risks in subsequent governance reviews.

## Reference Documents
- [governance/governance-pilot-report.md](../executive-reports/governance-pilot-report.md)
- [governance/CORRIDOR_VALIDATION_REPORT.md](../executive-reports/CORRIDOR_VALIDATION_REPORT.md)
- [governance/ROOT_CAUSE_ANALYSIS.md](../executive-reports/ROOT_CAUSE_ANALYSIS.md)
- [governance/EXECUTIVE_RECOMMENDATION.md](../executive-reports/EXECUTIVE_RECOMMENDATION.md)

---

## Decision ID
D-003

## Title
Execution Continuity Investigation Sprint

## Date
2026-05-24

## Decision Owner
Chief Orchestrator

## Participating Roles
- Testing Director
- Chief Technology Officer
- Chief Orchestrator

## Background
Following the governance pilot, continuity behavior required deeper evidence gathering and corridor-by-corridor certification without remediation implementation.

## Decision
Run an evidence-only Execution Continuity Investigation and Corridor Certification Sprint.

## Rationale
A dedicated investigation sprint was needed to classify all supported corridors, test the continuity hypothesis rigorously, and define affected components and risk posture before remediation planning.

## Alternatives Considered
- Merge investigation and remediation into one sprint.
- Limit scope to only GBP -> KWD without full corridor certification matrix.

## Risks
- Medium: Residual UNKNOWN corridor statuses until runtime evidence is expanded.
- Medium: Stakeholder pressure to remediate before full causal confidence is established.

## Expected Outcome
Formal corridor certification, hypothesis verdict (PROVEN, DISPROVEN, or PARTIALLY PROVEN), and governance-backed remediation scope definition.

## Status
Completed

## Follow-up Actions
1. Maintain certification statuses as governance gates.
2. Reclassify UNKNOWN corridors only when new runtime evidence is available.
3. Use identified affected components as the baseline for next sprint scope.

## Reference Documents
- [governance/execution-continuity-investigation-report.md](../executive-reports/execution-continuity-investigation-report.md)
- [governance/CORRIDOR_CERTIFICATION_REPORT.md](../executive-reports/CORRIDOR_CERTIFICATION_REPORT.md)
- [governance/EXECUTION_CONTINUITY_ANALYSIS.md](../executive-reports/EXECUTION_CONTINUITY_ANALYSIS.md)
- [governance/EXECUTION_CONTINUITY_EXECUTIVE_REVIEW.md](../executive-reports/EXECUTION_CONTINUITY_EXECUTIVE_REVIEW.md)

---

## Decision ID
D-004

## Title
Approval to Proceed to Execution Continuity Remediation Planning

## Date
2026-05-24

## Decision Owner
Chief Orchestrator

## Participating Roles
- Chief Orchestrator
- Chief Technology Officer
- Testing Director

## Background
The investigation sprint concluded with a PARTIALLY PROVEN continuity hypothesis, one FAIL corridor (GBP -> KWD), and nine UNKNOWN expanded corridors requiring further runtime evidence.

## Decision
Approve progression to remediation planning for execution continuity, with implementation deferred to a dedicated remediation sprint and governed by certification gates.

## Rationale
Evidence supports justified remediation planning while preserving governance control over release-risk decisions and corridor status upgrades.

## Alternatives Considered
- Defer all remediation planning until hypothesis reaches fully PROVEN.
- Proceed immediately to implementation without a scoped remediation-planning decision.

## Risks
- High: Continued non-terminal behavior risk if planning does not transition into validated remediation execution.
- Medium: Extended UNKNOWN corridor status may reduce rollout confidence.

## Expected Outcome
A defined remediation plan targeting resume determinism and terminal-state certainty, with measurable acceptance criteria and re-certification obligations.

## Status
Approved for Planning

## Follow-up Actions
1. Produce remediation sprint plan with explicit acceptance criteria.
2. Prioritize GBP -> KWD as sentinel corridor for re-certification.
3. Require PASS/FAIL reclassification for all currently UNKNOWN corridors in the next evidence cycle.

## Reference Documents
- [governance/execution-continuity-investigation-report.md](../executive-reports/execution-continuity-investigation-report.md)
- [governance/EXECUTION_CONTINUITY_EXECUTIVE_REVIEW.md](../executive-reports/EXECUTION_CONTINUITY_EXECUTIVE_REVIEW.md)
- [governance/governance-pilot-report.md](../executive-reports/governance-pilot-report.md)

---

## Decision ID
D-005

## Title
Approval of Governance Completion Sprint

## Date
2026-05-24

## Decision Owner
Chief Orchestrator

## Participating Roles
- Chief Orchestrator
- Chief Technology Officer
- Testing Director
- Engineering Quality & Assurance Officer

## Background
NexusPay required final governance, founder communication, and executive reporting structures before remediation and future delivery activities could proceed under complete governance controls.

## Decision
Approve and execute the Governance Completion Sprint to finalize framework structure, founder communication repositories, executive reporting discovery, and governance authority updates.

## Rationale
Framework completion reduces governance ambiguity, improves executive traceability, and ensures future remediation activities start with full governance readiness.

## Alternatives Considered
- Proceed to remediation planning without completing governance framework enhancements.
- Defer founder and executive reporting structure completion to a later sprint.

## Risks
- Low: Additional documentation governance overhead.
- Medium: Future governance drift risk if closure repositories are not maintained.

## Expected Outcome
Complete governance framework readiness with clear authority references, founder communication closure obligations, executive report discoverability, and updated decision history.

## Status
Completed

## Follow-up Actions
1. Maintain founder and executive reporting indexes as mandatory governance closure artifacts.
2. Enforce program status and founder next actions updates on every governance activity closure.
3. Include EQAO participation in remediation plan quality gates.

## Reference Documents
- [governance/GOVERNANCE_INDEX.md](GOVERNANCE_INDEX.md)
- [governance/EQAO_CHARTER.md](EQAO_CHARTER.md)
- [governance/FOUNDER_COMMUNICATION_STANDARD.md](FOUNDER_COMMUNICATION_STANDARD.md)
- [governance/FOUNDER_BRIEFING_TEMPLATE.md](FOUNDER_BRIEFING_TEMPLATE.md)
- [governance/CHIEF_ORCHESTRATOR_CHARTER.md](CHIEF_ORCHESTRATOR_CHARTER.md)
- [executive-reports/EXECUTIVE_REPORT_INDEX.md](../executive-reports/EXECUTIVE_REPORT_INDEX.md)
- [founder-briefings/FOUNDER_BRIEFING_INDEX.md](../founder-briefings/FOUNDER_BRIEFING_INDEX.md)

---

## Decision ID
D-006

## Title
Governance Repository Refactoring Sprint

## Date
2026-05-24

## Decision Owner
Chief Orchestrator

## Participating Roles
- Chief Orchestrator
- Chief Technology Officer
- Testing Director
- Engineering Quality & Assurance Officer

## Background
Governance documents were created across multiple root-level locations, reducing discoverability and making audit traversal, executive reporting, and historical sprint tracking harder to execute consistently.

## Decision
Approve and complete a governance-only repository refactor that consolidates all governance artefacts under a single `governance/` structure with dedicated repositories for core governance, founder briefings, executive reports, governance history, and sprint archives.

## Rationale
Repository normalization improves governance clarity, document discoverability, cross-repository traceability, auditability, and reporting readiness for founders and executives while preserving governance authority precedence.

## Alternatives Considered
- Keep existing mixed root-level governance layout and rely on manual navigation.
- Delay structural normalization until after remediation workstreams.

## Risks
- Low: Temporary link maintenance overhead during migration.
- Medium: Future reference drift if indexes and decision records are not maintained at governance closure.

## Expected Outcome
Final governance repository baseline established for remediation and future delivery, with clear ownership boundaries, stable authority indexing, and durable historical sprint memory.

## Status
Completed

## Follow-up Actions
1. Enforce governance closure checklist updates across index, decision register, and sprint archive for every governance sprint.
2. Include link-integrity checks as part of governance completion validation.
3. Keep founder and executive repositories synchronized with decision register updates.

## Reference Documents
- [GOVERNANCE_INDEX.md](GOVERNANCE_INDEX.md)
- [CHIEF_ORCHESTRATOR_CHARTER.md](CHIEF_ORCHESTRATOR_CHARTER.md)
- [../executive-reports/EXECUTIVE_REPORT_INDEX.md](../executive-reports/EXECUTIVE_REPORT_INDEX.md)
- [../founder-briefings/FOUNDER_BRIEFING_INDEX.md](../founder-briefings/FOUNDER_BRIEFING_INDEX.md)
- [../governance-history/governance-repository-refactoring-report.md](../governance-history/governance-repository-refactoring-report.md)

---

## Decision ID
D-007

## Title
Founder Reporting & Governance Closure Enhancement Sprint

## Date
2026-05-24

## Decision Owner
Chief Orchestrator

## Participating Roles
- Chief Orchestrator
- Chief Technology Officer
- Testing Director
- Engineering Quality & Assurance Officer

## Background
Final governance closure controls required stronger founder reporting structure, permanent action retention, a current program status dashboard, and explicit closure maintenance responsibilities to prevent governance drift.

## Decision
Approve and complete the Founder Reporting & Governance Closure Enhancement Sprint, including founder briefing repository restructuring, permanent founder action register adoption, latest program status model introduction, and mandatory closure-responsibility formalization.

## Rationale
The enhancement closes governance maintenance gaps, improves founder reporting clarity, preserves historical traceability, strengthens action management, and ensures closure artefacts are consistently maintained.

## Alternatives Considered
- Keep legacy founder files in a flat structure and continue manual closure updates.
- Delay closure discipline improvements until remediation planning begins.

## Risks
- Low: Additional governance maintenance overhead.
- Medium: Risk of reference drift if closure updates are not followed every sprint.

## Expected Outcome
Founder communications become clearer and easier to navigate, action history is durable, current status is always visible, and governance closure discipline is enforced through explicit charter responsibilities.

## Status
Completed

## Follow-up Actions
1. Update [../founder-briefings/PROGRAM_STATUS_LATEST.md](../founder-briefings/PROGRAM_STATUS_LATEST.md) at every governance activity closure.
2. Append all new founder actions in [../founder-briefings/FOUNDER_ACTION_REGISTER.md](../founder-briefings/FOUNDER_ACTION_REGISTER.md) and never delete historical records.
3. Archive each closure sprint in [../sprint-archives](../sprint-archives) and maintain [../sprint-archives/SPRINT_ARCHIVE_INDEX.md](../sprint-archives/SPRINT_ARCHIVE_INDEX.md).

## Reference Documents
- [GOVERNANCE_INDEX.md](GOVERNANCE_INDEX.md)
- [CHIEF_ORCHESTRATOR_CHARTER.md](CHIEF_ORCHESTRATOR_CHARTER.md)
- [../founder-briefings/FOUNDER_BRIEFING_INDEX.md](../founder-briefings/FOUNDER_BRIEFING_INDEX.md)
- [../founder-briefings/FOUNDER_ACTION_REGISTER.md](../founder-briefings/FOUNDER_ACTION_REGISTER.md)
- [../founder-briefings/PROGRAM_STATUS_LATEST.md](../founder-briefings/PROGRAM_STATUS_LATEST.md)
- [../sprint-archives/SPRINT_004_FOUNDER_REPORTING_GOVERNANCE_CLOSURE_ENHANCEMENT.md](../sprint-archives/SPRINT_004_FOUNDER_REPORTING_GOVERNANCE_CLOSURE_ENHANCEMENT.md)

---

## Decision ID
D-008

## Title
Approval to Initiate Execution Continuity Remediation and Re-Certification Sprint

## Date
2026-05-24

## Decision Owner
Chief Orchestrator

## Participating Roles
- Founder / CEO
- Chief Orchestrator
- Chief Technology Officer
- Testing Director
- Engineering Quality & Assurance Officer

## Background
Governance investigation concluded that GBP -> KWD remains FAIL and nine expanded corridors remain UNKNOWN. Founder approval has now been granted to initiate remediation planning and enforce evidence-gated re-certification.

## Decision
Initiate Sprint 005 execution continuity remediation and re-certification immediately, with mandatory PASS/FAIL evidence gates and sentinel-first validation starting with GBP -> KWD.

## Rationale
Immediate kickoff converts approved governance direction into controlled execution activity, reduces decision latency risk, and preserves reliability discipline before confidence upgrades.

## Alternatives Considered
- Delay sprint kickoff to a later governance cycle.
- Begin implementation activity without full remediation planning and evidence gate enforcement.

## Risks
- Medium: Schedule compression risk if runbook evidence capture quality is insufficient.
- Medium: Continued trust risk if sentinel corridor does not reach deterministic terminal behavior quickly.

## Expected Outcome
Sprint 005 executes with clear ownership, deterministic acceptance criteria, and corridor re-certification governance controls, enabling reliable reclassification of current FAIL/UNKNOWN states.

## Status
Approved and Active

## Follow-up Actions
1. CTO to publish deterministic resume and terminal-state remediation design.
2. Testing Director to execute sentinel-first re-certification sequence with reproducible traces.
3. EQAO to enforce quality gate approval before implementation transition.
4. Chief Orchestrator to issue weekly founder checkpoint packs and update governance closure artefacts.

## Reference Documents
- [../executive-reports/EXECUTION_CONTINUITY_EXECUTIVE_REVIEW.md](../executive-reports/EXECUTION_CONTINUITY_EXECUTIVE_REVIEW.md)
- [../executive-reports/CORRIDOR_CERTIFICATION_REPORT.md](../executive-reports/CORRIDOR_CERTIFICATION_REPORT.md)
- [../founder-briefings/PROGRAM_STATUS_LATEST.md](../founder-briefings/PROGRAM_STATUS_LATEST.md)
- [../founder-briefings/FOUNDER_ACTION_REGISTER.md](../founder-briefings/FOUNDER_ACTION_REGISTER.md)
- [../sprint-archives/SPRINT_005_EXECUTION_CONTINUITY_REMEDIATION_AND_RECERTIFICATION.md](../sprint-archives/SPRINT_005_EXECUTION_CONTINUITY_REMEDIATION_AND_RECERTIFICATION.md)

---

## Decision ID
D-009

## Title
Approval and Completion of Governance Enhancement Sprint for Executive Operating Model Standardization

## Date
2026-05-24

## Decision Owner
Chief Orchestrator

## Participating Roles
- Founder / CEO
- Chief Orchestrator
- Chief Technology Officer
- Testing Director
- Engineering Quality & Assurance Officer

## Background
Before Sprint 005 implementation transition, governance maturity required a standardized digital executive operating model, explicit charter inheritance requirements, and a reusable compliance-review framework to support high-level founder directives with full traceability.

## Decision
Execute and complete a governance-only enhancement sprint to establish a mandatory Digital Executive Operating Model, update executive charters for operating-model inheritance and compliance duties, create a compliance review framework, and strengthen founder communication enforcement.

## Rationale
Standardization reduces procedural ambiguity, increases executive autonomy under founder-level directives, improves governance startup reliability, and strengthens auditability and founder visibility before implementation work proceeds.

## Alternatives Considered
- Proceed to Sprint 005 implementation without operating-model standardization.
- Apply role-level procedural updates without introducing a common operating model.

## Risks
- Low: Documentation overhead from additional compliance artefacts.
- Medium: Adoption variance risk if startup and compliance sequences are not routinely enforced.

## Expected Outcome
All executive roles operate under one mandatory startup and governance lifecycle model, compliance reviews become repeatable, founder communication remains decision-ready, and future high-level founder directives can be executed without detailed procedural prompting.

## Status
Completed

## Follow-up Actions
1. Apply the Digital Executive Operating Model startup sequence at the beginning of all significant executive activities.
2. Run compliance reviews before implementation transitions and record compliance scores.
3. Keep founder communication artefacts synchronized at each governance closure.
4. Track governance maturity trends through quarterly compliance review rollups.

## Reference Documents
- [GOVERNANCE_INDEX.md](GOVERNANCE_INDEX.md)
- [DIGITAL_EXECUTIVE_OPERATING_MODEL.md](DIGITAL_EXECUTIVE_OPERATING_MODEL.md)
- [CHIEF_ORCHESTRATOR_CHARTER.md](CHIEF_ORCHESTRATOR_CHARTER.md)
- [CHIEF_TECHNOLOGY_OFFICER_CHARTER.md](CHIEF_TECHNOLOGY_OFFICER_CHARTER.md)
- [TESTING_DIRECTOR_CHARTER.md](TESTING_DIRECTOR_CHARTER.md)
- [EQAO_CHARTER.md](EQAO_CHARTER.md)
- [../compliance-reviews/COMPLIANCE_REVIEW_TEMPLATE.md](../compliance-reviews/COMPLIANCE_REVIEW_TEMPLATE.md)
- [../sprint-archives/SPRINT_006_GOVERNANCE_ENHANCEMENT_EXECUTIVE_OPERATING_MODEL.md](../sprint-archives/SPRINT_006_GOVERNANCE_ENHANCEMENT_EXECUTIVE_OPERATING_MODEL.md)

---

## Decision ID
D-010

## Title
Authorization to Resume Startup Architecture V2 Under Codex Highest Available Reasoning

## Date
2026-05-30

## Decision Owner
Founder / CEO

## Participating Roles
- Founder / CEO
- Chief Orchestrator
- Chief Technology Officer
- Testing Director
- Engineering Quality & Assurance Officer

## Background
The Startup Architecture V2 Programme required ChatGPT 5.5 reasoning capability and instructed the team to stop if that capability was unavailable. Founder Briefing 011 documented this model-capability blocker. The Founder then accepted the briefing, waived the blocker, and authorized execution using the highest reasoning capability available within the Codex environment.

## Decision
Resume Startup Architecture V2 under Codex operating at its highest available reasoning level, with the Founder considering that capability to satisfy the intent of the programme's reasoning and engineering standards requirements.

## Rationale
The Founder has explicit authority to waive the model-capability blocker and has confirmed that the programme should continue from the current state without restarting. This preserves governance traceability while allowing the startup architecture redesign to proceed.

## Alternatives Considered
- Pause until a ChatGPT 5.5-labelled execution environment is available.
- Terminate the programme due to model mismatch.
- Proceed without recording the waiver as a formal governance decision.

## Risks
- Medium: The original model label requirement is no longer literal, so traceability depends on the explicit Founder waiver.
- Medium: Startup V2 certification still depends on validation evidence, including device coverage that may require external hardware availability.

## Expected Outcome
Startup Architecture V2 proceeds through rollback protection, architecture review, design, implementation, validation, certification recommendation, and Founder Briefing under the waived model-capability constraint.

## Status
Approved and Active

## Follow-up Actions
1. Preserve Founder Briefing 011 as the accepted blocker record.
2. Publish Startup V2 rollback, architecture, dependency, design, implementation, validation, certification, and founder briefing artefacts.
3. Record any remaining validation gaps or external blockers in the final certification recommendation.

## Reference Documents
- [../founder-briefings/briefings/FOUNDER_BRIEFING_011_STARTUP_ARCHITECTURE_V2_MODEL_CAPABILITY_BLOCKER_2026-05-30.md](../founder-briefings/briefings/FOUNDER_BRIEFING_011_STARTUP_ARCHITECTURE_V2_MODEL_CAPABILITY_BLOCKER_2026-05-30.md)
- [../startup-architecture-v2/STARTUP_V1_ROLLBACK_INVENTORY_2026-05-30.md](../startup-architecture-v2/STARTUP_V1_ROLLBACK_INVENTORY_2026-05-30.md)
- [../startup-architecture-v2/STARTUP_ARCHITECTURE_REVIEW_2026-05-30.md](../startup-architecture-v2/STARTUP_ARCHITECTURE_REVIEW_2026-05-30.md)
- [../startup-architecture-v2/STARTUP_DEPENDENCY_MAP_2026-05-30.md](../startup-architecture-v2/STARTUP_DEPENDENCY_MAP_2026-05-30.md)
- [../startup-architecture-v2/STARTUP_V2_DESIGN_DOCUMENT_2026-05-30.md](../startup-architecture-v2/STARTUP_V2_DESIGN_DOCUMENT_2026-05-30.md)

---

## Decision ID
D-011

## Title
Startup Architecture V2 Implementation Accepted With Native Android Certification Blocker

## Date
2026-05-31

## Decision Owner
Chief Orchestrator

## Participating Roles
- Founder / CEO
- Chief Orchestrator
- Chief Technology Officer
- Testing Director
- Engineering Quality & Assurance Officer

## Background
Startup Architecture V2 was implemented after rollback protection, architecture review, dependency mapping, design, and pre-implementation compliance review. Application-level startup telemetry passed a 20-cycle determinism run. Native Android visual validation then exposed a blocker: the emulator either retained the native splash surface after `startupComplete=true` or, after rebuild and clean reinstall, entered `DevLauncherErrorActivity` before JavaScript loaded.

## Decision
Accept Startup V2 implementation as complete in the working tree, but classify production certification as NO-GO until native Android visual validation is remediated and re-tested.

## Rationale
Telemetry evidence proves deterministic application routing, but certification requires user-visible proof that the app shows the expected first screen. The native splash/dev-client blocker prevents that proof.

## Alternatives Considered
- Certify based on telemetry alone.
- Revert Startup V2 despite application-level determinism.
- Pause without recording the implementation outcome and blocker.

## Risks
- High: User-visible launch remains uncertified.
- Medium: Native remediation may require emulator reset, dev-client rebuild, or physical device validation.
- Low: Startup V2 application logic can be rolled back using the preserved V1 package if required.

## Expected Outcome
Founder visibility is preserved, Startup V2 implementation remains available for remediation, and certification resumes only after native visual validation passes.

## Status
Approved Implementation / Certification NO-GO

## Follow-up Actions
1. Resolve Android native splash/dev-client launch blocker.
2. Re-run screenshot validation after `startupComplete=true`.
3. Re-run 20-cycle startup determinism validation after native remediation.
4. Update certification recommendation and Founder Briefing when native validation passes.

## Reference Documents
- [../startup-architecture-v2/STARTUP_V2_IMPLEMENTATION_SUMMARY_2026-05-31.md](../startup-architecture-v2/STARTUP_V2_IMPLEMENTATION_SUMMARY_2026-05-31.md)
- [../startup-architecture-v2/STARTUP_V2_VALIDATION_EVIDENCE_PACKAGE_2026-05-31.md](../startup-architecture-v2/STARTUP_V2_VALIDATION_EVIDENCE_PACKAGE_2026-05-31.md)
- [../startup-architecture-v2/STARTUP_V2_CERTIFICATION_RECOMMENDATION_2026-05-31.md](../startup-architecture-v2/STARTUP_V2_CERTIFICATION_RECOMMENDATION_2026-05-31.md)
- [../founder-briefings/briefings/FOUNDER_BRIEFING_012_STARTUP_ARCHITECTURE_V2_VALIDATION_BLOCKER_2026-05-31.md](../founder-briefings/briefings/FOUNDER_BRIEFING_012_STARTUP_ARCHITECTURE_V2_VALIDATION_BLOCKER_2026-05-31.md)

---

## Decision ID
D-012

## Title
Consumer Banking Experience Sprint Authorization Under Startup V2 Preservation Constraints

## Date
2026-06-06

## Decision Owner
Chief Orchestrator

## Participating Roles
- Founder / CEO
- Chief Orchestrator
- Chief Technology Officer
- Testing Director
- Engineering Quality & Assurance Officer

## Background
Founder Validation confirmed Startup V2 architecture, multi-account authentication, account isolation foundations, Supabase integration, Nexus AI integration, EAS configuration, and APK launch into the Multi-Account Preview entry. The Personal Account workspace remained functional but prototype-grade in UX and incomplete for real send, tracking, history, and persisted profile/settings behavior.

## Decision
Authorize a dedicated Consumer Banking Experience Sprint to transform the Personal Account workspace into a premium consumer banking experience while preserving Startup V2, authentication, account isolation, Supabase integration, Nexus AI integration, Demo Workspace behavior, APK compatibility, and EAS environment-variable architecture.

## Rationale
Consumer value can be increased immediately without destabilizing validated foundations by using additive implementation that reuses existing route, transfer, recipient, audit, and settings services.

## Alternatives Considered
- Delay consumer upgrades until full enterprise account schema migration.
- Replace validated startup/authentication paths with a separate consumer-only architecture.
- Continue with static prototype consumer screens and defer real flows.

## Risks
- Medium: Regression risk if consumer UI rewrites bypass established transfer orchestration services.
- Medium: Data isolation risk if account-scope filtering is not enforced consistently in all consumer reads/writes.
- Low: Visual redesign drift from NexusPay design standards if tokens and shell patterns diverge.

## Expected Outcome
Consumer workspace supports real transfer creation, user-scoped tracking/history, and persisted profile/settings while preserving validated startup/auth/account architecture and maintaining release gating through existing governance controls.

## Status
Approved and Active

## Follow-up Actions
1. Deliver required programme reports and founder briefing package for the sprint.
2. Validate consumer flows with lint, diagnostics, and user-scope isolation checks before APK recommendation.
3. Keep Demo Workspace unchanged and document Corporate Workspace V2 roadmap recommendations without modifying existing corporate functionality.

## Reference Documents
- [../founder-review-packages/CONSUMER_BANKING_EXPERIENCE_SPRINT_2026-06-06/EXECUTIVE_PROGRAMME_REVIEW.md](../founder-review-packages/CONSUMER_BANKING_EXPERIENCE_SPRINT_2026-06-06/EXECUTIVE_PROGRAMME_REVIEW.md)
- [../founder-review-packages/CONSUMER_BANKING_EXPERIENCE_SPRINT_2026-06-06/CONSUMER_BANKING_SPRINT_PLAN.md](../founder-review-packages/CONSUMER_BANKING_EXPERIENCE_SPRINT_2026-06-06/CONSUMER_BANKING_SPRINT_PLAN.md)
- [../founder-review-packages/CONSUMER_BANKING_EXPERIENCE_SPRINT_2026-06-06/TECHNICAL_DESIGN_REPORT.md](../founder-review-packages/CONSUMER_BANKING_EXPERIENCE_SPRINT_2026-06-06/TECHNICAL_DESIGN_REPORT.md)
- [../founder-review-packages/CONSUMER_BANKING_EXPERIENCE_SPRINT_2026-06-06/UI_UX_DESIGN_REPORT.md](../founder-review-packages/CONSUMER_BANKING_EXPERIENCE_SPRINT_2026-06-06/UI_UX_DESIGN_REPORT.md)

---

## Decision ID
D-013

## Title
Persona Flow Correction Sprint Implementation

## Date
2026-06-17

## Decision Owner
Chief Orchestrator

## Participating Roles
- Founder / CEO
- Chief Orchestrator
- Chief Technology Officer
- Testing Director
- Engineering Quality & Assurance Officer

## Background
The implemented persona flow routed participant personas into recipient-only screens, which conflicted with the multi-account architecture principle that active account/persona context should shape a complete platform experience.

## Decision
Correct persona flow so selected personas enter the full Personal Account application, while notifications, received transfers, profile information, bank details, and transfer history remain persona-specific. Preserve Demo Workspace and Corporate Workspace functionality.

## Rationale
Personas are complete platform users, not standalone recipient inboxes. The corrected model keeps one authentication model, preserves Startup V2, and applies persona-specific data inside the existing account-scoped app.

## Alternatives Considered
- Keep standalone Persona Selector and recipient-only routing.
- Build a separate recipient-only application shell.
- Modify Startup V2 coordinator logic to branch by persona.

## Risks
- Medium: Existing historical personal transfers without `personaId` remain associated with the default personal persona.
- Medium: Persona-specific transfer filtering depends on persisted `selected_route.personaId` for new transfer rows.
- Low: Corporate Payouts must remain discoverable when corporate persona is active.

## Expected Outcome
All selected personas can access Home, Send, Routes, Track, Transfers, Profile, Settings, Nexus AI, Notifications, and Received Transfers from the Personal Account application, with persona-specific data boundaries preserved.

## Status
Implemented pending Android EAS build validation

## Follow-up Actions
1. Trigger Android EAS build and record build URL.
2. Complete APK walkthrough across personal, corporate, and recipient personas.
3. Plan a separate technical debt sprint for unrelated TypeScript blockers.

## Reference Documents
- [../founder-review-packages/PERSONA_FLOW_CORRECTION_SPRINT_2026-06-17/FOUNDER_BRIEFING.md](../founder-review-packages/PERSONA_FLOW_CORRECTION_SPRINT_2026-06-17/FOUNDER_BRIEFING.md)
- [../founder-review-packages/PERSONA_FLOW_CORRECTION_SPRINT_2026-06-17/TECHNICAL_DESIGN_REPORT.md](../founder-review-packages/PERSONA_FLOW_CORRECTION_SPRINT_2026-06-17/TECHNICAL_DESIGN_REPORT.md)
- [../founder-review-packages/PERSONA_FLOW_CORRECTION_SPRINT_2026-06-17/PERSONA_FLOW_VALIDATION_REPORT.md](../founder-review-packages/PERSONA_FLOW_CORRECTION_SPRINT_2026-06-17/PERSONA_FLOW_VALIDATION_REPORT.md)
- [../founder-review-packages/PERSONA_FLOW_CORRECTION_SPRINT_2026-06-17/APK_READINESS_REPORT.md](../founder-review-packages/PERSONA_FLOW_CORRECTION_SPRINT_2026-06-17/APK_READINESS_REPORT.md)

---

## Register Maintenance Guidance

1. Add new decisions in ascending ID order.
2. Never overwrite historical decisions; append updates through status and follow-up actions.
3. Link every decision to authoritative governance and supporting evidence artifacts.
4. Update this register as part of governance closure for every future governance workstream.
