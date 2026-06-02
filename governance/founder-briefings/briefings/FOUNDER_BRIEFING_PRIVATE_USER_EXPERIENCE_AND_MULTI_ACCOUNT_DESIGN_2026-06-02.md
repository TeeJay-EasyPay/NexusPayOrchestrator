# Founder Briefing: Private User Experience And Multi-Account Design

## Date
2026-06-02

## Founder Summary
The private-user NexusPay experience has been designed as a simpler consumer app, separate from founder/operator Mission Control.

The design keeps the strengths of NexusPay orchestration but presents them as clear user choices: send money, choose Cheapest or Most Stable, track transfers, manage profile/settings, and receive reassuring Nexus AI guidance.

## What Was Designed
- Private-user screen model: Home, Send Money, Transfers, User Profile, Settings, Nexus AI, and later KYC/XML verification.
- Cheapest vs Most Stable route-choice model for consumers.
- Consumer-safe Nexus AI language and behavior.
- Multi-account concept covering account switching, ownership, permissions, and future Supabase data implications.
- Visual wireframe artifact in `governance/executive-reports/PRIVATE_USER_APP_VISUAL_WIREFRAME_2026-06-02.md`.

## Why It Matters
NexusPay currently has strong operational intelligence, but private users need clarity rather than internal telemetry. The private-user design makes the product easier to understand, safer to trust, and more ready for consumer onboarding.

## How It Differs From Operations / Founder Experience
Private users should not see:
- treasury pressure
- provider degradation
- failover internals
- route operational event ledgers
- Mission Control dashboards

Private users should see:
- transfer readiness
- cost and stability choices
- receipt/reference history
- reassuring status updates
- simple AI explanations

## Recommended Implementation Sequence
1. Review and merge Transaction Centre V1 from WS2.
2. Add a private navigation model with Home, Send, Transfers, Profile, and Settings.
3. Introduce a consumer route-choice adapter: Cheapest and Most Stable.
4. Rewrite Nexus AI private-user copy around reassurance and next best action.
5. Add Settings as the control hub for payment methods, Nexus AI, security, notifications, privacy, and verification.
6. Design account-scoped Supabase migrations with backfill.
7. Build account switching only after RLS and account ownership are proven.

## Code Changed
No production app code was changed in WS3. This branch is design and architecture only.

## What Should Be Built First
Build the private-user Transfers experience first by reviewing WS2 Transaction Centre V1, then build the Cheapest vs Most Stable route-choice adapter. Those two moves create the clearest consumer value without disturbing Startup V2, treasury, or execution.

## Merge Recommendation
WS3 is docs-only and ready for design review. It can merge independently after review, but implementation of multi-account backend changes should wait until WS1 proves auth/runtime parity.
