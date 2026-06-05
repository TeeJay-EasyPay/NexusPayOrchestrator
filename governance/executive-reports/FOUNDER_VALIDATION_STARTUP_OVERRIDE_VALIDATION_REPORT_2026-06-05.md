# Founder Validation Startup Override Validation Report - 2026-06-05

## Executive Summary

Validation confirms the Founder Validation startup override is present, statically routes launch to `/multi-account-preview`, preserves reachable consumer routes, and passes targeted ESLint.

Physical-device visual validation was not completed because no Android device was attached through ADB in this session.

## Branch Validated

```text
startup-v2-founder-validation-consumer-multi-account
```

Implementation commit:

```text
76f93e7a397ccdd7b2551c19c399af979fc5b96f
```

## Validation Results

### 1. Branch Check

Command:

```powershell
git status --short --branch
```

Result:

```text
## startup-v2-founder-validation-consumer-multi-account...origin/startup-v2-founder-validation-consumer-multi-account
```

The working branch is the required Founder Validation branch.

### 2. Implementation Scope Check

Command:

```powershell
git show --name-only --oneline HEAD
```

Result:

```text
76f93e7 Add founder validation startup override
src/startup/StartupCoordinator.tsx
src/startup/startupStateMachine.ts
```

Only two implementation files were modified in the implementation commit.

### 3. Targeted ESLint

Command:

```powershell
npx eslint src\startup\StartupCoordinator.tsx src\startup\startupStateMachine.ts app\multi-account-preview.tsx app\consumer\index.tsx app\consumer\send.tsx app\consumer\track.tsx app\consumer\transfers.tsx app\consumer\profile.tsx app\consumer\settings.tsx app\consumer\nexus-ai.tsx src\components\consumer\ConsumerShell.tsx src\components\consumer\consumerData.ts
```

Result:

```text
Passed with no reported ESLint errors.
```

### 4. Static Startup Override Check

Command:

```powershell
rg 'FOUNDER_VALIDATION_STARTUP_OVERRIDE|founder-validation|DEFAULT_UNAUTHENTICATED_STARTUP_ROUTE' src app -n
```

Evidence:

- `src/startup/StartupCoordinator.tsx:21` defines `FOUNDER_VALIDATION_STARTUP_OVERRIDE_ENABLED = true`.
- `src/startup/StartupCoordinator.tsx:22` sets the override route to `DEFAULT_UNAUTHENTICATED_STARTUP_ROUTE`.
- `src/startup/StartupCoordinator.tsx:77` emits reason `founder-validation-startup-override`.
- `src/startup/StartupCoordinator.tsx:83-84` emits `founder-validation-*` routing decisions.
- `src/startup/startupRoutes.ts:2` defines `DEFAULT_UNAUTHENTICATED_STARTUP_ROUTE = "/multi-account-preview"`.

Result:

```text
Passed static override check.
```

### 5. Static Route Reachability Check

Command:

```powershell
rg 'multi-account-preview|/consumer' src app -n
```

Evidence:

- `/multi-account-preview` exists in `app/multi-account-preview.tsx`.
- `app/multi-account-preview.tsx:81` routes Personal Account to `/consumer`.
- `src/startup/startupRoutes.ts:2` defines `/multi-account-preview` as the unauthenticated startup route.
- `src/startup/startupRoutes.ts:5` lists `/multi-account-preview` as public.
- Consumer shell defines:
  - `/consumer`
  - `/consumer/send`
  - `/consumer/track`
  - `/consumer/transfers`
  - `/consumer/profile`
- Consumer screens also link to:
  - `/consumer/settings`
  - `/consumer/nexus-ai`

Result:

```text
Passed static route reachability check.
```

### 6. Full TypeScript Check

Command:

```powershell
npx tsc --noEmit
```

Result:

```text
Failed on known unrelated baseline errors.
```

Observed blockers:

- stale `/operations` typed route reference in `app/index.tsx`
- stale helper imports in `src/components/operations/OperationsCommandCentre.tsx`
- undefined diagnostic variables in `src/hooks/useOperationsCommandCentre.ts`
- Supabase realtime overload typing in `src/services/execution/executionRealtimeService.ts`
- disconnected intelligence context builder import/type mismatches in `src/services/intelligence/contextBuilder.ts`

Assessment:

These errors were known before the Founder Validation override and are outside the implementation scope.

### 7. Physical Device Check

Command:

```powershell
adb devices
```

Result:

```text
List of devices attached
```

No device was attached. Physical-device visual validation could not be completed in this session.

## Startup Flow Before

```text
App launch
  -> AuthProvider restores session
  -> StartupCoordinator calls resolveStartupDecision()
  -> hasAccess = sessionPresent || demoAccessEnabled
  -> Startup V2 bypasses /multi-account-preview
  -> Unlock NexusPay
  -> Home Screen
```

## Startup Flow After

```text
App launch
  -> StartupCoordinator Founder Validation override
  -> replace to /multi-account-preview
  -> allow /multi-account-preview content
  -> Demo Workspace routes to /
  -> Personal Account routes to /consumer
```

## First Screen Confirmation

Static validation confirms the first startup route decision now targets:

```text
/multi-account-preview
```

Physical-device confirmation remains pending because no device was attached.

## Issues Discovered

- No new lint issues in touched startup or validation-flow files.
- No new TypeScript-specific evidence of failure in the touched files.
- Full TypeScript remains blocked by existing non-startup baseline errors.
- Physical-device proof is still required.

## Recommended APK Build Branch

```text
startup-v2-founder-validation-consumer-multi-account
```

## Founder Recommendation

Proceed to APK generation from the recommended branch when ready, then validate on a physical device that the first visible application screen is:

```text
NexusPay Multi-Account Preview
```

Do not treat this override as production startup policy.

