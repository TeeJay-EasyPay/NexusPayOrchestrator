# Parallel Workstream Execution Plan

## Date
2026-06-02

## Executive Summary
This plan defines three parallel Founder-directed workstreams and provides branch strategy, governance controls, merge sequencing, and ready-to-copy Codex prompts.

Current repository context indicates:
- Startup V2 is the active startup architecture baseline on the startup-v2 branch.
- Auth routing architecture currently has one live auth route in app/auth.tsx.
- Physical device behavior suggests probable runtime/build parity drift, which is a release-confidence blocker.

Recommended execution model:
1. Run all three workstreams on separate branches.
2. Start all three from the same base: latest stabilized startup-v2 commit.
3. Prioritize Workstream 1 first for certification confidence.
4. Allow Workstream 3 to run in parallel as design-only.
5. Allow Workstream 2 to progress in parallel for UI/product momentum, while deferring release-certification decisions until Workstream 1 closes.

---

## Workstream 1
## Build-to-Device Runtime Parity Investigation

### Branch Name
startup-v2-ws1-build-device-parity

### Objective
Determine exactly why the installed Android physical-device experience does not match repository expectations, and produce a deterministic clean-install and parity-proof procedure.

### Scope
- Android build provenance verification (branch, commit, build profile).
- EAS build/update path analysis (channel, branch, runtimeVersion, update source).
- App identity/config verification (package identifier, update URL, runtimeVersion, release channel behavior).
- Embedded JS vs OTA JS source-of-truth determination.
- Device-side stale state analysis (old binary, cached update, app data persistence).
- Repro matrix: emulator vs physical device.
- Founder-safe clean install procedure with parity evidence criteria.

### Out of Scope
- Feature implementation changes.
- Startup architecture redesign.
- New UX work unrelated to parity diagnosis.

