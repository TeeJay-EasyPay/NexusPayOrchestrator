# Authentication Root Cause Analysis

## Date
2026-06-01

## Scope
Repository analysis of the current NexusPay Startup V2 and authentication flow against the reported physical-device observations.

## Physical-Device Observations Reviewed
- App launches successfully.
- Home screen loads.
- Supabase User ID is missing.
- Demo User access is missing.
- Biometric unlock is not triggered.
- Nexus AI reports No Authenticated User Found.
- Transaction history is empty.
- Saved recipients are empty.
- Signing out navigates to what appears to be an older login screen.

## Most Likely Root Cause
### Selected Cause
6. Another repository-level cause.

### Precise Root Cause
The most likely root cause is a repository-level authentication truth mismatch:

- Startup V2 routing currently treats a locally restorable Supabase session from `supabase.auth.getSession()` as sufficient proof of authentication.
- Large parts of the app then require `supabase.auth.getUser()` to succeed before they show user identity, Nexus AI settings, transfer history, recipients, and other user-scoped data.

This means the app can route to the authenticated home screen using a persisted local session object while the rest of the repository behaves as if there is no authenticated user.

That is not best described as only `Startup V2 routing changes`, only `Supabase session retrieval failure`, or only `legacy login routing`. It is a broader repository-level inconsistency between the startup auth signal and the downstream user-validation signal.

## Why This Is The Best Fit

### Why it is not primarily a demo-user session failure
Demo access is only enabled through `enableDemoAccess()` in the auth screen and depends on `EXPO_PUBLIC_DEMO_EMAIL` and `EXPO_PUBLIC_DEMO_PASSWORD`. Missing demo access does not explain why the app still opens the protected home screen.

### Why it is not primarily legacy login routing
The older-looking login screen is the current `/auth` route. Signing out clears session state and Startup V2 correctly routes unauthenticated users to `/auth`. That symptom is real, but it is downstream behavior, not the main cause.

### Why it is not primarily Startup V2 routing changes alone
Startup V2 is exposing the issue because it routes off `sessionPresent`, but the stronger explanation is the mismatch between local session restoration and downstream authenticated-user checks across the repository.

### Why it is not only Supabase session retrieval failure
If startup had simply failed to retrieve any session, Startup V2 should route an unauthenticated user to `/auth`, not to `/`. The observed protected home load suggests that some local session state is still being treated as valid by startup.

## Repository Evidence

### 1. Startup V2 routes based on local session presence
In `src/state/AuthContext.tsx`, startup bootstrap calls `supabase.auth.getSession()` and sets:

- `session`
- `sessionValidated`
- `startupPhase`

based on whether `existingSession` is present.

The code does not perform a second authenticated-user validation step before classifying startup as authenticated.

In `src/startup/startupStateMachine.ts`, authenticated access is derived from:

- `sessionPresent`
- `demoAccessEnabled`

not from `getUser()` success.

In `src/startup/StartupCoordinator.tsx`, that decision directly controls whether `/` is allowed or the user is redirected to `/auth`.

### 2. Home and downstream features require a real authenticated user
The home screen in `app/index.tsx` loads user identity with `supabase.auth.getUser()`. If that returns no user, the screen falls back to a generic display name.

Nexus AI settings in `src/hooks/useNexusAISettings.ts` also call `supabase.auth.getUser()`. If no user is returned, settings are cleared and the app logs a no-user fallback path.

Transfer history in `src/services/transferService.ts` returns an empty list when `supabase.auth.getUser()` returns no user.

Saved recipients in `src/services/recipientService.ts` also return an empty list when `supabase.auth.getUser()` returns no user.

This repository pattern is consistent with the device report:

- home route visible
- no authenticated user identity
- no Nexus AI user context
- empty transfers
- empty recipients

### 3. Biometric unlock is not part of startup auth restoration
In `src/state/DeviceUnlockContext.tsx`, `locked` defaults to `false`.

In `src/startup/startupStateMachine.ts`, biometric unlock at startup is only relevant when the app is already considered authenticated and `locked === true`.

In `app/auth.tsx`, biometric unlock is triggered as part of sign-in or demo access actions, not during passive session restoration.

So if startup incorrectly treats a stale local session as authenticated while `locked` is still `false`, the app will go straight to home and no biometric unlock will be triggered.

### 4. Signing out reaches the existing auth screen
In `src/state/AuthContext.tsx`, `signOut()` clears local auth state and calls `supabase.auth.signOut()`.

Once that happens, Startup V2 correctly treats the user as unauthenticated and routes to `/auth`.

The auth screen at `app/auth.tsx` is the current login route and still presents the older “Orchestrator Login” UI. That explains why sign-out appears to navigate to an older login screen.

## Most Likely Runtime Scenario
The most likely runtime sequence is:

1. A persisted Supabase session object exists in local storage.
2. `AuthContext` restores that session through `supabase.auth.getSession()`.
3. Startup V2 sees `sessionPresent === true` and allows `/`.
4. The rest of the app attempts authenticated operations using `supabase.auth.getUser()`.
5. `getUser()` returns no user, or the session cannot be refreshed into a valid authenticated user.
6. User-scoped data layers therefore act unauthenticated and return empty results.
7. Because the app was already allowed into `/`, the user sees home with missing identity and missing account-backed data.

