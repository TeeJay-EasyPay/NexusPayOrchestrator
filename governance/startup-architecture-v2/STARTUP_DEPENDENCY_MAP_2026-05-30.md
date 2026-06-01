# Startup Dependency Map

## Programme

Startup Architecture V2 Programme

## Date

2026-05-30

## Startup V1 Dependency Chain

```text
Android launch
  -> native splash theme
  -> Expo Router entry
  -> app/_layout.tsx
  -> Supabase client module import
  -> AuthProvider
      -> supabase.auth.getSession()
      -> supabase.auth.onAuthStateChange()
  -> DeviceUnlockProvider
      -> LocalAuthentication hardware/enrolment check
  -> WalletProvider
      -> supabase.auth.getSession()
      -> XRPL wallet and SecureStore helpers if session exists
  -> PaymentMethodsProvider
      -> mock payment method state
  -> TransferProvider
      -> loadCompletedTransfers()
      -> supabase.auth.onAuthStateChange()
  -> AuthGate
      -> derive finalAuthPhase
      -> redirect with router.replace()
      -> write StartupEvidence
      -> optional biometric unlock prompt
      -> routing watchdog fallback
  -> Expo Router Stack
      -> route screen renders
```

## Startup V1 Decision Points

| Decision | Current Owner | Possible Outcomes |
|---|---|---|
| Supabase configured? | `AuthContext`, `supabase.ts` | configured, fallback unauthenticated |
| Session exists? | `AuthContext`, `WalletContext`, `TransferContext`, `UserAccountBadge` | present, missing, error |
| Demo access enabled? | `AuthContext` | true, false |
| Device locked? | `DeviceUnlockContext`, `AuthGate`, `auth.tsx` | locked, unlocked |
| Current route public? | `AuthGate`, `Screen` | public, protected |
| Redirect required? | `AuthGate` | `/auth`, previous protected route, none |
| Startup timed out? | `AuthGate` watchdog | redirect `/auth`, no action |
| Evidence complete? | `AuthGate`, `startupEvidence` | partial, complete, missing |

## Startup V1 Route Transitions

| Initial Route | Auth State | Startup V1 Transition |
|---|---|---|
| `/` | unresolved | Render stack while concealed, wait for auth or watchdog |
| `/` | unauthenticated | `router.replace("/auth")` |
| `/` | authenticated | allow `/` |
| `/auth` | unresolved | public route may render while auth resolves |
| `/auth` | unauthenticated | allow `/auth` |
| `/auth` | authenticated | `router.replace(lastProtectedRoute || "/")` |
| `/check-email` | authenticated | redirect to protected route |
| `/account-created` | authenticated | redirect to protected route |
| protected non-home route | unauthenticated | `router.replace("/auth")` |
| protected non-home route | authenticated | allow current route |
| any protected route | authenticated and locked | show loading overlay and optional biometric prompt |

## Startup V1 Failure Paths

| Failure Path | Current Behaviour |
|---|---|
| Supabase config missing | Auth state resolves unauthenticated and app should route to `/auth`. |
| Supabase session bootstrap timeout | Auth state resolves unauthenticated after AuthContext timeout. |
| AuthGate watchdog timeout before AuthContext timeout | AuthGate redirects to `/auth` independently. |
| AsyncStorage startup evidence write fails | Evidence log can be lost or degraded. |
| Native splash/start window mismatch | User can see blank white surface during launch. |
| Logcat cannot parse console objects | Validation reports unknown startup state. |
| Initial protected route renders before auth decision | Business screen effects can run before auth route is final. |

## Startup V2 Target Dependency Chain

```text
Android launch
  -> dark native splash theme
  -> Expo Router entry
  -> app/_layout.tsx
  -> AuthProvider owns auth snapshot only
  -> DeviceUnlockProvider owns local unlock snapshot only
  -> StartupCoordinator owns startup decision
      -> pure startup state machine
      -> shared public route registry
      -> route action
      -> render mode
      -> startup evidence
  -> Expo Router Stack kept mounted
  -> protected content visible only after startup decision allows it
```

## Startup V2 State Transitions

```text
bootstrapping
  -> unauthenticated
      -> allow /auth, /check-email, /account-created
      -> redirect protected route to /auth
  -> authenticated
      -> allow protected route
      -> redirect public route to last protected route or /
  -> locked
      -> show unlock surface on protected route
      -> redirect public route to protected route before unlock surface
```

## Startup V2 Completion Criteria

Startup is complete when all of the following are true:

1. Auth bootstrap is no longer pending.
2. The startup state machine has produced a non-bootstrapping phase.
3. The route action is `allow`.
4. The visible render mode matches the phase:
   - unauthenticated -> public auth route
   - authenticated -> protected route
   - locked -> unlock surface on protected route
5. A `[StartupEvidence]` JSON line has been emitted with the final phase and route reached.

## Startup Dependency Decision

Startup V2 must make routing deterministic by moving route choice from distributed effects into one pure state machine used by one coordinator.

