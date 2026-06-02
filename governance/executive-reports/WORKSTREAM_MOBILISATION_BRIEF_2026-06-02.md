# Workstream Mobilisation Brief

## Date
2026-06-02

## Baseline Reviewed
- `docs/PROJECT_MAP.md`
- `governance/governance-core/GOVERNANCE_INDEX.md`
- `governance/governance-core/DECISION_REGISTER.md`
- Startup V2 artefacts under `governance/startup-architecture-v2/`
- `AUTHENTICATION_ARCHITECTURE_REVIEW_.md`
- `governance/executive-reports/PARALLEL_WORKSTREAM_EXECUTION_PLAN_2026-06-02.md`

## Repository Baseline
- Parent branch: `startup-v2`
- Baseline commit recorded before branch creation: `779fe7627e655322e0debe6d464f4041ee779f83`
- Worktree state before branch creation: clean

## Mobilisation Decision
The Founder-authorised parallel delivery programme may proceed with strict branch separation.

Workstream 1 remains certification-critical and may block Startup V2 certification.

Workstream 2 and Workstream 3 may proceed independently unless Workstream 1 identifies a repository-wide risk.

## Workstream Separation
| Workstream | Branch | Scope control |
|---|---|---|
| WS1 Build-to-device runtime parity | `startup-v2-ws1-build-device-parity` | Investigation and parity evidence only; no product feature remediation. |
| WS2 Transaction Centre V1 | `startup-v2-ws2-transaction-centre-v1` | Product screen implementation only; no treasury, route execution, payout, or startup/auth redesign. |
| WS3 Private user experience and multi-account design | `startup-v2-ws3-private-user-experience-multi-account-design` | Design and architecture only; no broad production code implementation. |

## Evidence-Based Baseline Conclusions
1. Startup V2 is implemented in the repository but production certification remains NO-GO pending native/device visual parity.
2. Current live auth architecture has one runtime `/auth` implementation and one Startup V2 routing authority.
3. Physical-device behavior that lacks the Demo Workspace button or opens Home while signed out is more consistent with runtime/build/OTA/cache drift than with multiple live auth implementations.
4. Transaction Centre V1 can be built safely against existing transfer history models, with an explicit auth/session dependency note.
5. Private-user and multi-account design can proceed as docs-first architecture without touching runtime behavior.

## Initial Risk Posture
| Risk | Posture | Mitigation |
|---|---|---|
| Device runtime drift | High for certification | WS1 parity proof remains the release gate. |
| Cross-branch scope bleed | Medium | One branch per workstream and separate reports. |
| Auth/session dependency for transaction history | Medium | Document in WS2; do not alter auth in WS2. |
| Multi-account backend overreach | Medium | Keep WS3 design-only; defer database implementation. |

## Mobilisation Outcome
Proceed with the three workstreams sequentially in one coordinated run while keeping outputs, commits, reports, and merge readiness separate.
