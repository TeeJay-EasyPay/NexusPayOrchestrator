# NexusPay Route Intelligence Consistency Audit

**Audit date:** 6 August 2026  
**Scope:** Send preview, alternative Routes, route scoring, route persistence, execution selection, XRPL bridge conditions, and payout-provider resolution.  
**Method:** Read-only source inspection plus deterministic execution of the existing quote builder for the observed GBP 250 / MYR / zero simulated-RLUSD case. No provider call, database write, application change, migration, deployment, or OTA publication was performed.

## Executive conclusion

NexusPay route calculation is **mainly rules-based, with configured demo assumptions and limited dynamic inputs**.

- The Send screen's apparent recommendation is a hard-coded corridor preview. It always presents an RLUSD path for supported destinations and does not call the ranking engine.
- The Routes screen deterministically scores five hard-coded route templates. The amount, destination currency, and a locally stored **simulated** RLUSD balance vary; provider pricing, provider availability, actual corridor capacity, historical outcomes, and live FX do not.
- The optional Nexus AI Edge Function explains an already-calculated route. It does not determine the route score or ranking.
- The selected `RouteQuote` is passed into execution, but failover can replace it with another route. The final payout provider is resolved separately, so a template called `FastTrack Banking Rail` can ultimately execute through Airwallex Sandbox.
- A route labelled `RLUSD Bridge Settlement` does not currently execute an RLUSD transfer. The bridge implementation sends a calculated amount of **XRP on XRPL testnet** using a fixed demo conversion (`0.05 XRP/GBP`, capped at 25 XRP).

The current product must not be described as real-world dynamic route optimisation. It is a useful orchestration demonstration with genuine sandbox/testnet execution legs, but its pre-execution economics and rankings are configured estimates.

## Findings for questions 1-7

### 1. Where the Send Route Preview obtains its route

The corporate Send screen renders `RoutePreviewCard` in `app/send.tsx:292-443`. It calls the local `getCorridorSignal(country)` function at `app/send.tsx:41-190`.

That function contains literal values for every corridor: confidence, liquidity wording, delivery wording, an RLUSD rail string, FX rate, fee, and saving. For example, Malaysia is configured as `GBP -> RLUSD -> MYR`, rate `5.92`, fee `GBP 2.85`, confidence `86`, and delivery `Minutes` (`app/send.tsx:63-70`). The recipient amount is simply `amount * receiveRate` (`app/send.tsx:305-306`); the displayed fee is not deducted.

The card calls this a `Best route` (`app/send.tsx:313-334`), but `handleFindRoutes` only creates a transfer, stores the recipient, and navigates to `/routes` (`app/send.tsx:630-706`). It does not select or persist the previewed route. There is no service, API, Edge Function, or database source behind this preview.

**Classification:** hard-coded preview / demo.

### 2. Where the Routes screen obtains and ranks options

`app/routes.tsx:28-37` delegates to `buildOrchestratedRouteQuotes` in `src/lib/settlementOrchestrator.ts:208-355`. Inputs are:

- current transfer amount;
- recipient currency;
- `simulatedRlusdBalance` from `WalletContext` (`app/routes.tsx:356-382`).

The engine maps five literal templates (`src/lib/settlementOrchestrator.ts:53-135`), calculates each quote, and sorts descending by `score` (`src/lib/settlementOrchestrator.ts:350-355`). Index zero receives the `Recommended` badge (`app/routes.tsx:142-168`). The user must explicitly select a card before continuing (`app/routes.tsx:472-481`).

The calculated route and treasury snapshots are then written to `treasury_liquidity_snapshots` and simulated events to `route_operational_events` (`app/routes.tsx:394-420`). These database rows are outputs of route generation, not live inputs to the ranking.

### 3. Whether both screens share one engine

They do not.

| Path | Logic | Result |
|---|---|---|
| Corporate Send preview | `getCorridorSignal` in `app/send.tsx` | Always displays a configured RLUSD corridor preview. |
| Corporate Routes | `buildOrchestratedRouteQuotes` | Scores five templates and may rank a fiat route first. |
| Private-user Send | Same quote builder, then keeps the cheapest route and the highest-scoring non-cheapest route (`app/consumer/send.tsx:137-162`) | Defaults to the cheapest of those two, not necessarily the overall highest score. |
| Execution | `runTransferExecution` in `src/services/execution/executionEngine.ts` | Starts with the selected route, but may fail over to another stored route. |
| Last-leg payout | `resolvePayoutPartnerThroughCapabilities` | Separately selects a sandbox payout adapter by configured capability scores. |

