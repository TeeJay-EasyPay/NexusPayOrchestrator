# Startup Architecture Review

## Programme

Startup Architecture V2 Programme

## Date

2026-05-30

## Governance Startup Completion

The Founder directive scope is confirmed: redesign the NexusPay startup subsystem for deterministic, observable, testable, certification-ready startup behaviour. Governance authority, executive role charters, founder communication standards, decision history, programme status, prior startup briefings, startup validation outputs, startup telemetry outputs, pilot certification outputs, and architecture authority documents were reviewed before implementation planning.

## Reviewed Runtime Components

| Component | Current Responsibility | Finding |
|---|---|---|
| `app/_layout.tsx` | Installs providers, starts startup evidence, wraps router in `AuthGate` | Root shell is stable, but all providers mount before startup routing settles. |
| `src/state/AuthContext.tsx` | Supabase session bootstrap, auth state, demo access, sign-in/sign-out | Auth bootstrap owns session state but does not own route decisions. |
| `src/components/auth/AuthGate.tsx` | Derives final auth phase, redirects routes, writes evidence, runs watchdog, prompts unlock | This is the active routing authority, but it duplicates state interpretation already present in auth context and adds an independent watchdog. |
| `src/state/DeviceUnlockContext.tsx` | Tracks local lock state and biometric availability | Unlock state is separate from auth state and is interpreted by `AuthGate`. |
| `app/auth.tsx` | Login, sign-up, demo access, device unlock before sign-in | Auth screen starts device unlock and auth mutation directly, then relies on `AuthGate` to route. |
| `src/services/startupLogger.ts` | Emits `[Startup]` logs | Logs are emitted as console objects, which are weak evidence for logcat parsing. |
| `src/services/startupEvidence.ts` | Persists and emits startup evidence | Evidence logging is dependent on AsyncStorage success and is not emitted as the single startup decision source. |
| `src/components/ui/Screen.tsx` | Hides app chrome on public routes | Public route knowledge is duplicated with `AuthGate`. |
| `src/state/WalletContext.tsx` | Loads XRPL and simulated wallet state | Wallet startup work runs before startup routing is settled and reads Supabase session independently. |
| `src/state/TransferContext.tsx` | Hydrates transfer history and subscribes to auth changes | Transfer startup work runs before startup routing is settled and reads business data independently. |
| Native splash files | Android startup screen and post-splash theme | Day splash background is white, which makes startup display-layer failures look like a blank app. |
| `governance/automation/scripts/runStartupDeterminismValidation.ts` | Startup cycle validation | Existing evidence parsing failed because no usable startup evidence reached logcat in prior runs. |

## Observed Startup V1 Sequence

1. Native Android splash launches.
2. Expo Router root layout mounts.
3. `AuthProvider`, `DeviceUnlockProvider`, `WalletProvider`, `PaymentMethodsProvider`, and `TransferProvider` mount.
4. `AuthContext` starts Supabase `getSession()`.
5. `WalletContext` also calls `supabase.auth.getSession()`.
6. `TransferContext` hydrates transfers and attaches an auth listener.
7. `AuthGate` derives `finalAuthPhase` from `loading`, `sessionValidated`, session presence, demo access, and lock state.
8. `AuthGate` uses effects to redirect between protected and public routes.
9. `AuthGate` writes startup evidence after render.
10. Business screens may mount before the final startup route is settled, although they may be visually concealed.

## Root Cause Position

The Startup V1 root cause is split startup authority. Authentication bootstrap, route selection, device unlock interpretation, provider startup work, and startup evidence are distributed across multiple components and effects. This creates timing-dependent startup behaviour rather than one deterministic startup state machine.

## Why Previous Investigations Struggled

Previous investigations focused on visible symptoms: white screens, route flashes, and missing evidence. Those symptoms did not share one surface-level cause. The underlying issue is architectural: no single component owns the startup decision from auth state to final route to telemetry completion. Because evidence was also weak, validation could not distinguish app logic failure, display-layer masking, missing log capture, and route timing.

## Race Conditions Identified

| Race | Description | Impact |
|---|---|---|
| Auth bootstrap vs routing watchdog | `AuthGate` can redirect to `/auth` after 6 seconds while `AuthContext` is still resolving an eventual authenticated session. | Can create login-to-home bounce or apparent auth instability. |
| Supabase `getSession()` vs auth listener | Auth bootstrap and auth-state-change events can both commit session state. | Later async callbacks can overwrite earlier user-auth state. |
| Protected screen render vs auth decision | The router stack renders while auth is unresolved. | Protected screens can mount and run effects before startup route is final. |
| Public screen render vs authenticated decision | Public routes can render while an authenticated startup is still resolving. | Login can briefly appear for an authenticated user. |
| AsyncStorage evidence vs evidence emission | Startup evidence is logged after persistence succeeds. | Storage failure or timing can remove certification evidence. |
| Device lock vs authenticated route | Lock state is interpreted after auth state and can trigger automatic biometric prompts. | Device unlock can introduce modal timing into route startup. |
| Native white splash vs app dark shell | Day splash background is white while the app shell is dark. | A launch stall appears as a white-screen app failure. |

## State Ownership Gap

Startup V1 has no single owner for these decisions:

- Whether startup is still resolving.
- Whether the current route is public or protected.
- Whether the app should show content, conceal content, show loading, or show unlock UI.
- Whether a redirect is permitted.
- Whether startup has completed.
- Which telemetry record represents the authoritative final startup result.

## Architecture Gate Findings

Implementation may proceed only if Startup V2 establishes:

1. One startup coordinator as the single route authority.
2. One pure startup state machine for deterministic decisions.
3. One public route registry shared by routing and screen chrome.
4. Startup telemetry emitted as JSON lines independent of persistence success.
5. No independent routing watchdog outside the startup state machine.
6. Splash display that cannot masquerade as a blank white app.
7. Validation evidence that can parse final auth phase, session state, route reached, redirect reason, and startup completion.

## Review Decision

Architecture review is complete. Startup V2 should replace the current distributed startup routing logic with a single coordinator and pure decision function.

