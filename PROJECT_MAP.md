# NexusPay Orchestrator Project Map

This document maps the repository into the parts an AI architect needs to understand the system without reading every source file.

## Overview

NexusPay Orchestrator is an Expo Router mobile/web app that simulates an intelligent cross-border payment platform. The app is built around a layered flow:

1. Authenticate and unlock the device.
2. Create a transfer and capture the recipient.
3. Generate ranked routes from FX, treasury, provider, and corridor intelligence.
4. Choose a funding source and authorise it.
5. Execute the transfer through a state machine.
6. Persist audit, operational, treasury, and execution telemetry to Supabase.

The codebase is intentionally split into UI screens, reusable components, state providers, service layers, and domain intelligence modules.

## Folder Structure

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
│  │  ├─ execution/
│  │  │  ├─ executionEngine.ts
│  │  │  ├─ executionPersistenceService.ts
│  │  │  ├─ executionRealtimeService.ts
│  │  │  └─ executionRecoveryService.ts
│  │  ├─ intelligence/
│  │  │  ├─ providerExecutionIntelligence.ts
│  │  │  └─ telemetryIntelligenceService.ts
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

Generated build output such as dist/ exists in the workspace, but it is not part of the source architecture map.

## Screens

### app/_layout.tsx

The root composition layer. It installs the provider stack in this order:

- AuthProvider
- DeviceUnlockProvider
- WalletProvider
- PaymentMethodsProvider
- TransferProvider
- AuthGate
- Expo Router Stack

This is the true application shell and determines which global state is available to every screen.

### app/index.tsx

The home dashboard. It:

- Loads live FX rates from the provider chain.
- Builds corridor health from the FX feed.
- Shows corridor intelligence cards and summary metrics.
- Renders recent transaction history.
- Surfaces the AI corridor intelligence card.
- Links into Send, Routes, Operations, and Account.

This is the top-level operational overview for the system.

### app/auth.tsx

Secure sign-in and sign-up screen. It:

- Supports email/password sign-in and sign-up through Supabase Auth.
- Requires device unlock for sign-in and demo access.
- Supports demo access using EXPO_PUBLIC_DEMO_EMAIL and EXPO_PUBLIC_DEMO_PASSWORD.
- Sends newly created users to /check-email.

### app/check-email.tsx

Post-sign-up confirmation screen. It explains that a confirmation email was sent and routes back to login.

### app/account-created.tsx

Post-confirmation landing screen. It tells the user the account was verified and returns them to /auth.

### app/account.tsx

Account, security, and profile screen. It:

- Displays the active Supabase session.
- Shows demo access state, account readiness, and verification posture.
- Surfaces security, compliance, payment-method, and limit status.
- Exposes sign-out.

### app/send.tsx

Transfer initiation screen. It:

- Captures amount, recipient identity, country, payout method, and provider.
- Loads saved recipients and allows reuse/favoriting.
- Validates the transfer inputs.
- Creates the transfer in TransferContext.
- Moves the user to route scoring.

This is the recipient and transfer construction screen.

### app/routes.tsx

Primary route-selection screen. It:

- Builds ranked route quotes with settlementOrchestrator.
- Writes treasury snapshots and route operational events to Supabase.
- Persists the available routes into TransferContext.
- Lets the user choose the best route and continue to funding.

This is the main route intelligence and orchestration decision screen.

### app/quote.tsx

A simpler standalone route estimator. It calculates a small set of quote options from corridors and can forward the user to /send.

It looks like an earlier or alternate quoting screen compared with the richer /routes flow.

### app/funding.tsx

Funding-authorisation screen. It:

- Lets the user choose a saved bank or card method.
- Sets the funding method and funding status on the transfer.
- Simulates authorisation before moving to tracking.

### app/track.tsx

Live execution and settlement tracking screen. It:

- Hydrates a persisted execution snapshot if one exists.
- Subscribes to realtime execution updates from Supabase.
- Starts the transfer execution engine.
- Debits the simulated GBP balance.
- Shows execution steps, payout status, XRPL proof, failover state, and completion status.

This is the state machine visualisation and terminal execution view.

### app/operations.tsx

Operations command centre. It:

- Loads treasury snapshots, route operational events, and recoverable execution sessions.
- Subscribes to realtime execution session updates.
- Builds provider execution metrics.
- Summarises treasury pressure, failover activity, and active executions.

This is the observability and resilience dashboard.

### app/payment-methods.tsx

Payment method management screen. It:

- Shows mock saved cards and open-banking connections.
- Lets the user select a primary funding method.
- Exposes simulated add-card and connect-bank flows.

### app/xrpl-test.tsx

Small XRPL connectivity check screen. It gets or creates the testnet wallet and displays the address/status.

## Context Providers

### AuthContext

File: src/state/AuthContext.tsx

Responsibilities:

- Owns Supabase auth session state.
- Loads the current session and listens for auth state changes.
- Upserts the user profile row into profiles.
- Provides signIn, signUp, signOut, enableDemoAccess, and disableDemoAccess.

Key exported API:

- AuthProvider
- useAuth

Important behavior:

- In development reloads, it forces a clean login by signing out.
- Demo access is treated as a special session mode.

### DeviceUnlockContext

File: src/state/DeviceUnlockContext.tsx

Responsibilities:

- Detects biometric availability.
- Locks/unlocks the app locally.
- Uses Expo Local Authentication when hardware and enrollment exist.

Key exported API:

- DeviceUnlockProvider
- useDeviceUnlock

### WalletContext

File: src/state/WalletContext.tsx

Responsibilities:

- Tracks a simulated GBP balance.
- Manages the XRPL wallet address and balances.
- Ensures the RLUSD trustline exists.
- Tracks the simulated RLUSD reserve separately.

Key exported API:

- WalletProvider
- useWallet

Important behavior:

- Refreshes balances only when an authenticated Supabase session exists.
- Uses SecureStore-backed XRPL wallet creation and restoration.

### PaymentMethodsContext

File: src/state/PaymentMethodsContext.tsx

Responsibilities:

- Loads static mock payment methods.
- Tracks the primary funding method.
- Exposes the resolved primary method and setter.

Key exported API:

- PaymentMethodsProvider
- usePaymentMethods

### TransferContext

File: src/state/TransferContext.tsx

Responsibilities:

- Owns the active transfer draft.
- Tracks completed transfers for history.
- Hydrates completed transfers from Supabase.
- Emits audit logs when the transfer lifecycle changes.
- Persists completed transfers and derives saved recipients.

Key exported API:

- TransferProvider
- useTransfer

Transfer lifecycle methods:

- createTransfer
- setRecipient
- setRoutes
- selectRoute
- setFundingMethod
- setFundingStatus
- startTransfer
- completeTransfer
- resetTransfer

## Services and Exports

### Audit logging

File: src/services/auditLog.ts

Exports:

- AuditEventType
- writeAuditLog

Purpose:

- Writes user-level audit entries to audit_logs.
- Used for login, signup, logout, and recipient lifecycle events.

### Transaction audit logging

File: src/services/transactionAuditService.ts

Exports:

- TransactionAuditStatus
- TransactionAuditEventType
- resolvePendingAuditEvents
- writeTransactionAuditLog
- loadTransactionAuditLogs

Purpose:

- Maintains a step-by-step audit ledger for a specific transfer.
- Resolves pending entries when downstream events complete or fail.

### Transfer persistence

File: src/services/transferService.ts

Exports:

- saveTransferProgress
- saveCompletedTransfer
- loadCompletedTransfers

Purpose:

- Persists the transfer draft and completed transfers to the transfers table.
- Serialises the selected route into the row payload.

### Recipient persistence

File: src/services/recipientService.ts

Exports:

- saveRecipientFromTransfer
- loadSavedRecipients
- toggleRecipientFavorite

Purpose:

- Upserts recipients from completed transfers.
- Falls back to completed transfers when the recipients table is empty.
- Stores and toggles favourites.

### Route operational events

File: src/services/routeOperationalEventService.ts

Exports:

- RouteOperationalEventRow
- writeRouteOperationalEvent
- loadRecentRouteOperationalEvents

Purpose:

- Writes simulated route degradation and failover events.
- Feeds the Operations Command Centre.

### Treasury snapshots

