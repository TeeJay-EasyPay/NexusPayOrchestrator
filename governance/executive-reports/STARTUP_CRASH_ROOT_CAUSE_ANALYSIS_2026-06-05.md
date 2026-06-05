# Startup Crash Root Cause Analysis - 2026-06-05

## Executive Summary

The Founder Validation APK crash was caused by the first startup override implementation issuing an Expo Router replacement too early in the native launch lifecycle.

The override was designed to force `/multi-account-preview` before normal Startup V2 session restoration could bypass it. That goal was correct for Founder Validation, but the first implementation allowed `router.replace("/multi-account-preview")` to run from `StartupCoordinator` before the root navigation container was confirmed ready.

Remediation has been implemented in commit:

```text
f30a766a2cd2fdc4622c543d7677455d4f634a37
```

The fix keeps Startup V2 in place, preserves all providers, preserves the Founder Validation first-screen objective, waits for Expo Router navigation readiness, and converts `StartupDecision` to a type-only import.

## Evidence Reviewed

Governance and architecture reviewed before remediation:

- `governance/governance-core/GOVERNANCE_INDEX.md`
- `docs/ARCHITECTURE_PRINCIPLES.md`
- `governance/governance-core/FOUNDER_COMMUNICATION_STANDARD.md`
- `governance/governance-core/FOUNDER_BRIEFING_TEMPLATE.md`
- `governance/startup-architecture-v2/STARTUP_V2_DESIGN_DOCUMENT_2026-05-30.md`
- `governance/startup-architecture-v2/STARTUP_V2_IMPLEMENTATION_SUMMARY_2026-05-31.md`
- `governance/executive-reports/HAS_ACCESS_ROOT_CAUSE_ANALYSIS_2026-06-05.md`
- `governance/executive-reports/FOUNDER_VALIDATION_APK_CRASH_ANALYSIS_2026-06-05.md`
- `governance/executive-reports/FOUNDER_VALIDATION_STARTUP_OVERRIDE_IMPLEMENTATION_REPORT_2026-06-05.md`

Runtime limitation:

```text
adb devices
List of devices attached
```

No Android device was attached during this remediation session, so root cause is based on code-path analysis and the known before/after symptom timing.

## Startup Execution Trace

Root provider order remains:

```text
app/_layout.tsx
  -> AccountProvider
  -> AuthProvider
  -> DeviceUnlockProvider
  -> WalletProvider
  -> PaymentMethodsProvider
  -> TransferProvider
  -> StartupCoordinator
  -> Stack
```

Provider evidence:

- `app/_layout.tsx:35-50` mounts all required providers before `Stack` routes render.

## Root Cause Identified

### Exact Failure Point

The crash-risk point was:

```text
src/startup/StartupCoordinator.tsx
router.replace(target as never)
```

In the first override implementation, the Founder Validation decision could return:

```text
routeAction.type = replace
targetRoute = /multi-account-preview
```

before:

- auth bootstrap had settled
- Expo Router root navigation container readiness was known
- the native APK launch lifecycle had fully mounted navigation state

The strongest root-cause classification is:

```text
early Expo Router imperative navigation before root navigation readiness
```

### Why This Was New

Before the override, normal Startup V2 delayed route changes while startup was bootstrapping.

After the override, `StartupCoordinator` intentionally bypassed the normal auth/session/device-lock state machine for Founder Validation and could attempt a route replacement immediately.

That changed startup timing and created the crash window.

## Other Causes Reviewed

### Type-Only Import Risk

The first override imported `StartupDecision` as a normal named import:

```ts
import { resolveStartupDecision, StartupDecision } from "./startupStateMachine";
```

`StartupDecision` is a TypeScript type. While the local transform normally strips it, a production bundle should not rely on runtime handling of type-only symbols.

Remediation:

```ts
import { resolveStartupDecision } from "./startupStateMachine";
import type { StartupDecision } from "./startupStateMachine";
```

Evidence:

- `src/startup/StartupCoordinator.tsx:17-18`

### Provider Readiness

Providers are not the likely root cause.

Evidence:

- `_layout` mounts `AccountProvider`, `AuthProvider`, and `DeviceUnlockProvider` above `StartupCoordinator`.
- `AccountProvider` provides default values before AsyncStorage scope loading finishes.
- `AuthProvider` provides default values before Supabase bootstrap finishes.
- `DeviceUnlockProvider` provides default values before biometric availability check finishes.