### Required Repository Review
- app.json
- eas.json
- package.json
- expo-env.d.ts
- src/lib/supabase.ts
- src/state/AuthContext.tsx
- src/startup/StartupCoordinator.tsx
- src/startup/startupStateMachine.ts
- app/auth.tsx
- governance/startup-architecture-v2/AUTH_RESTORATION_FIX_IMPLEMENTATION_SUMMARY_2026-06-01.md
- governance/automation/outputs/** (latest parity-relevant runs)

### Files/Directories Likely Involved
- app.json
- eas.json
- app/
- src/startup/
- src/state/
- governance/startup-architecture-v2/
- governance/automation/outputs/
- governance/founder-briefings/briefings/
- governance/executive-reports/

### Risks
- Medium: incomplete build metadata may prevent absolute branch-to-device attribution.
- Medium: OTA and embedded runtime interactions may produce non-obvious behavior.
- Low: investigation-only scope should not introduce product regressions.

### Deliverables
- [governance/founder-briefings/briefings/FOUNDER_BRIEFING_BUILD_TO_DEVICE_PARITY_2026-06-02.md](governance/founder-briefings/briefings/FOUNDER_BRIEFING_BUILD_TO_DEVICE_PARITY_2026-06-02.md)
- [governance/executive-reports/BUILD_TO_DEVICE_PARITY_REVIEW_2026-06-02.md](governance/executive-reports/BUILD_TO_DEVICE_PARITY_REVIEW_2026-06-02.md)

### Validation Criteria
- Proven source of installed device bundle (embedded vs OTA).
- Proven build profile, runtimeVersion, channel, and commit lineage.
- Reproducible parity procedure with pass/fail checklist.
- Explicit decision on whether Startup V2 and pilot certification remain blocked.

### Founder Briefing Filename
FOUNDER_BRIEFING_BUILD_TO_DEVICE_PARITY_2026-06-02.md

### Ready-to-Copy Codex Prompt
```md
Act as NexusPay Repository Intelligence Officer.

Task: Build-to-Device Runtime Parity Investigation only.

Do not implement product features.
Do not redesign Startup V2.
Focus on proving why physical device behavior does not match repository expectations.

Required outcomes:
1. Determine whether installed APK was built from latest startup-v2 commit.
2. Determine whether EAS build/update branch, channel, runtimeVersion, or profile caused stale JS loading.
3. Determine whether app is using embedded JS, OTA JS, or cached stale update.
4. Determine whether uninstall/reinstall, app-data reset, update-channel change, or runtimeVersion change is required.
5. Provide exact clean-install steps Founder can execute to prove parity.

Repository targets to review:
- app.json
- eas.json
- package.json
- src/state/AuthContext.tsx
- src/startup/StartupCoordinator.tsx
- src/startup/startupStateMachine.ts
- app/auth.tsx
- governance/startup-architecture-v2/AUTH_RESTORATION_FIX_IMPLEMENTATION_SUMMARY_2026-06-01.md
- governance/automation/outputs/**

Output documents to create:
- governance/founder-briefings/briefings/FOUNDER_BRIEFING_BUILD_TO_DEVICE_PARITY_2026-06-02.md
- governance/executive-reports/BUILD_TO_DEVICE_PARITY_REVIEW_2026-06-02.md

Reporting requirements:
- Plain-English Founder summary.
- Evidence table mapping each finding to file/config/log source.
- Decision statement: code issue vs build issue vs OTA/cache issue.
- Clear block/unblock recommendation for Startup V2 and pilot certification.

Do not ship code remediation in this workstream unless absolutely required for instrumentation.
If instrumentation is needed, keep it temporary and explicitly marked.
```

---

## Workstream 2
## Transaction Centre V1

### Branch Name
startup-v2-ws2-transaction-centre-v1

### Objective
Deliver a user-facing Transaction Centre V1 for private and future business users, focused on transaction visibility and actionability.

### Scope
- New Transaction Centre screen and navigation entry point.
- Transaction list, search, status/corridor/date filtering.
- Transaction detail (expandable or dedicated view).
- Repeat/resend action path (safe, non-disruptive).
- Receipt/reference/status display.
- Clear loading, error, and empty states.
- Mobile-first UI polish.

### Out of Scope
- Treasury logic changes.
- Corridor execution logic changes.
- Payment execution engine changes.
- Startup/auth architecture redesign.
- Ops telemetry dashboard features.

### Required Repository Review
- app/index.tsx
- app/track.tsx
- app/account.tsx
- src/state/TransferContext.tsx
- src/services/transferService.ts
- src/services/recipientService.ts
- src/types/transfer.ts
- src/components/ui/**
- src/theme/**

### Files/Directories Likely Involved
- app/
- src/components/
- src/state/
- src/services/
- src/types/
- governance/founder-briefings/briefings/
- governance/executive-reports/

### Risks
- Medium: user-scoped data quality depends on auth/session correctness.
- Medium: repeated-transfer UX can accidentally couple to execution logic if not bounded.
- Low: isolated screen/module changes are merge-safe when scoped correctly.

### Deliverables
- [governance/founder-briefings/briefings/FOUNDER_BRIEFING_TRANSACTION_CENTRE_V1_2026-06-02.md](governance/founder-briefings/briefings/FOUNDER_BRIEFING_TRANSACTION_CENTRE_V1_2026-06-02.md)
- [governance/executive-reports/TRANSACTION_CENTRE_V1_IMPLEMENTATION_REPORT_2026-06-02.md](governance/executive-reports/TRANSACTION_CENTRE_V1_IMPLEMENTATION_REPORT_2026-06-02.md)

### Validation Criteria
- Transaction Centre is reachable, stable, and mobile-usable.
- Filter/search/detail/repeat/receipt behaviors work with existing transfer data model.
- Empty/loading/error states are explicit and user-friendly.
- No regression in transfer creation/execution/funding path.
- Auth dependency is clearly documented in founder briefing.

### Founder Briefing Filename
FOUNDER_BRIEFING_TRANSACTION_CENTRE_V1_2026-06-02.md

### Ready-to-Copy Codex Prompt
```md
Act as NexusPay Product Engineer for Transaction Centre V1.

Implement a user-facing Transaction Centre V1 on this branch only.

Must include:
- transaction list
- search
- filters: status, corridor, date
- detail view or expandable card
- repeat/resend action
- receipt/reference display
- status badge
- route/corridor summary
- clear loading, empty, error states

Constraints:
- Do not change treasury logic.
- Do not change corridor execution logic.
- Do not change payment execution engine.
- Reuse existing transfer services/models where possible.

Repository areas to review first:
- app/index.tsx
- app/track.tsx
- src/state/TransferContext.tsx
- src/services/transferService.ts
- src/services/recipientService.ts
- src/types/transfer.ts

If auth/session dependency affects user-scoped history, document dependency explicitly in the implementation report.

Outputs required:
- governance/founder-briefings/briefings/FOUNDER_BRIEFING_TRANSACTION_CENTRE_V1_2026-06-02.md
- governance/executive-reports/TRANSACTION_CENTRE_V1_IMPLEMENTATION_REPORT_2026-06-02.md

Founder briefing must include:
- what was built
- problem solved
- changed screens/files
- how to test
- auth dependency note
- merge-readiness recommendation
```

---

## Workstream 3
## Private User App Experience and Multi-Account Design

### Branch Name
startup-v2-ws3-private-user-experience-multi-account-design

### Objective
Design a simplified private-user NexusPay experience and define a multi-account concept and sequencing roadmap.

### Scope
- Private-user IA and screen model:
  - Home
  - Send Money
  - Transfers
  - Profile
  - Settings
  - Nexus AI (consumer-safe)
- Route choice simplification for private users (Cheapest / Most Stable).
- Multi-account conceptual architecture:
  - account switch model
  - ownership boundaries
  - permissions concept
  - future data-model considerations
- Visual wireframe artifact in repository-friendly format.

### Out of Scope
- Full production implementation of all designed screens.
- Ops/founder telemetry expansion.
- Deep backend migration work.

### Required Repository Review
- app/index.tsx
- app/send.tsx
- app/track.tsx
- app/account.tsx
- app/nexus-ai.tsx
- src/services/nexusAIService.ts
- src/hooks/useNexusAISettings.ts
- docs/UI design and architecture references

### Files/Directories Likely Involved
- docs/
- governance/executive-reports/
- governance/founder-briefings/briefings/
- possibly non-invasive design notes in app/ or src/ if needed for low-risk prototype references

### Risks
- Medium: over-scoping into implementation may collide with Workstream 2.
- Medium: unclear account-permission boundary can create future migration cost.
- Low: design-first branch can progress independently of auth parity closure.

### Deliverables
- [governance/founder-briefings/briefings/FOUNDER_BRIEFING_PRIVATE_USER_EXPERIENCE_AND_MULTI_ACCOUNT_DESIGN_2026-06-02.md](governance/founder-briefings/briefings/FOUNDER_BRIEFING_PRIVATE_USER_EXPERIENCE_AND_MULTI_ACCOUNT_DESIGN_2026-06-02.md)
- [governance/executive-reports/PRIVATE_USER_EXPERIENCE_AND_MULTI_ACCOUNT_DESIGN_2026-06-02.md](governance/executive-reports/PRIVATE_USER_EXPERIENCE_AND_MULTI_ACCOUNT_DESIGN_2026-06-02.md)
- [governance/executive-reports/PRIVATE_USER_APP_VISUAL_WIREFRAME_2026-06-02.md](governance/executive-reports/PRIVATE_USER_APP_VISUAL_WIREFRAME_2026-06-02.md)

### Validation Criteria
- Design explicitly differentiates private-user and operations experiences.
- Visual artifact includes required screen flow and two-route choice model.
- Multi-account concept includes ownership, switching, permissions, and data implications.
- Implementation sequence is pragmatic and risk-ranked.

### Founder Briefing Filename
FOUNDER_BRIEFING_PRIVATE_USER_EXPERIENCE_AND_MULTI_ACCOUNT_DESIGN_2026-06-02.md

### Ready-to-Copy Codex Prompt
```md
Act as NexusPay Product Architect for private-user experience design.

This workstream is primarily design and architecture.
Do not implement broad production code.

Design outputs required:
1. private-user experience architecture
2. multi-account concept design
3. visual wireframe artifact

Required private-user screen model:
- Home
- Send Money
- Transfers
- User Profile
- Settings
- Nexus AI
- (later-phase placeholder) KYC/XML verification

Mandatory design constraints:
- Consumer-friendly, simplified UX
- No operations telemetry clutter in private-user flows
- Send screen route options limited to Cheapest and Most Stable
- Nexus AI must be reassuring and user-centric, not operator-centric

Multi-account design must define:
- account switching model
- ownership boundaries
- permissions concept
- future Supabase data model considerations

Output documents to create:
- governance/founder-briefings/briefings/FOUNDER_BRIEFING_PRIVATE_USER_EXPERIENCE_AND_MULTI_ACCOUNT_DESIGN_2026-06-02.md
- governance/executive-reports/PRIVATE_USER_EXPERIENCE_AND_MULTI_ACCOUNT_DESIGN_2026-06-02.md
- governance/executive-reports/PRIVATE_USER_APP_VISUAL_WIREFRAME_2026-06-02.md

Founder briefing must clearly state:
- what was designed
- why it matters
- how it differs from operations/founder experience
- recommended implementation sequence
- whether any code was changed
- what should be built first
```

---

## Parallel Delivery Governance

### 1. Should they run on separate branches?
Yes. Each workstream should run on a separate branch for isolated delivery and review.

### 2. What should each branch be called?
- startup-v2-ws1-build-device-parity
- startup-v2-ws2-transaction-centre-v1
- startup-v2-ws3-private-user-experience-multi-account-design

### 3. Which branch should be started from?
Start all three from latest stabilized startup-v2 commit (common baseline).

### 4. Which workstream should be implemented first?
Workstream 1 first (parity investigation) because it governs release confidence and certification readiness.

### 5. Which workstream should be design-only?
Workstream 3 should be design-first and architecture-first.

### 6. Which workstream can safely proceed while authentication/parity is unresolved?
- Workstream 3 can fully proceed.
- Workstream 2 can proceed for UI and architecture implementation, but final user-scoped acceptance should note auth dependency.

### 7. What merge order is recommended?
Recommended merge order:
1. Workstream 1 (parity findings and process controls)
2. Workstream 2 (Transaction Centre V1)
3. Workstream 3 documents (can merge anytime if docs-only, but practical order after WS1/WS2 for coherent founder narrative)

### 8. What should block pilot certification?
Pilot certification should remain blocked until Workstream 1 closes with proven repo-to-device parity and startup/auth runtime confidence on physical device.

### 9. What should not block product design?
Workstream 3 private-user and multi-account design should not be blocked by parity investigation.

---

## Recommended Branch Strategy
- Use one branch per workstream.
- Keep branch scopes strict and non-overlapping.
- Enforce branch-specific founder briefings and executive reports.
- Rebase each branch on startup-v2 stabilization checkpoints before merge.

## Recommended Merge Strategy
- Gate all merges through documented evidence and founder-facing briefing quality.
- WS1 merge should include explicit parity decision and certification gate status.
- WS2 merge should include regression checks and auth dependency note.
- WS3 merge should include final visual and architecture sequence decisions.

## Cross-Workstream Risks
- Cross-branch drift if WS2 starts modifying auth behavior while WS1 is investigating parity.
- Delivery confusion if WS3 turns into implementation-heavy changes.
- Certification pressure causing premature close of WS1 before parity proof is complete.

Mitigations:
- Strict scope policing per branch.
- Mandatory weekly cross-workstream checkpoint note in governance/executive-reports.
- Single source of truth for certification gate remains WS1 outputs.

## Founder Decisions Required
1. Approve branch model and names.
2. Approve WS1 as certification-critical priority.
3. Confirm WS3 remains design-only in first pass.
4. Confirm WS2 may proceed in parallel with explicit auth/parity dependency note.
5. Approve merge order and pilot-certification block condition.

---

## Branch Inventory

| Parent branch | Branch name | Creation timestamp | Commit hash used | Purpose | Merge target |
|---|---|---|---|---|---|
| `startup-v2` | `startup-v2-ws1-build-device-parity` | 2026-06-02T11:39:35+01:00 | `779fe7627e655322e0debe6d464f4041ee779f83` | Build-to-device runtime parity investigation and certification gate evidence. | `startup-v2` |
| `startup-v2` | `startup-v2-ws2-transaction-centre-v1` | 2026-06-02T11:39:35+01:00 | `779fe7627e655322e0debe6d464f4041ee779f83` | Transaction Centre V1 product implementation. | `startup-v2` |
| `startup-v2` | `startup-v2-ws3-private-user-experience-multi-account-design` | 2026-06-02T11:39:35+01:00 | `779fe7627e655322e0debe6d464f4041ee779f83` | Private-user experience and multi-account design architecture. | `startup-v2` |

Branch separation control:
- WS1 changes must only be committed to `startup-v2-ws1-build-device-parity`.
- WS2 changes must only be committed to `startup-v2-ws2-transaction-centre-v1`.
- WS3 changes must only be committed to `startup-v2-ws3-private-user-experience-multi-account-design`.
- No workstream branch is authorised for automatic merge.

## Final Recommendation
Launch all three workstreams in parallel from startup-v2 baseline, but treat Workstream 1 as the release/certification gate. Continue product momentum through Workstream 2 and design acceleration through Workstream 3 without waiting for parity closure, while keeping pilot certification blocked until parity is proven.
