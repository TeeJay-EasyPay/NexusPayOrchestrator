# Founder Briefing: Route Intelligence Transformation

## The Outcome

NexusPay now has one route decision for the entire payment journey. The route shown on Send is the route compared on Routes, approved, executed, explained by Nexus AI, and displayed in Tracking.

The contradictory RLUSD recommendation has been removed. RLUSD now appears only as unavailable until NexusPay can prove a real RLUSD path, market depth, cost, and settlement implementation.

## What You Will See

- Every route value carries a source label such as LIVE, SANDBOX, TESTNET, DERIVED, ESTIMATED, or UNAVAILABLE.
- Unknown fees, total costs, liquidity, limits, and capacity say `Unavailable`.
- Tracking records the approved route and any failed/replacement route.
- Corporate and Consumer payments use the same route and execution model.

## Important Truth

There is currently no evidence-complete route available for a new payment.

Airwallex sandbox payout evidence is genuine and live FX is available. However, NexusPay's current Yapily flow authenticates and queries institutions but does not submit a real Yapily payment authorisation/payment. Its consent and payment references are synthetic sandbox records. The new engine correctly blocks approval instead of presenting that first leg as genuine.

XRPL/RLUSD is also blocked because NexusPay does not yet have an executable RLUSD quote, liquidity/slippage evidence, or an executor that transfers RLUSD.

## Business Value

This change replaces a persuasive demonstration with an auditable operating model. It protects Founder and investor credibility because missing data can no longer create a high route score or a recommended rail.

It also creates the durable foundation needed to add providers without rebuilding every screen: a provider contributes evidence to one Route Plan, and every NexusPay experience consumes it consistently.

## Current Status

**PARTIAL PASS.** The architecture, database audit trail, screen consistency, provenance, and fail-closed controls are implemented and validated. Genuine dynamic routing cannot be certified until Yapily payment initiation and at least one complete alternative route are connected.

## Next Founder Decision

Prioritise Yapily's real payment-authorisation redirect and callback flow. After that passes, add server-side Route Plan signing and provider preflight quotes, then certify direct banking and failover before presenting NexusPay as production-ready orchestration.

Technical report: [../../reports/ROUTE_INTELLIGENCE_TRANSFORMATION_IMPLEMENTATION_REPORT.md](../../reports/ROUTE_INTELLIGENCE_TRANSFORMATION_IMPLEMENTATION_REPORT.md)
