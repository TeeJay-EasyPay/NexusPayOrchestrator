# Authentication Resolution Report

## Date
2026-06-02

## Branch
`startup-v2-ws1-device-auth-resolution`

## Objective
Resolve whether current authentication, Demo User access, Sign Out behavior, and Startup V2 routing explain the reported physical-device behavior.

## Executive Finding
The current repository authentication design is internally consistent. The reported physical-device behavior is not explained by multiple live auth implementations in the current source.

Current source expects:
- Unauthenticated protected launch redirects to `/auth`.
- `/auth` renders `app/auth.tsx`.
- `app/auth.tsx` includes Demo Workspace access.
- Sign Out clears local auth state and Startup V2 redirects to `/auth`.

If a physical device shows Home while effectively signed out, or shows an auth screen without Demo Workspace access, the strongest repository-backed explanation remains runtime drift: old APK, OTA JS, cached update, or stale device state.

## Evidence Table
| Area | Source | Finding | Status |
|---|---|---|---|
| Auth provider | `src/state/AuthContext.tsx` | Validates restored sessions using `supabase.auth.getUser()` and clears stale restored sessions. | Proven |
| Demo access | `src/state/AuthContext.tsx`, `app/auth.tsx` | Demo access is implemented through `enableDemoAccess()` and shown as `Enter Demo Workspace`. | Proven |
| Startup routing | `src/startup/startupStateMachine.ts`, `src/startup/StartupCoordinator.tsx` | Unauthenticated protected routes are replaced with `/auth`. | Proven |
| Sign Out | `src/state/AuthContext.tsx`, `app/account.tsx`, `src/components/navigation/AppDropdownMenu.tsx` | Sign Out sets session to null and unauthenticated phase, allowing Startup V2 to route to `/auth`. | Proven |
| Previous auth architecture review | `AUTHENTICATION_ARCHITECTURE_REVIEW_.md` | One live auth route and one live Startup V2 routing authority are documented. | Proven |
| Physical-device auth behavior | Device evidence | No current device log/screenshot evidence was present in repository. | Not proven |

## Pass / Fail Criteria
### Pass
Authentication resolution is PASS when a clean physical-device run proves:
- Cold unauthenticated launch reaches `/auth`.
- `/auth` visibly includes Demo Workspace access.
- Sign Out from a protected screen returns to the same `/auth`.
- Startup V2 logs show `unauthenticated-protected-route` followed by `allow:/auth`.
- Supabase restored-session validation logs match current `AuthContext.tsx`.

### Fail
Authentication resolution is FAIL if:
- Physical device reaches Home with no valid session.
- `/auth` does not include Demo Workspace access while current code is proven to be running.
- Sign Out routes to a different auth implementation.
- Current Startup V2 events are absent from device logs.

## Engineering Decisions
1. Do not redesign authentication until device provenance is proven.
2. Do not add temporary instrumentation in this branch because the current logs already contain Startup V2 and auth events required for the next proof run.
3. Treat WS1 as certification evidence, not product remediation.

## Assumptions
- Existing Startup V2 log events are available in physical-device logcat.
- Demo credentials are correctly configured in the environment used for the device build.

## Risks
| Risk | Level | Mitigation |
|---|---|---|
| Demo credentials missing in installed build | Medium | Record environment/profile used for the build. |
| Supabase session state persists across reinstall-like tests | Medium | Use uninstall or `pm clear` before proof run. |
| OTA update masks embedded JS | High | Capture update source and update ID before certifying. |

## Merge Readiness
Merge-ready as an evidence report. Release readiness remains blocked until physical-device pass criteria are met.
