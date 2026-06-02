# Build-To-Device Runtime Parity Review

## Date
2026-06-02

## Branch
`startup-v2-ws1-build-device-parity`

## Baseline
- Parent branch: `startup-v2`
- Baseline commit used for branch creation: `779fe7627e655322e0debe6d464f4041ee779f83`
- Scope: investigation only; no product feature remediation.

## Executive Decision
Startup V2 and pilot certification remain blocked until physical-device parity is proven.

Current repository evidence supports a build/runtime parity issue or OTA/cache issue more strongly than a Startup V2 code-routing issue. The reviewed source has one live auth route, one startup coordinator, and deterministic unauthenticated routing to `/auth`. Existing automation evidence shows JS reaching `/auth` and emitting `startupComplete=true`, but visual/native validation remains inconclusive or failed.

## Decision Statement
| Question | Current answer | Confidence | Evidence |
|---|---|---:|---|
| Is the current code expected to route unauthenticated protected launch to `/auth`? | Yes. | High | `src/startup/startupStateMachine.ts`, `src/startup/StartupCoordinator.tsx`, `app/auth.tsx` |
| Are Startup V2 and sign-out using different active auth implementations? | No evidence of that in live app code. | High | `AUTHENTICATION_ARCHITECTURE_REVIEW_.md`, `app/auth.tsx`, `src/state/AuthContext.tsx` |
| Is the installed physical APK proven to be built from the latest `startup-v2` commit? | Not proven from repository evidence alone. | Medium | No build provenance artifact tying physical device binary to commit was found in reviewed files. |
| Is the app proven to be running embedded JS rather than OTA or cached JS? | Not proven. | High | `app.json` enables Expo Updates on load with fixed `runtimeVersion` `1.0.0`; `eas.json` uses `development`, `preview`, and `production` channels. |
| Is an OTA/cache issue plausible? | Yes. | High | `app.json`, `eas.json`, physical symptoms documented in `AUTHENTICATION_ARCHITECTURE_REVIEW_.md`. |
| Is a product feature remediation required in WS1? | No. | High | Current repository path is coherent; blocker is proof/provenance, not feature behavior. |

## Evidence Table
| Finding | Evidence source | What it proves | Remaining gap |
|---|---|---|---|
| Expo Updates is enabled and checks on app load. | `app.json` -> `updates.enabled=true`, `checkAutomatically=ON_LOAD`, `fallbackToCacheTimeout=0` | Device may load OTA JS instead of only embedded JS. | Need device-side update ID/source evidence. |
| Runtime version is fixed at `1.0.0`. | `app.json` -> `runtimeVersion` | Multiple builds/updates can share a runtime unless version is bumped intentionally. | Need EAS branch/channel/update mapping for installed app. |
| Build channels are profile-specific. | `eas.json` -> `development`, `preview`, `production` channels | Installed behavior depends on the build profile/channel combination. | Need installed build profile and channel proof. |
| Package identity is stable. | `app.json` -> Android package `com.nexuspay.orchestrator` | Clean-install commands can target one app ID. | Need physical device package dump for installed version/update state. |
| Supabase sessions persist through AsyncStorage. | `src/lib/supabase.ts` -> `persistSession=true`, AsyncStorage auth storage | Stale local auth state can exist across app launches unless data is cleared. | Need clean app-data reset before parity proof. |
| Restored sessions are validated against Supabase user. | `src/state/AuthContext.tsx` | Current code should clear stale restored sessions and become unauthenticated if validation fails. | Need physical logs proving this exact code is executing. |
| Startup V2 replaces unauthenticated protected routes with `/auth`. | `src/startup/startupStateMachine.ts`, `src/startup/StartupCoordinator.tsx` | Current routing authority should not show protected home for unauthenticated state. | Need physical launch logs from the installed binary. |
| Auth UI includes demo workspace entry. | `app/auth.tsx` | Current `/auth` should render `Enter Demo Workspace`. | Missing demo button on device indicates runtime drift or different bundle. |
| Prior automation reached `/auth` with `startupComplete=true`. | `governance/automation/outputs/metro-auth-fix.out.log`, `governance/startup-architecture-v2/AUTH_RESTORATION_FIX_IMPLEMENTATION_SUMMARY_2026-06-01.md` | JS route and auth state path can settle correctly. | Screenshot evidence was black/inconclusive; not physical-device proof. |
| Earlier Startup V2 certification stayed NO-GO. | `governance/startup-architecture-v2/STARTUP_V2_CERTIFICATION_RECOMMENDATION_2026-05-31.md` | Telemetry pass alone was not enough because native visual validation failed. | Need clean native/device visual validation. |

## Clean-Install Parity Procedure
Use this procedure on the Founder device or a fresh Android test device.

1. Confirm the branch and commit to be tested:
   - Branch: `startup-v2` or the explicitly selected workstream branch.
   - Commit: record `git rev-parse HEAD`.
2. Build or install from that exact commit:
   - For development-client validation, rebuild/install the development build from the same commit.
   - For preview/production validation, record EAS build ID, profile, channel, runtime version, and Git commit.
3. Remove stale device state:
   - `adb uninstall com.nexuspay.orchestrator`
   - Reinstall the selected APK/build.
   - If uninstall is not possible, run `adb shell pm clear com.nexuspay.orchestrator` before launch.
4. Clear OTA ambiguity for the test:
   - Record the EAS channel used by the installed binary.
   - Record any update ID or update metadata emitted by Expo Updates if available.
   - If testing embedded JS only, use a build/update configuration that cannot fetch an older OTA update.
5. Launch and capture evidence:
   - Android package dump for `com.nexuspay.orchestrator`.
   - Logcat lines containing `auth-bootstrap`, `supabase-user-validation`, `startup-v2-decision`, `startup-v2-route-replace`, `startup-v2-splash-hide`, `AUTH-MOUNT`, and `AUTH-RENDER`.
   - Screenshot after `startupComplete=true`.
6. Pass criteria:
   - Logs show current Startup V2 schema and expected route decision.
   - Unauthenticated clean launch reaches `/auth`.
   - `/auth` visibly shows `Enter Demo Workspace`.
   - Sign-out returns to the same `/auth` implementation.
   - Screenshot evidence matches telemetry after `startupComplete=true`.
7. Fail criteria:
   - Device renders a login UI without the demo workspace button.
   - Device opens protected home while logs show no valid session.
   - Logs are missing current Startup V2 events.
   - Device foregrounds `DevLauncherErrorActivity`.
   - Screenshot remains native splash after `startupComplete=true`.

## Block / Unblock Recommendation
Startup V2 certification: blocked.

Pilot certification: blocked.

WS2 and WS3 continuation: allowed, provided they do not alter Startup V2 auth/routing, treasury execution, or device-parity assumptions.

## Required Next Evidence
1. Physical-device package/build provenance: build ID, profile, channel, runtimeVersion, commit hash.
2. Device-side JS source proof: embedded bundle vs OTA update vs cached update.
3. Clean-install launch logs and screenshot after `startupComplete=true`.
4. Sign-out-to-`/auth` logs and screenshot from the same install.
5. Explicit pass/fail matrix comparing emulator and physical device.

## Merge Readiness
WS1 is merge-ready as an investigation/reporting branch after the required documents are reviewed. It does not unblock Startup V2 certification by itself; it defines the proof gate that must pass before certification can reopen.
