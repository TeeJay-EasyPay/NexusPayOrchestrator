# Root Cause Analysis Report: Personal Account Workspace Crash

Date: 2026-06-07
Author: Chief Technology Officer
Severity: Critical — Blocking Founder Validation

---

## Executive Summary

A definitive runtime crash was identified in the Personal Account workspace. The crash occurs immediately on render of the Consumer Home Screen after successful authentication and navigation. This is a code defect introduced by an edit between the 2026-06-06 sprint commit and this investigation, not an architecture, routing, or authentication failure.

---

## Observed Behaviour

- Demo Workspace: launches successfully
- Personal Account: App returns to device home screen OR displays blank grey screen
- Failure occurs only when opening the Personal Account workspace

---

## Investigation Scope

Reviewed:
- Multi-account preview launch path
- AuthContext and enablePrivateUserAccess
- StartupCoordinator and startupStateMachine routing decisions
- DeviceUnlockContext
- AccountContext and scope selection
- WalletContext type definition and exports
- TransferContext and hydrateTransfers stability
- ConsumerShell component
- All consumer routes: index, send, track, transfers, profile, settings, nexus-ai
- consumerSettingsService
- PaymentMethodsContext

---

## Execution Path Trace

```
Multi-Account Preview screen
  → openPersonalWorkspace() invoked
  → lockApp() called
  → biometric unlock (unlock() or unlockWithPassword())
  → setAccountScope("personal")
  → enablePrivateUserAccess() → signIn(PRIVATE_USER_EMAIL, PRIVATE_USER_PASSWORD)
  → session established → setSession(), setStartupPhase("authenticated")
  → StartupCoordinator re-evaluates:
      pathname = /multi-account-preview
      founderValidationRouteReachedRef = true
      Decision: allow at /multi-account-preview ← CORRECT, no redirect
  → router.replace("/consumer")
  → pathname transitions to /consumer
  → StartupCoordinator re-evaluates:
      sessionPresent = true, locked = false, /consumer is NOT public
      Decision: allowDecision("authenticated", "content", true) ← CORRECT
  → ConsumerHomeScreen renders
  → useWallet() is called → returns WalletContextType (gbpBalance, debitGbp, ...)
  → const { balances } = useWallet() ← balances IS UNDEFINED
  → formatGbp(balances.gbp) ← CRASH: TypeError: Cannot read properties of undefined (reading 'gbp')
```

---

## Root Cause 1 — Primary Crash (CONFIRMED, CRITICAL)

**File:** app/consumer/index.tsx
**Line (pre-fix):** 24
**Code:** `const { balances } = useWallet();`
**Then line 47:** `{formatGbp(balances.gbp)}`

**Cause:** WalletContext exports `gbpBalance: number` not `balances`. Destructuring `{ balances }` from `WalletContextType` produces `undefined` at runtime. Accessing `.gbp` on `undefined` throws:

```
TypeError: Cannot read properties of undefined (reading 'gbp')
```

This is a JavaScript runtime crash. React Native (Hermes runtime on Android) cannot recover from this unhandled exception at render time. Android either returns to the device home screen or shows a blank grey screen depending on whether the JS error boundary catches it.

**Why TypeScript did not flag it at time of investigation:** The TypeScript language server cache had not invalidated after the external edit (made between sessions). With `strict: true` in tsconfig.json, TypeScript would have flagged this as "Property 'balances' does not exist on type 'WalletContextType'" if the language server had processed the new file content at validation time.

**Failure occurs during:** Component rendering (first render of consumer home screen)

---

## Root Cause 2 — Stability Defect (CONFIRMED, MAJOR)

**File:** src/state/TransferContext.tsx
**Code:** `hydrateTransfers` defined as a plain `async function` inside the component body, not memoized with `useCallback`

**Cause:** Every render of `TransferProvider` creates a new `hydrateTransfers` function reference. Consumer screens using `useEffect(() => { void hydrateTransfers(); }, [hydrateTransfers])` will re-fire on every render because the reference is never stable. This produces an infinite transfer hydration loop, causing continuous Supabase calls, repeated `setIsLoadingTransfers(true/false)` state cycles, and UI instability.

This defect is secondary because Root Cause 1 crashes the home screen before the transfer hydration loop is reached. However, if Root Cause 1 were not present, Root Cause 2 would cause severe degraded performance on any screen using the hydrateTransfers dependency.

**Failure occurs during:** Ongoing data loading (effects phase)

---

## Root Causes NOT Found

After full investigation, the following were ruled out:

- Authentication path: WORKING. Session is established correctly for private user.
- StartupCoordinator routing: WORKING. Correctly allows /consumer for authenticated user.
- AccountContext scope selection: WORKING. "personal" scope is set before navigation.
- DeviceUnlockContext: WORKING. Biometric path works (same as Demo Workspace).
- ConsumerShell component: CLEAN. No rendering errors.
- ConsumerSettingsService: CLEAN. Loads defaults gracefully if no prior data.
- PaymentMethodsContext: CLEAN. Initializes safely.
- Expo Router file structure: CORRECT. app/consumer/index.tsx is the route for /consumer.
- PRIVATE_USER_EMAIL / PRIVATE_USER_PASSWORD configuration: presumed configured if auth succeeds (failure here returns an error string shown on the preview screen, not a blank screen).

---

## Summary

| # | Location | Type | Severity |
|---|---|---|---|
| 1 | app/consumer/index.tsx | Runtime TypeError (undefined property access) | CRITICAL — crashes screen |
| 2 | src/state/TransferContext.tsx | Unstable function reference → infinite loop | MAJOR — degrades all consumer screens |