File: src/services/treasuryIntelligenceService.ts

Exports:

- TreasuryLiquiditySnapshotRow
- writeTreasuryLiquiditySnapshot
- loadTreasurySnapshots
- loadRecentTreasurySnapshots

Purpose:

- Persists treasury decision snapshots for route evaluation.
- Supports per-transfer and recent-history retrieval.

### Execution engine

File: src/services/execution/executionEngine.ts

Exports:

- ExecutionState
- ExecutionStepStatus
- ExecutionStep
- ExecutionSnapshot
- runTransferExecution

Purpose:

- The core transfer state machine.
- Handles idempotency, recovery, route authorisation, XRPL bridge settlement, payout submission, payout verification, failover, and completion.

### Execution persistence

File: src/services/execution/executionPersistenceService.ts

Exports:

- PersistedExecutionSession
- persistExecutionSnapshot
- loadExecutionSession
- loadRecoverableExecutionSessions

Purpose:

- Stores the latest execution snapshot in execution_sessions.
- Retrieves a transfer-specific snapshot and the active recoverable sessions.

### Execution realtime

File: src/services/execution/executionRealtimeService.ts

Exports:

- subscribeToExecutionSession
- subscribeToRecentExecutionSessions

Purpose:

- Subscribes to Supabase realtime changes on execution_sessions.
- Drives the Track and Operations screens.

### Execution recovery

File: src/services/execution/executionRecoveryService.ts

Exports:

- RecoverableExecutionSession
- loadRecoverableExecutionSessions
- loadLatestExecutionSnapshot

Purpose:

- Recovery-oriented reads for unfinished execution sessions.
- Used by the observability surfaces and recovery prelude.

### Provider execution intelligence

File: src/services/intelligence/providerExecutionIntelligence.ts

Exports:

- ProviderExecutionMetrics
- buildProviderExecutionMetrics

Purpose:

- Derives health, success rate, latency, degradation risk, and failover risk from a route quote.

### Telemetry intelligence

File: src/services/intelligence/telemetryIntelligenceService.ts

Exports:

- TelemetryInsightSeverity
- TelemetryInsight
- TelemetryIntelligenceSummary
- loadTelemetryIntelligence

Purpose:

- Aggregates transfer, execution, and audit history into a higher-level intelligence summary.
- Produces insights for the future analytics layer.

### Payout orchestration

File: src/services/payout/payoutTypes.ts

Exports:

- PayoutProviderId
- PayoutStatus
- PayoutRail
- CreatePayoutRequest
- PayoutResult
- PayoutProvider
- PayoutPartnerProfile
- PayoutPartnerSelection

File: src/services/payout/payoutPartnerDirectory.ts

Exports:

- payoutPartnerDirectory

File: src/services/payout/payoutRoutingEngine.ts

Exports:

- selectBestPayoutPartner

File: src/services/payout/payoutAdapter.ts

Exports:

- createPayout
- getPayoutStatus

File: src/services/payout/mockPayoutProvider.ts

Exports:

- mockPayoutProvider

File: src/services/payout/providers/niumSandboxProvider.ts

Exports:

- hasNiumSandboxCredentials
- niumSandboxProvider

Purpose:

- Chooses a payout provider from a partner directory.
- Executes via Nium sandbox when configured, otherwise falls back to the mock provider.

## Library Modules

### fxFeed.ts

Exports:

- FxProviderName
- FxRate
- fetchFxRate
- fetchCorridorFxRates

Purpose:

- Chains through multiple live FX providers and falls back to mock rates.

### corridorHealth.ts

Exports:

- VolatilityLevel
- CorridorHealth
- buildCorridorHealth

Purpose:

- Converts FX feed output into corridor-level health, volatility, route confidence, and status.

### aiRouteIntelligence.ts

Exports:

- RouteOptimisationMode
- ProviderIntelligenceProfile
- CorridorHealthSignal
- getProviderIntelligence
- getCorridorHealth
- calculateAiRouteScore

Purpose:

- Computes route scores from provider history, corridor health, and optimisation weights.

### treasuryIntelligence.ts

Exports:

