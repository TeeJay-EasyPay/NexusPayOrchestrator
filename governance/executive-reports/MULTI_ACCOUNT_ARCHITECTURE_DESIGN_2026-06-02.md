# Multi-Account Architecture Design

## Date
2026-06-02

## Branch
`startup-v2-ws3-multi-account-architecture`

## Objective
Define architecture for Demo User, Personal User, and Enterprise User without implementing production backend changes.

## Executive Summary
NexusPay should separate human authentication from account ownership.

The authenticated Supabase user represents the person signing in. An account context represents the workspace or ownership boundary through which transfers, recipients, payment methods, AI settings, and permissions are accessed.

## User Classes
| Segment | Purpose | Initial capability |
|---|---|---|
| Demo User | Safe preview user for Founder, testing, and guided demos. | Simulated data, limited write scope, no live-money capability. |
| Personal User | Private consumer sending money for self/family use. | Personal account, own recipients, own transfers, simple settings. |
| Enterprise User | Future business/operator account with roles, approvals, and admin controls. | Multi-member account, permissions, approval workflows, operational views. |

## Authentication Model
| Layer | Responsibility |
|---|---|
| Supabase Auth user | Identity, session, email, password, device trust, sign-in/sign-out. |
| Profile | Person-level display name, preferences, verification pointers. |
| Account | Ownership boundary for financial activity and settings. |
| Account membership | Connects a user to one or more accounts with role and status. |

## Account Switching Model
1. On successful auth bootstrap, resolve memberships for the signed-in user.
2. If one account exists, set it as active account.
3. If multiple accounts exist, use the last selected account or ask the user to choose.
4. All account-owned queries must include active `account_id`.
5. Sign Out clears active account state.

## Account Types
| Account type | Owner model | Intended navigation |
|---|---|---|
| `DEMO` | System-controlled demo account with authorised demo users. | Consumer preview plus demo controls. |
| `PERSONAL` | One primary owner, optional future family members. | Consumer app. |
| `ENTERPRISE` | Organisation-owned with roles and approvals. | Enterprise/founder/operator surfaces. |

## Permission Model
| Role | Demo | Personal | Enterprise |
|---|---:|---:|---:|
| Owner | Full demo reset controls | Full personal controls | Full organisation controls |
| Sender | Create simulated demo transfers | Create transfers within limits | Create transfers within policy |
| Approver | Not required | Later phase | Approve thresholded transfers |
| Viewer | View demo activity | View own account activity | View permitted account activity |
| Admin | System only | Not required initially | Manage members and settings |

## Evidence Table
| Design question | Decision | Evidence / rationale |
|---|---|---|
| Should auth user own transfers directly? | No, use account ownership. | Multi-account, family, and enterprise use cases require account context. |
| Should Demo User be a separate auth implementation? | No. | Current Startup V2 expects one auth flow; demo is an account/membership mode. |
| Should Personal and Enterprise share tables? | Yes, with account type and role controls. | Avoids duplicate persistence models. |
| Should account switching launch before RLS migration? | No. | Account-scoped RLS and backfill must exist first. |

## Pass / Fail Criteria
### Pass
- Every account-owned entity can be traced to `account_id`.
- Every user action can be traced to `user_id`, `account_id`, and role.
- Demo, Personal, and Enterprise can share auth but differ by account type and permissions.

### Fail
- Transfer ownership remains user-only after multi-account rollout.
- Demo user requires a second auth implementation.
- Enterprise controls become visible in personal flows by default.

## Risks
| Risk | Level | Mitigation |
|---|---|---|
| RLS migration breaks existing history | High | Backfill personal accounts before enforcing account-scoped policies. |
| Demo data leaks into personal accounts | High | Use account type and strict memberships. |
| Enterprise scope bloats consumer app | Medium | Route by account type and feature flags. |

## Merge Readiness
Docs-only and ready for architecture review. No production code changes were made.
