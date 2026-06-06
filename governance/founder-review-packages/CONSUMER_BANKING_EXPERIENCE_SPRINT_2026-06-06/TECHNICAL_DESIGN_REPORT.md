# Technical Design Report

Date: 2026-06-06

## Architecture Preservation Commitments
Preserved without bypass:
- Startup V2 coordinator/routing model
- Authentication model
- Account scope isolation model
- Supabase integration model
- Nexus AI service path
- Demo workspace behavior

## Implemented Design
1. Consumer send flow now uses:
- src/services/recipientService.ts (load recipients)
- src/lib/settlementOrchestrator.ts (route generation)
- src/state/TransferContext.tsx (transfer initialization and route selection)

2. Consumer tracking flow now uses:
- src/state/TransferContext.tsx (active transfer state)
- src/services/transactionAuditService.ts (timeline event feed)

3. Consumer history flow now uses:
- src/state/TransferContext.tsx hydrated completed transfers
- Existing transfer service persistence and scope filtering

4. Consumer profile/settings persistence:
- New src/services/consumerSettingsService.ts (AsyncStorage scoped by user and account scope)
- Enhanced src/state/PaymentMethodsContext.tsx with persisted primary method

5. Nexus AI settings integration:
- app/consumer/nexus-ai.tsx wired to src/hooks/useNexusAISettings.ts

## Data Scope Controls
- Transfer load/save remains user_id bound and accountScope filtered in selected_route payload.
- Recipient load/save remains user_id bound with scope-prefixed IDs.
- Consumer profile/preferences persistence key includes user and account scope.
- Payment method primary selection key includes user and account scope.

## Dependencies
- Supabase auth session
- AsyncStorage persistence
- Existing route orchestration utilities
- Existing transfer and recipient services

## Risks and Mitigations
- Risk: transfer initialization race.
  Mitigation: TransferContext createTransfer now supports atomic initialization options.

- Risk: settings persistence drift.
  Mitigation: unified consumerSettingsService with typed defaults and merge behavior.

- Risk: isolation drift.
  Mitigation: all new persistence keys are user+scope scoped; transfer/recipient services left scope-aware.

## Files Added
- src/services/consumerSettingsService.ts

## Files Updated
- app/consumer/index.tsx
- app/consumer/send.tsx
- app/consumer/track.tsx
- app/consumer/transfers.tsx
- app/consumer/profile.tsx
- app/consumer/settings.tsx
- app/consumer/nexus-ai.tsx
- src/components/consumer/ConsumerShell.tsx
- src/state/TransferContext.tsx
- src/state/PaymentMethodsContext.tsx
- governance/governance-core/DECISION_REGISTER.md
