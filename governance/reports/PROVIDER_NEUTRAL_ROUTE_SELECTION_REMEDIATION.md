# Provider-Neutral Route Selection Remediation

Date: 2026-08-10
Status: Implemented and validated
Environment: Sandbox/Testnet only

## Executive Outcome

The Send journey no longer asks the sender to choose Airwallex or Nium. NexusPay requests evidence from both payout networks, creates candidate Route Plans, ranks eligible routes, and presents the result through the existing route comparison and approval flow.

Recipient data is now collected once as a provider-neutral bank profile. NexusPay translates that profile into each provider's current API field names. This allows the same approved recipient to support a controlled provider failover without asking the sender to re-enter equivalent bank details.

## Architecture

1. Airwallex and Nium recipient requirements are requested for the selected country and currency.
2. Common fields are merged into one canonical recipient profile. Provider-specific validation remains attached to each field.
3. The canonical route engine requests current provider evidence and creates Airwallex, Nium and XRPL candidates once.
4. Ineligible or incomplete candidates remain visible as `UNAVAILABLE` and cannot be approved or executed.
5. The approved Route Plan version determines the payout provider used by execution.
6. A failover route must be eligible, unexpired, permitted, and have recipient data materialised for its provider. The replacement is persisted through the existing Route Plan transition record.

## User Experience

- Removed the manual payout-provider selector from Send.
- Added one `Bank recipient requirements` section with source and sandbox visibility.
- Added one universal sandbox-recipient generator.
- Preserved the existing route comparison and approval screens.
- Preserved mobile-wallet payout behaviour.

## Provider Status

| Provider | Evidence | Current route state | Reason |
|---|---|---|---|
| Airwallex Sandbox | Authenticated schema, FX and payout evidence | Eligible where corridor evidence passes | Sandbox payout integration is configured |
| Nium Sandbox | Authenticated corridor requirements and FX quote | Unavailable | Sandbox customer and wallet identifiers are not provisioned |
| XRPL Testnet | Ledger/path evidence | Unavailable for the validation amount | No executable XRP-to-RLUSD order-book path was returned |

NexusPay does not assign a score to unavailable routes and will not fail over to Nium until Nium reports executable payout readiness.

## Persistence And Migration

Migration `20260810000300_provider_neutral_recipient_profiles.sql` adds:

- `recipient_profiles.provider_beneficiary_details`
- `recipient_profiles.provider_schema_evidence`

The migration is additive. Existing provider-specific recipient records are copied into the new provider-keyed structure. Legacy columns remain readable for compatibility.

## Security And Failure Controls

- Provider secrets remain in Supabase Edge Function secrets and are not shipped to the app.
- A route cannot execute merely because its provider returned a recipient schema.
- Expired, blocked, ineligible, or recipient-incomplete routes cannot be selected as failover.
- A replacement route remains subject to the execution lock and durable Route Plan transition evidence.
- No Nium payout success or automatic failover is claimed before wallet provisioning and certification.

## Validation

| Check | Result |
|---|---|
| TypeScript | PASS |
| Provider-neutral recipient contract | PASS |
| Canonical route generation, ranking and persistence | PASS |
| Anonymous Route Plan read isolation | PASS |
| Android Expo export | PASS |
| Supabase migration parity | PASS |
| Nium payout certification | PENDING: customer/wallet provisioning |

The route validator persisted three candidate plans and three transition events. Airwallex was eligible with score 86. Nium and XRPL were correctly unscored and unavailable.

## Files Changed

- `app/send.tsx`
- `src/components/payments/UnifiedRecipientFields.tsx`
- `src/hooks/useCanonicalRouteQuotes.ts`
- `src/services/recipientRequirementsService.ts`
- `src/services/recipientService.ts`
- `src/services/routeIntelligenceService.ts`
- `src/services/execution/executionEngine.ts`
- `src/types/recipient.ts`
- `src/types/transfer.ts`
- `supabase/migrations/20260810000300_provider_neutral_recipient_profiles.sql`
- `governance/automation/scripts/validateCanonicalRouteIntelligence.ts`
- `governance/automation/scripts/validateProviderNeutralRecipientRouting.ts`
- `package.json`
- Governance records listed below.

## Rollback

1. Roll back the app/OTA to the preceding update group.
2. Revert the implementation commit to restore manual provider selection.
3. Leave the additive database columns in place during rollback; they do not change existing reads or constraints.
4. If database removal is later required, first export any canonical recipient data, restore it to legacy fields, then remove the two new columns in a separately reviewed migration.

## Remaining Work

1. Provision the Nium sandbox customer and funded wallet.
2. Re-run beneficiary, payout, idempotency, reconciliation and signed-webhook certification.
3. Certify a genuine Airwallex-to-Nium failover using a new sandbox orchestration session.
4. Add further payout providers through the same recipient and Route Plan contracts; do not add new customer-facing provider selectors.

## Release

- Implementation commit: `42a420327651e9cb13380c0c4bd34788dea603ac`
- Preview OTA update group: `a7e90131-27a8-4e08-9b68-4ca27f83a478`
- Android update: `019febf9-e82e-740c-be88-eaa0642e58f5`
- iOS update: `019febf9-e82e-726f-a72e-d3a5cd1256c4`
- Expo dashboard: `https://expo.dev/accounts/nexuspay/projects/NexusPayOrchestrator/updates/a7e90131-27a8-4e08-9b68-4ca27f83a478`

## Recipient Selection Addendum

On 2026-08-10 the shared recipient form was updated so provider-returned option sets above eight entries render as a searchable, scrollable and alphabetically sorted dropdown. This resolves the excessive Thailand state/region button list and applies consistently to all countries and payout providers. Provider option values remain unchanged when submitted.
