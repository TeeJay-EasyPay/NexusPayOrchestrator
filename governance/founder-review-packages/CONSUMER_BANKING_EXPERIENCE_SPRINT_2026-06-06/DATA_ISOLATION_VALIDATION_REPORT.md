# Data Isolation Validation Report

Date: 2026-06-06

## Validation Objective
Confirm Demo Workspace and Personal Account remain isolated with no data leakage.

## Isolation Controls Reviewed
1. Transfer isolation
- src/services/transferService.ts stores selected_route.accountScope.
- loadCompletedTransfers filters rows by active stored account scope.

2. Recipient isolation
- src/services/recipientService.ts builds recipient IDs with user+scope prefix.
- loadSavedRecipients filters by scope-prefixed IDs and user_id.

3. Nexus AI settings isolation
- src/services/nexusAISettingsService.ts local fallback key includes user+scope.

4. Consumer profile/settings isolation
- src/services/consumerSettingsService.ts key includes user+scope.

5. Payment method preference isolation
- src/state/PaymentMethodsContext.tsx persisted key includes user+scope.

## Evidence Summary
- Consumer routes now read from scoped transfer and recipient services.
- Consumer persistence additions are scope-keyed.
- Existing account scope context remains authoritative for personal vs demo workspace selection.

## Result
Status: PASS (code-level isolation controls present and active in implemented paths).

## Residual Risk
- Full proof still requires runtime APK validation with both account modes and seeded data to confirm no unexpected backend policy drift.

## Required Field Validation Steps
1. Login Demo Workspace and create/send/track/history data.
2. Switch to Personal Account and confirm demo data is not visible.
3. Create Personal Account data and confirm it is not visible in Demo Workspace.
4. Verify profile/settings and Nexus AI preferences remain account-scope separated.
