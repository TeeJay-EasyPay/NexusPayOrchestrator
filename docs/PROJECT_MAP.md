# NexusPay Orchestrator Project Map

This file is the current architecture map for the repository. It reflects the live screens, service layers, Supabase tables, and deployment configuration as implemented now, not an aspirational design.

## 1. Current Folder Structure

```text
.
├─ app/
│  ├─ _layout.tsx
│  ├─ index.tsx
│  ├─ auth.tsx
│  ├─ check-email.tsx
│  ├─ account-created.tsx
│  ├─ account.tsx
│  ├─ send.tsx
│  ├─ routes.tsx
│  ├─ quote.tsx
│  ├─ funding.tsx
│  ├─ track.tsx
│  ├─ operations.tsx
│  ├─ payment-methods.tsx
│  └─ xrpl-test.tsx
├─ assets/
│  └─ images/
├─ components/
│  ├─ external-link.tsx
│  ├─ haptic-tab.tsx
│  ├─ hello-wave.tsx
│  ├─ parallax-scroll-view.tsx
│  ├─ themed-text.tsx
│  ├─ themed-view.tsx
│  └─ ui/
│     ├─ collapsible.tsx
│     ├─ icon-symbol.tsx
│     └─ icon-symbol.ios.tsx
├─ constants/
│  └─ theme.ts
├─ hooks/
│  ├─ use-color-scheme.ts
│  ├─ use-color-scheme.web.ts
│  └─ use-theme-color.ts
├─ scripts/
│  └─ reset-project.js
├─ src/
│  ├─ components/
│  │  ├─ audit/
│  │  │  └─ OperationalTimelineCard.tsx
│  │  ├─ auth/
│  │  │  ├─ AuthGate.tsx
│  │  │  ├─ UnlockPanel.tsx
│  │  │  └─ UserAccountBadge.tsx
│  │  ├─ intelligence/
│  │  │  └─ AICorridorIntelligenceCard.tsx
│  │  ├─ navigation/
│  │  │  ├─ AppDropdownMenu.tsx
│  │  │  └─ AppMenu.tsx
│  │  ├─ payment/
│  │  │  └─ PaymentMethodsCard.tsx
│  │  ├─ recipients/
│  │  │  └─ SavedRecipientsCard.tsx
│  │  ├─ transactions/
│  │  │  └─ RecentTransactionHistoryCard.tsx
│  │  ├─ transfer/
│  │  │  ├─ AnimatedCorridorMap.tsx
│  │  │  └─ WorldCorridorMap.tsx
│  │  └─ ui/
│  │     ├─ AppButton.tsx
│  │     ├─ AppCard.tsx
│  │     ├─ AppText.tsx
│  │     ├─ RouteOptionCard.tsx
│  │     └─ Screen.tsx
│  ├─ data/
│  │  ├─ corridors.ts
│  │  ├─ mockPaymentMethods.ts
│  │  └─ mockRoutes.ts
│  ├─ lib/
│  │  ├─ aiRouteIntelligence.ts
│  │  ├─ corridorHealth.ts
│  │  ├─ fxFeed.ts
│  │  ├─ id.ts
│  │  ├─ providerIntegrationFramework.ts
│  │  ├─ routeOperationalState.ts
│  │  ├─ routingEngine.ts
│  │  ├─ settlementOrchestrator.ts
│  │  ├─ simulatedRLusdWallet.ts
│  │  ├─ supabase.ts
│  │  ├─ treasuryIntelligence.ts
│  │  ├─ xrplClient.ts
│  │  ├─ xrplExplorer.ts
│  │  ├─ xrplSettlement.ts
│  │  └─ xrplWallet.ts
│  ├─ services/
│  │  ├─ auditLog.ts
│  │  ├─ recipientService.ts
│  │  ├─ routeOperationalEventService.ts
│  │  ├─ transactionAuditService.ts
│  │  ├─ transferService.ts
│  │  ├─ treasuryIntelligenceService.ts
│  │  ├─ intelligence/
│  │  │  ├─ executiveInsightService.ts
│  │  │  ├─ providerExecutionIntelligence.ts
│  │  │  └─ telemetryIntelligenceService.ts
│  │  ├─ execution/
│  │  │  ├─ executionEngine.ts
│  │  │  ├─ executionPersistenceService.ts
│  │  │  ├─ executionRealtimeService.ts
│  │  │  └─ executionRecoveryService.ts
│  │  └─ payout/
│  │     ├─ payoutAdapter.ts
│  │     ├─ payoutPartnerDirectory.ts
│  │     ├─ payoutRoutingEngine.ts
│  │     ├─ payoutTypes.ts
│  │     ├─ mockPayoutProvider.ts
│  │     └─ providers/
│  │        └─ niumSandboxProvider.ts
│  ├─ state/
│  │  ├─ AuthContext.tsx
│  │  ├─ DeviceUnlockContext.tsx
│  │  ├─ PaymentMethodsContext.tsx
│  │  ├─ TransferContext.tsx
│  │  └─ WalletContext.tsx
│  ├─ theme/
│  │  ├─ colors.ts
│  │  ├─ index.ts
│  │  ├─ shadows.ts
│  │  ├─ spacing.ts
│  │  └─ typography.ts
│  └─ types/
│     ├─ index.ts
│     ├─ recipient.ts
│     └─ transfer.ts
├─ supabase/
│  ├─ orchestration-decisions.sql
│  ├─ payment-methods.sql
│  ├─ rls-security-foundation.sql
│  ├─ route-operational-events.sql
│  ├─ transaction-audit-logs.sql
│  └─ treasury-liquidity-snapshots.sql
├─ app.json
├─ eas.json
├─ eslint.config.js
├─ expo-env.d.ts
├─ package.json
├─ README.md
└─ tsconfig.json
```

