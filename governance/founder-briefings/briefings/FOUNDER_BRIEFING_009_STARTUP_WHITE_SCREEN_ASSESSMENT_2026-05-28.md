# Founder Briefing 009

## Subject
Startup White Screen Assessment (Android Dev Client)

## Date
2026-05-28

## Executive Summary
The launch white screen is most likely a native startup display-layer transition issue (splash/starting window), not a core app logic failure. The app runtime is active during the incident, but UI visibility is intermittently masked at launch.

## What We Verified
- Auth/render lifecycle executes repeatedly, confirming JS app activity.
- Splash hide lifecycle events are emitted, confirming hide flow is being triggered.
- Android activity state is resumed/focused during incident windows.
- Automation fails at first visible UI assertion because launch CTA is not rendered to the visible layer.

## Root Cause Position
### Primary Cause
- Native splash/starting-window lifecycle mismatch during startup transitions.

### Secondary Contributors
- Mixed splash control patterns (manual JS control plus native behavior).
- White splash background visually indistinguishable from a blank UI state.
- Separate network/runtime error noise (`Response status 0`) that should be remediated for stability but is not currently assessed as primary to this white-screen symptom.

## Business Impact
- Launch reliability risk in demos and automated runs.
- Elevated perception risk (appears as frozen app to stakeholders).
- No current evidence of payment/auth business-logic corruption.

## Recommendation
Proceed with a narrow, low-risk stabilization pass first:
1. Remove manual JS splash lifecycle control and use one consistent splash pathway.
2. Keep business logic and auth flow untouched.
3. Re-validate launch visibility and rerun automation checks.

## Decision Gate
- GO: targeted splash lifecycle stabilization.
- NO-GO: broad startup refactors before validating the targeted fix.

## Planned File Scope (Targeted Pass)
- app/_layout.tsx
- app/auth.tsx
- app.json
- android/app/src/main/res/values/colors.xml
- android/app/src/main/res/values/styles.xml
- Optional (if needed after first pass): android/app/src/main/java/com/nexuspay/orchestrator/MainActivity.kt

## Success Criteria
- Launch CTA becomes reliably visible post-startup.
- Automation can detect and interact with initial auth/demo controls.
- No regression in auth routing or provider initialization.
