# Corporate Governance Framework V1 Implementation Report

Date: 2026-06-22

# Executive Summary

NexusPay now has a configurable corporate governance and approval foundation layered on top of the existing batch payment, participant, notification, Home, and OCC architecture.

The implementation changes NexusPay from a single Corporate User batch-payment preview into a role-based Corporate Workspace with CEO, CFO, CTO, Finance Manager, Finance Director, Auditor, business entity, and private user separation. Corporate batches now require payment classification and are routed through database-driven approval rules before release.

# Files Changed

- `app/multi-account-preview.tsx`
- `app/corporate-dashboard.tsx`
- `app/corporate-payouts.tsx`
- `app/corporate-governance.tsx`
- `app/approval-queue.tsx`
- `app/batch-operations-dashboard.tsx`
- `app/audit-logs.tsx`
- `app/corporate-reports.tsx`
- `app/corporate-users-personas.tsx`
- `app/business-recipients.tsx`
- `app/participant-notifications.tsx`
- `app/received-transfers.tsx`
- `app/payment-methods.tsx`
- `app/consumer/index.tsx`
- `src/components/corporate/CorporateShell.tsx`
- `src/components/consumer/ConsumerShell.tsx`
- `src/components/business/BusinessHome.tsx`
- `src/components/navigation/AppMenu.tsx`
- `src/components/navigation/AppDropdownMenu.tsx`
- `src/services/corporateAccessService.ts`
- `src/services/corporateGovernanceService.ts`
- `src/services/multiEntityOrchestrationService.ts`
- `src/services/participantService.ts`
- `src/types/multiEntity.ts`
- `supabase/migrations/20260622000100_corporate_governance_approval_framework.sql`
- `governance/reports/CORPORATE_GOVERNANCE_FRAMEWORK_V1.md`
- `governance/reports/CORPORATE_GOVERNANCE_FRAMEWORK_V1_IMPLEMENTATION_REPORT.md`
- `governance/implementation-log/IMPLEMENTATION_LOG.md`

# Health Model Context

This implementation preserves the existing Health Consistency remediation and OCC architecture. Corporate CTO navigation now links to OCC and Platform Health through the role-aware corporate shell. No separate corporate health model was introduced.

# Governance Model Design

The governance model is database-driven:

- `payment_categories` defines high-level payment classes.
- `payment_types` defines expandable payment types under each category.
- `approval_roles` defines corporate approver roles.
- `approval_rules` defines amount thresholds and payment-type governance.
- `approval_rule_roles` defines required approver roles and stage order.
- `batch_approvals` records assigned approval requests.
- `audit_events` records governance, approval, and release events.

Corporate User can edit approval thresholds, enable or disable approval chains, toggle sequential/parallel rule intent, and change required approver roles without code changes.

# New Personas

Corporate Workspace:

- Corporate User
- Chief Executive Officer (CEO)
- Chief Financial Officer (CFO)
- Chief Technology Officer (CTO)
- Finance Manager
- Finance Director
- Auditor

Business Entities:

- Alpha Trading LLC
- Manila Services Inc
- Kuala Lumpur Logistics

Private Users:

- Anne
- James
- Maria
- John

# New Screens

- Corporate Dashboard
- Corporate Governance
- Approval Queue
- Batch Operations Dashboard
- Audit Logs
- Corporate Reports
- Users & Personas

# Approval Engine Summary

1. Corporate persona creates a batch.
2. Batch creator selects payment category and payment type.
3. `executePayoutBatch()` writes the batch as `PENDING_APPROVAL`.
4. `corporateGovernanceService` evaluates the best enabled rule by payment type and amount.
5. Required role stages generate `batch_approvals` assigned to configured personas.
6. Notifications are generated for approval requests.
7. Approvers approve or reject from Approval Queue.
8. Approval decisions update `batch_approvals`, `payout_batches`, and `audit_events`.
9. Corporate User can release fully approved batches from Batch Operations Dashboard.