The repo is an Expo Router app with a strong separation between screens, state providers, orchestration engines, and persistence services. The live runtime is intentionally simulation-first, but the data model already anticipates real payment, execution, and operational telemetry.

## 2. Screens and Navigation Routes

| Route | Screen | Visible in menus | Role |
|---|---|---:|---|
| `/` | [app/index.tsx](app/index.tsx) | Yes | Home dashboard with corridor intelligence, FX health, and telemetry summary |
| `/auth` | [app/auth.tsx](app/auth.tsx) | No | Supabase sign-in/sign-up and demo access gate |
| `/check-email` | [app/check-email.tsx](app/check-email.tsx) | No | Post-sign-up confirmation screen |
| `/account-created` | [app/account-created.tsx](app/account-created.tsx) | No | Post-confirmation landing screen |
| `/account` | [app/account.tsx](app/account.tsx) | Yes | Identity, security, verification, and sign-out screen |
| `/send` | [app/send.tsx](app/send.tsx) | Yes | Transfer creation, recipient capture, and initial transfer setup |
| `/routes` | [app/routes.tsx](app/routes.tsx) | Yes | Ranked route selection and orchestration decision screen |
| `/funding` | [app/funding.tsx](app/funding.tsx) | No | Funding authorisation screen after route selection |
| `/track` | [app/track.tsx](app/track.tsx) | Yes | Execution state machine, XRPL proof, payout tracking, and completion view |
| `/operations` | [app/operations.tsx](app/operations.tsx) | Dropdown only | Operational command centre for treasury and execution telemetry |
| `/payment-methods` | [app/payment-methods.tsx](app/payment-methods.tsx) | No | Payment method management screen |
| `/quote` | [app/quote.tsx](app/quote.tsx) | No | Older standalone route estimator, not wired into the main flow |
| `/xrpl-test` | [app/xrpl-test.tsx](app/xrpl-test.tsx) | No | XRPL connectivity utility screen |

`app/_layout.tsx` is the root shell. It installs the provider stack and wraps the router in [AuthGate](src/components/auth/AuthGate.tsx). The public screens are `auth`, `check-email`, and `account-created`; [Screen](src/components/ui/Screen.tsx) suppresses the app chrome on those routes.

The global menu surfaces are split in two places:

- [AppMenu](src/components/navigation/AppMenu.tsx) provides the bottom navigation for Home, Send, Routes, Track, and Account.
- [AppDropdownMenu](src/components/navigation/AppDropdownMenu.tsx) adds a top-level menu that also exposes Operations and sign-out.

## 3. Services and Responsibilities

### Persistence and lifecycle services

| Module | Responsibility |
|---|---|
| [src/services/auditLog.ts](src/services/auditLog.ts) | Writes high-level audit events to `audit_logs` for auth and recipient activity |
| [src/services/transactionAuditService.ts](src/services/transactionAuditService.ts) | Writes transfer-scoped lifecycle events to `transaction_audit_logs`, resolves pending milestones, and reads the event trail |
| [src/services/transferService.ts](src/services/transferService.ts) | Persists transfer drafts and completed transfers to `transfers`, then rehydrates transfer history |
| [src/services/recipientService.ts](src/services/recipientService.ts) | Saves recipients to `recipients`, reads saved recipients, and falls back to transfer history when needed |
| [src/services/routeOperationalEventService.ts](src/services/routeOperationalEventService.ts) | Persists route degradation/failover events to `route_operational_events` and reads recent events for operations |
| [src/services/treasuryIntelligenceService.ts](src/services/treasuryIntelligenceService.ts) | Writes and reads treasury snapshots in `treasury_liquidity_snapshots` |
| [src/services/execution/executionPersistenceService.ts](src/services/execution/executionPersistenceService.ts) | Upserts execution snapshots into `execution_sessions` and loads recoverable sessions |
| [src/services/execution/executionRealtimeService.ts](src/services/execution/executionRealtimeService.ts) | Subscribes to realtime changes on `execution_sessions` |
| [src/services/execution/executionRecoveryService.ts](src/services/execution/executionRecoveryService.ts) | Reads recoverable execution snapshots from `execution_sessions` |

### Intelligence services

| Module | Responsibility |
|---|---|
| [src/services/intelligence/telemetryIntelligenceService.ts](src/services/intelligence/telemetryIntelligenceService.ts) | Aggregates transfers, execution sessions, and audit logs into an operational intelligence summary |
| [src/services/intelligence/executiveInsightService.ts](src/services/intelligence/executiveInsightService.ts) | Converts telemetry summaries into executive-level narrative, recommendation, and risk level |
| [src/services/intelligence/providerExecutionIntelligence.ts](src/services/intelligence/providerExecutionIntelligence.ts) | Derives provider health, failover risk, and recommendation from a route quote |

### Orchestration and execution engines

| Module | Responsibility |
|---|---|
| [src/lib/settlementOrchestrator.ts](src/lib/settlementOrchestrator.ts) | Builds ranked route quotes by combining AI scoring, treasury signals, provider templates, and liquidity status |
| [src/lib/aiRouteIntelligence.ts](src/lib/aiRouteIntelligence.ts) | Pure AI-like route scoring heuristics and corridor health signals |
| [src/lib/treasuryIntelligence.ts](src/lib/treasuryIntelligence.ts) | Pure treasury heuristics for corridor, partner, and rail liquidity signals |
| [src/lib/routeOperationalState.ts](src/lib/routeOperationalState.ts) | Derives route degradation/failover events from route quote metadata |
| [src/services/execution/executionEngine.ts](src/services/execution/executionEngine.ts) | Orchestrates the transfer state machine, XRPL bridge step, payout step, retries, failover, and snapshot persistence |
| [src/services/payout/payoutAdapter.ts](src/services/payout/payoutAdapter.ts) | Chooses the payout backend, currently defaulting to mock fallback unless Nium sandbox credentials are present |
| [src/services/payout/payoutRoutingEngine.ts](src/services/payout/payoutRoutingEngine.ts) | Scores payout partners and selects the best supported partner |
| [src/services/payout/payoutPartnerDirectory.ts](src/services/payout/payoutPartnerDirectory.ts) | Static directory of payout partner capabilities |
| [src/services/payout/mockPayoutProvider.ts](src/services/payout/mockPayoutProvider.ts) | Mock payout backend used by default |
| [src/services/payout/providers/niumSandboxProvider.ts](src/services/payout/providers/niumSandboxProvider.ts) | Credential-gated Nium sandbox connector |

