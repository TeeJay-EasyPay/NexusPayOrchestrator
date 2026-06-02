# Private User Experience And Multi-Account Design

## Date
2026-06-02

## Branch
`startup-v2-ws3-private-user-experience-multi-account-design`

## Scope
Design and architecture only. No production app code was changed in this workstream.

## Design Objective
Create a simpler private-user NexusPay app model that keeps the strength of orchestration, route intelligence, and Nexus AI while removing operations telemetry clutter from consumer flows.

The private-user experience should answer four questions quickly:
1. Can I send money?
2. What will it cost?
3. Is it safe and stable?
4. Where is my transfer now?

## Required Screen Model
| Screen | Private-user purpose | Keep | Remove or hide |
|---|---|---|---|
| Home | Money movement status, recent transfers, best next action. | Balance/funding readiness, active transfer, recent transfers, reassuring Nexus AI summary. | Operations command-centre metrics, treasury capacity grids, provider-level telemetry. |
| Send Money | Amount, recipient, payout method, simple route choice. | Existing recipient reuse and corridor support. | Full route scoring matrix during first input flow. |
| Transfers | Searchable transfer history and receipts. | Transaction Centre V1 pattern from WS2. | Operational failover internals unless needed for support. |
| User Profile | Identity, verification, trusted devices, support. | Account profile and security posture. | Founder/ops readiness language. |
| Settings | Payment methods, security, notifications, privacy, account switching. | Existing payment-method and Nexus AI settings concepts. | Operations toggles. |
| Nexus AI | Consumer-safe guidance and preferences. | Master enablement and sensitivity. | Operator-centric terms like treasury utilisation, route degradation, operational telemetry. |
| KYC/XML Verification | Later-phase identity/compliance placeholder. | Verification status and document flow. | Detailed compliance operations internals. |

## Private User Information Architecture
Primary navigation:
- Home
- Send
- Transfers
- Profile
- Settings

Secondary destinations:
- Nexus AI
- Payment Methods
- Verification
- Help and Support

The private app should treat Operations and Mission Control surfaces as founder/operator-only experiences, not user-facing private flows.

## Send Money Route Choice Model
Private users should see only two route choices:

| Choice | Meaning | Inputs behind the scenes | User-facing language |
|---|---|---|---|
| Cheapest | Prioritises lower total cost and better receive amount. | Route fee, FX rate, cost score, provider quote. | "Best value: lower fees and more received." |
| Most Stable | Prioritises reliability and fewer interruptions. | Reliability score, partner health, treasury pressure, liquidity, failover status. | "Most reliable: chosen for stable delivery." |

The existing route engine can keep all route templates and scores internally. The consumer UI should collapse them into these two understandable choices.

## Nexus AI Consumer Model
Nexus AI should feel like a calm assistant, not an operations analyst.

Recommended wording:
- "Your transfer is on track."
- "This route is cheaper today because the exchange rate improved."
- "Most Stable is recommended because this corridor is busy right now."
- "We will tell you if anything needs your attention."

Avoid in private-user screens:
- "Treasury pressure"
- "Operational event ledger"
- "Route degradation"
- "Provider failover evaluation"
- "Liquidity utilisation"

These terms can remain available for founder/operator surfaces and support diagnostics.

## Multi-Account Concept
### Account Switching
Users should be able to switch between account contexts from Profile or Settings.

Account switcher model:
- Personal account
- Family account
- Business account later
- Each account has its own recipients, transfers, limits, permissions, and verification state.

The switcher should be explicit and visible near the profile identity area. It should not silently blend transfer histories across accounts.

### Ownership Boundaries
| Boundary | Rule |
|---|---|
| User identity | Supabase auth user remains the person signing in. |
| Account entity | Account context owns transfers, recipients, payment methods, limits, and verification state. |
| Membership | A user may belong to more than one account. |
| Transfer ownership | Every transfer belongs to one account context and one initiating user. |
| Audit ownership | Audit logs should record user ID, account ID, role, action, and timestamp. |

### Permissions Concept
| Role | Capabilities |
|---|---|
| Owner | Manage account, members, payment methods, transfers, limits, verification. |
| Sender | Create and repeat transfers within limits. |
| Viewer | View transfers, receipts, and account status. |
| Approver | Approve transfers above configured thresholds. |

Initial private-user release can ship Personal account only, with a dormant account model documented for future migration.

## Future Supabase Data Model Considerations
Future tables or columns:
- `accounts`
- `account_memberships`
- `account_payment_methods`
- `account_recipients`
- `account_verification_profiles`
- `transfer_approvals`
- Add `account_id` to `transfers`, `recipients`, `payment_methods`, `audit_logs`, `transaction_audit_logs`, and `nexus_ai_settings`.

RLS principle:
- User can access account-owned rows only through active membership.
- Role determines allowed actions.
- Personal accounts should be created automatically at sign-up or first bootstrap after migration.

Migration caution:
- Do not add `account_id` blindly without a backfill plan for existing user-scoped data.
- Existing transfer history must be assigned to a default personal account before enforcing account-scoped RLS.

## Recommended Implementation Sequence
1. Define private-user IA and navigation split.
2. Merge Transaction Centre V1 after review.
3. Add consumer route-choice adapter that maps internal route quotes to Cheapest and Most Stable.
4. Rewrite private Nexus AI copy and sensitivity controls around reassurance and clarity.
5. Add Settings screen as the home for payment methods, AI, security, notifications, privacy, verification, and future account switching.
6. Introduce account data model behind feature flags.
7. Add account switcher only after account-scoped Supabase tables and RLS are ready.

## Risk Register
| Risk | Impact | Mitigation |
|---|---|---|
| Operations concepts leak into private-user UX. | Users may feel confused or anxious. | Keep operations telemetry behind founder/operator surfaces. |
| Cheapest vs Most Stable hides too much detail. | Users may not understand tradeoffs. | Show one concise reason and allow "View details" later. |
| Multi-account scope grows too early. | High migration and RLS risk. | Design now; implement after personal account model and backfill plan. |
| Auth parity remains unresolved. | Private history and account switching cannot be trusted on device. | Keep WS1 as certification gate. |

## Merge Readiness
WS3 is docs-only and merge-ready for design review. It does not require WS1 to proceed, but its implementation sequence should not begin account-scoped backend changes until Startup V2 parity and auth confidence are restored.