- LiquidityDepth
- LiquidityPressure
- TreasurySignalStatus
- CorridorLiquiditySignal
- PartnerLiquiditySignal
- RailLiquiditySignal
- TreasuryIntelligenceSignal
- getTreasuryIntelligence

Purpose:

- Produces treasury-aware corridor, partner, and rail capacity signals.
- Feeds route scoring and treasury snapshots.

### settlementOrchestrator.ts

Exports:

- buildOrchestratedRouteQuotes

Purpose:

- Combines FX, treasury intelligence, AI scoring, and route templates into ranked RouteQuote objects.

### routingEngine.ts

Exports:

- scoreRoutes
- labelRoutes
- getRankedRoutes

Purpose:

- Generic scoring helper for simpler route option models.

### routeOperationalState.ts

Exports:

- OperationalEventSeverity
- RouteOperationalEvent
- buildRouteOperationalEvent

Purpose:

- Converts a route quote into a simulated operational event with severity and recommended action.

### providerIntegrationFramework.ts

Exports:

- ProviderMode
- ProviderCapability
- ProviderHealthStatus
- ProviderAdapter
- ProviderQuoteRequest
- ProviderExecutionProfile
- DEFAULT_PROVIDER_MODE
- getProviderAdapterForRoute
- listProviderAdapters
- buildProviderExecutionProfile
- isProviderQuoteExpired

Purpose:

- Abstracts provider integration metadata and execution profiles for future live connectors.

### id.ts

Exports:

- createTransferId

Purpose:

- Generates transfer identifiers.

### simulatedRLusdWallet.ts

Exports:

- getSimulatedRlusdBalance
- setSimulatedRlusdBalance
- addSimulatedRlusd
- debitSimulatedRlusd
- resetSimulatedRlusdBalance

Purpose:

- Holds a simulated RLUSD reserve used by route and treasury logic.

### xrplClient.ts

Exports:

- getXrplClient
- resetXrplClient
- disconnectXrpl

Purpose:

- Manages a reusable XRPL websocket client.

### xrplWallet.ts

Exports:

- RLUSD_DISPLAY_CODE
- RLUSD_CURRENCY_CODE
- RLUSD_TESTNET_ISSUER
- getOrCreateWallet
- getXrplTestnetXrpBalance
- getXrplTestnetRlusdBalance
- ensureRlusdTrustline

Purpose:

- Creates or loads the testnet wallet and retrieves XRPL balances.

### xrplSettlement.ts

Exports:

- XrplSettlementResult
- executeXrplTestnetSettlement

Purpose:

- Executes a testnet payment between two wallets as the hybrid bridge proof.

### xrplExplorer.ts

Exports:

- getXrplTestnetTransactionUrl
- shortenTxHash

Purpose:

- Builds explorer links and display helpers for XRPL transaction hashes.

## Database Tables and Relationships

The code touches the following Supabase/Postgres tables.

### profiles

- Owned by the Supabase auth user id.
- Upserted from AuthContext after sign-in/sign-up state changes.
- RLS in supabase/rls-security-foundation.sql restricts access to auth.uid() = id.

### transfers

- Primary transfer history table.
- Written by transferService.ts.
- Stores sender values, recipient snapshot, selected route, status, and completion time.
- Related to user_id and to the completed transfer history shown on the dashboard.

### recipients

- Saved recipient table.
- Written by recipientService.ts when a transfer completes.
- Read back for recipient reuse in the send flow.
- RLS restricts rows to the owning authenticated user.

### payment_methods

- Saved funding methods table.
- Defined in supabase/payment-methods.sql.
- Contains one primary method per user via a filtered unique index.
- Read by PaymentMethodsContext and the payment-methods screen.

### audit_logs

- User-level audit log table.
- Written by writeAuditLog.
- Used for auth events and recipient lifecycle events.

### transaction_audit_logs

- Transfer-specific audit ledger.
- Written by writeTransactionAuditLog.
- Read by the operational timeline component and the telemetry service.
- Has a strict transaction_id + user_id scope and PENDING resolution flow.

### route_operational_events

- Simulated route degradation/failover event ledger.
- Written from route selection to power the operations dashboard.
- Unique on transaction_id, route_id, user_id, and event_type.

