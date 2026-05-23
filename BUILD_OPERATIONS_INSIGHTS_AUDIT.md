# buildOperationsInsights() Execution & Crash Analysis

**Report Date:** May 23, 2026  
**Focus:** Complete audit of `buildOperationsInsights()` function execution path, data flow, and crash vulnerability points.

---

## 1. FUNCTION SIGNATURE & INPUT

### Location
- **File:** `src/utils/operationsCommandCentre.ts`
- **Line:** 507
- **Signature:** `export function buildOperationsInsights(params: OperationsLiveState): OperationsInsights`

### Input Parameter Type: OperationsLiveState

| Field | Type | Source Service | Nullable | Crash Risk |
|---|---|---|---|---|
| `snapshots` | `TreasuryLiquiditySnapshotRow[]` | `loadRecentTreasurySnapshots(60)` | No | High |
| `events` | `RouteOperationalEventRow[]` | `loadRecentRouteOperationalEvents(60)` | No | Low |
| `transfers` | `Transfer[]` | `loadCompletedTransfers()` | No | **CRITICAL** |
| `sessions` | `PersistedExecutionSession[]` | `loadRecoverableExecutionSessions()` | No | Medium |
| `feeds` | `LiveIntelligenceFeeds \| null` | `getLiveIntelligenceFeeds()` | Yes | Low |
| `missionSummary` | `IntelligenceReportResult \| null` | Nexus AI service | Yes | Low |
| `missionSummaryLoading` | `boolean` | AI hook state | No | No |
| `missionSummaryEnabled` | `boolean` | AI hook state | No | No |
| `realtimeStatus` | `string` | Hook state | No | Low |

### Data Flow Origin

```
Hook (useOperationsCommandCentre.ts, line 156)
  └─ loadTelemetry() callback
     └─ Promise.all([
        loadRecentTreasurySnapshots(60),
        loadRecentRouteOperationalEvents(60),
        loadRecoverableExecutionSessions(),
        loadCompletedTransfers(),  ← CRASH SOURCE: missing createdAt
        getLiveIntelligenceFeeds()
     ])
     └─ setState() updates
        └─ Memo dependencies change
           └─ insights useMemo (line 183)
              └─ buildOperationsInsights(params)  ← CRASH POINT
```

---

## 2. COMPLETE EXECUTION TRACE

### Execution Order with Helper Calls

| Step | Line | Helper Function | Input | Synchronous | Returns | Crash Risk |
|---|---|---|---|---|---|---|
| **1** | 508 | `buildCorridorRows(params.snapshots)` | `TreasuryLiquiditySnapshotRow[]` | Yes | `OperationsCorridorRow[]` | **HIGH** |
| **2** | 509 | `buildActiveTransfers(params.sessions, params.transfers)` | `PersistedExecutionSession[], Transfer[]` | Yes | `OperationsTransferRow[]` | Medium |
| **3** | 510 | `buildTreasurySummary(params.snapshots, params.transfers)` | `TreasuryLiquiditySnapshotRow[], Transfer[]` | Yes | `OperationsTreasurySummary` | Medium |
| **4** | 511 | `buildKpis({transfers, sessions, snapshots, events})` | All telemetry | Yes | `{items[], successRateAnomaly?}` | **CRITICAL** |
| **5** | 517 | `buildServiceHealth({alerts, treasuryPressure, ...})` | Events, pressure, counts, AI state, realtime status | Yes | `OperationsServiceHealth[]` | Low |
| **6** | 527 | `buildMissionControlStatus({kpis, treasurySummary, serviceHealth, ...})` | KPIs, summary, health, AI state | Yes | `OperationsMissionStatus` | Low |
| **7** | 535 | `Array.from(new Set(params.events.map((event) => mapEventToAlertFilter(event))))` | `RouteOperationalEventRow[]` | Yes | `OperationsAlertFilter[]` | Low |
| **8** | 537 | Return assembled object | All computed values | Yes | `OperationsInsights` | Depends on steps 1-6 |

---

## 3. HELPER FUNCTION CALL HIERARCHY

