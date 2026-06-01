# Startup V2 Design Document

## Programme

Startup Architecture V2 Programme

## Date

2026-05-30

## Design Objective

Startup V2 establishes deterministic startup behaviour through one startup coordinator, one pure startup state machine, one public route registry, and JSON-line startup telemetry.

## Design Principles

- Auth state is owned by `AuthContext`.
- Device lock state is owned by `DeviceUnlockContext`.
- Startup routing is owned only by `StartupCoordinator`.
- Startup decisions are produced by a pure function.
- Public route knowledge is defined once and reused.
- Startup telemetry is emitted even if persistence fails.
- The router stack remains mounted to avoid Expo Router remount instability.
- Protected content is visually concealed until the startup decision allows it.

## New Startup Modules

| Module | Responsibility |
|---|---|
| `src/startup/startupRoutes.ts` | Single registry of public startup routes and default authenticated route. |
| `src/startup/startupStateMachine.ts` | Pure deterministic startup decision function. |
| `src/startup/StartupCoordinator.tsx` | Runtime coordinator that applies state-machine decisions, performs route replacement, controls rendering mode, and emits evidence. |

## Updated Existing Modules

| Module | Planned Change |
|---|---|
| `src/components/auth/AuthGate.tsx` | Replace legacy routing logic with compatibility export to `StartupCoordinator`. |
| `app/_layout.tsx` | Use `StartupCoordinator` as the startup authority. |
| `src/components/ui/Screen.tsx` | Import public route registry instead of maintaining duplicate public-route state. |
| `src/services/startupLogger.ts` | Emit parseable JSON-line `[Startup]` telemetry. |
| `src/services/startupEvidence.ts` | Emit evidence before persistence and include Startup V2 decision fields. |
| `governance/automation/scripts/runStartupDeterminismValidation.ts` | Parse Startup V2 evidence fields and produce stronger validation output. |
| Native splash config | Use dark NexusPay launch background to prevent white-screen masking. |

## Startup State Machine Inputs

| Input | Source |
|---|---|
| `pathname` | Expo Router `usePathname()` |
| `sessionPresent` | `AuthContext.session` |
| `demoAccessEnabled` | `AuthContext.demoAccessEnabled` |
| `loading` | `AuthContext.loading` |
| `sessionValidated` | `AuthContext.sessionValidated` |
| `resetInProgress` | `AuthContext.resetInProgress` |
| `locked` | `DeviceUnlockContext.locked` |
| `lastProtectedRoute` | `StartupCoordinator` local ref |

## Startup State Machine Outputs

| Output | Meaning |
|---|---|
| `phase` | `bootstrapping`, `unauthenticated`, `authenticated`, or `locked` |
| `routeAction` | `allow` or `replace` |
| `targetRoute` | Target path when replacement is required |
| `renderMode` | `content`, `startup-overlay`, or `locked-overlay` |
| `redirectReason` | Deterministic explanation for any replacement |
| `startupDestination` | Expected final startup route |
| `startupComplete` | Whether startup has reached a certifiable settled state |

## Deterministic Routing Rules

| Phase | Current Route | Decision |
|---|---|---|
| bootstrapping | any route | No redirect, show startup overlay, emit pending evidence. |
| unauthenticated | public route | Allow route and show content. |
| unauthenticated | protected route | Replace with `/auth`, conceal content until route changes. |
| authenticated | public route | Replace with last protected route or `/`, conceal content until route changes. |
| authenticated | protected route | Allow route and show content. |
| locked | public route | Replace with last protected route or `/`, show startup overlay until protected route is reached. |
| locked | protected route | Allow route and show unlock overlay. |

## Removed Ambiguity

Startup V2 removes:

- The independent AuthGate watchdog redirect.
- Duplicate public-route sets.
- Console-object startup logs.
- Evidence emission that depends on AsyncStorage success.
- Auth routing decisions spread across multiple effects.

## Compatibility Boundary

Startup V2 does not intentionally change:

- Payment execution.
- Transfer orchestration.
- Treasury logic.
- XRPL integrations.
- Supabase transaction processing.
- Nexus AI services.
- Corridor execution.
- Pilot certification logic outside startup validation parsing.
- Governance framework behaviour.

## Architecture Gate Decision

Architecture Gate is approved for implementation because:

1. The root cause is understood as split startup authority.
2. Startup V2 replacement architecture is defined.
3. Startup state ownership is explicit.
4. Startup routing decisions are deterministic and testable.
5. Rollback protection exists.