### treasury_liquidity_snapshots

- Treasury intelligence snapshot ledger.
- Written during route evaluation.
- Stores corridor, partner, rail, pressure, recommendation, and the raw snapshot payload.

### execution_sessions

- Persisted execution state machine snapshots.
- Written by persistExecutionSnapshot.
- Read by track/operations screens and realtime subscriptions.
- Not defined in the supplied SQL files, but required by the execution stack.

### orchestration_decisions

- Architectural decision table for route/provider choice, safety scores, failover recommendations, and AI factors.
- Present in supabase/orchestration-decisions.sql.
- Not yet wired into the main app flow, but clearly intended for richer decision auditability.

### xrpl_identities

- Reserved in the RLS foundation for future XRPL identity records.
- Not yet part of the visible app flow.

### transactions

- Kept in the RLS foundation for compatibility.
- Not currently referenced by the app code.

## Supabase Integrations

The Supabase integration surface is concentrated in src/lib/supabase.ts and the service layer.

### Auth

- Supabase Auth stores the user session.
- AuthContext reads the session, reacts to auth state changes, and upserts the profile row.
- AuthGate uses the session and demo access state to gate protected routes.

### Realtime

- executionRealtimeService.ts subscribes to execution_sessions changes.
- OperationalTimelineCard subscribes to transaction_audit_logs inserts.
- The app uses realtime as a best-effort enhancement, with polling/reload-style fallbacks in several screens.

### Storage and data access pattern

- Most reads/writes are straight Supabase table calls from service modules.
- Query scope is always user_id restricted after reading the authenticated user from Supabase Auth.
- The app relies on client-side RLS enforcement, not server-side custom RPC.

### Configuration

- src/lib/supabase.ts requires EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.
- If the config is missing, the app falls back to a placeholder client and surfaces a config error.

## Orchestration Flow

The main transfer path is:

1. Auth gate accepts a valid session or demo access.
2. The home screen starts the transfer flow.
3. send.tsx captures the recipient and transfer amount.
4. routes.tsx builds orchestrated quotes from settlementOrchestrator.ts.
5. The selected route is persisted to the transfer draft and treasury/operational events are written.
6. funding.tsx selects a saved funding source and marks the transfer as authorised.
7. track.tsx starts the execution engine.
8. executionEngine.ts creates an execution lock, writes transaction audit events, and steps through:
   - route authorisation
   - optional XRPL bridge settlement
   - payout submission
   - payout verification
   - failover, if needed
9. Persisted execution snapshots are written to execution_sessions.
10. On completion, the transfer is stored, the recipient is upserted, and completed history is refreshed.

Key properties of the flow:

- Idempotency is enforced in the execution engine.
- Failover is built into the route lifecycle.
- XRPL settlement is only used for HYBRID routes.
- Payout providers are abstracted behind the payout adapter.

## Treasury Intelligence Components

The treasury layer exists in both the route scoring path and the observability path.

### Core modules

- treasuryIntelligence.ts computes the route-time treasury signal.
- treasuryIntelligenceService.ts persists and loads snapshots.
- treasury_liquidity_snapshots.sql defines the backing table.

### What it models

- Corridor liquidity depth and pressure.
- Partner capacity and settlement status.
- Rail capacity and bridge-asset pressure.
- A combined treasury score, penalty, recommendation, and decision factors.

### How it is used

- settlementOrchestrator.ts injects treasury signal into RouteQuote objects.
- routes.tsx persists the snapshot for each generated route.
- operations.tsx summarises recent snapshots and operational pressure.

## Provider Intelligence Components

### Core modules

- aiRouteIntelligence.ts supplies provider intelligence profiles and provider-health adjustments.
- providerExecutionIntelligence.ts turns a RouteQuote into live execution metrics.
- providerIntegrationFramework.ts provides the abstraction for future live adapters.
- payoutPartnerDirectory.ts defines payout partners and their supported corridors.
- payoutRoutingEngine.ts selects the best payout partner.

### What it models

- Historical success rate.
- Average latency.
- Failure risk.
- Recent trend.
- Provider health score and failover risk.

### Where it appears

