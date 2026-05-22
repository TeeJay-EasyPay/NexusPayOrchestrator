# NexusPay Architecture Principles

## Architecture Philosophy

NexusPay is an orchestration platform.

The orchestration engine is the heart of the platform.

All major platform intelligence should support orchestration decisions.

---

## Single Source of Truth

Avoid duplicate data storage.

Each business concept should have one authoritative source.

Examples:

AI settings:
- nexus_ai_settings

User balances:
- Wallet service

Transfer execution:
- Transfer services

Routing intelligence:
- Routing engine

---

## Reusability

Reusable components should always be preferred.

Examples:

- Shared hooks
- Shared cards
- Shared dashboard widgets
- Shared intelligence components

Avoid duplicated UI logic.

Avoid duplicated business logic.

---

## AI Architecture

AI should be layered on top of platform intelligence.

AI does not generate route scores directly.

Route scores are generated from measurable inputs.

Examples:

- FX conditions
- Liquidity conditions
- Treasury pressure
- Market hours
- Network health
- Historical execution quality

AI interprets and explains the resulting intelligence.

---

## Governance Architecture

AI configuration is controlled through:

nexus_ai_settings

This table is the single source of truth for:

- master_enabled
- home_enabled
- route_enabled
- corridor_enabled
- tracking_enabled
- sensitivity

All screens must respect these settings.

---

## Screen Architecture

Each screen should follow a consistent pattern:

1. Screen Header
2. Nexus AI Control
3. Primary Intelligence Cards
4. Operational Content
5. Actions

This structure improves usability and consistency.

---

## Data First

Facts must be generated before explanations.

Example:

Good:

Data -> Route Score -> AI Explanation

Bad:

AI -> Invented Route Score

The platform should always remain grounded in measurable data.

---

## Error Handling

The platform should fail gracefully.

AI failures must never stop:

- Transfers
- Tracking
- Routing
- Wallet functionality

If AI is unavailable, operational functionality continues.

---

## Scalability

Future expansion should support:

- Additional corridors
- Additional assets
- Additional intelligence feeds
- Additional AI capabilities

without requiring major redesigns.