This scenario explains all reported symptoms with one consistent cause.

## Files Involved

### Primary files
- `src/state/AuthContext.tsx`
- `src/startup/StartupCoordinator.tsx`
- `src/startup/startupStateMachine.ts`
- `src/startup/startupRoutes.ts`
- `app/index.tsx`
- `app/auth.tsx`
- `src/state/DeviceUnlockContext.tsx`

### Downstream evidence files
- `src/hooks/useNexusAISettings.ts`
- `src/services/transferService.ts`
- `src/services/recipientService.ts`
- `src/state/WalletContext.tsx`
- `src/lib/supabase.ts`

## Symptom-by-Symptom Explanation

### App launches successfully
Startup V2 itself is functioning well enough to mount the app and render a route.

### Home screen loads
Startup V2 likely sees a persisted local session and therefore allows the authenticated default route `/`.

### Supabase User ID is missing
Screens and services that rely on `supabase.auth.getUser()` do not see a valid authenticated user even though startup allowed the route.

### Demo User access is missing
Demo access is not being restored as an active auth mode at startup. It is only explicitly enabled from the auth screen and depends on demo environment variables.

### Biometric unlock is not triggered
The app is not entering the `locked` startup state. It is likely entering home through a restored local session while `locked` remains `false`.

### Nexus AI reports No Authenticated User Found
Nexus AI settings use `supabase.auth.getUser()`. If no user is returned there, Nexus AI behaves as unauthenticated.

### Transaction history is empty
Transfer history returns an empty array when no authenticated user is returned from `getUser()`.

### Saved recipients are empty
Saved recipients return an empty array when no authenticated user is returned from `getUser()`.

### Signing out navigates to an older login screen
That is the existing `/auth` route. It reflects current repository UI composition, not the primary auth-restoration defect.

## Safest and Smallest Remediation Approach

### Recommended Approach
Do not redesign Startup V2.

Do not change route structure.

Do not broaden the remediation into Nexus AI, transfers, or recipients.

Instead, make the authentication source of truth consistent at startup.

### Smallest safe remediation
After `supabase.auth.getSession()` restores a session during bootstrap, perform a single authoritative authenticated-user validation step before Startup V2 treats the app as authenticated.

If the repository cannot obtain a valid current user, clear the stale session and classify startup as unauthenticated.

### Why this is the safest approach
- It addresses the root mismatch instead of patching downstream symptoms one by one.
- It preserves Startup V2 architecture.
- It avoids touching multiple business features.
- It aligns startup routing with the same authenticated-user standard already used by Nexus AI, transfers, recipients, and audit services.

### Avoid these broader approaches
- Do not bypass `getUser()` checks across downstream services.
- Do not mark `/` as public.
- Do not add feature-specific fallbacks for transfers, recipients, or Nexus AI.
- Do not treat the sign-out login screen as the primary defect.

## Recommended Engineering Prompt For Codex Implementation

```md
Investigate and fix the NexusPay authentication restoration mismatch without changing overall Startup V2 architecture.

Problem observed on physical device:
- App launches to home (`/`)
- Supabase user identity is missing
- Nexus AI reports no authenticated user
- transfer history and saved recipients are empty
- biometric unlock is not triggered
- signing out returns to `/auth`

Repository evidence suggests Startup V2 currently treats `supabase.auth.getSession()` as sufficient to classify startup as authenticated, while downstream features rely on `supabase.auth.getUser()` to confirm a real authenticated user.

Goal:
Make startup authentication truth consistent so the app only enters authenticated Startup V2 routes when the authenticated user is actually restorable.

Constraints:
- Preserve Startup V2 coordinator/state-machine design.
- Do not redesign routing.
- Do not change business features outside the auth restoration boundary unless required by the fix.
- Prefer a minimal change in the auth bootstrap path.

Files to inspect first:
- `src/state/AuthContext.tsx`
- `src/startup/startupStateMachine.ts`
- `src/startup/StartupCoordinator.tsx`
- `src/lib/supabase.ts`
- `app/index.tsx`
- `src/hooks/useNexusAISettings.ts`
- `src/services/transferService.ts`
- `src/services/recipientService.ts`

Implementation objective:
During bootstrap, after restoring any local session, validate whether a real current Supabase user can be retrieved. If not, clear stale auth state and continue startup as unauthenticated so Startup V2 routes to `/auth` instead of `/`.

Validation objective:
- unauthenticated device launch goes to `/auth`
- stale/invalid persisted session also goes to `/auth`
- valid authenticated session goes to `/`
- Nexus AI, transfer history, recipients, and user identity align with the startup auth state
- sign-out still routes to `/auth`
```

## Final Conclusion
The most likely cause is not a pure demo failure, not a pure legacy routing issue, and not a pure Startup V2 defect.

The most likely cause is a repository-level authentication restoration mismatch: Startup V2 trusts locally restored session presence, while the rest of the repository trusts validated current-user retrieval.

That mismatch is the smallest explanation that fits the entire observed device behavior.