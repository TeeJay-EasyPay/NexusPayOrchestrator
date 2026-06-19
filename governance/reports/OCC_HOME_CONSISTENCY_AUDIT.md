# Executive Summary

The Home Dashboard and Operations Command Centre currently disagree because they are not using a shared health source of truth.

Home displays optimistic executive-facing indicators from local UI constants, FX-derived corridor heuristics, mock payment methods, and AI fallback telemetry. OCC displays operational health from a separate OCC model that maps disabled realtime monitoring, absent AI summaries, simulated route events, simulated treasury snapshots, and missing feed data into `DEGRADED` or `OFFLINE`.

Founder conclusion: the contradiction is real. Home is presenting several health labels as if they are platform-wide operational status, while OCC is presenting diagnostic service-state status. Neither surface has a canonical platform health contract, provenance-aware "no data" state, or shared freshness policy.

# Scope

Audited surfaces:
- Home Dashboard: `app/index.tsx`
- Operations Command Centre V2: `app/operations-v2.tsx`, `src/hooks/useOperationsCommandCentre.ts`, `src/utils/operationsCommandCentre.ts`, and `src/components/operations-v2/*`

Relevant supporting services:
- `src/lib/fxFeed.ts`
- `src/lib/corridorHealth.ts`
- `src/services/liveIntelligenceFeedService.ts`
- `src/services/nexusAIService.ts`
- `src/services/execution/executionPersistenceService.ts`
- `src/services/treasuryIntelligenceService.ts`
- `src/services/routeOperationalEventService.ts`
- `src/state/PaymentMethodsContext.tsx`
- `src/state/TransferContext.tsx`

# Health Indicator Matrix

| Indicator | Screen | Source Component | Source / Table / API | Calculation | Status Type |
| --- | --- | --- | --- | --- | --- |
| Markets Open | Home | `StatusBadge` in `app/index.tsx` | None | Literal label rendered unconditionally when Home AI is enabled | HARDCODED |
| Liquidity Strong | Home | `StatusBadge` in `app/index.tsx` | None | Literal label rendered unconditionally when Home AI is enabled | HARDCODED |
| Network Healthy | Home | `StatusBadge` in `app/index.tsx` | None | Literal label rendered unconditionally when Home AI is enabled | HARDCODED |
| Treasury Capacity: Healthy/Watch/Syncing | Home | `app/index.tsx` | `fetchCorridorFxRates`, `buildCorridorHealth`; external FX APIs with mock fallback | `Syncing` while loading; `Healthy` if `corridorHealth.length > 0`; else `Watch` | DERIVED / FALLBACK |
| Liquidity Coverage: x/y | Home | `app/index.tsx` | `buildCorridorHealth` from FX rates | Count corridors where `status !== "Restricted"` over corridor count; `--` if no corridors | DERIVED / FALLBACK |
| Recommended corridor liquidity | Home | `buildRecommendedCorridors` in `app/index.tsx` | `buildCorridorHealth`; static USD synthetic corridor | `Excellent -> Strong`; otherwise `Healthy`; USD corridor always `Strong` | DERIVED / HARDCODED |
| Treasury Capacity 91% | Home | `app/index.tsx` | None | Static array value `{ value: 91, tone: "Healthy" }` | HARDCODED |
| Liquidity Coverage 98% | Home | `app/index.tsx` | None | Static array value `{ value: 98, tone: "Excellent" }` | HARDCODED |
| XRPL Network Health 99.98% | Home | `app/index.tsx` | None | Static array value `{ value: 99.98, tone: "Optimal" }` | HARDCODED |
| Home AI treasury status | Home | `generateDashboardSummary` input in `app/index.tsx` | Home local state | `Healthy` if corridor health exists, `Watch` otherwise, `Syncing` while loading | DERIVED / FALLBACK |
| Home AI liquidity status | Home | `generateDashboardSummary` input in `app/index.tsx` | Home local state | `Strong` if coverage is not `--`; otherwise `Unknown` | DERIVED / FALLBACK |
| Home AI network health | Home | `generateDashboardSummary` input in `app/index.tsx` | Home local state | `Healthy` if all corridor statuses are not `Restricted`; otherwise `Watch` | DERIVED / FALLBACK |
| Home AI market status | Home | `generateDashboardSummary` input in `app/index.tsx` | None | Literal payload value `Operational` | HARDCODED |
| Home AI fallback summary | Home | `nexusAIService.buildDashboardFallback` | Supabase Edge Function attempted; fallback local template | If Edge Function fails, template says rails operational using Home telemetry | FALLBACK |
| Platform Status | OCC | `MissionControlCard`, `OperationalHealthCard` | `useOperationsCommandCentre`; intended `execution_sessions` realtime | `HEALTHY` only if `realtimeStatus === "Live"`; diagnostic mode yields `DEGRADED` | DERIVED / HARDCODED DIAGNOSTIC |
| Network Status | OCC | `MissionControlCard`, `OperationalHealthCard` | `route_operational_events` | Critical alerts > 1 -> `OFFLINE`; warnings > 0 -> `DEGRADED`; else `HEALTHY` | DERIVED from simulated records |
| Liquidity Status | OCC | `MissionControlCard`, `OperationalHealthCard` | `treasury_liquidity_snapshots` | Treasury pressure `CRITICAL -> OFFLINE`, `HIGH -> DEGRADED`, otherwise `HEALTHY` | DERIVED from simulated records |
| Markets Status | OCC | `MissionControlCard`, `OperationalHealthCard` | `liveIntelligenceFeedService.getMarketHoursFeeds` | One or more fixed markets open -> `HEALTHY`; zero open -> `DEGRADED` | DERIVED / PARTIAL |
| AI Monitoring Status | OCC | `MissionControlCard`, `OperationalHealthCard` | Intended `nexus-ai`; OCC summary currently absent unless enabled and returned | Enabled + summary -> `HEALTHY`; enabled + loading -> `DEGRADED`; enabled + no summary -> `OFFLINE`; disabled -> `DEGRADED` | DERIVED / FALLBACK |
| FX Feed Service | OCC | `OperationalHealthCard` | Frankfurter API through `getLiveIntelligenceFeeds` | FX feed count > 0 -> `HEALTHY`; otherwise `OFFLINE` | LIVE / NO DATA MISLABEL |
| Notification Service | OCC | `OperationalHealthCard` | `route_operational_events` proxy | Critical alert count > 2 -> `DEGRADED`; else `HEALTHY` | DERIVED ASSUMPTION |
| Overall Operational Health | OCC | `OperationalHealthCard` | OCC service health array | Any `OFFLINE` -> service issue; any `DEGRADED` -> degraded; else operational | DERIVED |