### Startup Loop or Race

A loop was possible in theory because the first override used `founderValidationRouteReachedRef`, which is updated after pathname changes.

The existing `redirectInFlightRef` reduced duplicate replacement risk, but the real weakness was still that navigation could be attempted before root navigation readiness.

Remediation now gates the replacement on `rootNavigationReady`.

## Remediation Implemented

File changed:

```text
src/startup/StartupCoordinator.tsx
```

### 1. Router Readiness Hook

Added:

```ts
useNavigationContainerRef
```

Evidence:

- `src/startup/StartupCoordinator.tsx:1`
- `src/startup/StartupCoordinator.tsx:35`

### 2. Root Navigation Ready State

Added:

```ts
const [rootNavigationReady, setRootNavigationReady] = useState(false);
```

Evidence:

- `src/startup/StartupCoordinator.tsx:51`

### 3. Readiness Watcher

Added a requestAnimationFrame readiness watcher:

```text
rootNavigationRef.current?.isReady()
```

Evidence:

- `src/startup/StartupCoordinator.tsx:119-148`

This watcher sets `rootNavigationReady` only after Expo Router's navigation container reports readiness.

### 4. Safe Redirect Gate

Added a guard before route replacement:

```ts
if (!rootNavigationReady) {
  return;
}
```

Evidence:

- `src/startup/StartupCoordinator.tsx:210-212`

The actual replacement remains:

```ts
router.replace(target as never);
```

Evidence:

- `src/startup/StartupCoordinator.tsx:237`

### 5. Type-Only Import

Converted `StartupDecision` to a type-only import.

Evidence:

- `src/startup/StartupCoordinator.tsx:17-18`

## Startup Flow After Remediation

```text
App launch
  -> _layout mounts providers and Stack
  -> StartupCoordinator computes Founder Validation decision
  -> decision may target /multi-account-preview
  -> redirect effect checks rootNavigationReady
  -> if navigation is not ready:
       do not call router.replace()
       keep startup overlay
  -> readiness watcher observes rootNavigationRef.current?.isReady()
  -> rootNavigationReady becomes true
  -> redirect effect runs
  -> router.replace("/multi-account-preview")
  -> /multi-account-preview renders as content
```

## Validation Results

### ESLint

Command:

```powershell
npx eslint src\startup\StartupCoordinator.tsx src\startup\startupStateMachine.ts app\multi-account-preview.tsx app\consumer\index.tsx app\consumer\send.tsx app\consumer\track.tsx app\consumer\transfers.tsx app\consumer\profile.tsx app\consumer\settings.tsx app\consumer\nexus-ai.tsx src\components\consumer\ConsumerShell.tsx src\components\consumer\consumerData.ts
```

Result:

```text
Passed with no reported ESLint errors.
```

### Static Route Validation

Confirmed:

- `FOUNDER_VALIDATION_STARTUP_OVERRIDE_ENABLED`
- `/multi-account-preview`
- `/consumer`
- `/consumer/send`
- `/consumer/track`
- `/consumer/transfers`
- `/consumer/profile`
- `/consumer/settings`
- `/consumer/nexus-ai`

### TypeScript

Command:

```powershell
npx tsc --noEmit
```

Result:

```text
Failed on known unrelated baseline errors.
```

Known baseline blockers remain in:

- `app/index.tsx`
- `src/components/operations/OperationsCommandCentre.tsx`
- `src/hooks/useOperationsCommandCentre.ts`
- `src/services/execution/executionRealtimeService.ts`
- `src/services/intelligence/contextBuilder.ts`

No new TypeScript blocker was identified in the remediated startup file.

### Physical Device

Physical-device validation was not completed in this session because no Android device was attached.

## Root Cause Conclusion

The exact root cause was:

```text
Founder Validation override called router.replace before Expo Router root navigation readiness was confirmed.
```

The crash was not caused by missing providers or missing routes. The branch had the route and screens. The failure was startup lifecycle timing.

## Commit Hash

```text
f30a766a2cd2fdc4622c543d7677455d4f634a37
```

## Recommended APK Build Branch

```text
startup-v2-founder-validation-consumer-multi-account
```

