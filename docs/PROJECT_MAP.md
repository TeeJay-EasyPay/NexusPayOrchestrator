# NexusPay Orchestrator Project Map

Generated on 2026-06-02. This is the current repository map for NexusPay Orchestrator as implemented in the working tree. It describes live code paths, connected services, inactive scaffolding, Supabase dependencies, deployment configuration, technical debt, and the active roadmap implied by governance documents.

## 1. Current Folder Structure

```text
.
|-- app/
|   |-- _layout.tsx
|   |-- account-created.tsx
|   |-- account.tsx
|   |-- auth.tsx
|   |-- check-email.tsx
|   |-- funding.tsx
|   |-- index.tsx
|   |-- live-intelligence-feeds.tsx
|   |-- nexus-ai.tsx
|   |-- operations-v2.tsx
|   |-- payment-methods.tsx
|   |-- quote.tsx
|   |-- routes.tsx
|   |-- send.tsx
|   |-- track.tsx
|   `-- xrpl-test.tsx
|-- assets/images/
|-- components/
|   |-- ui/
|   `-- legacy Expo template components
|-- constants/
|-- docs/
|   |-- ARCHITECTURE_PRINCIPLES.md
|   |-- BUSINESS_EXECUTION_STRATEGY.md
|   |-- PROJECT_MAP.md
|   |-- PROJECT_VISION.md
|   |-- QA_TEST_PLAN.md
|   |-- UI_DESIGN_SYSTEM.md
|   `-- implementation, audit, cleanup, and Codex output reports
|-- governance/
|   |-- automation/
|   |   |-- maestro/flows/
|   |   `-- scripts/
|   |-- compliance-reviews/
|   |-- executive-reports/
|   |-- founder-briefings/
|   |-- governance-core/
|   |-- governance-history/
|   |-- sprint-archives/
|   `-- startup-architecture-v2/
|-- hooks/
|-- scripts/
|-- src/
|   |-- components/
|   |   |-- audit/
|   |   |-- auth/
|   |   |-- intelligence/
|   |   |-- navigation/
|   |   |-- operations/
|   |   |-- operations-v2/
|   |   |-- payment/
|   |   |-- recipients/
|   |   |-- transactions/
|   |   |-- transfer/
|   |   `-- ui/
|   |-- data/
|   |-- hooks/
|   |-- lib/
|   |-- services/
|   |   |-- execution/
|   |   |-- intelligence/
|   |   `-- payout/
|   |-- startup/
|   |-- state/
|   |-- testing/
|   |   `-- automation/
|   |-- theme/
|   |-- types/
|   `-- utils/
|-- supabase/
|   |-- functions/nexus-ai/
|   `-- *.sql
|-- app.json
|-- eas.json
|-- package.json
`-- tsconfig.json
```

Generated or diagnostic artefacts such as `dist/`, `.expo/`, `node_modules/`, and `temp_window_dump*.txt` exist in the workspace but are not source architecture.

## 2. Screens and Navigation Routes

| Route | File | Role | Navigation status |
|---|---|---|---|
| `/` | `app/index.tsx` | Home dashboard with funding readiness, FX snapshots, recommended corridors, active transfer summary, transaction history, and Nexus AI dashboard summary. | Home route and quick tiles. |
| `/auth` | `app/auth.tsx` | Supabase sign-in/sign-up and demo access. | Public startup route. |
| `/check-email` | `app/check-email.tsx` | Post-sign-up email confirmation prompt. | Public startup route. |
| `/account-created` | `app/account-created.tsx` | Confirmation landing after email link. | Public startup route. |
| `/account` | `app/account.tsx` | Profile, security, verification posture, limits, payment-method link, and sign-out. | Dropdown and older `AppMenu`. |
| `/send` | `app/send.tsx` | Transfer initiation, recipient capture/reuse, destination/payout selection, and route preview. | Dropdown, older `AppMenu`, home action. |
| `/routes` | `app/routes.tsx` | Main ranked route selection with treasury and AI route reasoning. | Dropdown, older `AppMenu`, home quick tile. |
| `/funding` | `app/funding.tsx` | Select saved funding source and simulate authorisation. | Flow-only after route selection. |
| `/track` | `app/track.tsx` | Execution state machine, realtime execution session updates, XRPL proof, payout status, and operational timeline. | Dropdown and older `AppMenu`. |
| `/operations-v2` | `app/operations-v2.tsx` | Mission Control style operations dashboard built from treasury snapshots, route events, execution sessions, live feeds, and QA summary. | Dropdown. |
| `/live-intelligence-feeds` | `app/live-intelligence-feeds.tsx` | Live FX feed, simulated treasury feed, and global market-hours view. | Dropdown and home quick tile. |
| `/nexus-ai` | `app/nexus-ai.tsx` | User-facing Nexus AI settings, screen toggles, and sensitivity controls. | Dropdown and home quick tile. |
| `/payment-methods` | `app/payment-methods.tsx` | Mock funding-source management and primary method selection. | Account link and home action. |
| `/quote` | `app/quote.tsx` | Legacy/alternate standalone quote estimator. | Not exposed in current menu. |
| `/xrpl-test` | `app/xrpl-test.tsx` | XRPL testnet wallet/connectivity utility. | Not exposed in current menu. |

Important navigation note: `app/operations.tsx` no longer exists, but `app/index.tsx` still routes the "Operations Centre" quick tile to `/operations`. The dropdown correctly routes to `/operations-v2`.

`app/_layout.tsx` is the root shell. It installs `GestureHandlerRootView`, `SafeAreaProvider`, `AuthProvider`, `DeviceUnlockProvider`, `WalletProvider`, `PaymentMethodsProvider`, `TransferProvider`, and `StartupCoordinator`, then renders the Expo Router `Stack`.

Startup routing is now handled by `src/startup/StartupCoordinator.tsx`, `startupStateMachine.ts`, and `startupRoutes.ts`, replacing the older direct `AuthGate` shell approach.

## 3. Services and Responsibilities

### Core Persistence

| Service | Responsibility |
|---|---|
| `src/services/auditLog.ts` | Writes high-level user audit events to `audit_logs`. |
| `src/services/transferService.ts` | Upserts transfer progress/completions into `transfers` and loads transfer history. |
| `src/services/recipientService.ts` | Upserts saved recipients, reads favourites, and falls back to completed transfers if `recipients` is unavailable or empty. |
| `src/services/transactionAuditService.ts` | Writes transfer lifecycle events, resolves pending milestones, and reads transaction audit trails. |
| `src/services/routeOperationalEventService.ts` | Upserts route degradation/failover events and loads recent route events. |
| `src/services/treasuryIntelligenceService.ts` | Upserts and reads treasury liquidity snapshots for route decisions. |
| `src/services/startupEvidence.ts` | Records Startup V2 launch and decision evidence. |
| `src/services/startupLogger.ts` | Central startup diagnostic logging. |

### Execution and Payout

| Service | Responsibility |
|---|---|
| `src/services/execution/executionEngine.ts` | Resumable transfer execution state machine: idempotency, route authorisation, XRPL settlement, payout submission, verification, retry, failover, completion/failure. |
| `src/services/execution/executionPersistenceService.ts` | Persists full execution snapshots to `execution_sessions` and loads recoverable sessions. |
| `src/services/execution/executionRealtimeService.ts` | Supabase realtime subscriptions for one execution session or recent sessions. |
| `src/services/execution/executionRecoveryService.ts` | Recovery-oriented reads from `execution_sessions`. |
| `src/services/payout/payoutAdapter.ts` | Selects payout backend and executes payout. |
| `src/services/payout/payoutRoutingEngine.ts` | Scores payout partners and selects the best candidate. |
| `src/services/payout/payoutPartnerDirectory.ts` | Static partner capability directory. |
| `src/services/payout/mockPayoutProvider.ts` | Default mock payout provider. |
| `src/services/payout/providers/niumSandboxProvider.ts` | Nium sandbox connector, gated by environment credentials. |

### Intelligence and AI

| Service | Responsibility |
|---|---|
| `src/services/nexusAIService.ts` | Client wrapper for the Supabase `nexus-ai` Edge Function, with typed actions, retries, timeouts, normalization, context enrichment, and deterministic fallbacks. |
| `src/services/nexusAISettingsService.ts` | Reads/writes `nexus_ai_settings` and supplies default settings on RLS/config failures. |
| `src/hooks/useNexusAISettings.ts` | React hook for screen-level AI enablement and toggles. |
| `src/services/liveIntelligenceFeedService.ts` | Fetches Frankfurter FX rates, generates simulated treasury feeds, and calculates market-hour status. |
| `src/services/intelligence/contextBuilder.ts` | Intended AI context aggregation layer for dashboard, route, transfer, and operations contexts. |
| `src/services/intelligence/contextTypes.ts` | Structured AI context type definitions. |
| `src/services/intelligence/telemetryIntelligenceService.ts` | Aggregates transfer, execution, and transaction audit telemetry into platform-level intelligence. |
| `src/services/intelligence/executiveInsightService.ts` | Turns telemetry metrics into executive narrative and risk recommendation. |
| `src/services/intelligence/providerExecutionIntelligence.ts` | Derives provider execution metrics from a route quote. |

### Domain Libraries

| Module | Responsibility |
|---|---|
| `src/lib/settlementOrchestrator.ts` | Builds ranked route quotes from route templates, FX, treasury, AI scoring, liquidity, and provider metadata. |
| `src/lib/aiRouteIntelligence.ts` | Provider/corridor scoring heuristics, predicted risk, confidence, and recommendation text. |
| `src/lib/treasuryIntelligence.ts` | Treasury liquidity model for corridor, partner, rail, pressure, score, and decision factors. |
| `src/lib/routeOperationalState.ts` | Converts route quote metadata into simulated operational events. |
| `src/lib/fxFeed.ts` | Multi-provider FX fetching with fallbacks. |
| `src/lib/corridorHealth.ts` | Converts FX rates into corridor health summaries. |
| `src/lib/providerIntegrationFramework.ts` | Provider adapter metadata and execution profile scaffolding. |
| `src/lib/routingEngine.ts` | Older generic route scoring helpers. |
| `src/lib/xrplClient.ts`, `xrplWallet.ts`, `xrplSettlement.ts`, `xrplExplorer.ts` | XRPL testnet client, wallet, settlement, and explorer helpers. |
| `src/lib/simulatedRLusdWallet.ts` | SecureStore-backed simulated RLUSD reserve. |

### QA and Governance Automation

| Module | Responsibility |
|---|---|
| `src/testing/qaTestDefinitions.ts` | Defines corridor, lifecycle, and regression QA test cases. |
| `src/testing/qaExecutionLogger.ts` | Stores QA execution logs locally and optionally syncs to `qa_execution_logs`. |
| `src/testing/defectRegister.ts` | Maintains seeded defects locally and optionally syncs to `qa_defect_register`. |
| `src/testing/automation/*` | Pilot certification scenario and recording helpers. |
| `governance/automation/scripts/*` | Emulator, Metro, evidence-pack, pilot-certification, and startup determinism automation. |

## 4. Supabase Tables and Active Read/Write Status

| Table | Read? | Write? | Local schema? | Current use |
|---|---:|---:|---:|---|
| `profiles` | No direct app reader | Yes | RLS only | Upserted during auth bootstrap and auth state changes. |
| `transfers` | Yes | Yes | RLS only | Main transfer progress/history table. Also used to derive recipients. |
| `recipients` | Yes | Yes | RLS only | Saved recipient table with favourites and reuse. |
| `audit_logs` | No active app reader | Yes | RLS only | Auth and recipient audit stream. |
| `transaction_audit_logs` | Yes | Yes | Yes | Transfer lifecycle ledger and realtime timeline source. |
| `route_operational_events` | Yes | Yes | Yes | Route degradation/failover event ledger for operations and AI contexts. |
| `treasury_liquidity_snapshots` | Yes | Yes | Yes | Route-time treasury snapshot ledger for operations. |
| `execution_sessions` | Yes | Yes | No | Persisted execution state machine snapshots. Required by track and operations. |
| `payment_methods` | No | No | Yes | Schema exists, but current app uses mock payment methods. |
| `nexus_ai_settings` | Yes | Yes | No | Required by Nexus AI settings screen and toggles. Missing local migration. |
| `qa_execution_logs` | No app reader from Supabase | Optional write | No | QA logs sync to Supabase when configured; UI reads local AsyncStorage. |
| `qa_defect_register` | No app reader from Supabase | Optional write | No | Defect register syncs to Supabase when configured; UI reads local AsyncStorage. |
| `orchestration_decisions` | No | No | Yes | Architectural decision-audit table not wired to route selection. |
| `transactions` | No | No | RLS only | Compatibility/future table in RLS foundation. |
| `xrpl_identities` | No | No | RLS only | Future XRPL identity table in RLS foundation. |

## 5. Data Flows Between Screens, Services, and Tables

1. `app/_layout.tsx` starts Startup V2 evidence capture, installs providers, and delegates route protection to `StartupCoordinator`.
2. `AuthContext` validates/restores Supabase sessions, clears stale sessions when necessary, upserts `profiles`, and writes `audit_logs`.
3. `StartupCoordinator` uses `startupStateMachine` to decide whether to show content, startup overlay, locked overlay, or route replacement. It writes startup evidence through `startupEvidence`.
4. `app/send.tsx` reads saved recipients from `recipients` with transfer-history fallback, captures recipient details, logs recipient reuse, creates a transfer in `TransferContext`, and moves to `/routes`.
5. `app/routes.tsx` calls `buildOrchestratedRouteQuotes`, persists generated routes into `TransferContext`, writes `treasury_liquidity_snapshots`, writes `route_operational_events`, optionally asks Nexus AI for route explanations, and moves selected routes to `/funding`.
6. `app/funding.tsx` selects a mock payment method from `PaymentMethodsContext`, updates funding state in `TransferContext`, simulates authorisation, and moves to `/track`.
7. `app/track.tsx` hydrates `execution_sessions`, subscribes to realtime execution changes, starts `executionEngine`, debits simulated GBP, writes execution snapshots and transfer progress, writes `transaction_audit_logs`, optionally runs XRPL settlement, runs payout, and completes the transfer.
8. Completion saves the final transfer row in `transfers`, upserts the recipient into `recipients`, and refreshes completed transfer history in `TransferContext`.
9. `app/operations-v2.tsx` uses `useOperationsCommandCentre` to read recent treasury snapshots, route events, recoverable execution sessions, completed transfers, live feeds, and QA summary cards.
10. `app/index.tsx` fetches corridor FX rates, builds corridor health, displays transfer history from context, and optionally calls Nexus AI for the home dashboard summary.
11. `app/live-intelligence-feeds.tsx` directly uses `getLiveIntelligenceFeeds` for FX, treasury, and market-hour displays.
12. `app/nexus-ai.tsx` reads/writes `nexus_ai_settings`; individual screens use `useNexusAIScreenSetting` for per-screen visibility and behavior.

## 6. Intelligence Services Currently Connected

| Connected intelligence | Connected through | Notes |
|---|---|---|
| `nexusAIService.generateDashboardSummary` | `app/index.tsx` | Home executive summary; invokes Edge Function with fallback. |
| `nexusAIService.explainRoute` | `app/routes.tsx` | AI route explanation for each active route when route AI is enabled. |
| `nexusAIService.analyseTransfer` | `app/track.tsx` | Transfer progress analysis when tracking AI is enabled. |
| `nexusAISettingsService` | `app/nexus-ai.tsx`, `useNexusAISettings`, `NexusAIToggleCard` | Global and screen-level AI controls. |
| `liveIntelligenceFeedService.getLiveIntelligenceFeeds` | `app/live-intelligence-feeds.tsx`, `useOperationsCommandCentre` | FX feed, simulated treasury feed, market hours. |
| `aiRouteIntelligence` | `settlementOrchestrator` -> `app/routes.tsx` | Core scoring and route-recommendation heuristics. |
| `treasuryIntelligence` | `settlementOrchestrator` -> `treasuryIntelligenceService` | Treasury score and snapshot payload for route decisions. |
| `routeOperationalState` | `app/routes.tsx` -> `routeOperationalEventService` | Creates operational event rows per generated route. |
| `providerExecutionIntelligence` | Older operations component path | Implemented and historically connected to operations surfaces; less central in `operations-v2`. |
| QA intelligence summary | `QATestCentreCard` and QA services | Reads local QA logs and defects; optional Supabase sync for writes. |

## 7. Intelligence Services Implemented but Not Connected

| Implemented item | Current connection status |
|---|---|
| `src/services/intelligence/contextBuilder.ts` | Intended to enrich Nexus AI calls, but imports `liveIntelligenceFeedsService` and `getTreasurySignal`, which are not exported by the current modules. This is implemented but likely not compile-safe as written. |
| `buildOperationsCentreContext` | Implemented in `contextBuilder.ts`, but not directly used by `useOperationsCommandCentre`; operations-v2 builds its own telemetry. |
| `telemetryIntelligenceService` and `executiveInsightService` | Implemented; no current route in `app/index.tsx` imports `AICorridorIntelligenceCard`, so they appear disconnected from the visible home dashboard after the Nexus AI redesign. |
| `providerIntegrationFramework` | Rich provider adapter/profile scaffolding exists, but active route generation does not depend on it directly. |
| `routingEngine` | Older generic route scorer; not used by current `/routes` flow. |
| `xrplExplorer` | Helper exists; `app/track.tsx` builds the explorer URL inline instead of importing it. |
| `orchestration_decisions` table | Schema exists but no service writes route decisions to it. |

## 8. Treasury Architecture

Treasury is modeled as a route-time intelligence layer, not a standalone backend.

- `treasuryIntelligence.ts` is the pure calculator. It models corridor liquidity, partner liquidity, rail liquidity, pressure, score, penalty, recommendation, and decision factors.
- `settlementOrchestrator.ts` calls treasury intelligence for every route template and merges the treasury score into route ranking.
- Hybrid routes include RLUSD bridge reserve checks using `simulatedRLusdWallet` and `WalletContext`.
- `routes.tsx` persists each generated route's treasury signal into `treasury_liquidity_snapshots`.
- `operations-v2` reads recent snapshots and turns them into corridor rows, treasury capacity, pressure, currency distribution, and mission-control health.
- Live treasury feeds in `liveIntelligenceFeedService.ts` are simulated feed rows, separate from persisted treasury snapshots.

The architecture is production-shaped but simulation-first. There is no server-side liquidity ledger or real treasury inventory service in this repository.

## 9. Execution Engine Architecture

The execution engine is a persisted, resumable client-side orchestration state machine.

- State machine: `IDLE`, recovery states, `VALIDATING_IDEMPOTENCY`, `AUTHORISING_ROUTE`, `SETTLING_BRIDGE`, `EXECUTING_PAYOUT`, `VERIFYING_PAYOUT`, `FAILOVER_EVALUATION`, `COMPLETED`, `FAILED`.
- Each emission writes an `ExecutionSnapshot` to `execution_sessions` and saves transfer progress to `transfers`.
- Idempotency is guarded in memory with `runningTransfers` and `completedTransfers`, plus a provider idempotency key in snapshots.
- XRPL settlement is only attempted for `HYBRID` routes. Fiat routes skip bridge settlement.
- Payout execution goes through `payoutAdapter`, which selects Nium sandbox when fully configured and otherwise uses the mock provider.
- Failover selects an alternate non-blocked route from the transfer's route list when the primary route fails and a failover route is available.
- `transaction_audit_logs` captures execution milestones, pending resolution, failover, payout, XRPL, completion, and failure.
- `track.tsx` is both the user-facing execution display and the trigger point for the client-side engine.
- `executionRealtimeService.ts` supports realtime session updates, but `operations-v2` currently disables its recent-session subscription in diagnostic mode.

## 10. Route Intelligence Architecture

The current authoritative route intelligence flow is `/send` -> `/routes` -> `/funding`.

- `send.tsx` gives a lightweight route preview based on hardcoded corridor signals.
- `routes.tsx` calls `buildOrchestratedRouteQuotes`, which builds richer `RouteQuote` objects.
- `settlementOrchestrator.ts` combines route templates, FX/cost/speed scores, liquidity status, treasury intelligence, provider intelligence, failover metadata, and settlement stages.
- `aiRouteIntelligence.ts` produces provider profiles, corridor health signals, predicted failure risk, confidence, AI recommendation, and decision factors.
- `treasuryIntelligence.ts` contributes route-level liquidity and pressure.
- `routeOperationalState.ts` turns route metadata into operational events for persistence and later operations monitoring.
- Nexus AI route explanations are advisory overlays. They do not select the route or mutate execution state.

Legacy route intelligence still exists in `app/quote.tsx` and `src/lib/routingEngine.ts`; these are separate from the active route-selection architecture.

## 11. OTA Deployment Configuration

OTA and builds are configured through Expo/EAS:

- `app.json` defines scheme `nexuspayorchestrator`, package `com.nexuspay.orchestrator`, runtime version `1.0.0`, and EAS project ID `35f8cdd6-557f-493d-b065-52d6121f62d3`.
- `expo-updates` is enabled with URL `https://u.expo.dev/35f8cdd6-557f-493d-b065-52d6121f62d3`.
- Updates check automatically on app load with `fallbackToCacheTimeout: 0`.
- `eas.json` uses remote app version source and defines `development`, `preview`, and `production` build profiles.
- EAS channels are `development`, `preview`, and `production`.
- Development builds use `developmentClient: true` and internal distribution.
- Preview builds use internal distribution.
- Production builds auto-increment and publish to the `production` channel.

Governance documentation on 2026-06-02 identifies build-to-device runtime parity as a certification blocker, especially around embedded JS vs OTA JS, runtime version, channel, branch, and stale device/cache behavior.

## 12. Known Technical Debt

- Dashboard quick tile routes to `/operations`, but the existing operations screen is `/operations-v2`.
- `src/components/operations/OperationsCommandCentre.tsx` imports helper exports from `useOperationsCommandCentre` that now live in `src/utils/operationsCommandCentre.ts`, leaving the older operations component stale.
- `contextBuilder.ts` references non-existent exports (`liveIntelligenceFeedsService.getLatest`, `getTreasurySignal`, and `getWalletBalance` import naming appears inconsistent with `simulatedRLusdWallet`). This likely breaks TypeScript once that file is compiled.
- `operations-v2` disables realtime subscription in diagnostic mode and bypasses the mission-summary AI effect with an early `return`; unreachable code in that effect still references undefined `safeExitTimer` and `cancelled` variables.
- `executionRealtimeService.ts` has Supabase realtime overload/type errors around `postgres_changes` channel subscriptions.
- `payment_methods` has a SQL schema, but payment method UI and context remain mock-backed.
- `nexus_ai_settings`, `execution_sessions`, `qa_execution_logs`, and `qa_defect_register` are used by code but have no local migration file in `supabase/`.
- `orchestration_decisions` has a SQL migration but is not wired into the route decision flow.
- Startup evidence writes are implemented, but the backing table/schema is not present in local SQL files.
- Several UI files contain mojibake/encoding artefacts in rendered strings and icon text.
- `quote.tsx`, `routingEngine.ts`, and parts of `providerIntegrationFramework.ts` duplicate or trail the newer route architecture.
- XRPL explorer helper exists but is not used by `track.tsx`.
- `audit_logs` is write-only from the app perspective.
- Nium sandbox support is credential-gated, while mock payout remains the default execution path.
- Operations success-rate calculations depend on execution-session completeness; governance defects note history/track synchronization issues.
- Temporary diagnostic files (`temp_window_dump*.txt`) are present at repo root.
- Git status currently shows untracked governance/authentication files; they should be reviewed before broad cleanup or commits.

## 13. Current Development Roadmap

The clearest current roadmap comes from `governance/executive-reports/PARALLEL_WORKSTREAM_EXECUTION_PLAN_2026-06-02.md`:

1. Build-to-device runtime parity investigation.
   - Prove whether physical device behavior matches the repo, embedded bundle, OTA update, branch, build profile, runtime version, and cache state.
   - Keep pilot certification blocked until parity is proven.

2. Transaction Centre V1.
   - Build a user-facing transaction list/search/filter/detail/repeat/receipt experience.
   - Reuse the existing transfer and recipient models without changing treasury or execution logic.

3. Private user experience and multi-account design.
   - Design a simpler consumer app structure: Home, Send Money, Transfers, Profile, Settings, Nexus AI, and later KYC/XML verification.
   - Define Cheapest vs Most Stable route choice for private users.
   - Define multi-account ownership, switching, permissions, and future Supabase data implications.

Additional engineering roadmap implied by the repository:

4. Add missing migrations for used tables (`execution_sessions`, `nexus_ai_settings`, QA tables, startup evidence).
5. Fix Nexus AI context builder export mismatches and decide whether operations contexts should feed operations-v2 summaries.
6. Restore or intentionally remove operations-v2 realtime and mission-summary AI bypasses.
7. Wire `payment_methods` into the funding source model.
8. Route dashboard operations navigation to `/operations-v2`.
9. Connect `orchestration_decisions` to route selection for durable decision auditability.
10. Promote sandbox/live payout integrations beyond the mock default.
11. Consolidate or retire legacy route quote/scoring surfaces.

## Short Architecture Summary

NexusPay Orchestrator is an Expo Router app for simulated cross-border payment orchestration. The strongest live systems are Startup V2 auth/routing, route scoring, treasury snapshotting, execution state persistence, transaction audit logging, Nexus AI advisory overlays, operations-v2 telemetry, and governance/QA automation.

The main runtime flow is:

```text
Startup V2/auth -> dashboard -> send -> routes -> funding -> track/execution
              -> transfers/recipients/audit/execution sessions
              -> operations-v2/live intelligence/governance QA
```

The main architectural gaps are schema drift, mock-backed funding/payout, disconnected or compile-risk AI context scaffolding, operations route drift, and active governance work around device/OTA parity.