```
buildOperationsInsights()
│
├─ buildCorridorRows(snapshots)
│  ├─ Group snapshots by corridor
│  ├─ getOverallOperationalPressure(latest)
│  │  ├─ getPressureWeight(pressure_string)
│  │  └─ getPressureFromWeight(weight)
│  └─ Return sorted OperationsCorridorRow[]
│
├─ buildActiveTransfers(sessions, transfers)
│  ├─ toTransferMap(transfers)  [Creates Map<id, Transfer>]
│  ├─ Filter sessions not terminal
│  ├─ For each session: lookup transfer in map
│  └─ Return sorted OperationsTransferRow[]
│
├─ buildTreasurySummary(snapshots, transfers)
│  ├─ Length check: if (snapshots.length === 0)
│  ├─ Group transfers by senderCurrency
│  ├─ getOverallOperationalPressure(latest)
│  └─ Return OperationsTreasurySummary
│
├─ buildKpis({transfers, sessions, snapshots, events})
│  ├─ Calculate time windows (24h, prev 24h)
│  ├─ Filter transfers by createdAt  ← CRASH HERE (line 283)
│  ├─ Filter sessions by updated_at
│  ├─ Calculate success rate
│  ├─ Calculate settlement time
│  ├─ Get capacity trends
│  ├─ Filter alerts
│  ├─ mapEventToAlertFilter(event) [3+ calls]
│  ├─ Build KPI items array
│  └─ Return {items[], successRateAnomaly?}
│
├─ buildServiceHealth({alerts, treasuryPressure, fxFeedCount, ...})
│  ├─ Filter alerts
│  ├─ mapEventToAlertFilter() [2 calls]
│  ├─ Determine status from pressure/counts
│  └─ Return OperationsServiceHealth[]
│
├─ buildMissionControlStatus({kpis, treasurySummary, serviceHealth, ...})
│  ├─ Find status in serviceHealth array [5x .find()]
│  ├─ Build attentionSummary string
│  ├─ getMissionTone(status) [5 calls]
│  └─ Return OperationsMissionStatus
│
└─ Assemble alertOptions from events
   └─ mapEventToAlertFilter(event) [in .map()]
```

---

## 4. PROPERTY ACCESS AUDIT

### CRITICAL: Lines 283-287 in buildKpis

```typescript
const transfersCurrent = params.transfers.filter((item) => item.createdAt >= currentStart);
const transfersPrevious = params.transfers.filter(
  (item) => item.createdAt >= previousStart && item.createdAt < currentStart
);
```

**Risk Level:** 🔴 **CRITICAL**

**Issue:** Direct property access to `item.createdAt` without:
- Null check
- Optional chaining (`?.`)
- Fallback (`??`)
- Type guard

**Crash Condition:** If any `Transfer` object from `loadCompletedTransfers()` has:
- `createdAt: undefined`
- `createdAt: null`
- Missing `createdAt` property

**Error Type:** `TypeError: undefined >= number` or equivalent

---

### HIGH RISK: buildCorridorRows Property Accesses

| Property | Line | Fallback | Risk |
|---|---|---|---|
| `item.corridor` | 163, 168 | None | **HIGH** - used as Map key; null corridor creates invalid Map entry |
| `item.created_at` | 171 | None | **HIGH** - passed to `new Date()` → Invalid Date → NaN |
| `item.treasury_score` | 173, 186 | None | **HIGH** - subtraction with undefined produces NaN |
| `item.corridor_capacity_score` | 175-177 | None | **HIGH** - division by 3 with undefined produces NaN |
| `item.partner_capacity_score` | 175-177 | None | **HIGH** - same as above |
| `item.rail_capacity_score` | 175-177 | None | **HIGH** - same as above |
| `item.corridor_pressure` | 115 | None | **MEDIUM** - passed to getPressureWeight() |
| `item.partner_pressure` | 116 | None | **MEDIUM** |
| `item.rail_pressure` | 117 | None | **MEDIUM** |

---

### MEDIUM RISK: buildActiveTransfers Property Accesses

| Property | Expression | Fallback | Risk |
|---|---|---|---|
| `item.state` | `.filter((item) => item.state !== ...)` | None | Low - comparison works even with undefined |
| `session.transfer_id` | `transferMap.get(session.transfer_id)` | Returns undefined if not found | **Medium** - undefined transfer handled with ?? 0 |
| `session.snapshot?.activeRoute` | Optional chaining | Yes | Low |
| `transfer?.senderAmount` | Optional chaining | ?? 0 | Low |
| `transfer?.senderCurrency` | Optional chaining | ?? "GBP" | Low |
| `route?.treasuryCorridor` | Optional chaining | ?? "Unknown corridor" | Low |
| `route?.estimatedTime` | Optional chaining | ?? "Pending" | Low |
| `route?.id` | Optional chaining | ?? "--" | Low |
| `session.updated_at ?? session.created_at` | Nullish coalescing | ?? new Date().toISOString() | Low |