- Routes screen route cards show provider health, confidence, predicted failure risk, and recommendation text.
- Operations screen uses provider metrics for a high-level observability view.

## Route Intelligence Components

### Core modules

- fxFeed.ts fetches live FX from a provider chain with fallback.
- corridorHealth.ts transforms FX into corridor health scoring.
- aiRouteIntelligence.ts calculates route score and corridor health signal.
- settlementOrchestrator.ts synthesises the final ranked RouteQuote list.
- routeOperationalState.ts creates simulated operational events for routes.

### What a RouteQuote contains

A route quote is not just price and ETA. It also carries:

- AI confidence and recommendation.
- Predicted failure risk.
- Corridor health score and insight.
- Provider history and trend.
- Treasury score and pressure fields.
- Bridge asset and liquidity coverage.
- Orchestration safety status and failover metadata.

### How route intelligence is consumed

- index.tsx shows live corridor intelligence at the dashboard level.
- send.tsx uses a simpler corridor preview before route selection.
- routes.tsx is the authoritative selection surface for ranked orchestration.

## External Integrations

### Supabase

- Auth, table persistence, and realtime.

### XRPL

- xrpl package for testnet client, wallet generation, trustline creation, and settlement.
- Testnet explorer links are generated for transaction proof.

### Expo / React Native ecosystem

- Expo Router for file-based routing.
- Expo Secure Store for wallet seeds.
- Expo Local Authentication for biometrics.
- AsyncStorage for Supabase auth session persistence.
- react-native-get-random-values for crypto-safe randomness.

### FX providers

- Frankfurter
- ExchangeRate API
- Currency API CDN
- FloatRates
- Open Exchange Rates
- Fixer
- CurrencyLayer

### Payout providers

- Nium sandbox when credentials are present.
- Mock payout sandbox as the default fallback.
- Directory entries also model Thunes, NextPay, and Tranglo sandbox endpoints for future use.

### Simulated rails

- Mock payment methods for card and open banking.
- Simulated RLUSD wallet balance.
- Simulated fiat payout provider fallback.

## Current Architecture

The architecture is a client-first orchestration prototype rather than a server-driven payment backend.

### Structure

- Expo Router app shell on top.
- Cross-cutting state in React context providers.
- Pure domain logic in src/lib.
- Supabase service adapters in src/services.
- UI cards that render derived state rather than owning business logic.

### Strengths

- Clear separation between orchestration logic and screens.
- Most critical state transitions are persisted.
- Realtime and recovery support are already part of the model.
- The route quote is rich enough to carry audit, treasury, and execution metadata end to end.

### Constraints

- Many integrations are simulated or mock-backed.
- The app still depends heavily on client-side orchestration.
- Some tables are expected by code but not yet shipped in SQL.
- The architecture assumes authenticated user scope for almost every persisted read/write.

## Current Roadmap

This is inferred from code comments, simulated flows, and placeholder screens rather than a formal product backlog.

### Near-term

- Wire real card tokenisation and open-banking setup instead of simulated payment method flows.
- Connect a real KYC/AML provider and make the account screen reflect real verification state.
- Add stronger 2FA and trusted-device management.
- Promote the Nium sandbox from credential-ready stub to a full live connector.
- Expand execution recovery/resume behaviour with more deterministic checkpointing.

### Mid-term

- Wire orchestration_decisions into the main route-selection flow for richer decision auditability.
- Expand the telemetry model into a real analytics/forecasting view.
- Add more live provider adapters and richer partner directory data.
- Replace or supplement mock payout/provider paths with live integrations.

### Longer-term

- Move from simulated settlement to real settlement orchestration where supported.
- Add compliance, risk, and observability surfaces that reflect production operations.
- Use the persisted telemetry to drive adaptive scoring and corridor-specific automation.

## Notable Implementation Notes

- quote.tsx is a lighter legacy-style estimator, while routes.tsx is the main orchestrated route-selection experience.
- payment-methods.tsx and the payment method context are mock-backed today, but the architecture is ready for real provider onboarding.
- execution_sessions, orchestration_decisions, and some other tables are part of the intended data model even where the SQL migration is not present in the checked-in files.
- Several cards and screens show intentionally simulated values; that is part of the prototype design, not a bug.