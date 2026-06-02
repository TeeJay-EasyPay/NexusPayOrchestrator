# WS3 Founder Design Review Pack

## Workstream
startup-v2-ws3-private-user-experience-multi-account-design

## Review Date
2026-06-02

## 1) What Was Completed (Evidence Review)

WS3 was delivered as a design-and-architecture workstream, not an app implementation workstream.

Completed branch commit:
- df505b9 - Document private user experience design

Files added on WS3 branch:
- governance/executive-reports/PRIVATE_USER_EXPERIENCE_AND_MULTI_ACCOUNT_DESIGN_2026-06-02.md
- governance/executive-reports/PRIVATE_USER_APP_VISUAL_WIREFRAME_2026-06-02.md
- governance/founder-briefings/briefings/FOUNDER_BRIEFING_PRIVATE_USER_EXPERIENCE_AND_MULTI_ACCOUNT_DESIGN_2026-06-02.md

WS3 conclusion on completion status:
- Workstream objective was met for design documentation.
- No production app code changes were made in WS3.
- Deliverables are ready for founder review and implementation planning.

## 2) Design Explained in Simple Business Language

This design turns NexusPay into a clearer private-user product while keeping the operational intelligence in the background.

In business terms:
- Private users want confidence, not system complexity.
- The design reorganizes the app around daily user needs: send money, track status, manage profile, and control settings.
- Route selection is simplified to two understandable choices:
  - Cheapest: maximize value received.
  - Most Stable: maximize reliability and delivery confidence.
- Nexus AI is reframed from operator language to customer reassurance language.
- Multi-account is designed now (Personal, Family, later Business), but implementation is intentionally sequenced to reduce migration and security risk.

Business value expected:
- Faster user understanding and lower drop-off at send flow.
- Higher trust due to clearer language and status visibility.
- Better path to family/business expansion via account model.
- Reduced implementation risk by separating design now from backend migration later.

## 3) All Wireframes and Mockups from WS3

Note: WS3 produced repository-friendly text wireframes/mockups (ASCII), not image files.

### 3.1 Navigation Model

```text
Bottom navigation

+-----------+-----------+-------------+-----------+-----------+
| Home      | Send      | Transfers   | Profile   | Settings  |
+-----------+-----------+-------------+-----------+-----------+
```

Secondary links:
- Nexus AI from Home and Settings
- Verification from Profile and Settings
- Payment Methods from Settings
- Help from Settings

### 3.2 Home Wireframe

```text
+----------------------------------------------------------+
| Good afternoon, Tayo                         Personal v  |
| Your money movement is ready                             |
+----------------------------------------------------------+
| Available to send                                       |
| GBP 1,240.00                                             |
| [Send money]                       [Add funding source]  |
+----------------------------------------------------------+
| Nexus AI                                                |
| Your usual Philippines transfer is stable today.         |
| Most Stable is recommended if delivery certainty matters.|
+----------------------------------------------------------+
| Active transfer                                         |
| Maria Santos                         COMPLETED          |
| GBP 250.00 -> PHP                                      |
| [View transfer]                                          |
+----------------------------------------------------------+
| Recent transfers                                        |
| Maria Santos       NXP-2026-004981      Completed       |
| Ahmed Khan         NXP-2026-004877      Completed       |
| [View all transfers]                                    |
+----------------------------------------------------------+
```

### 3.3 Send Money Wireframe

```text
+----------------------------------------------------------+
| Send Money                                               |
| Amount                                                   |
| [ GBP 250.00                                      ]       |
+----------------------------------------------------------+
| Recipient                                                |
| [ Maria Santos                                  v ]       |
| Philippines - Bank account                               |
+----------------------------------------------------------+
| Choose route                                             |
| +----------------------+  +----------------------+       |
| | Cheapest             |  | Most Stable          |       |
| | Lower fees           |  | Reliable delivery    |       |
| | Receives PHP 18,210  |  | Receives PHP 18,090  |       |
| +----------------------+  +----------------------+       |
+----------------------------------------------------------+
| Summary                                                  |
| Fee: GBP 3.20                                            |
| Estimated arrival: minutes                               |
| [Continue]                                               |
+----------------------------------------------------------+
```

### 3.4 Transfers Wireframe

```text
+----------------------------------------------------------+
| Transfers                                                |
| [ Search recipient, reference, country          ]         |
| [All status] [All corridors] [30 days]                   |
+----------------------------------------------------------+
| Maria Santos                         COMPLETED           |
| GBP -> PHP - Philippines                                |
| NXP-2026-004981                                          |
| [Repeat] [Receipt]                                       |
+----------------------------------------------------------+
| Ahmed Khan                           COMPLETED           |
| GBP -> AED - UAE                                        |
| NXP-2026-004877                                          |
| [Repeat] [Receipt]                                       |
+----------------------------------------------------------+
```

### 3.5 Profile Wireframe