---

### SAFE: buildTreasurySummary Property Accesses

```typescript
if (snapshots.length === 0) {
  // Handles empty array safely
  return {...};
}

const latest = snapshots[0];  // Only accessed if length > 0
const utilization = 100 - Math.round(
  (latest.corridor_capacity_score + latest.partner_capacity_score + latest.rail_capacity_score) / 3
);
```

**Pattern:** Explicit length check before property access. **SAFE.**

---

### SAFE: buildServiceHealth Property Accesses

```typescript
const platformStatus =
  params.serviceHealth.find((item) => item.label === "Platform Status")?.status ?? "DEGRADED";
```

**Pattern:** `.find()?.status ?? "DEFAULTVALUE"` with fallback. **SAFE.**

---

### SAFE: buildMissionControlStatus Property Accesses

Same pattern as buildServiceHealth. All `.find()?.status ?? "DEGRADED"`. **SAFE.**

---

## 5. ARRAY OPERATIONS REVIEW

### Step 1: buildCorridorRows

| Operation | Code | Risk |
|---|---|---|
| **Map creation** | `new Map<string, TreasuryLiquiditySnapshotRow[]>()` | Low |
| **forEach** | `snapshots.forEach((item) => { ... })` | **HIGH** - if item.corridor is null, invalid key |
| **Map.get()** | `grouped.get(item.corridor) ?? []` | **HIGH** - depends on item.corridor being valid |
| **Map.set()** | `grouped.set(item.corridor, next)` | **HIGH** - null key creates invalid entry |
| **Array.from()** | `Array.from(grouped.entries())` | Depends on Map validity |
| **map()** | `.map(([corridor, rows]) => {...})` | **HIGH** - row property accesses can fail |
| **sort()** (by date) | `.sort((a, b) => new Date(...).getTime() - ...)` | **HIGH** - if created_at undefined, NaN comparison |
| **sort()** (by score) | `.sort((a, b) => b.score - a.score)` | **HIGH** - if treasury_score undefined, NaN |

---

### Step 4: buildKpis

| Operation | Code | Risk |
|---|---|---|
| **filter()** | `params.transfers.filter((item) => item.createdAt >= ...)` | **🔴 CRITICAL - no null check** |
| **filter()** | `params.sessions.filter((item) => new Date(item.updated_at ?? 0).getTime() >= ...)` | Low - has fallback ?? 0 |
| **reduce()** | `items.reduce((sum, item) => sum + ..., 0)` | Low - fallback prevents error |
| **map()** | Building KPI items | Low - all inputs already validated |
| **Set()** | `new Set(params.events.map(...))` | Low - mapEventToAlertFilter handles all values |
| **Array.from()** | `Array.from(new Set(...))` | Low - safe after Set construction |

---

## 6. NULL/UNDEFINED RISK ANALYSIS

### Crash Condition Tree

```
If loadCompletedTransfers() returns Transfer[] where any item has:
  ├─ createdAt === undefined  ← TRIGGERS CRASH
  │  └─ buildKpis() line 283: item.createdAt >= currentStart
  │     └─ TypeError: Cannot compare undefined >= number
  │        └─ insights memo throws
  │           └─ Component rerender blocked
  │              └─ App crashes
  │
  ├─ createdAt === null
  │  └─ Same as above
  │
  └─ createdAt not a number type
     └─ NaN >= number always false
        └─ Silently filters wrong transfers (logical bug, not crash)
```

### Other Vulnerable Paths

**Path 2: buildCorridorRows with null corridor**
```
If loadRecentTreasurySnapshots() returns snapshot with:
  ├─ corridor === null
  │  └─ Map key becomes null
  │     └─ grouped.set(null, [...])
  │        └─ Array.from(grouped.entries()) includes [null, [...]]
  │           └─ Later access to corridor string fails
```

