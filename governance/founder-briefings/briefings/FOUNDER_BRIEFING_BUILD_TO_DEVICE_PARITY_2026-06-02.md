# Founder Briefing: Build-To-Device Runtime Parity

## Date
2026-06-02

## Founder Summary
The repository code and the reported physical-device behavior still do not line up.

In the current code, unauthenticated startup should go to `/auth`, and that auth screen includes the Demo Workspace button. If a physical device opens Home while effectively signed out, or shows a login screen without demo access, the most likely explanation is that the device is running a different runtime: an older APK, an OTA update, or cached app state.

## What Was Reviewed
- `app.json`
- `eas.json`
- `package.json`
- `expo-env.d.ts`
- `src/lib/supabase.ts`
- `src/state/AuthContext.tsx`
- `src/startup/StartupCoordinator.tsx`
- `src/startup/startupStateMachine.ts`
- `app/auth.tsx`
- `AUTHENTICATION_ARCHITECTURE_REVIEW_.md`
- `governance/startup-architecture-v2/*`
- `governance/automation/outputs/*`

## Key Findings
1. Current code has one live Startup V2 routing authority and one live `/auth` route.
2. Current `/auth` includes the Demo Workspace control.
3. Expo Updates is enabled on app load, and the runtime version is fixed at `1.0.0`.
4. EAS build channels are split across `development`, `preview`, and `production`.
5. Prior automation shows JS reaching `/auth` and `startupComplete=true`, but visual/device proof is not yet sufficient.

## Decision
This is not certified as a code fix or release-ready state yet.

The current decision is: probable build, OTA, cache, or installed-runtime drift until physical-device evidence proves otherwise.

## Certification Recommendation
Startup V2 remains blocked for certification.

Pilot certification remains blocked until WS1 parity proof passes on a clean physical-device install.

## Founder Clean-Install Proof Required
The next validation should prove:
- exact installed APK/build profile
- exact Git commit used
- exact EAS channel and runtime version
- whether the device is running embedded JS, OTA JS, or cached JS
- clean launch routes to `/auth`
- `/auth` visibly shows Demo Workspace
- sign-out returns to the same `/auth` screen

## Workstream Impact
WS1 blocks Startup V2 certification.

WS1 should not automatically block Transaction Centre V1 or private-user design work, provided those branches do not change startup/auth architecture.

## Founder Decision Required
Approve the clean physical-device parity run using the procedure in `governance/executive-reports/BUILD_TO_DEVICE_PARITY_REVIEW_2026-06-02.md`.
