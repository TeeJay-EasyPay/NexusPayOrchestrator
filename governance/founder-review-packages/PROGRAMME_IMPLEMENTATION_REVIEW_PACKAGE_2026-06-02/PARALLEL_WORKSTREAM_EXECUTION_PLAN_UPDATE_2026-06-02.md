# Parallel Workstream Execution Plan Update

## Date
2026-06-02

## Sequencing Decision
Sequencing is updated from investigation/design only to implementation review:

1. WS1 remains release gate and continues to physical-device proof.
2. WS2 proceeds as consumer app implementation preview.
3. WS3 proceeds as architecture-only foundation for account ownership and segmentation.

## Branches
| Workstream | Branch | Merge target |
|---|---|---|
| WS1 | `startup-v2-ws1-device-auth-resolution` | `startup-v2` after review only |
| WS2 | `startup-v2-ws2-consumer-app-build` | `startup-v2` after review only |
| WS3 | `startup-v2-ws3-multi-account-architecture` | `startup-v2` after review only |

## Merge Order Recommendation
1. WS1 reports after physical-device proof plan is accepted.
2. WS3 architecture docs before account-scoped implementation begins.
3. WS2 consumer preview after Founder product review.

No automatic merges are authorised.