```text
+----------------------------------------------------------+
| Profile                                                  |
| Tayo Jehonathan                                          |
| Personal account                                         |
+----------------------------------------------------------+
| Verification                                             |
| Identity verification: Not started                       |
| Transfer limits: Demo/private preview                    |
| [Start verification]                                     |
+----------------------------------------------------------+
| Security                                                 |
| Password: Enabled                                        |
| Trusted devices: 1                                       |
| [Manage security]                                        |
+----------------------------------------------------------+
| Account switcher                                        |
| Personal account                         Active          |
| Family account                           Planned         |
+----------------------------------------------------------+
```

### 3.6 Settings Wireframe

```text
+----------------------------------------------------------+
| Settings                                                 |
+----------------------------------------------------------+
| Payment methods                     [Manage]             |
| Nexus AI                            [Manage]             |
| Notifications                       [Manage]             |
| Privacy and data                    [Manage]             |
| Verification                        [Manage]             |
| Help and support                    [Open]               |
+----------------------------------------------------------+
```

### 3.7 Nexus AI Wireframe

```text
+----------------------------------------------------------+
| Nexus AI                                                 |
| Helpful guidance for your transfers                      |
+----------------------------------------------------------+
| AI guidance                         [On]                 |
| Tone                                Calm and concise     |
| Detail level                        Balanced             |
+----------------------------------------------------------+
| Where Nexus AI helps                                    |
| Home: transfer readiness                                |
| Send: Cheapest vs Most Stable explanation                |
| Transfers: status explanation and next steps             |
+----------------------------------------------------------+
```

### 3.8 KYC/XML Verification Placeholder Wireframe

```text
+----------------------------------------------------------+
| Verification                                             |
| Required before live high-limit transfers                |
+----------------------------------------------------------+
| Identity document                    Later phase         |
| Address check                        Later phase         |
| XML/compliance provider              Later phase         |
+----------------------------------------------------------+
```

### 3.9 Multi-Account Switcher Mockup

```text
+----------------------------------------------------------+
| Switch account                                           |
+----------------------------------------------------------+
| Personal account                         Active          |
| Family account                           Planned         |
| Business account                          Later          |
+----------------------------------------------------------+
| Each account has separate recipients, transfers, limits, |
| payment methods, verification, and permissions.          |
+----------------------------------------------------------+
```

## 4) User Journey Walkthrough (Screen by Screen)

### Step 1: Home
User lands on a clean overview: available balance, quick send action, transfer status, and recent activity. Nexus AI gives one calm recommendation.

Business intent:
- Immediate confidence and action readiness.
- Reduce cognitive load by showing only high-value information.

### Step 2: Send Money
User enters amount and recipient, then chooses between Cheapest or Most Stable.

Business intent:
- Keep decision quality high while reducing complexity.
- Make route trade-offs understandable in seconds.

### Step 3: Transfer Confirmation and Continue
User sees fee and ETA summary, then continues.

Business intent:
- Improve trust with predictable, transparent costs and timing.

### Step 4: Transfers
User reviews history, searches by reference/recipient/country, and can repeat or access receipt.

Business intent:
- Support repeat behavior and improve retention.
- Reduce support requests by exposing receipts and status in-app.

### Step 5: Profile
User checks verification progress, security posture, and sees account context.

Business intent:
- Build trust with clear identity and security visibility.
- Prepare users for compliance steps without overwhelming them.

### Step 6: Settings
User manages payment methods, AI preferences, notifications, privacy, verification, and help.

Business intent:
- Centralize controls and lower friction for account management.

### Step 7: Nexus AI
User adjusts AI guidance tone and detail; AI explains next-best-action in plain language.

Business intent:
- Increase confidence and feature adoption.
- Preserve intelligence advantage without exposing operational jargon.

### Step 8: Verification (Later Phase)
User eventually completes document/address/XML checks for higher limits.

Business intent:
- Stage compliance progressively to avoid onboarding shock.

### Step 9: Multi-Account Switching (Planned Capability)
User can switch context (Personal/Family/later Business), with separate data boundaries per account.

Business intent:
- Enable product expansion while preserving data ownership clarity and audit control.

## 5) Strengths, Weaknesses, and Recommendations

### Strengths
- Clear strategic separation between private-user and operator experiences.
- Strong simplification of route choice into two business-meaningful options.
- Thoughtful language strategy for Nexus AI that builds user trust.
- Multi-account model includes ownership and permissions from the start.
- Implementation sequence is risk-aware and practical.
- Design-first scope avoided unstable implementation before parity is proven.

### Weaknesses and Gaps
- No production prototype or coded UI validation yet; usability is still assumption-based.
- No quantitative UX targets defined (for example completion rate, time-to-send, and drop-off points).
- Cheapest vs Most Stable may hide detail for advanced users if no drill-down exists.
- Multi-account model is conceptual only; no migration/backfill runbook is attached.
- No visual assets beyond text wireframes (no high-fidelity mockups, no clickable prototype).

