# NexusPay
# Chief Digital Liaison Officer (CDLO)
# Operational Handbook

**Version:** 1.0  
**Status:** Active

## Mission

The Chief Digital Liaison Officer (CDLO) manages NexusPay's external ecosystem of financial infrastructure partners, maintains communication history, and supports the Founder in securing infrastructure required for the MVP and investor readiness.

---

# Current Strategic Objective

Demonstrate one complete end-to-end payment journey:

1. Source Rail
2. NexusPay AI Orchestration
3. Settlement Layer
4. Destination Rail

Target MVP:

```text
Sender Bank
    │
Yapily Sandbox
    │
NexusPay AI Orchestrator
    │
XRPL Testnet
    │
Destination Rail Sandbox
    │
Recipient Bank
```

---

# Partner Register

| Company | HQ | Primary Capability | Journey Layer | Sandbox | Status |
|---------|----|--------------------|---------------|----------|--------|
| Yapily | London, UK | Open Banking | Source Rail | Yes | Sandbox Active |
| Stripe | San Francisco / Dublin | Financial Infrastructure | Source / Potential Destination | Yes | Active Discussions |
| Ripple | San Francisco, USA | Settlement Network | Settlement | XRPL Testnet | Integrated |
| Thunes | Singapore | Global Payout Network | Destination Rail | Yes | Discovery |
| Tranglo | Kuala Lumpur, Malaysia | Payout Network | Destination Rail | Yes | Awaiting Response |
| TerraPay | London, UK | Global Payouts | Destination Rail | Yes | Awaiting Response |
| Nium | Singapore | Global Payments | Source & Destination | Yes | Awaiting Response |
| TrueLayer | London, UK | Open Banking | Source Rail | Yes | Referred to Stripe |
| Airwallex | Melbourne, Australia | Financial Infrastructure | Destination Rail | Yes | Terminal Sandbox Payout Passed; Webhook Pending |
| Currencycloud | London, UK | Cross-border Banking | Settlement / Destination | Yes | Target |
| BVNK | London, UK | Stablecoin Infrastructure | Settlement / Destination | Yes | Target |
| Banking Circle | Luxembourg | Banking Infrastructure | Settlement / Destination | Yes | Target |

---

# Communication History

## Infrastructure Progress

- Purchased NexusPay domains.
- Migrated business email to Hostinger.
- Established `tarik.jehangir@nexuspay.uk`.
- Created `enquiries@nexuspay.uk` forwarding to Founder mailbox.

## Outreach Completed

- Yapily
- Stripe
- TrueLayer
- Thunes
- Tranglo
- TerraPay
- Nium

## Meetings

### Yapily
- Discovery meeting completed.
- Sandbox access granted.
- Credentials issued.
- Technical onboarding available.

### Stripe
- Discovery meeting completed.
- Consultant follow-up pending to determine best fit.

### TrueLayer
- Determined NexusPay was not the ideal fit.
- Referred NexusPay to Stripe.

### Thunes
- Qualification form completed.
- Awaiting next engagement.

### Airwallex
- Founder created self-service sandbox account.
- Scoped sandbox Client API credentials supplied through local environment configuration.
- Read-only sandbox authentication passed.
- Account capability funding-limits read returned HTTP 200.
- Supabase migrations and Edge Functions deployed after project reactivation.
- Founder-expanded API scope now permits balance, beneficiary and transfer operations.
- Terminal sandbox payout certification passed through Airwallex beneficiary creation, transfer submission, `SENT`, and `PAID`.
- NexusPay stores redacted provider references, attempts, timestamps and journey evidence and exposes the stages in Corporate payment tracking.
- Webhook signature verification is implemented and synthetically tested; actual Airwallex webhook delivery remains pending.

---

# Current Priorities

1. Secure a destination rail sandbox.
2. Continue Stripe engagement.
3. Configure and verify an actual Airwallex sandbox webhook subscription.
4. Contact Currencycloud.
5. Contact BVNK.
6. Contact Banking Circle.
7. Maintain existing partner relationships.

---

# Positioning

NexusPay is presented as:

> "An AI-driven financial infrastructure orchestration platform that intelligently selects the optimal combination of source rails, settlement networks and destination rails for every transaction."

NexusPay is **not** positioned as:
- a bank
- an EMI
- an exchange
- a remittance company

---

# Daily Founder Briefings

## 2026-08-02

### Key Achievements

- Yapily sandbox secured.
- Stripe technical engagement underway.
- Thunes discovery progressing.
- Hostinger business email established.
- Architecture refined into:
  - Source Rails
  - AI Orchestration
  - Settlement Networks
  - Destination Rails

### Immediate Objective

Secure a destination-rail sandbox partner to complete the first end-to-end MVP orchestration demonstration.

---

> **Maintenance Rule:** Append new daily briefings to the end of this document. Do not overwrite previous entries. Update the partner register and communication history whenever new information is confirmed.
