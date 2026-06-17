# Technical Design Report: Persona Flow Correction Sprint

Date: 2026-06-17

## Objective
Correct persona behavior so personas operate as complete users of the NexusPay platform rather than recipient-only views.

## Design Constraints Applied
- Preserve Startup V2 architecture.
- Preserve authentication.
- Preserve account isolation.
- Preserve Personal Account and Corporate Workspace functionality.
- Preserve Supabase integrations and EAS compatibility.
- Follow account-context and user-segmentation architecture principles.

## Implemented Design
1. Startup destination correction
- `DEFAULT_UNAUTHENTICATED_STARTUP_ROUTE` now points to `/multi-account-preview`.
- Startup Coordinator and state machine were not changed.
- `/persona-selector` standalone route was removed.

2. Integrated persona entry
- `app/multi-account-preview.tsx` now contains Demo Workspace, Personal Account, persona selection, and Continue.
- Continue stores selected persona, requires unlock, enables private user access, sets personal account scope, and routes to `/consumer`.
- Demo Workspace still routes to the existing demo workspace.

3. Full consumer access
- Consumer shell now displays selected persona identity.
- Consumer menu exposes Routes, Transfers, Notifications, Received Transfers, Nexus AI, Profile, Settings, and account/persona switching.
- Corporate Payouts remains available from the consumer menu when the corporate persona is selected.

4. Persona-specific data
- `Transfer` and `RouteQuote` now include optional `personaId`.
- Transfer creation sets `personaId` from the selected persona.
- Transfer persistence embeds `personaId` in `selected_route`.
- Completed transfer loading filters by active `accountScope` and active `personaId`.
- Notifications continue to filter by `participant_id`.
- Received transfers continue to filter by recipient participant ID.
- Profile displays selected persona name, country, participant type, and bank account summary when applicable.

5. Corporate UX
- Corporate Payouts now has compact batch summary cards.
- Recipient list is compact and selectable.
- Amount editing is focused on the selected recipient.
- Existing batch execution and notification creation behavior was preserved.

## Files Updated
- `app/multi-account-preview.tsx`
- `app/consumer/profile.tsx`
- `app/corporate-payouts.tsx`
- `app/participant-notifications.tsx`
- `app/received-transfers.tsx`
- `app/index.tsx`
- `src/components/consumer/ConsumerShell.tsx`
- `src/components/navigation/AppDropdownMenu.tsx`
- `src/components/navigation/AppMenu.tsx`
- `src/services/transferService.ts`
- `src/startup/startupRoutes.ts`
- `src/state/PersonaContext.tsx`
- `src/state/TransferContext.tsx`
- `src/types/transfer.ts`

## Non-Changes
- No Startup V2 coordinator rewrite.
- No auth provider rewrite.
- No Supabase schema changes.
- No EAS config changes.
