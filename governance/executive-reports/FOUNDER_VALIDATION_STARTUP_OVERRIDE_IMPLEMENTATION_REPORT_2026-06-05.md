# Founder Validation Startup Override Implementation Report - 2026-06-05

## Executive Summary

A Founder Validation startup override has been implemented on:

```text
startup-v2-founder-validation-consumer-multi-account
```

The override is branch-scoped and forces app launch to `/multi-account-preview` before normal Startup V2 access, session, lock, and protected-route policy can bypass the Founder Validation entry screen.

No APK was generated. No EAS build was run. No merges were performed into `startup-v2` or any workstream branch.

## Files Modified

Implementation files modified:

- `src/startup/StartupCoordinator.tsx`
- `src/startup/startupStateMachine.ts`

Report files created:

- `governance/executive-reports/FOUNDER_VALIDATION_STARTUP_OVERRIDE_IMPLEMENTATION_REPORT_2026-06-05.md`
- `governance/executive-reports/FOUNDER_VALIDATION_STARTUP_OVERRIDE_VALIDATION_REPORT_2026-06-05.md`
- `governance/founder-briefings/briefings/FOUNDER_BRIEFING_FOUNDER_VALIDATION_STARTUP_OVERRIDE_2026-06-05.md`

## Startup Flow Before

Before the change, Startup V2 executed the normal banking startup policy:

```text
App launch
  -> app/_layout.tsx
  -> AuthProvider restores Supabase session
  -> DeviceUnlockProvider supplies lock state
  -> StartupCoordinator calls resolveStartupDecision()
  -> hasAccess = sessionPresent || demoAccessEnabled
  -> authenticated or locked user bypasses /multi-account-preview
  -> Unlock NexusPay
  -> Home Screen
```

Relevant prior condition:

```text
src/startup/startupStateMachine.ts
resolveStartupDecision()
hasAccess = input.sessionPresent || input.demoAccessEnabled
```

The earlier root-cause analysis found that Supabase session restoration from AsyncStorage was the most likely source of `hasAccess === true`.

## Startup Flow After

After the change, `StartupCoordinator` applies a Founder Validation override before calling the normal state machine:

```text
App launch
  -> app/_layout.tsx
  -> providers mount
  -> StartupCoordinator
  -> Founder Validation override checks whether /multi-account-preview has been reached
  -> if not reached:
       routeAction = replace
       targetRoute = /multi-account-preview
       reason = founder-validation-startup-override
  -> when /multi-account-preview is reached:
       routeAction = allow
       renderMode = content
       startupComplete = true
```

From the preview screen:

```text
NexusPay Multi-Account Preview
  -> Demo Workspace
        -> /
        -> Corporate Experience

  -> Personal Account
        -> /consumer
        -> Consumer Experience
```

After the preview has been reached, non-preview routes fall back to existing Startup V2 logic. The override continues allowing `/multi-account-preview` itself so authenticated or locked public-route policy does not immediately redirect away from the validation entry screen.

## Implementation Detail

`src/startup/StartupCoordinator.tsx`

- Lines 21-22 define the branch override and target route:

```text
FOUNDER_VALIDATION_STARTUP_OVERRIDE_ENABLED = true
FOUNDER_VALIDATION_STARTUP_ROUTE = DEFAULT_UNAUTHENTICATED_STARTUP_ROUTE
```

- Lines 56-85 return a Founder Validation startup decision before `resolveStartupDecision()` is called.
- Lines 63-85 explicitly set:
  - `phase: "unauthenticated"`
  - `isPublicRoute: true`
  - `hasAccess: false`
  - `targetRoute: /multi-account-preview`
  - `renderMode: content` once the preview route is reached
  - `routingDecision: founder-validation-*`
- Lines 88-97 preserve the original Startup V2 state-machine call for non-preview routes after the validation entry route has been reached.
- Lines 110-112 record that the validation route has been reached.

`src/startup/startupStateMachine.ts`

- Lines 19-23 add the telemetry reason:

```text
founder-validation-startup-override
```

No production startup branch was modified.

## Existing Startup Logic Remaining Active

Yes. Existing Startup V2 logic remains active after the validation preview has been reached and the user navigates to a non-preview route.

Active after preview:

- AuthProvider session restoration
- DeviceUnlockProvider lock/unlock state
- Normal protected-route policy for `/`, `/consumer`, and other protected surfaces
- Startup evidence logging
- Splash hide behavior

Bypassed for initial Founder Validation entry:

- `sessionPresent`
- `demoAccessEnabled`
- restored authenticated session
- biometric lock state
- protected-route redirect policy
- authenticated-public-route redirect policy

## Commit Hash

Implementation commit:

```text
76f93e7a397ccdd7b2551c19c399af979fc5b96f
```

Commit message:

```text
Add founder validation startup override
```

## Recommended APK Build Branch

Use:

```text
startup-v2-founder-validation-consumer-multi-account
```

## Risks

- This is intentionally not production startup behavior.
- The override is hard-enabled on the Founder Validation branch.
- Physical-device visual confirmation was not completed in this session because no Android device was attached through ADB.
- Full repository TypeScript remains blocked by known unrelated baseline errors outside this implementation.

## Founder Recommendation

Use this branch as the APK source for Founder Validation testing of:

- first-screen Multi-Account Preview
- Demo Workspace / Corporate Experience
- Personal Account / Consumer Experience

Do not merge this override into production startup branches without a separate product decision.

