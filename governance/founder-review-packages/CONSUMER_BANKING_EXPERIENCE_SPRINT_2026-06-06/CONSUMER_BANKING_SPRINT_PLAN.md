# Consumer Banking Sprint Plan

Date: 2026-06-06

## Workstreams
1. Consumer Experience Redesign
- Upgrade shell, hierarchy, cards, trust indicators, and navigation quality.

2. Real Send Experience
- Recipient selection + manual entry
- Amount entry
- Route generation and route selection
- Transfer creation and persistence into existing transfer lifecycle

3. Real Tracking Experience
- Active transfer tracking
- Timeline progression by transfer status
- Transaction audit event feed integration

4. Real Transfer History
- User-scoped transfer listing
- Search, status filtering
- Detail drill-down
- Repeat transfer preparation and receipt view entry

5. Profile & Settings
- Persisted profile management (display name, phone, country)
- Persisted preferences (notifications, landing preference)
- Payment method management integration
- Nexus AI settings integration

6. Data Isolation Validation
- Verify account scope is respected in transfer and recipient visibility.
- Verify personal and demo paths remain isolated by scope and user.

7. Corporate Workspace V2 Review
- No functional modifications.
- Produce future roadmap recommendations.

## Risks
- Regression risk in transfer initialization flow.
- Scope leakage risk if consumer UI bypasses scoped services.
- UX inconsistency risk across new consumer pages.

## Dependencies
- Supabase authenticated session.
- Existing transfer/recipient services.
- Existing route orchestration utilities.
- Existing Nexus AI settings service.

## Testing Strategy
- Lint + diagnostics for all changed files.
- Functional route validation for consumer flows.
- User-scoped service path checks for isolation.
- Manual regression checks for multi-account preview and demo workspace.

## Validation Strategy
- Validate each workstream with direct evidence in report set.
- Do not mark complete without code-level and diagnostics evidence.

## Rollback Strategy
- Additive changes only to consumer-specific files and safe context/service extensions.
- Revert by file-level rollback of consumer route files and new settings service if required.
- No destructive modifications to Startup V2 core state machine.

## APK Validation Strategy
- Confirm first launch still enters Multi-Account Preview.
- Confirm Demo Workspace still opens unchanged.
- Confirm Personal workspace opens upgraded consumer routes.
- Confirm transfer create/track/history/profile/settings behave without crash.

## Founder Acceptance Criteria
- Premium consumer UX visible on Personal Account routes.
- Real send/track/history paths are functional and persisted.
- Profile/settings are persisted.
- Isolation controls remain intact and demonstrated.
- Demo workspace remains fully operational.
