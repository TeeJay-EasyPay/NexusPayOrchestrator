# Decision Register Entries: Persona Flow Correction Sprint

Date: 2026-06-17

## Decision ID
D-013

## Title
Persona Flow Correction Sprint Implementation

## Decision Owner
Chief Orchestrator

## Participating Roles
- Founder / CEO
- Chief Orchestrator
- Chief Technology Officer
- Testing Director
- Engineering Quality & Assurance Officer

## Background
The existing persona implementation treated participant personas as recipient-only views by routing them to Notifications or Received Transfers screens. This conflicted with the multi-account architecture principle that active account/persona context should drive the complete user experience.

## Decision
Correct persona flow so selected personas enter the full Personal Account application, with persona-specific data applied inside the app. Preserve Demo Workspace and Corporate Workspace functionality.

## Rationale
Personas represent complete platform users, not isolated recipient inboxes. The corrected model aligns with the account-context architecture, keeps one authentication model, and avoids creating a second startup or recipient-only application path.

## Alternatives Considered
- Keep standalone Persona Selector and recipient-only routing.
- Build a separate recipient application shell.
- Replace Startup V2 routing with persona-specific startup logic.

## Risks
- Medium: Persona-specific filtering depends on `selected_route.personaId` for newly persisted transfers.
- Medium: Existing historical personal transfers without `personaId` remain associated with the default personal persona.
- Low: Corporate Payouts remains accessible only when corporate persona is selected.

## Expected Outcome
All selected personas can access the complete Personal Account experience while notifications, received transfers, profile, bank information, and transfer history remain persona-specific.

## Status
Implemented pending Android EAS build validation.

## Follow-Up Actions
1. Trigger Android EAS build and record build URL.
2. Complete APK walkthrough across personal, corporate, and recipient personas.
3. Open a separate technical debt sprint for non-persona TypeScript blockers.

## Reference Documents
- `governance/founder-review-packages/PERSONA_FLOW_CORRECTION_SPRINT_2026-06-17/FOUNDER_BRIEFING.md`
- `governance/founder-review-packages/PERSONA_FLOW_CORRECTION_SPRINT_2026-06-17/TECHNICAL_DESIGN_REPORT.md`
- `governance/founder-review-packages/PERSONA_FLOW_CORRECTION_SPRINT_2026-06-17/PERSONA_FLOW_VALIDATION_REPORT.md`
- `governance/founder-review-packages/PERSONA_FLOW_CORRECTION_SPRINT_2026-06-17/APK_READINESS_REPORT.md`