This separation fully explains why the preview can imply RLUSD while Routes prefers banking rails and the completed payment can use Yapily plus Airwallex without XRPL.

### 4. How route scores are calculated

#### Quote economics

- FX: compile-time `BASE_FX_RATES` (`src/lib/settlementOrchestrator.ts:36-49`).
- Fee: `max(minimumFee, amount * feeRate)`, rounded to two decimals (`:215-220`).
- Recipient amount: `(amount - fee) * configuredFxRate`, rounded (`:218-220`).
- Required RLUSD: `(amount - fee) * 1.27` for the hybrid template (`:51`, `:222-225`).
- ETA, reliability, speed, cost, uptime, fees and provider names: route-template constants (`:53-135`).

#### Liquidity rules

RLUSD coverage uses the device's simulated SecureStore balance, not the live testnet RLUSD balance. The simulation defaults to zero (`src/lib/simulatedRLusdWallet.ts:3-15`).

| Coverage | Status | Liquidity score | Base penalty |
|---|---:|---:|---:|
| Available >= required | `AVAILABLE` | 100 | 0 |
| Available >= 50% required | `LOW` | 62 | 12 |
| Available < 50% required | `INSUFFICIENT` | 20 | 28 |
| Non-bridge route | `NOT_REQUIRED` | 90 | 0 |

Source: `src/lib/settlementOrchestrator.ts:141-163`.

#### Treasury/capacity rules

Corridor, partner, and rail profiles are literal tables in `src/lib/treasuryIntelligence.ts:90-251` and `:287-420`. Transfer thresholds switch between configured normal and high-value values.

`treasuryScore = round(corridorCapacity * 0.38 + partnerCapacity * 0.32 + railCapacity * 0.30 - pressurePenalty * 0.45)`

Pressure points are `LOW=0`, `MEDIUM=7`, `HIGH=14`, `CRITICAL=24`; the score penalty passed to route ranking is `round(totalPressurePoints * 0.55)` (`src/lib/treasuryIntelligence.ts:61-72`, `:424-441`). Fiat rail capacity is always 84. RLUSD rail capacity is based on simulated coverage and is clamped to at least 1 (`:363-409`).

#### Route score rules

`intelligenceScore = clamp(historicalSuccess - failureRisk + confidenceAdjustment + (corridorHealth - 85) * 0.35)`

`routeScore = round(reliability*wR + speed*wS + cost*wC + liquidity*wL + intelligence*wI - baseLiquidityPenalty - treasuryPressurePenalty)`

| Optimisation mode | Reliability | Speed | Cost | Liquidity | Intelligence |
|---|---:|---:|---:|---:|---:|
| Balanced | 31% | 22% | 20% | 17% | 10% |
| Speed | 25% | 38% | 12% | 15% | 10% |
| Low cost | 24% | 12% | 38% | 16% | 10% |
| Resilience | 38% | 14% | 14% | 18% | 16% |

`FASTEST` and `DIGITAL_BRIDGE` use Speed; `LOWEST_COST` uses Low cost; `BACKUP` and `BEST_LIQUIDITY` use Resilience (`src/lib/aiRouteIntelligence.ts:291-318`). Provider history, latency, failure risk and trend are hard-coded profiles (`:32-88`); corridor health and thresholds are also hard-coded (`:100-267`).

`predictedFailureRisk = max(0.3, configuredProviderRisk + (100 - corridorHealth)*0.04 + totalPenalty*0.08)`

`aiConfidence = clamp(round(routeScore*0.65 + intelligenceScore*0.35 - predictedFailureRisk*0.30))`

Source: `src/lib/aiRouteIntelligence.ts:320-372`.

#### Why RLUSD scored 40

The observed result is exactly reproducible for GBP 250 -> MYR with a zero simulated RLUSD balance:

- fee: `max(0.89, 250*0.011) = GBP 2.75`;
- required RLUSD: `(250-2.75)*1.27 = 313.01`;
- zero coverage gives liquidity score 20 and base penalty 28;
- MYR normal corridor pressure contributes 7; RLUSD partner pressure contributes 0; zero rail coverage contributes 24;
- treasury pressure penalty is `round((7+0+24)*0.55) = 17`; total ranking penalty is `28+17 = 45`;
- provider intelligence is `96.9-2.8+4+(84-85)*0.35 = 97.75`;
- Speed weighted subtotal is `91*.25 + 99*.38 + 96*.12 + 20*.15 + 97.75*.10 = 84.665`;
- `round(84.665-45) = 40`.

The same run produces fiat scores 90, 87, 83 and 81. The result is deterministic configuration behaviour, not evidence that current market RLUSD liquidity is poor.

### 5. Displayed-value provenance

See the Route data lineage table below. No displayed Send/Routes pricing or score is sourced from a live provider quote. The codebase has a multi-provider live FX service (`src/lib/fxFeed.ts:138-423`), but neither `app/send.tsx` nor `buildOrchestratedRouteQuotes` uses it.

The Nexus AI Edge Function can produce fresh commentary (`src/services/nexusAIService.ts:461-550`, `:589-623`), with deterministic fallback commentary on failure. It receives the already-scored route and does not change ranking. The Routes UI discards the returned source metadata and does not show whether commentary came from the Edge Function or fallback.

### 6. Exact XRPL/RLUSD conditions

**Generated:** When amount and recipient currency exist, the quote builder always creates all five templates, including RLUSD (`app/routes.tsx:372-382`; `src/lib/settlementOrchestrator.ts:215-348`). It does not restrict RLUSD by corridor.

**Eligible:** There is no pre-selection eligibility filter. `INSUFFICIENT` liquidity lowers the score but does not remove or block the route. Generated quotes also do not populate `orchestrationSafetyStatus`, although execution supports a `BLOCK` value (`src/services/execution/executionEngine.ts:440-464`).

**Ranked:** Every template is ranked by the formula above. RLUSD is favoured for speed and cost but heavily penalised when the simulated balance is below 50% of configured requirement.

**Selected:** On corporate Routes, the user selects a route explicitly. The green `Recommended` badge is only array position zero. On private Send, only cheapest plus safest are shown and the first (cheapest) defaults as selected (`app/consumer/send.tsx:149-162`).

**Executed:** The selected `RouteQuote` enters `runTransferExecution`; XRPL is called only when the active route's `rail === "HYBRID"` (`src/services/execution/executionEngine.ts:470-506`). The implementation submits XRP on XRPL testnet using a fixed demo amount, not RLUSD (`src/lib/xrplSettlement.ts:21-22`, `:42-79`).

**Skipped:** A fiat active route marks the bridge unnecessary. A failed primary route may also be replaced by the highest-scoring non-blocked alternative; if that failover is fiat, execution rebuilds the steps and skips XRPL (`src/services/execution/executionEngine.ts:124-133`, `:756-794`). Thus `Bridge settlement skipped` is expected for FastTrack/Partner/Economy/Reserve routes.

### 7. Missing live data and integrations

Before the ranking can truthfully be described as real-world dynamic orchestration, it needs:

1. Executable, expiring provider quotes for FX, fees, payout amount, ETA and availability.
2. Real Yapily institution/payment availability and funding constraints incorporated before route selection.
3. Real Airwallex corridor, beneficiary, transfer-method, fee, cutoff, capability and account-funding data incorporated into the candidate route.
4. Actual XRPL/RLUSD trustline balance, order-book/AMM depth, path quote, slippage, network fee and settlement finality in ranking. The bridge must transfer the stated asset rather than demo XRP.
5. Outcome-derived provider success, latency and failure rates from NexusPay execution records, segmented by provider, corridor, method and time window.
6. Provider health, maintenance windows, compliance eligibility, limits, bank reachability, holidays and payout cutoffs.
7. Durable quote IDs, freshness timestamps, expiry, source provenance and pre-execution revalidation.
8. One route plan that identifies funding provider, bridge asset/rail and final payout provider before approval and remains reconcilable through failover.

## Route data lineage table

