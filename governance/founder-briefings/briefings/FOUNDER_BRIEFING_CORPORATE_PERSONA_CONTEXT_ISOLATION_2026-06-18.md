# Founder Briefing: Corporate Persona Context Isolation

Date: 2026-06-18

## Executive Summary

Recent remediation work addressed a critical navigation and context-isolation issue across Corporate User, business personas, and private/persona flows.

The app had two active navigation systems:
- the original root corporate workspace shell using `Screen`, `AppDropdownMenu`, and `AppMenu`
- the newer persona shell using `ConsumerShell`

Corporate User could reach shared screens such as Batch, Alerts, Recipients, and Received Transfers through the persona shell. Separately, private/business persona dropdown menus could expose routes that escaped into the root corporate workspace. The visible result was confusing. The security result was more serious: a user could appear to move between operating contexts without explicitly switching persona/workspace.

The remediation now separates these contexts more clearly:
- Corporate User uses the original corporate workspace chrome for corporate routes.
- Private and business personas stay inside the persona shell.
- Persona dropdown menus no longer expose root corporate routes.
- Shared routes branch by active persona where needed.

## Root Cause

The issue was not a single screen bug. It came from multiple layers:

1. Corporate workspace entry did not originally force `corporate-demo` selection, so stale selected-persona state could persist.
2. Shared routes such as `participant-notifications`, `received-transfers`, `business-recipients`, and `corporate-payouts` were reused across corporate, business, and participant personas.
3. Those shared routes initially rendered through `ConsumerShell`, even for Corporate User.
4. `ConsumerShell` dropdown menus included entries such as root `/routes`, which opened the original corporate/root workspace from inside private or business persona contexts.
5. `Payment Methods` used the root `Screen` shell for everyone, so private/business users could open a root corporate-style screen.

## Remediation Applied

### Corporate Context Selection

Commit:
- `1e9226630a2cb4b09b818f2290522ec5a34f226c`

Changes:
- Corporate Workspace entry now explicitly selects `corporate-demo`.
- Corporate home no longer falls through to personal consumer home.
- Corporate language replaced `Demo User` / `Demo Workspace` / `Demo Access`.

### Corporate Route Shell Unification

Commit:
- `df26c834ea9757c47eb49864b1ce553bf768d4f3`

Changes:
- Corporate Batch Payments, Alerts, Recipients, and Received Transfers now render through the original root corporate `Screen`.
- Business/private versions continue to render through `ConsumerShell`.
- Corporate routes now show the same hamburger menu and bottom navigation as the main corporate dashboard.

### Persona Menu Isolation

Commit:
- `0840079eba5bc92a2abfc277570883b2b7c5146f`

Changes:
- Removed root `Routes` from persona dropdown menus.
- Restricted `Alerts` and `Received Transfers` to participant personas.
- Restricted `Batch Payments` and `Recipients` to business personas in the persona shell.
- Made `Payment Methods` persona-aware so private/business users remain in `ConsumerShell`.

## Files Most Relevant To This Work

- `app/multi-account-preview.tsx`
- `app/consumer/index.tsx`
- `app/corporate-payouts.tsx`
- `app/participant-notifications.tsx`
- `app/received-transfers.tsx`
- `app/business-recipients.tsx`
- `app/payment-methods.tsx`
- `src/components/consumer/ConsumerShell.tsx`
- `src/components/business/BusinessHome.tsx`
- `src/types/multiEntity.ts`

## Validation Evidence

Performed across the remediation sequence:
- Targeted ESLint passed after each change set.
- `git diff --check` passed on route/menu fixes.
- Route scan confirmed remaining non-corporate route hits were consumer-scoped (`/consumer/...`) or corporate-only conditional links.
- Search confirmed old `Demo User` / `Demo Workspace` / `Demo Access` user-facing labels were removed from active `app` and `src` paths.
- No database changes, migrations, or Supabase schema changes were made.

Known residual:
- Full `npx tsc --noEmit` still fails in pre-existing unrelated operations/intelligence/Deno Edge Function areas.
- Expo publish continues to warn about `@noble/hashes/crypto.js` export fallback; OTA publication succeeds.

## OTA Deployment Trail

Corporate context isolation:
- Update group: `0aeea4bf-3b8f-47dc-b97b-629df1a710f9`
- Android: `019eda92-8557-73ad-a844-6a9439d9bba3`
- iOS: `019eda92-8557-7422-b073-1d700f13d379`

Corporate workspace visual alignment:
- Update group: `6dfd2b3d-3796-4066-977a-5a67c7992fcc`
- Android: `019edc93-21f8-7512-97ae-3bb90e7ee189`
- iOS: `019edc93-21f8-71b3-b0b9-7875eb8dd57b`

Corporate route shell unification:
- Update group: `6a3d26e2-1060-4483-b74d-74424393054c`
- Android: `019edcb7-3ab8-70bc-9792-3fbecc6623f5`
- iOS: `019edcb7-3ab8-7ccc-957f-38083948ea40`

Persona menu route isolation:
- Update group: `c534d0a2-266e-4452-b72f-0943c36baf19`
- Android: `019edcc3-0b48-7410-b4eb-d51c914951a7`
- iOS: `019edcc3-0b48-7d82-b1c6-f19830dbbca0`

## Recommendation

Going forward, treat persona/workspace context as a security boundary:
- Corporate routes should default to the root corporate `Screen` shell.
- Private and business persona routes should default to `ConsumerShell`.
- Shared routes must branch explicitly by `selectedPersona.id` or `participantType`.
- Any new menu item should be reviewed for context escape before deployment.
- Every meaningful implementation should update `governance/implementation-log/IMPLEMENTATION_LOG.md` before commit.