**Path 3: buildCorridorRows with missing created_at**
```
If snapshot.created_at === undefined:
  └─ new Date(undefined) → Invalid Date
     └─ .getTime() → NaN
        └─ NaN - NaN = NaN
           └─ sort() places in random order
              └─ .sort((a,b) => b.score - a.score) on NaN produces wrong results
```

---

## 7. CRASH CANDIDATE RANKING

### Tier 1: DEFINITE CRASH (Will throw immediately)

| Rank | Location | Line | Condition | Error Type | Impact |
|---|---|---|---|---|---|
| **#1** | `buildKpis()` | **283** | Any `Transfer.createdAt === undefined` | `TypeError` | **Blocks entire memo, app crash** |
| **#2** | `buildKpis()` | **287** | Same as #1, second filter | `TypeError` | **Same as #1** |
| **#3** | `buildCorridorRows()` | 171 | Any `snapshot.created_at === undefined` | Produces NaN | **Silent: wrong sort order** |

---

### Tier 2: LIKELY CRASH (High probability with real data)

| Rank | Location | Line | Condition | Error Type | Impact |
|---|---|---|---|---|---|
| **#4** | `buildCorridorRows()` | 163 | Any `snapshot.corridor === null` | Invalid Map key | **Cascading property accesses fail** |
| **#5** | `buildCorridorRows()` | 175-177 | Any capacity score undefined | NaN in calculation | **Produces invalid KPI values** |
| **#6** | `buildCorridorRows()` | 173 | `treasury_score === undefined` | NaN subtraction | **Produces NaN trend** |

---

### Tier 3: MEDIUM RISK (Less likely but possible)

| Rank | Location | Condition | Impact |
|---|---|---|---|
| **#7** | `buildKpis()` | `params.sessions` with missing `updated_at` | Handled by ?? 0, safe |
| **#8** | `buildActiveTransfers()` | Transfer not in map | Handled by ??, safe |
| **#9** | `buildTreasurySummary()` | Empty snapshots array | Explicit check at line 233, safe |
| **#10** | `buildServiceHealth()` | Status not found in serviceHealth array | Handled by ?? "DEGRADED", safe |

---

## 8. EXECUTION TIME & DEPENDENCIES

### Memo Execution Path

```
Hook render starts (line 138)
  ├─ All state variables initialized
  ├─ useNexusAIScreenSetting() hook called
  ├─ Memo dependencies calculated:
  │  ├─ events (from state)
  │  ├─ feeds (from state)
  │  ├─ missionSummary (from state)
  │  ├─ missionSummaryLoading (from state)
  │  ├─ operationsAIEnabled (from hook)
  │  ├─ realtimeStatus (from state)
  │  ├─ sessions (from state)
  │  ├─ snapshots (from state)
  │  └─ transfers (from state)
  │
  └─ insights useMemo [line 183] runs if any dependency changed
     └─ buildOperationsInsights(params)  ← HERE
        ├─ buildCorridorRows(snapshots)
        ├─ buildActiveTransfers(sessions, transfers)
        ├─ buildTreasurySummary(snapshots, transfers)
        ├─ buildKpis({transfers, sessions, snapshots, events})
        │  └─ CRASH at line 283 if Transfer.createdAt undefined
        └─ ... (steps 5-7 never reached if step 4 crashes)
```

---

## 9. RECOMMENDED FIXES

### PRIORITY 1: Fix buildKpis Lines 283 & 287 (CRITICAL)

**Current Code:**
```typescript
const transfersCurrent = params.transfers.filter((item) => item.createdAt >= currentStart);
const transfersPrevious = params.transfers.filter(
  (item) => item.createdAt >= previousStart && item.createdAt < currentStart
);
```

**Fixed Code:**
```typescript
const transfersCurrent = params.transfers.filter(
  (item) => (item.createdAt ?? 0) >= currentStart
);
const transfersPrevious = params.transfers.filter(
  (item) => {
    const ts = item.createdAt ?? 0;
    return ts >= previousStart && ts < currentStart;
  }
);
```

**Rationale:** Provides fallback timestamp (0 = 1970-01-01) if createdAt missing, prevents crash.

---

### PRIORITY 2: Add Type Guards to buildCorridorRows