| Displayed metric | Source | Calculation | Freshness | Confidence in lineage | Current truth label |
|---|---|---|---|---|---|
| Send preview rail | `app/send.tsx:getCorridorSignal` | Literal `GBP -> RLUSD -> currency` | App release | High | DEMO / hard-coded |
| Send preview confidence | Same | Literal by country | App release | High | DEMO / hard-coded |
| Send preview liquidity | Same | Literal wording | App release | High | DEMO / hard-coded |
| Send preview ETA | Same | Literal `Minutes` | App release | High | ESTIMATED / hard-coded |
| Send preview FX | Same | Literal by country | App release | High | DEMO / hard-coded |
| Send preview fee/saving | Same | Literal strings | App release | High | DEMO / hard-coded |
| Send preview recipient amount | `RoutePreviewCard` | amount * preview rate; fee not deducted | Current render | High | DERIVED from demo rate |
| Routes FX rate | `BASE_FX_RATES` | Literal by currency | App release | High | DEMO / hard-coded |
| Routes fee | Route template | max(minimum, amount*rate) | Quote generation | High | DERIVED from configured estimate |
| Routes recipient amount | Quote builder | (amount-fee)*configured FX | Quote generation | High | DERIVED from configured estimate |
| ETA | Route template | Literal range | App release | High | ESTIMATED / hard-coded |
| Speed/cost/reliability | Route template | Literal scores | App release | High | DEMO / hard-coded |
| Partner uptime | Route template | Literal percentage | App release | High | DEMO / hard-coded |
| Historical success | `PROVIDER_INTELLIGENCE` | Literal percentage | App release | High | SEEDED / hard-coded |
| Predicted failure risk | AI score module | Formula over configured profiles and penalties | Quote generation | High | DERIVED from demo inputs |
| Corridor health score | `CORRIDOR_HEALTH_PROFILES` | Normal/high-value literal selected by amount threshold | Quote generation | High | DERIVED from configured profile |
| RLUSD liquidity | Device SecureStore simulation | simulated balance / configured requirement | Last local simulation change; no timestamp | High | SIMULATED |
| Non-RLUSD liquidity | Quote builder | Fixed score 90 / `NOT_REQUIRED` | App release | High | DEMO / hard-coded |
| Corridor capacity | Treasury profile | Normal/high-value literal | Quote generation | High | DERIVED from configured profile |
| Partner capacity | Treasury profile | Literal selected by provider and GBP 900 threshold | Quote generation | High | DERIVED from configured profile |
| Rail capacity | Treasury module | Fiat fixed 84; RLUSD simulated coverage formula | Quote generation | High | DEMO or SIMULATED |
| Treasury/route-capacity score | Treasury module | 38/32/30 weighted formula minus pressure | Quote generation | High | DERIVED from demo/simulated inputs |
| Route AI score | AI score module | Weighted deterministic formula | Quote generation | High | DERIVED from demo/simulated inputs |
| AI confidence | AI score module | 65% route score + 35% configured intelligence - risk | Quote generation | High | DERIVED from demo/simulated inputs |
| AI explanation | `nexus-ai` Edge Function or local fallback | Commentary over existing route object | Per request | High | DERIVED or FALLBACK; UI does not distinguish |
| Treasury DB snapshot | `treasury_liquidity_snapshots` | Persists calculated profile output | At Routes screen evaluation | High | DATABASE-BACKED SIMULATED/DERIVED |
| Route operational event | `route_operational_events` | Derived from configured scores; healthy value includes `Math.random()` | At Routes screen evaluation | High | DATABASE-BACKED SIMULATED |
| Selected route history | `transfers.selected_route` JSON | Persists selected/active `RouteQuote` | Each execution checkpoint | High | DATABASE RECORD of configured quote |
| Yapily/XRPL/Airwallex execution evidence | Execution services/tables | Provider sandbox/testnet calls and persisted statuses | During execution | High | SANDBOX / TESTNET, not ranking input |

## Canonical route and lifecycle confirmations

- **One canonical object:** No across preview, ranking and execution. The preview is not a `RouteQuote`. Ranking and initial execution do share `RouteQuote` (`src/types/transfer.ts:94-175`), but last-leg provider resolution is separate and failover creates a distinct `activeRoute`.
- **Displayed route always executed:** No. The preview is never selected; the user can choose another ranked route; runtime failover can change the selected route. Execution persists the active route into `transfers.selected_route` (`src/services/execution/executionEngine.ts:339-383`).
- **Repeat payment:** Recalculated. Repeat actions pass amount/recipient/funding parameters back to Send, not the prior route (`app/consumer/index.tsx:38-56`; `app/consumer/transfers.tsx:65-84`). Send then creates a new transfer ID and the quote builder runs again. Existing evidence is not reused.
- **Truth labels:** Inadequate. Send and Routes do not display provenance badges for quote metrics. `AI score` is shown for deterministic configuration (`app/routes.tsx:180-187`). AI Edge Function versus fallback source is hidden. Execution views can label Yapily/Airwallex as sandbox, but that does not label the route preview or ranking inputs.

