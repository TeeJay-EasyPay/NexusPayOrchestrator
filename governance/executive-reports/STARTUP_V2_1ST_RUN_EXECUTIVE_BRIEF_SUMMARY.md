# Startup V2 1st Run Board Summary

## Date
2026-06-01

## Board-Level Position
Startup Architecture V2 succeeded at the application-logic level and failed at production certification.

Repository evidence shows that Startup V1's underlying problem was split startup authority: auth, routing, unlock state, provider startup, and evidence logging were making timing-dependent decisions across multiple surfaces. Startup V2 corrected that architecture by introducing one startup coordinator, one pure decision function, one shared public-route registry, and stronger telemetry.

That redesign produced a clean 20-cycle determinism pass on 2026-05-31. All 20 launches reached `/auth`, all 20 recorded `startupComplete=true`, and no unexpected transitions were recorded. On that evidence alone, the application-layer startup state machine should be considered materially improved and successful.

The programme still ended in NO-GO for production certification. After the telemetry pass, delayed screenshots continued showing the splash surface instead of the sign-in screen. After an Android rebuild and reinstall, later runs failed before JavaScript loaded and foregrounded `expo.modules.devlauncher.launcher.errors.DevLauncherErrorActivity`. The repository therefore proves deterministic routing, but it does not prove a correct user-visible Android launch.

## Executive Calls
- Startup-V2 branch status: Conditionally Ready.
- OTA readiness: No.
- Android build required: Yes.
- iOS native files modified: No evidence.
- iOS build required if iOS is in scope: Yes, because `app.json` changed build-time splash configuration.
- Production certification: NO GO.

## Why These Calls Were Made
- Decision D-011 accepts Startup V2 implementation in the working tree but classifies certification as NO-GO.
- Founder Briefing 012 recommends keeping Startup V2 in place and authorizing a focused native Android remediation pass.
- `app.json` changed the `expo-splash-screen` background from white to `#07111F`, which is not OTA-deliverable.
- No live `android/` files were changed in the current delta, and no tracked `ios/` project exists in the repo snapshot reviewed.
- The current branch state is still a working-tree delta, not a committed branch change-set beyond merge-base.

## What The Founder Needs To Decide
1. Approve Founder Action A-005 and authorize a narrow Android-native validation remediation pass.
2. Keep Startup V2 implementation in place; do not revert the application-layer redesign.
3. Use a physical Android device such as Honor Magic V3 if available, because the first run contains no physical-device evidence.
4. Merge Startup-V2 only if it is explicitly treated as certification-incomplete, not production-ready.
5. Do not run Pilot Certification until startup visual certification is complete.
6. After startup closure, move governance focus to the hanging-transfer and deterministic-resume risk surface identified in Program Status Latest.

## Evidence Referenced
- `governance/startup-architecture-v2/STARTUP_V2_IMPLEMENTATION_SUMMARY_2026-05-31.md`
- `governance/startup-architecture-v2/STARTUP_V2_VALIDATION_EVIDENCE_PACKAGE_2026-05-31.md`
- `governance/startup-architecture-v2/STARTUP_V2_CERTIFICATION_RECOMMENDATION_2026-05-31.md`
- `governance/founder-briefings/briefings/FOUNDER_BRIEFING_012_STARTUP_ARCHITECTURE_V2_VALIDATION_BLOCKER_2026-05-31.md`
- `governance/founder-briefings/PROGRAM_STATUS_LATEST.md`
- `governance/founder-briefings/FOUNDER_ACTION_REGISTER.md`
- `governance/governance-core/DECISION_REGISTER.md`
- `governance/automation/outputs/2026-05-31/startup-determinism-20260531001414/startup-determinism-results.md`
- `governance/automation/outputs/latest/nexuspay-startup-v2-final-waited.png`
- `governance/automation/outputs/latest/nexuspay-dev-error-post-rebuild.png`