# Data Ownership Design

## Date
2026-06-02

## Branch
`startup-v2-ws3-multi-account-architecture`

## Objective
Define Supabase data ownership for profiles, recipients, transfers, AI settings, payment methods, and audit records across Demo, Personal, and Enterprise users.

## Ownership Principle
NexusPay should move from user-scoped data to account-scoped data.

`user_id` identifies who performed an action. `account_id` identifies the account that owns the financial record.

## Proposed Ownership Model
| Entity | Current posture | Future owner | Notes |
|---|---|---|---|
| `profiles` | User-scoped | User | Person-level identity remains user-owned. |
| `transfers` | User-scoped | Account + initiating user | Add `account_id`, retain `user_id`. |
| `recipients` | User-scoped | Account | Recipients belong to account context. |
| `payment_methods` | Mock/current schema | Account | Funding sources belong to account context. |
| `nexus_ai_settings` | User-scoped | Account + optional user preference override | Personal settings can default from account settings. |
| `audit_logs` | User-action stream | Account + user | Include actor and ownership boundary. |
| `transaction_audit_logs` | Transaction-scoped | Transfer/account | Attach to transfer and account. |
| `execution_sessions` | Transfer-scoped | Transfer/account | Used for recovery and operations. |

## Proposed Tables
| Table | Purpose |
|---|---|
| `accounts` | Account/workspace record with type `DEMO`, `PERSONAL`, or `ENTERPRISE`. |
| `account_memberships` | User-to-account membership, role, status, default flag. |
| `account_profiles` | Account display metadata, default currency, country, verification status. |
| `account_verification_profiles` | KYC/KYB/XML provider status and evidence references. |
| `transfer_approvals` | Enterprise approval workflow for thresholded transfers. |

## RLS Requirements
| Rule | Requirement |
|---|---|
| Membership required | User can access account-owned rows only when active membership exists. |
| Role-based writes | Sender/Owner can create transfers; Viewer cannot. |
| Account type gates | Enterprise-only tables/features require enterprise account type. |
| Demo protection | Demo accounts cannot trigger live-money providers. |
| Audit visibility | Users can see audit events only for accounts they belong to. |

## Migration Sequence
1. Create `accounts` and `account_memberships`.
2. Backfill one `PERSONAL` account per existing user.
3. Assign existing transfers and recipients to the user's personal account.
4. Add account-scoped RLS in permissive/dual-read mode.
5. Update services to pass active `account_id`.
6. Enforce account-scoped RLS.
7. Add enterprise roles and approval workflows.

## Evidence Table
| Data question | Decision | Rationale |
|---|---|---|
| Should transfers keep `user_id`? | Yes. | Actor traceability is required. |
| Should transfers add `account_id`? | Yes. | Ownership boundary must support family/business accounts. |
| Should AI settings be account-owned? | Yes, with optional user override later. | Enterprise and personal accounts may need different AI settings. |
| Should recipients be shared across accounts? | No by default. | Prevents privacy leakage. |

## Pass / Fail Criteria
### Pass
- Every account-owned table has `account_id`.
- RLS checks account membership.
- Existing user history can be backfilled without data loss.
- Demo data remains isolated.

### Fail
- A user can access another account's transfers by changing IDs.
- Existing history is orphaned during migration.
- Personal and enterprise settings are mixed.

## Risks
| Risk | Level | Mitigation |
|---|---|---|
| Backfill complexity | High | Build migration dry-run and rollback plan. |
| RLS lockout | High | Test policies with Demo, Personal, and Enterprise fixtures. |
| Service mismatch | Medium | Add active account context provider before enforcing RLS. |

## Merge Readiness
Ready for architecture review. Do not implement database changes until a migration plan and test fixtures are approved.