# Evidence

## Home Dashboard

- `app/index.tsx:626-628` renders `Markets Open`, `Liquidity Strong`, and `Network Healthy` as fixed `StatusBadge` labels. These labels do not read any service, table, API, hook health state, or OCC telemetry.
- `app/index.tsx:341-376` loads Home dashboard data from FX feeds only: `fetchCorridorFxRates()` and `fetchFxRate("GBP", "USD")`; on failure it clears corridor and FX state.
- `app/index.tsx:348-358` creates a USD fallback rate with `source: "MOCK_FALLBACK"` and `providerStatus: "Protected fallback pricing"` when GBP/USD live lookup fails.
- `app/index.tsx:429-455` constructs Home AI telemetry locally: treasury becomes `Healthy` if any corridor health exists; liquidity becomes `Strong` if corridor coverage exists; market status is hardcoded to `Operational`.
- `app/index.tsx:656-659` displays Treasury Capacity and Liquidity Coverage from Home corridor health presence/count, not from treasury balances, treasury snapshots, provider capacity, or OCC health.
- `app/index.tsx:825-829` renders static values: Treasury Capacity `91%`, Liquidity Coverage `98%`, and XRPL Network Health `99.98%`.
- `src/lib/corridorHealth.ts` calculates corridor scores from FX provider confidence, static liquidity scores, static partner health values, and volatility heuristics. It is not a settlement network, treasury balance, or provider uptime monitor.
- `src/lib/fxFeed.ts` has live FX providers and `MOCK_RATES`; missing API keys for Open Exchange Rates, Fixer, and CurrencyLayer mean those providers throw unless configured.
- `src/state/PaymentMethodsContext.tsx` builds Home funding source counts from `mockPaymentMethods`; it persists the selected primary method to AsyncStorage but does not validate real funding rails.
- `src/services/nexusAIService.ts:195-215` builds dashboard fallback text from Home telemetry, including lines that can state rails remain operational.
- `src/services/nexusAIService.ts:481-550` attempts the `nexus-ai` Edge Function and returns fallback data when unavailable.

## Operations Command Centre