**Add at start of function:**
```typescript
export function buildCorridorRows(snapshots: TreasuryLiquiditySnapshotRow[]): OperationsCorridorRow[] {
  // Filter out snapshots with invalid required fields
  const validSnapshots = snapshots.filter(
    (item) => 
      item.corridor && 
      item.created_at && 
      typeof item.treasury_score === 'number' &&
      typeof item.corridor_capacity_score === 'number' &&
      typeof item.partner_capacity_score === 'number' &&
      typeof item.rail_capacity_score === 'number'
  );

  // Rest of function uses validSnapshots instead of snapshots
```

---

### PRIORITY 3: Add Defensive Check to buildOperationsInsights

**Add wrapping try-catch:**
```typescript
export function buildOperationsInsights(params: OperationsLiveState): OperationsInsights {
  try {
    const corridorRows = buildCorridorRows(params.snapshots);
    // ... rest of function
  } catch (error) {
    console.warn("[Operations] Failed to build insights:", error);
    // Return empty/safe state
    return {
      kpis: [],
      corridorRows: [],
      activeTransfers: [],
      treasurySummary: {...defaultTreasury},
      serviceHealth: [...defaultHealth],
      missionStatus: {...defaultMission},
      alertOptions: ["ALL"],
    };
  }
}
```

---

### PRIORITY 4: Improve loadCompletedTransfers() Validation

**In the service that returns transfers:**
```typescript
export async function loadCompletedTransfers(): Promise<Transfer[]> {
  const transfers = await fetchFromSupabase(...);
  
  // Validate required fields
  return transfers.map(transfer => ({
    ...transfer,
    createdAt: transfer.createdAt ?? new Date().toISOString(),
  })).filter(transfer => transfer.createdAt);
}
```

---

## 10. TESTING RECOMMENDATIONS

### Unit Test Cases

1. **Empty arrays:**
   - `buildOperationsInsights({snapshots: [], events: [], transfers: [], sessions: [], feeds: null, ...})`

2. **Missing required fields:**
   - Transfer with createdAt undefined
   - Snapshot with corridor null
   - Snapshot with created_at undefined
   - Session with updated_at null

3. **Malformed data types:**
   - Snapshot with treasury_score as string
   - Transfer with createdAt as number (timestamp) vs string (ISO)

4. **Edge case combinations:**
   - All data empty
   - Only transfers have data
   - Only snapshots have data

---

## 11. APPENDIX: FUNCTION SIGNATURES

```typescript
export type OperationsLiveState = {
  snapshots: TreasuryLiquiditySnapshotRow[];
  events: RouteOperationalEventRow[];
  transfers: Transfer[];
  sessions: PersistedExecutionSession[];
  feeds: LiveIntelligenceFeeds | null;
  missionSummary: IntelligenceReportResult | null;
  missionSummaryLoading: boolean;
  missionSummaryEnabled: boolean;
  realtimeStatus: string;
};

export type OperationsInsights = {
  kpis: OperationsKpiItem[];
  corridorRows: OperationsCorridorRow[];
  activeTransfers: OperationsTransferRow[];
  treasurySummary: OperationsTreasurySummary;
  serviceHealth: OperationsServiceHealth[];
  missionStatus: OperationsMissionStatus;
  alertOptions: OperationsAlertFilter[];
  transferSuccessAnomaly?: string;
};

export function buildOperationsInsights(
  params: OperationsLiveState
): OperationsInsights
```

---

## 12. SUMMARY TABLE

| Aspect | Status | Details |
|---|---|---|
| **Total Helper Functions** | 6 | buildCorridorRows, buildActiveTransfers, buildTreasurySummary, buildKpis, buildServiceHealth, buildMissionControlStatus |
| **Total Crash Points** | 2 | Line 283 & 287 in buildKpis (Transfer.createdAt comparison) |
| **Definite Crash Probability** | **Very High** | If any Transfer missing createdAt, app will crash 100% |
| **Silent Failure Points** | 3+ | NaN comparisons, invalid Map keys, property access on undefined |
| **Safe Patterns Used** | High | Optional chaining (?.) and nullish coalescing (??) common in 3/6 helpers |
| **Unsafe Patterns Used** | 2 | Direct property comparison without fallback in buildKpis lines 283-287 |
| **Recommended Actions** | 4 | Fix buildKpis, add type guards to buildCorridorRows, wrap with try-catch, validate service output |

