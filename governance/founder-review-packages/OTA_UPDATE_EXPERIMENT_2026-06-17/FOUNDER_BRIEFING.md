# Founder Briefing: OTA Update Experiment Remediation Sprint

Date: 2026-06-17

## 1. Executive Summary
The OTA Update Experiment Remediation Sprint addresses two active workspace navigation defects without changing Startup V2, authentication, Supabase schema, or native Android configuration.

The remediation makes corporate/workspace hamburger menus scrollable on constrained viewports and foldable devices, and promotes Alerts into explicit active-workspace navigation for participant and corporate personas. Alerts now routes directly to the current active persona/workspace notification screen rather than relying on any stored or previously selected persona fallback.

Deployment target: EAS OTA update to preview.

## 2. Root Cause Analysis
### Corporate Workspace Drawer Menu
Root cause: the hamburger/dropdown menu was rendered as a fixed `View` with no internal scroll container. As menu items grew after persona and workspace features were added, lower menu options could render below the visible screen on standard phones.

Remediation:
- Bound dropdown height to the current viewport using `useWindowDimensions`.
- Wrapped drawer menu items in `ScrollView`.
- Enabled nested scrolling where menus are rendered inside existing scrollable surfaces.

### Alerts Navigation Defect
Root cause: workspace/persona navigation had two weak points:
- Corporate persona did not expose Alerts as an explicit bottom navigation target in the `Screen` chrome.
- Consumer/corporate shell bottom navigation was static and did not treat participant/corporate Alerts as an active workspace route.

Remediation:
- Added Alerts and Received tabs for active participant personas, including the corporate persona.
- Corporate persona bottom navigation now includes Payouts, Alerts, Received, and Profile.
- Alerts route is always `/participant-notifications` and reads `selectedPersona.participantId` from the active context.
- No Alerts path reads `getStoredPersonaId` or restores a previous persona.

## 3. Files Modified
- `src/components/navigation/AppDropdownMenu.tsx`
- `src/components/navigation/AppMenu.tsx`
- `src/components/consumer/ConsumerShell.tsx`

## 4. Security Impact Assessment
Security posture is unchanged or improved.

- No authentication logic changed.
- No Startup V2 state machine or coordinator logic changed.
- No Supabase RLS or schema changes were made.
- Notifications continue to query by active `selectedPersona.participantId`.
- Received transfers continue to query by active recipient participant ID.
- The remediation reduces cross-workspace leakage risk by making Alerts an explicit active-context route.

## 5. Validation Results
Targeted lint:

```powershell
npx eslint src\components\navigation\AppDropdownMenu.tsx src\components\navigation\AppMenu.tsx src\components\consumer\ConsumerShell.tsx app\participant-notifications.tsx app\received-transfers.tsx app\corporate-payouts.tsx --max-warnings=0
```

Result: PASS.

Full TypeScript:

```powershell
npx tsc --noEmit
```

Result: BLOCKED by pre-existing non-remediation technical debt:
- Legacy Operations component imports removed helper exports.
- Operations hook diagnostic bypass references undefined variables.
- Supabase realtime overload typing errors.
- Intelligence context builder references unavailable exports and a typoed route field.
- Supabase Edge Function Deno imports are included in the app TypeScript project.

Manual/code-path validation:
- Drawer menu now has viewport-bounded scroll behavior.
- Lower hamburger menu items remain reachable through vertical scrolling.
- Corporate bottom navigation exposes Alerts explicitly.
- Consumer shell participant/corporate bottom navigation exposes Alerts explicitly.
- Alerts reads the current active `selectedPersona.participantId`.
- No Alerts route depends on stored previous persona selection.

## 6. Git Commit ID
Code commit: `bdf5868` (`Fix workspace drawer and alerts navigation`)
Report/OTA commit: PENDING_REPORT_COMMIT_ID

## 7. OTA Update ID
OTA Update ID: PENDING_OTA_UPDATE_ID

## 8. OTA Publication Status
Status: PENDING_OTA_PUBLICATION

## 9. Whether A Full APK Build Was Avoided
Full APK build avoided: PENDING_OTA_RESULT

No native dependencies, native configuration, Android project files, or EAS build profile changes were introduced. This remediation is JavaScript/TypeScript only and is suitable for OTA publication.

## 10. Recommended Next Actions
1. Publish EAS OTA update to preview.
2. Validate on a standard phone and foldable viewport that hamburger menu items are reachable.
3. Validate corporate persona Alerts from bottom navigation and drawer.
4. Validate recipient persona Alerts and Received Transfers still use persona-specific data.
5. Plan a separate technical debt sprint for existing TypeScript blockers.