## Contradictions found

1. **RLUSD preview versus ranking:** Send says `Best route` and displays RLUSD for every corridor; Routes independently ranks RLUSD and can place it last at 40.
2. **Different economics:** Malaysia preview rate is 5.92 with a fixed GBP 2.85 fee; Routes uses rate 5.85 and route-specific percentage fees. Preview recipient amount ignores its displayed fee.
3. **RLUSD label versus asset executed:** The quote says RLUSD; bridge execution sends demo-calculated XRP on testnet.
4. **Template provider versus actual provider:** Ranked names such as FastTrack and Partner Liquidity are not payout adapters. Airwallex is selected later by another configured resolver (`src/services/partnerCapabilityResolver.ts:84-128`).
5. **Recommended versus selected:** Routes marks rank one recommended but corporate execution requires user selection; private Send defaults to cheapest, not rank one.
6. **Live FX available but unused:** The live/fallback FX service exists, while route economics use compile-time rates.
7. **Database-backed versus live:** Treasury and operational rows are persisted, but originate from static, simulated and sometimes random calculations.
8. **Context claims versus implementation:** `buildRouteIntelligenceContext` comments claim live FX (`src/services/intelligence/contextBuilder.ts:154-163`), but the function reuses `route.fxRate`, hard-codes market conditions as `OPEN`, and does not call `fxFeed` (`:164-244`).

## Risks

- **Investor-demo credibility:** `Best route`, `AI score`, historical performance and capacity can be interpreted as measured intelligence although they are configured assumptions.
- **Customer transparency:** A user can approve economics and a rail preview that differ from the ranked quote and eventual execution provider.
- **Execution mismatch:** The selected template does not encode the final payout adapter, and failover can change the route after selection without a canonical before/after route plan.
- **Economic risk:** Static FX, fees and ETA cannot support an executable quote, price guarantee, or defensible savings claim.
- **Asset-description risk:** Calling the bridge RLUSD while sending XRP testnet evidence is materially misleading.
- **Operational risk:** Simulated capacity records can influence OCC/AI narrative after being persisted as database records.

## Recommendations

1. **Establish one canonical route source of truth.** Build a versioned route plan containing funding leg, bridge leg, payout leg, provider quote IDs, economics, provenance and expiry. Send preview, Routes, approval, execution and tracking should read that object.
2. **Make preview, ranking and execution consistent.** Generate routes before showing `Best route`; persist the selected route version; revalidate before execution; record explicit failover from selected to active route.
3. **Apply truthful labels at field level.** Use `LIVE`, `SANDBOX`, `TESTNET`, `DERIVED`, `ESTIMATED`, `SIMULATED`, `DEMO`, `FALLBACK`, and `STALE`. Database persistence must not upgrade provenance.
4. **Use XRPL only when it genuinely improves the route.** Require a real RLUSD path quote, sufficient spendable balance/depth, acceptable slippage and network fee, supported destination payout, lower total cost or better SLA, and successful preflight. Execute the asset shown.
5. **Separate deterministic policy from AI.** Rename the current score to a rules-based route score. Let AI explain evidence but never obscure its source or silently substitute fallback text.
6. **Incorporate provider evidence.** Rank only eligible providers with current executable quotes, health, limits, corridor coverage, beneficiary requirements and cutoffs. Derive historical metrics from completed NexusPay records.
7. **Add a later route-cost comparison view.** Compare total delivered amount, provider fee, FX spread, bridge/network cost, SLA, expiry, risk and provenance on like-for-like terms after the canonical route engine exists.

## Audit disposition

**Result:** The contradiction is confirmed. Route preview, ranking and execution are not governed by one canonical route decision. Current route ranking is deterministic and partly input-responsive, but predominantly configured/demo intelligence. No application remediation was performed in this audit.
