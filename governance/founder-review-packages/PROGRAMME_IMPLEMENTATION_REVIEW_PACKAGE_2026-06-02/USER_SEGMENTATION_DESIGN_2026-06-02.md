# User Segmentation Design

## Date
2026-06-02

## Branch
`startup-v2-ws3-multi-account-architecture`

## Objective
Define how NexusPay should segment Demo User, Personal User, and Enterprise User experiences.

## Segmentation Principle
Segment by active account type, not by separate authentication systems.

One user can hold multiple memberships. The active account determines UI, permissions, copy, data scope, and feature availability.

## Segment Matrix
| Segment | Primary UI | Data scope | AI tone | Transfer behavior |
|---|---|---|---|---|
| Demo User | Consumer preview with demo badge | Demo account data | Guided and explanatory | Simulated only |
| Personal User | Consumer app | Personal account data | Reassuring and simple | Live-ready after KYC and funding |
| Enterprise User | Enterprise/founder/operator surfaces | Enterprise account data | Operational and evidence-backed | Role and approval controlled |

## Experience Rules
### Demo User
- Must be visibly marked as demo.
- Must not access live payout or real funding.
- Can reset seeded data.
- Should be safe for Founder walkthroughs.

### Personal User
- Should see Home, Send, Transfers, Profile, Settings, and Nexus AI.
- Should see Cheapest and Most reliable delivery options.
- Should not see treasury, route degradation, provider failover, or operations telemetry.
- Should receive plain-language status and receipt access.

### Enterprise User
- May access operations dashboards, treasury views, route intelligence, approval workflows, audit trails, and member management.
- Must have role-scoped permissions.
- Should not share enterprise recipients or transfers with personal accounts unless explicitly linked through policy.

## Routing Model
| Active account type | Default destination |
|---|---|
| `DEMO` | `/consumer` with demo badge |
| `PERSONAL` | `/consumer` |
| `ENTERPRISE` | Existing dashboard or future enterprise home |

## Nexus AI Segmentation
| Segment | Nexus AI behavior |
|---|---|
| Demo | Explain features and guide the walkthrough. |
| Personal | Reassure, explain costs, highlight savings, explain status. |
| Enterprise | Provide telemetry, risk, route, liquidity, and operational insights. |

## Evidence Table
| Question | Decision | Rationale |
|---|---|---|
| Should enterprise controls appear for personal users? | No. | Consumer trust depends on simple flows. |
| Should Demo use production auth? | Yes. | Avoids multiple auth implementations. |
| Should active account drive UI? | Yes. | Supports one identity with multiple contexts. |

## Pass / Fail Criteria
### Pass
- Same auth flow can support all three segments.
- Active account determines UI and permissions.
- Personal user never sees operational telemetry by default.
- Enterprise user can access governed operational capabilities.

### Fail
- Segment is inferred only from email address.
- Demo user can trigger live-money execution.
- Personal user sees enterprise dashboards or treasury metrics by default.

## Risks
| Risk | Level | Mitigation |
|---|---|---|
| Email-based segmentation becomes brittle | Medium | Use account memberships and account type. |
| Demo mode leaks into production paths | High | Gate live providers by account type and environment. |
| Enterprise UI overwhelms personal users | Medium | Separate route shells by active account type. |

## Merge Readiness
Ready for architecture review. No production implementation was made.