# Security Validation

Implemented controls:

- Corporate route access is centralized in `corporateAccessService`.
- Corporate menu visibility is role-derived.
- Corporate screens use `CorporateShell`, which blocks direct navigation when the selected persona lacks the route key.
- Business and private personas do not see corporate governance screens.
- Approval decisions are restricted to assigned approver personas with approval permission.
- Batch release is restricted to personas with `release_batches` permission.

Known limitation:

- Supabase RLS remains permissive for the current authenticated preview architecture. Application-level persona permissions are enforced client-side. Production hardening should move persona claims and approval permissions into server-side policies or Edge Function enforcement.

# Terminology Changes

Visible corporate terminology now uses orchestration-aligned language:

- Corporate Governance
- Approval Governance
- Batch Operations
- Corridor Liquidity
- Settlement Network Health
- Route Capacity
- Provider Network

Remaining legacy `treasury*` identifiers are internal compatibility names in the route intelligence and OCC data model. They remain because existing migrations, tables, and transfer route types depend on those field names. Visible OCC text already presents these as corridor liquidity and route capacity.

# Remaining Simulated Elements

- OCC route capacity and corridor liquidity intelligence still include simulated or derived data where identified in prior OCC provenance reports.
- Payment method setup remains simulated provider integration.
- Corporate Users & Personas is a preview registry view; full database-backed user creation remains a future admin feature.
- Supabase RLS is not yet production-grade for corporate role claims.

# Remaining Live Elements

- Supabase-backed participants, payout batches, batch transfers, notifications, approval rules, approval requests, and audit events.
- Frankfurter FX feed and prior health consistency service remain unchanged.
- Corporate approval decisions and audit records are persisted.

# Validation

Completed:

- `npx tsc --noEmit` passed.
- Targeted lint for all touched files passed with no warnings.
- `npx eslint .` passed with 0 errors.

Residual baseline:

- Full-project lint still reports 40 pre-existing warnings in unrelated files, including older root payment screens, legacy OCC V1 component code, provider mock imports, and older intelligence context types. No lint errors were present.

# Deployment

- Implementation commit: `67fef21edd71e5d9ea9e0640897e8525cac0bfb2`
- Branch pushed: `startup-v2-founder-validation-consumer-multi-account`
- OTA branch: `preview`
- OTA update group: `a3961dd6-4057-4654-8057-4bc7ec7a2466`
- Android update: `019ef18e-dd8b-71b8-8940-8c37bd3f59f3`
- iOS update: `019ef18e-dd8b-7c68-ab0e-2157c79349df`
- Dashboard: `https://expo.dev/accounts/nexuspay/projects/NexusPayOrchestrator/updates/a3961dd6-4057-4654-8057-4bc7ec7a2466`

# Founder Testing Instructions

1. Open the persona selector.
2. Confirm three groups are shown: Corporate Workspace, Business Entities, Private Users.
3. Select Corporate User.
4. Open Corporate Governance and change a rule threshold or required approver role.
5. Create a corporate batch from Batch Payments with category and payment type selected.
6. Confirm the batch is created for approval rather than marked completed.
7. Switch to the assigned approver persona, for example CFO for Payroll.
8. Open Approval Queue and approve or reject the request with a comment.
9. Switch back to Corporate User.
10. Open Batch Operations Dashboard and release the approved batch.
11. Open Audit Logs and confirm creation, approval, and release events are recorded.
12. Switch to a business or private persona and confirm Corporate Governance, Approval Queue, Audit Logs, and Users & Personas are not exposed in their navigation.

# Success Criteria Status

- Corporate User can configure approval governance without code changes: complete.
- Approvers receive approval requests: complete.
- Approval decisions are audited: complete.
- Approved batches can be released: complete.
- Private and business personas remain isolated from governance functionality: complete at application-navigation level.
- Corporate personas share one corporate experience while seeing role-relevant functionality: complete.