- `src/hooks/useOperationsCommandCentre.ts:153-160` loads OCC telemetry from `treasury_liquidity_snapshots`, `route_operational_events`, recoverable and recent `execution_sessions`, `transfers`, and `getLiveIntelligenceFeeds()`.
- `src/hooks/useOperationsCommandCentre.ts:212-219` explicitly disables realtime subscription and sets `realtimeStatus` to `Diagnostic Mode`.
- `src/utils/operationsCommandCentre.ts:453-469` maps OCC health: critical alerts can make Network `OFFLINE`; critical treasury pressure can make Liquidity `OFFLINE`; absent FX feeds become `OFFLINE`; absent AI summary while enabled becomes `OFFLINE`; realtime not `Live` becomes Platform `DEGRADED`.
- `src/utils/operationsCommandCentre.ts:491-523` copies those service health states into Mission Control chips for Platform, Network, Liquidity, Markets, and AI.
- `src/services/routeOperationalEventService.ts:20-21` allows route events with severity `DEGRADED` or `FAILOVER` and status `SIMULATED`; OCC network health does not distinguish simulated events before using them for health.
- `src/services/treasuryIntelligenceService.ts:179-201` loads recent treasury snapshots from `treasury_liquidity_snapshots`; earlier provenance work identified these snapshots as generated by static treasury intelligence profiles rather than live balances.
- `src/services/liveIntelligenceFeedService.ts:91-319` returns hard-coded treasury feed rows with `health: "live"`.
- `src/services/liveIntelligenceFeedService.ts:49-59` calculates market open/closed from fixed local-hour rules only.

# Why Home and OCC Disagree

1. Home uses optimistic presentation labels; OCC uses diagnostic service-state mappings.
Home's top badges are static strings. OCC derives status from a health builder that treats disabled realtime, absent AI output, critical route events, and missing FX data as degraded or offline.

2. Home market health is not OCC market health.
Home displays `Markets Open` unconditionally and sends `marketStatus: "Operational"` to AI. OCC computes market health from London, New York, Singapore, and Tokyo local hours. When no fixed market is open, OCC becomes `DEGRADED`; Home still says `Markets Open`.

3. Home liquidity is FX/corridor heuristic liquidity; OCC liquidity is treasury snapshot pressure.
Home liquidity comes from `corridorHealth.length`, corridor status counts, static liquidity scores, and static 98% card value. OCC liquidity comes from `treasury_liquidity_snapshots` pressure. These are different concepts with different inputs.

4. Home network health is corridor recommendation confidence; OCC network health is route operational alert pressure.
Home says network is healthy if FX-derived corridor statuses are not `Restricted`. OCC says network is offline if more than one route event maps to critical. Home does not read `route_operational_events`.

5. Home AI and OCC AI have separate settings and fallback behavior.
Home uses `home_enabled` and can call/fallback through `generateDashboardSummary`. OCC uses `corridor_enabled` and currently has no active mission summary unless the OCC path produces one. OCC may therefore show AI offline while Home says `Generated by Nexus AI` or displays fallback AI summary text.

6. Missing data is interpreted differently.
Home generally treats missing data as benign (`Watch`, `--`, fallback, or static healthy labels). OCC often treats missing/disabled telemetry as `DEGRADED` or `OFFLINE`.

# Missing Data Shown As OFFLINE

| Case | Location | Current Behavior | Why It Is Incorrect |
| --- | --- | --- | --- |
| FX feed count is zero | OCC `FX Feed Service` | Shows `OFFLINE` | Zero fetched FX rows may mean provider failure, network failure, auth/config failure, timeout, or no data. It is not proven platform offline. |
| AI enabled but no mission summary | OCC `AI Monitoring Status` | Shows `OFFLINE` | Absence of a returned summary is no-data/fallback state unless the AI service health endpoint confirms outage. |
| Network critical alert count > 1 | OCC `Network Status` | Shows `OFFLINE` | Alerts may be simulated route operational events; this does not prove the network is offline. |
| Treasury pressure critical | OCC `Liquidity Status` | Shows `OFFLINE` | Treasury pressure from simulated/static snapshot logic does not prove liquidity systems are offline. |

# Missing Telemetry Shown As DEGRADED

| Case | Location | Current Behavior | Why It Is Incorrect |
| --- | --- | --- | --- |
| Realtime disabled | OCC `Platform Status` | Shows `DEGRADED` | This is a diagnostic configuration state, not measured platform degradation. It should be `Diagnostic Mode` or `No realtime telemetry`. |
| AI disabled | OCC `AI Monitoring Status` | Shows `DEGRADED` | A disabled feature flag is not operational degradation. |
| No markets open by fixed local-hour heuristic | OCC `Markets Status` | Shows `DEGRADED` | Closed market windows are expected operating schedule, not degradation. |
| Home no corridor health | Home AI telemetry | Sends `Watch` and `Unknown` | This is closer than OCC, but top Home badges still show healthy/open states. |

# Simulated Data Presented As Real