### XRPL and wallet helpers

| Module | Responsibility |
|---|---|
| [src/lib/xrplClient.ts](src/lib/xrplClient.ts) | Singleton XRPL testnet client manager |
| [src/lib/xrplWallet.ts](src/lib/xrplWallet.ts) | Creates/restores the testnet wallet, checks balances, and manages the RLUSD trustline |
| [src/lib/xrplSettlement.ts](src/lib/xrplSettlement.ts) | Sends a demo XRPL testnet settlement payment for hybrid routes |
| [src/lib/simulatedRLusdWallet.ts](src/lib/simulatedRLusdWallet.ts) | SecureStore-backed simulated RLUSD reserve used by routing and treasury logic |

## 4. Supabase Tables and Active Read/Write Status

| Table | Active read | Active write | In repo schema? | Notes |
|---|---:|---:|---:|---|
| `profiles` | Not directly read in app code | Yes, from [AuthContext](src/state/AuthContext.tsx) | RLS only | Upserted after session changes; schema is expected externally |
| `transfers` | Yes, by [transferService](src/services/transferService.ts), [recipientService](src/services/recipientService.ts), and telemetry intelligence | Yes, by [transferService](src/services/transferService.ts) | RLS only | Main transfer history and persistence table |
| `recipients` | Yes, by [recipientService](src/services/recipientService.ts) and the send screen | Yes, by [recipientService](src/services/recipientService.ts) | RLS only | Saved recipients and favourites |
| `audit_logs` | No current app-side reader | Yes, by [auditLog](src/services/auditLog.ts) | RLS only | High-level login/signup/logout and recipient audit stream |
| `transaction_audit_logs` | Yes, by [OperationalTimelineCard](src/components/audit/OperationalTimelineCard.tsx) and telemetry intelligence | Yes, by [transactionAuditService](src/services/transactionAuditService.ts) | Yes | Transfer-scoped lifecycle ledger |
| `route_operational_events` | Yes, by [operations](app/operations.tsx) | Yes, by [routeOperationalEventService](src/services/routeOperationalEventService.ts) | Yes | Route degradation and failover event ledger |
| `treasury_liquidity_snapshots` | Yes, by [operations](app/operations.tsx) | Yes, by [treasuryIntelligenceService](src/services/treasuryIntelligenceService.ts) | Yes | Treasury snapshot ledger for route evaluation time |
| `execution_sessions` | Yes, by execution persistence/realtime/recovery services and operations | Yes, by [executionPersistenceService](src/services/execution/executionPersistenceService.ts) | Not in repo SQL | Primary execution state ledger assumed to exist in Supabase |
| `payment_methods` | No, not yet queried by the app | No, not yet written by the app | Yes | Schema exists, but UI still uses mock payment data |
| `orchestration_decisions` | No | No | Yes | Schema exists but no current app writer/reader |
| `transactions` | No | No | RLS only | Future compatibility table in `rls-security-foundation.sql` |
| `xrpl_identities` | No | No | RLS only | Future compatibility table in `rls-security-foundation.sql` |

The important distinction is that the app already depends on several tables that are protected by the RLS foundation file but not defined locally in `supabase/`. Those are assumed to exist in the connected Supabase project.

## 5. Data Flows Between Screens, Services, and Tables

