# NexusPay Corporate Governance & Approval Framework V1

Date: 2026-06-22

# Executive Summary

This framework transforms NexusPay from a batch payment demonstrator into a configurable Corporate Governance & Approval Platform while preserving existing personal, business, batch, notification, participant, and OCC behavior.

The design is configuration-driven. Payment categories, payment types, approval roles, approval rules, rule stages, approval decisions, notifications, and audit events are database-backed. Corporate personas share one corporate experience and are separated by access rights, permissions, and workflow responsibilities rather than visual branding.

# Architecture

Core layers:
- Persona layer: static demo personas extended with corporate role metadata.
- Governance configuration layer: database-backed payment categories, payment types, approval roles, and approval rules.
- Approval engine: evaluates payment type, amount, and sequential role requirements.
- Batch workflow layer: creates batches, creates approval requests, emits notifications, records audit events, and releases approved batches.
- Security layer: route guards, menu guards, and service-level persona permission checks.
- Reporting/audit layer: batch operations dashboard, approval queue, audit logs, reports, and governance read views.

Important implementation principle:
Screens must not hardcode approval behavior. Screens request governance configuration, send batch metadata, and the approval engine determines required approvers.

# Schema

New tables:
- `payment_categories`
- `payment_types`
- `approval_roles`
- `approval_rules`
- `approval_rule_roles`
- `batch_approvals`
- `audit_events`

Enhanced tables:
- `payout_batches`
  - `payment_category_id`
  - `payment_type_id`
  - `created_by_persona_id`
  - `created_by_role`
  - `released_by_persona_id`
  - `released_at`
  - `approval_status`
  - `status_history`
  - `governance_metadata`
- `notifications`
  - `notification_type`
  - `metadata`

# Approval Model

Rules are evaluated by:
- Payment type.
- Amount range.
- Enabled/disabled state.
- Sequential or parallel approval mode.
- Required approval role chain.

Supported examples:
- Finance Manager -> CFO
- CFO -> CEO
- Finance Manager -> CFO -> CEO

Rules use role chains in `approval_rule_roles`:
- `approval_rule_id`
- `approval_role_id`
- `stage_order`
- `required`

Approval requests are stored in `batch_approvals`:
- `batch_id`
- `approval_rule_id`
- `approval_role_id`
- `assigned_persona_id`
- `stage_order`
- `decision`
- `decision_by_persona_id`
- `decision_at`
- `comment`

# Persona Model

Corporate Workspace personas:
- Corporate User: administrator, full access.
- CEO: executive approval, reports, audit, governance read.
- CFO: financial approval, rejection, reporting, batch review.
- CTO: operational intelligence, OCC, platform health, audit view.
- Finance Manager: create batches, manage recipients, approve within threshold.
- Finance Director: higher-value approval and reporting.
- Auditor: read-only audit, reports, governance rules.

Business entities:
- Alpha Trading LLC
- Manila Services Inc
- Kuala Lumpur Logistics
- Future business entities

Private users:
- Anne
- James
- Maria
- John
- Future private users

# Navigation Model

Corporate personas share corporate visual design:
- Dark background.
- White cards.
- Teal highlights.
- Corporate navigation style.
- Corporate branding.

Menu visibility is role-based:
- Corporate User sees all corporate functions.
- CEO sees executive dashboard, approval queue, batch operations, reports, audit logs, notifications.
- CFO sees finance dashboard, approval queue, batch operations, reports, payment analytics, notifications.
- CTO sees technology dashboard, OCC, platform health, reports, notifications.
- Finance Manager sees dashboard, send payments, batch payments, approval queue, recipients, notifications.
- Finance Director sees finance dashboard, approval queue, batch operations, reports, notifications.
- Auditor sees audit dashboard, audit logs, reports, governance rules, notifications.

# Security Model

Security is enforced at three layers:
- Persona route guard: blocks direct navigation to restricted screens.
- Menu isolation: only permitted screens appear in corporate navigation.
- Service guard: approval decisions and governance configuration changes validate selected persona role before writing.

Business and private personas cannot access:
- Corporate Governance.
- Approval Governance.
- Approval Rules.
- Audit Logs.
- Corporate reports.
- Approval queue unless they are explicitly represented as corporate approvers.

# Migration Impact

The migration is additive:
- Existing batch tables are preserved.
- Existing participant and notification behavior is preserved.
- Existing batch execution remains possible for business personas.
- Corporate governance batches now enter approval workflow before release.

No destructive table changes are required.

# Rollback Strategy

Rollback can be performed without data loss:
1. Hide new governance routes from navigation.
2. Stop calling the approval engine from batch creation.
3. Continue reading existing `payout_batches`, `batch_transfers`, and `notifications`.
4. Leave governance tables in place for audit preservation.
5. Re-enable direct batch execution if required.

# Validation Plan

Functional validation:
- Corporate User can view and configure approval rules.
- Finance Manager can create a governance-controlled batch.
- Approval requests are generated from database configuration.
- Approvers receive notifications.
- Approvers can approve/reject/comment.
- Audit events record creation, approval decisions, rejection, and release.
- Approved batches can be released.

Security validation:
- Private users cannot access governance routes.
- Business entities cannot access governance routes.
- CTO cannot approve payments.
- Auditor cannot create or approve payments.
- CEO/CFO cannot modify governance configuration.
- Corporate User can access all governance functionality.

# Success Criteria

Founder can open the corporate workspace, switch between corporate personas, and see one consistent corporate experience with role-specific access. Approval behavior is configuration-driven and auditable. Batch operations no longer imply completion before governance approval when corporate approval rules apply.