### Recommendations
- Recommendation 1: Build a thin private-user clickable prototype before full implementation to validate comprehension and confidence.
- Recommendation 2: Define success metrics now (send completion rate, average send time, repeat transfer rate, support tickets per 1,000 users).
- Recommendation 3: In send flow, keep two options primary but add optional More details for informed users.
- Recommendation 4: Produce a multi-account migration and RLS rollout plan before database changes.
- Recommendation 5: Implement in this order:
  1. Transfers UX (from WS2 pattern)
  2. Cheapest/Most Stable adapter in send flow
  3. Nexus AI consumer language update
  4. Settings hub consolidation
  5. Account model and switcher behind feature flags
- Recommendation 6: Gate multi-account backend work on WS1 parity closure and auth confidence evidence.

## 6) Founder Decision View

Decision-ready statement:
- WS3 design work is complete and high-quality as a design foundation.
- It is ready to merge as documentation.
- Implementation should begin with low-risk, high-clarity user flows (Transfers and route-choice simplification), while multi-account backend work remains deferred until runtime/auth parity is certified.

## 7) Generated Light-Theme Pictures

To make the wireframes easier to review, visual mockup pictures were created in a warm, lighter color style.

- Home screen picture: [governance/executive-reports/ws3-visual-mockups/home-screen-light.svg](governance/executive-reports/ws3-visual-mockups/home-screen-light.svg)
- Send Money screen picture: [governance/executive-reports/ws3-visual-mockups/send-screen-light.svg](governance/executive-reports/ws3-visual-mockups/send-screen-light.svg)
- Transfers screen picture: [governance/executive-reports/ws3-visual-mockups/transfers-screen-light.svg](governance/executive-reports/ws3-visual-mockups/transfers-screen-light.svg)

Design direction used:
- Warm cream and soft peach backgrounds for a welcoming first impression.
- High readability with gentle contrast and clear card hierarchy.
- Friendly, non-clinical tone aligned to private-user confidence and calmness.

## 8) Blue Theme Full WS3 Screen Set (White Cards)

Second set created with a soft blue trust palette while preserving white cards. This now covers all WS3 private-user screens.

- Home screen: [governance/executive-reports/ws3-visual-mockups-v2-blue-whitecards/home-screen-blue-whitecards.svg](governance/executive-reports/ws3-visual-mockups-v2-blue-whitecards/home-screen-blue-whitecards.svg)
- Send Money screen: [governance/executive-reports/ws3-visual-mockups-v2-blue-whitecards/send-screen-blue-whitecards.svg](governance/executive-reports/ws3-visual-mockups-v2-blue-whitecards/send-screen-blue-whitecards.svg)
- Transfers screen: [governance/executive-reports/ws3-visual-mockups-v2-blue-whitecards/transfers-screen-blue-whitecards.svg](governance/executive-reports/ws3-visual-mockups-v2-blue-whitecards/transfers-screen-blue-whitecards.svg)
- Track screen: [governance/executive-reports/ws3-visual-mockups-v2-blue-whitecards/track-screen-blue-whitecards.svg](governance/executive-reports/ws3-visual-mockups-v2-blue-whitecards/track-screen-blue-whitecards.svg)
- Profile screen: [governance/executive-reports/ws3-visual-mockups-v2-blue-whitecards/profile-screen-blue-whitecards.svg](governance/executive-reports/ws3-visual-mockups-v2-blue-whitecards/profile-screen-blue-whitecards.svg)
- Settings screen: [governance/executive-reports/ws3-visual-mockups-v2-blue-whitecards/settings-screen-blue-whitecards.svg](governance/executive-reports/ws3-visual-mockups-v2-blue-whitecards/settings-screen-blue-whitecards.svg)
- Nexus AI screen: [governance/executive-reports/ws3-visual-mockups-v2-blue-whitecards/nexus-ai-screen-blue-whitecards.svg](governance/executive-reports/ws3-visual-mockups-v2-blue-whitecards/nexus-ai-screen-blue-whitecards.svg)
- Verification placeholder screen: [governance/executive-reports/ws3-visual-mockups-v2-blue-whitecards/verification-screen-blue-whitecards.svg](governance/executive-reports/ws3-visual-mockups-v2-blue-whitecards/verification-screen-blue-whitecards.svg)
- Account switcher screen: [governance/executive-reports/ws3-visual-mockups-v2-blue-whitecards/account-switcher-screen-blue-whitecards.svg](governance/executive-reports/ws3-visual-mockups-v2-blue-whitecards/account-switcher-screen-blue-whitecards.svg)

Comparison guidance:
- Warm set feels more casual and welcoming.
- Blue set feels more trust-led and finance-native.
- Both preserve white cards for clarity and premium readability.