1. Authentication starts in [app/auth.tsx](app/auth.tsx), which calls [AuthContext](src/state/AuthContext.tsx). That context signs users into Supabase, upserts `profiles`, and logs auth events through [auditLog](src/services/auditLog.ts).
2. Once authenticated, [AuthGate](src/components/auth/AuthGate.tsx) unlocks the main app shell. [WalletContext](src/state/WalletContext.tsx) loads the testnet wallet, XRP balance, RLUSD balance, and simulated RLUSD reserve.
3. Transfer creation starts in [app/send.tsx](app/send.tsx). It captures sender amount and recipient details, reads saved recipients through [recipientService](src/services/recipientService.ts), writes audit events, and seeds the active transfer in [TransferContext](src/state/TransferContext.tsx).
4. Route generation happens in [app/routes.tsx](app/routes.tsx). It calls [settlementOrchestrator](src/lib/settlementOrchestrator.ts), which combines [aiRouteIntelligence](src/lib/aiRouteIntelligence.ts), [treasuryIntelligence](src/lib/treasuryIntelligence.ts), and provider templates to rank routes. The screen then writes route treasury snapshots and operational events to Supabase, and stores the generated routes back into transfer state.
5. Funding selection in [app/funding.tsx](app/funding.tsx) binds the chosen payment method into the transfer state. The current payment sources come from [PaymentMethodsContext](src/state/PaymentMethodsContext.tsx), which is still mock-backed rather than database-backed.
6. Execution starts in [app/track.tsx](app/track.tsx). It hydrates any existing `execution_sessions` snapshot, subscribes to realtime updates, runs [executionEngine](src/services/execution/executionEngine.ts), debits simulated GBP, optionally performs XRPL testnet settlement, and writes execution snapshots back to Supabase.
7. Completion writes the final transfer to `transfers`, saves the recipient to `recipients`, and resolves pending lifecycle audit events in `transaction_audit_logs`.
8. Observability flows into [app/operations.tsx](app/operations.tsx), which reads `treasury_liquidity_snapshots`, `route_operational_events`, and `execution_sessions` to build an operations dashboard.
9. The home dashboard in [app/index.tsx](app/index.tsx) reads the FX feed and corridor health, and the AI card reads `transfers`, `execution_sessions`, and `transaction_audit_logs` to produce executive-level intelligence.

## 6. Intelligence Services Currently Connected

- [src/services/intelligence/telemetryIntelligenceService.ts](src/services/intelligence/telemetryIntelligenceService.ts) is connected to [AICorridorIntelligenceCard](src/components/intelligence/AICorridorIntelligenceCard.tsx).
- [src/services/intelligence/executiveInsightService.ts](src/services/intelligence/executiveInsightService.ts) is also connected to [AICorridorIntelligenceCard](src/components/intelligence/AICorridorIntelligenceCard.tsx).
- [src/services/intelligence/providerExecutionIntelligence.ts](src/services/intelligence/providerExecutionIntelligence.ts) is connected to [app/operations.tsx](app/operations.tsx).
- [src/lib/aiRouteIntelligence.ts](src/lib/aiRouteIntelligence.ts) is connected through [settlementOrchestrator](src/lib/settlementOrchestrator.ts) and therefore drives ranked route scoring.
- [src/lib/treasuryIntelligence.ts](src/lib/treasuryIntelligence.ts) is connected through [settlementOrchestrator](src/lib/settlementOrchestrator.ts) and [treasuryIntelligenceService](src/services/treasuryIntelligenceService.ts).
- [src/lib/routeOperationalState.ts](src/lib/routeOperationalState.ts) is connected to [routeOperationalEventService](src/services/routeOperationalEventService.ts) and the route-selection screen.

## 7. Intelligence Services Implemented but Not Connected

- [src/lib/routingEngine.ts](src/lib/routingEngine.ts) looks like an older generic scorer and is not imported by the current route flow.
- [src/lib/providerIntegrationFramework.ts](src/lib/providerIntegrationFramework.ts) defines a richer provider adapter model, but the live route flow does not use it directly.
- [src/lib/xrplExplorer.ts](src/lib/xrplExplorer.ts) exists in the repo but is not wired into any current screen or service.
- [app/quote.tsx](app/quote.tsx) is a separate route estimator that is not exposed in the menu path and appears to be a legacy or alternate screen.
- [src/services/intelligence/telemetryIntelligenceService.ts](src/services/intelligence/telemetryIntelligenceService.ts) is connected, but it still depends on sample data quality that is limited by the current small telemetry history.

## 8. Treasury Architecture

The treasury path is split between pure calculation and persistence:

- [src/lib/treasuryIntelligence.ts](src/lib/treasuryIntelligence.ts) is the pure treasury engine. It scores corridor liquidity, partner capacity, rail capacity, pressure, and a treasury recommendation.
- [src/lib/settlementOrchestrator.ts](src/lib/settlementOrchestrator.ts) invokes that engine for each route template and merges the treasury penalty into the final route score.
- [src/services/treasuryIntelligenceService.ts](src/services/treasuryIntelligenceService.ts) persists the treasury signal into `treasury_liquidity_snapshots` for auditability.
- [app/routes.tsx](app/routes.tsx) triggers that write for every generated route, so each quote evaluation leaves a snapshot trail.
- [app/operations.tsx](app/operations.tsx) reads the snapshots back and summarizes treasury pressure, corridor health, and rail capacity.

The treasury model is simulation-first but already structured as if it were a live liquidity control plane. The simulated RLUSD reserve in [WalletContext](src/state/WalletContext.tsx) is part of the decision input for hybrid routes.

## 9. Execution Engine Architecture

The execution engine is centered in [src/services/execution/executionEngine.ts](src/services/execution/executionEngine.ts) and behaves like a resumable state machine.

- It defines explicit states for reconnecting, verifying status, reconciling provider state, authorising the route, settling the bridge, executing payout, verifying payout, failover evaluation, completion, and failure.
- It persists snapshots through [executionPersistenceService](src/services/execution/executionPersistenceService.ts), which upserts the full execution record into `execution_sessions`.
- It emits realtime updates through [executionRealtimeService](src/services/execution/executionRealtimeService.ts), which the track screen subscribes to.
- It supports recovery through [executionRecoveryService](src/services/execution/executionRecoveryService.ts), which loads in-flight sessions back from `execution_sessions`.
- It writes detailed lifecycle audit events to `transaction_audit_logs` through [transactionAuditService](src/services/transactionAuditService.ts).
- It can run an XRPL bridge settlement through [src/lib/xrplSettlement.ts](src/lib/xrplSettlement.ts) for hybrid routes, then verifies the resulting proof and refreshes wallet balances.
- It sends payout instructions through [src/services/payout/payoutAdapter.ts](src/services/payout/payoutAdapter.ts), which currently routes to the mock provider by default and upgrades to Nium sandbox only when credentials are present.

The track screen is therefore not just a progress view. It is the UI for a persisted, resumable execution workflow with audit logging, realtime updates, and a failover-aware backend.

## 10. Route Intelligence Architecture

The route stack is built in layers:

- [src/lib/settlementOrchestrator.ts](src/lib/settlementOrchestrator.ts) constructs five route templates and enriches them with FX rates, liquidity status, treasury penalties, AI scoring, provider metadata, and settlement stages.
- [src/lib/aiRouteIntelligence.ts](src/lib/aiRouteIntelligence.ts) contributes route score, predicted failure risk, AI confidence, partner health, and recommendation text.
- [src/lib/treasuryIntelligence.ts](src/lib/treasuryIntelligence.ts) contributes treasury score, pressure, corridor insight, and liquidity recommendation.
- [src/lib/routeOperationalState.ts](src/lib/routeOperationalState.ts) turns route metadata into a simulated operational event that can indicate watch, degraded, or failover conditions.
- [app/routes.tsx](app/routes.tsx) persists the generated treasury and operational data and stores the selected route back in transfer state.
- [src/services/routeOperationalEventService.ts](src/services/routeOperationalEventService.ts) and [src/services/treasuryIntelligenceService.ts](src/services/treasuryIntelligenceService.ts) make the route decisions auditable in Supabase.

There is also an older route estimator in [app/quote.tsx](app/quote.tsx), but the current route-selection flow is the richer one in `/routes`.

## 11. OTA Deployment Configuration

OTA and release configuration is Expo/EAS based:

- [app.json](app.json) enables `expo-updates`, sets `runtimeVersion` to `1.0.0`, and points updates at the EAS project URL `https://u.expo.dev/35f8cdd6-557f-493d-b065-52d6121f62d3`.
- [app.json](app.json) uses `checkAutomatically: ON_LOAD` and `fallbackToCacheTimeout: 0`, which means updates are checked on app load and the cached bundle is not preferred over a fresh update.
- [eas.json](eas.json) defines `development`, `preview`, and `production` build profiles with Expo channels `development`, `preview`, and `production`.
- [eas.json](eas.json) uses internal distribution for development and preview, and auto-incremented production builds.
- [app.json](app.json) enables `newArchEnabled`, `typedRoutes`, `reactCompiler`, and the `expo-secure-store` plugin, which matters for wallet and auth persistence.

This is a standard EAS Update deployment setup rather than a custom OTA system.

## 12. Known Technical Debt

- [src/state/PaymentMethodsContext.tsx](src/state/PaymentMethodsContext.tsx) is still mock-backed even though a `payment_methods` table and schema exist.
- [app/payment-methods.tsx](app/payment-methods.tsx) simulates card and open-banking setup instead of writing live provider data.
- [src/lib/routingEngine.ts](src/lib/routingEngine.ts) and [src/lib/providerIntegrationFramework.ts](src/lib/providerIntegrationFramework.ts) overlap conceptually with the newer settlement orchestrator and appear to be unused.
- [app/quote.tsx](app/quote.tsx) is a second route quote surface that is not integrated into the main navigation path.
- [src/services/auditLog.ts](src/services/auditLog.ts) writes to `audit_logs`, but there is no app-side reader for that table yet.
- [supabase/orchestration-decisions.sql](supabase/orchestration-decisions.sql) defines a useful audit table, but no code currently writes or reads it.
- [src/services/execution/executionPersistenceService.ts](src/services/execution/executionPersistenceService.ts) assumes `execution_sessions` exists in Supabase, but there is no local migration file for it in this repo.
- [src/lib/xrplSettlement.ts](src/lib/xrplSettlement.ts) and [src/lib/xrplWallet.ts](src/lib/xrplWallet.ts) are live XRPL integrations, but the app still defaults to simulation-first behavior with fallback behavior around credentials and balances.
- Route scoring still uses hardcoded corridor and provider heuristics for the current target markets rather than external live provider feeds.
- The telemetry intelligence card depends on the available persisted sample size, which is still small and can produce limited insight quality.

## 13. Current Development Roadmap

There is no dedicated roadmap document in the repo, so this section is inferred from the codebase state and the outstanding integration gaps.

1. Wire [src/state/PaymentMethodsContext.tsx](src/state/PaymentMethodsContext.tsx) to the live `payment_methods` table and remove the mock-only funding source model.
2. Add or confirm a migration for `execution_sessions`, then tighten the execution persistence and recovery contract around that schema.
3. Decide whether [src/lib/routingEngine.ts](src/lib/routingEngine.ts) and [src/lib/providerIntegrationFramework.ts](src/lib/providerIntegrationFramework.ts) should be consolidated into the current route stack or retired.
4. Promote [supabase/orchestration-decisions.sql](supabase/orchestration-decisions.sql) into the live decision trail so each route selection is auditable beyond treasury and operational snapshots.
5. Replace default mock payout handling with live sandbox providers where credentials exist, starting with the Nium path already scaffolded in [src/services/payout/providers/niumSandboxProvider.ts](src/services/payout/providers/niumSandboxProvider.ts).
6. Expand the route intelligence data sources beyond heuristics so corridor scoring is driven more by external signals and less by fixed fixtures.
7. Either integrate [app/quote.tsx](app/quote.tsx) into the main navigation model or remove it once the richer `/routes` flow is fully authoritative.

## 14. Short Summary

The repository currently behaves like a simulation-first payment orchestration platform with production-shaped abstractions. The main live path is:

Auth and unlock -> transfer creation -> route scoring and treasury snapshotting -> funding authorisation -> execution state machine -> realtime audit and operations telemetry.

The strongest active systems are the route orchestrator, treasury snapshotting, transaction audit trail, execution persistence/realtime stack, and the telemetry-backed home dashboard. The biggest gaps are live payment-method persistence, the unused legacy routing modules, and the still-mock-heavy funding and payout surfaces.