| Case | Location | Current Presentation | Reality |
| --- | --- | --- | --- |
| Home `Liquidity Strong` | Home top badge | Looks like live liquidity status | Hardcoded UI label. |
| Home `Network Healthy` | Home top badge | Looks like live network status | Hardcoded UI label. |
| Home `Treasury Capacity 91%` | Home treasury card | Looks like measured treasury capacity | Static literal value. |
| Home `Liquidity Coverage 98%` | Home treasury card | Looks like measured liquidity coverage | Static literal value. |
| Home `XRPL Network Health 99.98%` | Home treasury card | Looks like live network uptime | Static literal value. |
| Home recommended corridor liquidity | Home corridor recommendations | Looks like operational corridor liquidity | Derived from FX feed plus static liquidity/partner scores. |
| OCC route alerts | OCC Network/Alerts | Looks like operational route health | Rows may have `status: "SIMULATED"`. |
| OCC treasury pressure/capacity | OCC Liquidity/Treasury | Looks like operational treasury health | Derived from persisted snapshots generated by static treasury intelligence profiles. |
| Live treasury feeds | Live intelligence / OCC feed model | Marked `health: "live"` | Hard-coded rows in `getLiveTreasuryFeeds()`. |

# Single Source Of Truth Recommendation

Create a canonical `platform_health_snapshots` model and a single health service consumed by both Home and OCC.

Recommended health domains:
- Platform Health
- Network Health
- Liquidity Health
- Treasury Health
- AI Health
- Market Health

Each domain snapshot should include:
- `domain`
- `status`: `HEALTHY`, `DEGRADED`, `OFFLINE`, `NO_DATA`, `DIAGNOSTIC`, `DISABLED`
- `provenance`: `LIVE`, `DERIVED`, `SIMULATED`, `MOCK`, `FALLBACK`, `NO_DATA`
- `confidence`: `HIGH`, `MEDIUM`, `LOW`
- `source_service`
- `source_table`
- `source_record_ids`
- `calculation_version`
- `input_freshness_seconds`
- `last_success_at`
- `last_checked_at`
- `reason`
- `operator_label`

Recommended ownership:
- Platform Health: execution telemetry, realtime subscription state, API heartbeat, app backend heartbeat.
- Network Health: route operational events, provider health checks, payment rail status, settlement execution outcomes.
- Liquidity Health: provider balance APIs, prefunding/nostro balances, corridor limits, settlement obligations.
- Treasury Health: treasury snapshots only after backed by real balances and limits; until then mark simulated.
- AI Health: `nexus-ai` Edge Function health, last successful generation, fallback state, disabled state.
- Market Health: banking calendars, payment scheme operating windows, partner cutoffs, holidays, and FX provider availability.

Home should read the same health summary as OCC but render a founder-friendly compressed view. OCC should render the full operational detail and evidence.

# UI Recommendations

1. Replace ambiguous healthy/offline labels with provenance-aware states:
- `Live`
- `Derived`
- `Simulated`
- `Fallback`
- `No data`
- `Diagnostic`
- `Disabled`

2. Separate operational condition from telemetry availability:
- `Network: No live telemetry`
- `Realtime: Diagnostic Mode`
- `AI: Fallback summary`
- `Markets: Closed window`

3. Do not show static green health badges unless backed by a current source snapshot.
Home should not display `Markets Open`, `Liquidity Strong`, or `Network Healthy` without canonical health evidence.

4. Add consistent source badges to Home, matching OCC provenance badges.
Home currently lacks the data source toggle and provenance labels added to OCC.

5. Use neutral labels for unavailable data.
Prefer `No data available`, `Telemetry unavailable`, or `Diagnostic mode` over `Offline` unless there is a confirmed outage.

6. Make simulated/demo intelligence visually explicit.
Any hardcoded treasury capacity, mock payment method, synthetic corridor, or static treasury feed should carry `SIMULATED`, `MOCK`, or `FALLBACK`.

# Remediation Priority

Immediate:
- Stop rendering hardcoded Home health badges as platform truth.
- Replace Home static treasury/network percentages with `Simulated` or `No data` labels until canonical health exists.
- Change OCC `OFFLINE` mappings for missing AI/FX data to `NO DATA` or `FALLBACK`.
- Change OCC realtime platform state from degraded health to `Diagnostic Mode`.

Near term:
- Build shared health calculation utility used by Home and OCC.
- Add provenance metadata to Home health indicators.
- Persist health snapshots with calculation version and freshness.

Strategic:
- Integrate real provider health checks, treasury balances, payment rail telemetry, banking calendars, and AI Edge Function health into the canonical health service.
- Deprecate separate Home and OCC health logic once both screens consume the shared model.

# Founder Briefing

The Home Dashboard is currently presenting a more optimistic executive/demo interpretation of platform health, while the OCC is presenting a diagnostic operational interpretation. The contradiction is caused by duplicated, independent health logic and by Home displaying hardcoded or fallback health language as if it were live platform state.

The platform should be described as **partially simulated operational intelligence with inconsistent health presentation** until Home and OCC are unified behind a single health source of truth.
