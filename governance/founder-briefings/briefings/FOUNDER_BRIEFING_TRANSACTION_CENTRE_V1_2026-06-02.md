# Founder Briefing: Transaction Centre V1

## Date
2026-06-02

## Founder Summary
Transaction Centre V1 has been built as a dedicated user-facing transfer history screen.

It gives users a practical place to find, filter, inspect, repeat, and copy references for their transfers without changing the payment engine, treasury logic, route scoring, or Startup V2 architecture.

## What Was Built
- Transaction list
- Search
- Status, corridor, and date filters
- Expandable transaction details
- Repeat transfer action
- Receipt/reference display and copy action
- Status badge
- Route and corridor summary
- Loading, empty, error, and no-match states
- Navigation access from Home, dropdown menu, and bottom Transfers tab

## Problem Solved
Before this workstream, transaction history was only a small recent-history section on Home and was not strong enough for user support, receipts, repeat transfers, or transaction lookup.

Transaction Centre V1 turns that into a clear product surface.

## Changed Screens and Files
- `app/transactions.tsx`
- `app/index.tsx`
- `src/components/navigation/AppDropdownMenu.tsx`
- `src/components/navigation/AppMenu.tsx`
- `governance/executive-reports/TRANSACTION_CENTRE_V1_IMPLEMENTATION_REPORT_2026-06-02.md`

## How To Test
1. Sign in.
2. Complete a transfer.
3. Open Transaction Centre from Home, the app dropdown, or the bottom Transfers shortcut.
4. Search and filter the transaction list.
5. Expand a transfer.
6. Copy the receipt reference.
7. Tap Repeat and confirm the Send Money screen opens pre-filled.

## Auth Dependency Note
Transaction history is user-scoped through the current Supabase session. If the device is affected by the Startup V2 build/runtime parity issue, history can appear empty because the app may not have a valid authenticated user.

That dependency is documented, and this workstream does not change auth behavior.

## Merge Recommendation
Approve WS2 for product review and merge after normal review, but keep pilot certification blocked until WS1 proves physical-device runtime parity.
