# Nexus AI Service - Execution Flow Analysis

**Date**: May 22, 2026  
**Topic**: Function Execution Paths - Context Builder Integration  
**Conclusion**: All functions use ORIGINAL PAYLOAD path (Option 2)

---

## Executive Summary

All four Nexus AI service functions (`generateDashboardSummary()`, `explainRoute()`, `analyseTransfer()`, `generateIntelligenceReport()`) **do NOT automatically build Context Builder data internally**.

**Instead:**
- They accept the original payload types unchanged
- They pass original payloads to the Edge Function unchanged
- They never call context builder functions internally
- They never call enrichment helpers internally

**Context Builder is optional and must be explicitly supplied by advanced callers via exported helpers.**

---

## Table of Contents

1. [Function 1: generateDashboardSummary()](#function-1-generatedashboardsummary)
2. [Function 2: explainRoute()](#function-2-explainroute)
3. [Function 3: analyseTransfer()](#function-3-analysetransfer)
4. [Function 4: generateIntelligenceReport()](#function-4-generateintelligencereport)
5. [Comparison Table](#comparison-table)
6. [Optional Context Access](#optional-context-access)
7. [Architecture Decision Rationale](#architecture-decision-rationale)

---

## Function 1: generateDashboardSummary()

### Function Signature

```typescript
export async function generateDashboardSummary(
    input: DashboardSummaryInput,
    sensitivity: NexusAISensitivity,
    options?: NexusAIRequestOptions
): Promise<NexusAIResult<DashboardSummaryResult>>
```

### Input Type

```typescript
type DashboardSummaryInput = {
    telemetry: DashboardTelemetryPayload;
};

type DashboardTelemetryPayload = {
    treasuryStatus: string;
    liquidityStatus: string;
    corridorHealth: string;
    networkHealth: string;
    fxStatus: string;
    marketStatus: string;
    activeTransferCount?: number;
    corridorCoverage?: string;
};
```

### Execution Flow

```
CALLER
    ↓
generateDashboardSummary(telemetry, "balanced", options?)
    ↓
Step 1: Build Fallback (using ORIGINAL input only)
    fallback = buildDashboardFallback(input)
    ├─ Reads: input.telemetry.treasuryStatus
    ├─ Reads: input.telemetry.corridorHealth
    ├─ Reads: input.telemetry.networkHealth
    ├─ Reads: input.telemetry.fxStatus
    ├─ Reads: input.telemetry.marketStatus
    └─ Generates: Professional fallback commentary
    ↓
Step 2: Invoke Core AI Pipeline
    invokeNexusAI<DashboardSummaryResult, DashboardSummaryResult>({
        action: "dashboard_summary",
        screenContext: "home",
        sensitivity: "balanced",
        payload: input,  ← ORIGINAL telemetry UNCHANGED
        fallbackData: fallback,
        normalize: normalizeDashboardResult,
        options: options
    })
    ↓
Step 3: Attempt Edge Function Invocation
    supabase.functions.invoke("nexus-ai", {
        body: {
            action: "dashboard_summary",
            screenContext: "home",
            sensitivity: "balanced",
            payload: input  ← ORIGINAL telemetry sent to Edge Function
        }
    })
    ↓
Step 4: Edge Function Processing
    ├─ Receives: Original telemetry payload
    ├─ Calls: OpenAI with telemetry
    └─ Returns: DashboardSummaryResult
    ↓
Step 5: Normalize Response
    normalized = normalizeDashboardResult(data.data, fallback)
    ↓
Step 6: Return Result
    return {
        ok: true,
        data: normalized,
        meta: { action: "dashboard_summary", ... },
        source: "edge_function"
    }

ON EDGE FUNCTION FAILURE:
    ├─ Timeout: After 8.5 seconds
    ├─ Retry: Up to 2 times
    └─ Fallback: Return fallback generated from ORIGINAL input
        return {
            ok: false,
            data: fallback,
            meta: { source: "fallback" },
            error: { code: "NEXUS_AI_UNAVAILABLE" }
        }
```

### Data Flow Diagram

```
Original Telemetry Input
├─────────────────────────┬────────────────────────┐
│                         │                        │
↓                         ↓                        ↓
buildDashboardFallback   invokeNexusAI ──→ Edge Function
      (ORIGINAL)         (ORIGINAL payload)    (ORIGINAL payload)
         ↓                        ↓                    ↓
    Fallback Data            Execute              Response
         │                    Retry/Timeout       Processing
         │                    with timeouts           │
         └──────────────┬─────────────────────────────┘
                        ↓
                   Normalize & Return
                        ↓
                   DashboardSummaryResult
```

### Context Builder Status

- **Imported**: ✅ Yes (`buildDashboardExecutiveContext` imported but unused)
- **Called Internally**: ❌ NO
- **Passed to Edge Function**: ❌ NO
- **Enrichment Applied**: ❌ NO
- **Available Externally**: ✅ Yes (via `buildDashboardExecutiveContext()` export)

---

## Function 2: explainRoute()

### Function Signature

```typescript
export async function explainRoute(
    input: RouteExplanationInput,
    sensitivity: NexusAISensitivity,
    options?: NexusAIRequestOptions
): Promise<NexusAIResult<RouteExplanationResult>>
```

### Input Type

```typescript
type RouteExplanationInput = {
    corridor: string;
    routeScore: number;
    liquidityScore: number;
    treasuryScore: number;
    settlementEstimate: string;
};
```

### Execution Flow

```
CALLER
    ↓
explainRoute(routeData, "balanced", options?)
    ↓
Step 1: Build Fallback (using ORIGINAL input only)
    fallback = buildRouteFallback(input)
    ├─ Reads: input.corridor
    ├─ Reads: input.routeScore
    ├─ Reads: input.liquidityScore
    ├─ Reads: input.treasuryScore
    ├─ Reads: input.settlementEstimate
    └─ Generates: Professional route explanation
    ↓
Step 2: Invoke Core AI Pipeline
    invokeNexusAI<RouteExplanationResult, RouteExplanationResult>({
        action: "route_explanation",
        screenContext: "routes",
        sensitivity: "balanced",
        payload: input,  ← ORIGINAL route data UNCHANGED
        fallbackData: fallback,
        normalize: normalizeRouteResult,
        options: options
    })
    ↓
Step 3: Attempt Edge Function Invocation
    supabase.functions.invoke("nexus-ai", {
        body: {
            action: "route_explanation",
            screenContext: "routes",
            sensitivity: "balanced",
            payload: input  ← ORIGINAL route data sent to Edge Function
        }
    })
    ↓
Step 4: Edge Function Processing
    ├─ Receives: Original route data payload
    ├─ Calls: OpenAI with route scores
    └─ Returns: RouteExplanationResult
    ↓
Step 5: Normalize Response
    normalized = normalizeRouteResult(data.data, fallback)
    ↓
Step 6: Return Result
    return {
        ok: true,
        data: normalized,
        meta: { action: "route_explanation", ... },
        source: "edge_function"
    }

ON EDGE FUNCTION FAILURE:
    ├─ Timeout: After 8.5 seconds
    ├─ Retry: Up to 2 times
    └─ Fallback: Return fallback generated from ORIGINAL input
        return {
            ok: false,
            data: fallback,
            meta: { source: "fallback" },
            error: { code: "NEXUS_AI_UNAVAILABLE" }
        }
```

### Data Flow Diagram

```
Original Route Data Input
├────────────────────────┬──────────────────────┐
│                        │                      │
↓                        ↓                      ↓
buildRouteFallback      invokeNexusAI ──→ Edge Function
    (ORIGINAL)          (ORIGINAL payload)  (ORIGINAL payload)
       ↓                       ↓                  ↓
  Fallback Data             Execute            Response
       │                   Retry/Timeout      Processing
       │                   with timeouts          │
       └────────────┬──────────────────────────────┘
                    ↓
               Normalize & Return
                    ↓
               RouteExplanationResult
```

### Context Builder Status

- **Imported**: ✅ Yes (`buildRouteIntelligenceContext` imported but unused)
- **Called Internally**: ❌ NO
- **Passed to Edge Function**: ❌ NO
- **Enrichment Applied**: ❌ NO
- **Available Externally**: ✅ Yes (via `buildRouteIntelligenceContext()` export)

---

## Function 3: analyseTransfer()

### Function Signature

```typescript
export async function analyseTransfer(
    input: TransferAnalysisInput,
    sensitivity: NexusAISensitivity,
    options?: NexusAIRequestOptions
): Promise<NexusAIResult<TransferAnalysisResult>>
```

### Input Type

```typescript
type TransferAnalysisInput = {
    transferId: string;
    transferState: string;
    progressPercent: number;
    settlementCommentary: string;
    milestones: TransferMilestone[];
    operationalEvents: TransferOperationalEvent[];
};

type TransferMilestone = {
    title: string;
    status: "PENDING" | "RUNNING" | "DONE" | "FAILED" | "SKIPPED";
};

type TransferOperationalEvent = {
    label: string;
    value: string;
};
```

### Execution Flow

```
CALLER
    ↓
analyseTransfer(transferData, "balanced", options?)
    ↓
Step 1: Build Fallback (using ORIGINAL input only)
    fallback = buildTransferFallback(input)
    ├─ Reads: input.transferId
    ├─ Reads: input.transferState
    ├─ Reads: input.progressPercent
    ├─ Reads: input.settlementCommentary
    ├─ Reads: input.milestones
    ├─ Reads: input.operationalEvents
    └─ Generates: Professional transfer analysis
    ↓
Step 2: Invoke Core AI Pipeline
    invokeNexusAI<TransferAnalysisResult, TransferAnalysisResult>({
        action: "transfer_analysis",
        screenContext: "track",
        sensitivity: "balanced",
        payload: input,  ← ORIGINAL transfer data UNCHANGED
        fallbackData: fallback,
        normalize: normalizeTransferResult,
        options: options
    })
    ↓
Step 3: Attempt Edge Function Invocation
    supabase.functions.invoke("nexus-ai", {
        body: {
            action: "transfer_analysis",
            screenContext: "track",
            sensitivity: "balanced",
            payload: input  ← ORIGINAL transfer data sent to Edge Function
        }
    })
    ↓
Step 4: Edge Function Processing
    ├─ Receives: Original transfer data payload
    ├─ Calls: OpenAI with transfer progress
    └─ Returns: TransferAnalysisResult
    ↓
Step 5: Normalize Response
    normalized = normalizeTransferResult(data.data, fallback)
    ↓
Step 6: Return Result
    return {
        ok: true,
        data: normalized,
        meta: { action: "transfer_analysis", ... },
        source: "edge_function"
    }

ON EDGE FUNCTION FAILURE:
    ├─ Timeout: After 8.5 seconds
    ├─ Retry: Up to 2 times
    └─ Fallback: Return fallback generated from ORIGINAL input
        return {
            ok: false,
            data: fallback,
            meta: { source: "fallback" },
            error: { code: "NEXUS_AI_UNAVAILABLE" }
        }
```

### Data Flow Diagram

```
Original Transfer Data Input
├─────────────────────────┬────────────────────────┐
│                         │                        │
↓                         ↓                        ↓
buildTransferFallback    invokeNexusAI ──→ Edge Function
    (ORIGINAL)           (ORIGINAL payload)  (ORIGINAL payload)
       ↓                        ↓                   ↓
  Fallback Data              Execute            Response
       │                    Retry/Timeout      Processing
       │                    with timeouts          │
       └──────────────┬───────────────────────────┘
                      ↓
                 Normalize & Return
                      ↓
                 TransferAnalysisResult
```

### Context Builder Status

- **Imported**: ✅ Yes (`buildTransferIntelligenceContext` imported but unused)
- **Called Internally**: ❌ NO
- **Passed to Edge Function**: ❌ NO
- **Enrichment Applied**: ❌ NO
- **Available Externally**: ✅ Yes (via `buildTransferIntelligenceContext()` export)

---

## Function 4: generateIntelligenceReport()

### Function Signature

```typescript
export async function generateIntelligenceReport(
    input: IntelligenceReportInput,
    sensitivity: NexusAISensitivity,
    options?: NexusAIRequestOptions
): Promise<NexusAIResult<IntelligenceReportResult>>
```

### Input Type

```typescript
type IntelligenceReportInput = {
    reportType: IntelligenceReportType;
    focus: string;
    telemetry: Record<string, unknown>;
};

type IntelligenceReportType =
    | "corridor_analysis"
    | "treasury_analysis"
    | "value_flow_analysis"
    | "market_intelligence";
```

### Execution Flow

```
CALLER
    ↓
generateIntelligenceReport(reportInput, "balanced", options?)
    ↓
Step 1: Build Fallback (using ORIGINAL input only)
    fallback = buildReportFallback(input)
    ├─ Reads: input.reportType
    ├─ Reads: input.focus
    ├─ Reads: input.telemetry
    └─ Generates: Professional intelligence report
    ↓
Step 2: Invoke Core AI Pipeline
    invokeNexusAI<IntelligenceReportResult, IntelligenceReportResult>({
        action: "intelligence_report",
        screenContext: "intelligence",
        sensitivity: "balanced",
        payload: input,  ← ORIGINAL report input UNCHANGED
        fallbackData: fallback,
        normalize: normalizeReportResult,
        options: options
    })
    ↓
Step 3: Attempt Edge Function Invocation
    supabase.functions.invoke("nexus-ai", {
        body: {
            action: "intelligence_report",
            screenContext: "intelligence",
            sensitivity: "balanced",
            payload: input  ← ORIGINAL report input sent to Edge Function
        }
    })
    ↓
Step 4: Edge Function Processing
    ├─ Receives: Original report input payload
    ├─ Calls: OpenAI with telemetry
    └─ Returns: IntelligenceReportResult
    ↓
Step 5: Normalize Response
    normalized = normalizeReportResult(data.data, fallback)
    ↓
Step 6: Return Result
    return {
        ok: true,
        data: normalized,
        meta: { action: "intelligence_report", ... },
        source: "edge_function"
    }

ON EDGE FUNCTION FAILURE:
    ├─ Timeout: After 8.5 seconds
    ├─ Retry: Up to 2 times
    └─ Fallback: Return fallback generated from ORIGINAL input
        return {
            ok: false,
            data: fallback,
            meta: { source: "fallback" },
            error: { code: "NEXUS_AI_UNAVAILABLE" }
        }
```

### Data Flow Diagram

```
Original Report Input
├────────────────────┬────────────────────────┐
│                    │                        │
↓                    ↓                        ↓
buildReportFallback invokeNexusAI ──→ Edge Function
    (ORIGINAL)      (ORIGINAL payload)  (ORIGINAL payload)
       ↓                   ↓                   ↓
  Fallback Data         Execute            Response
       │              Retry/Timeout       Processing
       │              with timeouts           │
       └────────┬───────────────────────────┘
                ↓
           Normalize & Return
                ↓
           IntelligenceReportResult
```

### Context Builder Status

- **Imported**: ✅ Yes (builders imported but unused)
- **Called Internally**: ❌ NO
- **Passed to Edge Function**: ❌ NO
- **Enrichment Applied**: ❌ NO
- **Available Externally**: ✅ Yes (via builder exports)

---

## Comparison Table

| Characteristic | generateDashboardSummary | explainRoute | analyseTransfer | generateIntelligenceReport |
|---|---|---|---|---|
| **Accepts Original Input** | ✅ YES | ✅ YES | ✅ YES | ✅ YES |
| **Context Auto-Built** | ❌ NO | ❌ NO | ❌ NO | ❌ NO |
| **Enrichment Applied** | ❌ NO | ❌ NO | ❌ NO | ❌ NO |
| **Original Payload to Edge Fn** | ✅ YES | ✅ YES | ✅ YES | ✅ YES |
| **Uses Fallback from Original** | ✅ YES | ✅ YES | ✅ YES | ✅ YES |
| **Backward Compatible** | ✅ YES | ✅ YES | ✅ YES | ✅ YES |
| **Context Exported** | ✅ YES | ✅ YES | ✅ YES | ✅ NO (but builders exported) |

---

## Optional Context Access

While context is NOT automatically built or passed internally, it IS available for **optional external use** via exported helpers.

### Available Exports

```typescript
// Context builders (optional external use)
export {
    buildDashboardExecutiveContext,
    buildRouteIntelligenceContext,
    buildTransferIntelligenceContext,
};

// Context types (for typing external usage)
export type {
    DashboardExecutiveContext,
    RouteIntelligenceContext,
    TransferIntelligenceContext,
};

// Enrichment helpers (for optional payload enrichment)
export {
    enrichDashboardPayload,
    enrichRoutePayload,
    enrichTransferPayload
};
```

### Usage Example 1: Direct Context Building

```typescript
import { buildDashboardExecutiveContext } from "@/services/nexusAIService";

// Manually build context
const context = await buildDashboardExecutiveContext("balanced");

// Use for custom analysis, reporting, etc.
console.log(context.corridorRankings);
console.log(context.treasuryCapacity);
```

### Usage Example 2: Payload Enrichment

```typescript
import { enrichDashboardPayload, generateDashboardSummary } from "@/services/nexusAIService";

// Optionally enrich payload before passing to service
const enriched = await enrichDashboardPayload(telemetry, "balanced");

// enriched now contains: { ...original telemetry, _executiveContext: {...} }
// But note: generateDashboardSummary still uses ORIGINAL input
// Enrichment is for external consumption only
```

### Usage Example 3: External AI Enhancement

```typescript
import { 
    buildDashboardExecutiveContext,
    generateDashboardSummary 
} from "@/services/nexusAIService";

// Get both original and context-based summaries
const [original, context] = await Promise.all([
    generateDashboardSummary(telemetry, "balanced"),
    buildDashboardExecutiveContext("balanced")
]);

// Combine or compare for deeper analysis
const combinedInsight = {
    aiSummary: original.data,
    operationalContext: context
};
```

---

## Core Pipeline: invokeNexusAI()

All four functions ultimately call the same core pipeline function with different parameters.

### invokeNexusAI Signature

```typescript
async function invokeNexusAI<TData, TFallbackData>(params: {
    action: NexusAIRequestAction;
    screenContext: NexusAIScreenContext;
    sensitivity: NexusAISensitivity;
    payload: Record<string, unknown>;  // ORIGINAL payload
    fallbackData: TFallbackData;
    normalize: (input: unknown, fallback: TFallbackData) => TData;
    options?: NexusAIRequestOptions;
}): Promise<NexusAIResult<TData>>
```

### Core Pipeline Steps

```
1. START TIMER
   startedAt = Date.now()

2. EXTRACT OPTIONS
   timeoutMs = options?.timeoutMs ?? 8500
   maxRetries = options?.maxRetries ?? 2
   requestId = buildRequestId("nexus-ai")

3. ATTEMPT EDGE FUNCTION INVOCATION
   Loop: attempt = 1 to (1 + maxRetries)
   
   ├─ supabase.functions.invoke("nexus-ai", {
   │     body: {
   │         action,
   │         screenContext,
   │         sensitivity,
   │         payload  ← ORIGINAL payload
   │     }
   │  })
   │
   ├─ withTimeout(promise, timeoutMs)
   │
   ├─ Validate response
   │  └─ if !data?.ok: throw Error
   │
   └─ On success: return { ok: true, data: normalized, source: "edge_function" }

4. ON FAILURE (all retries exhausted)
   Fallback: return { ok: false, data: fallback, source: "fallback" }

5. ALWAYS
   onLoadingChange?.(false)
```

---

## Architecture Decision Rationale

### Why No Automatic Context Building?

**Reason 1: Backward Compatibility**
- All existing code continues to work without modification
- No surprises or breaking changes
- Migration is optional and voluntary

**Reason 2: Performance Control**
- Context building requires 200-600ms of additional latency
- Callers should opt-in to this cost
- Not all use cases need context

**Reason 3: Flexibility**
- Different callers may want different context models
- Some may build context once and reuse it
- Some may not need context at all

**Reason 4: Single Responsibility**
- These functions handle AI invocation
- Context building is a separate concern
- Separation of concerns improves maintainability

**Reason 5: Optional Enhancement**
- Context is available for advanced users
- Novice users get simple, predictable behavior
- Power users have access to rich models

### Why Export Context Builders?

Even though they're not used internally, they're exported because:

1. **Advanced Integrations** - Custom analytics, reporting, custom UI
2. **Composition** - Callers can build context once, use multiple times
3. **Testing** - Easier to test context building independently
4. **Future Evolution** - Can add context-aware versions later without breaking changes
5. **Transparency** - Users understand what data is available

---

## Summary

### All Four Functions

✅ **Accept original payload types unchanged**  
✅ **Pass original payloads to Edge Function unchanged**  
✅ **Generate fallbacks from original payloads**  
✅ **Preserve 100% backward compatibility**  
❌ **Do NOT automatically build context**  
❌ **Do NOT enrich payloads internally**  
❌ **Do NOT pass context to Edge Function**  

### Context Is Available As:

✅ **Exported builder functions** - `buildDashboardExecutiveContext()`, etc.  
✅ **Exported types** - `DashboardExecutiveContext`, etc.  
✅ **Exported enrichment helpers** - `enrichDashboardPayload()`, etc.  
✅ **Optional external use** - Advanced callers can build and use independently  

### Architecture Pattern

```
┌─────────────────────────────────────┐
│   Existing Callers (No Change)      │
│   - Original payloads               │
│   - Backward compatible             │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│   Public API Functions (Unchanged)  │
│   - generateDashboardSummary()      │
│   - explainRoute()                  │
│   - analyseTransfer()               │
│   - generateIntelligenceReport()    │
└──────────────┬──────────────────────┘
               ↓
         (ORIGINAL PAYLOAD)
         (NO CONTEXT BUILDING)
               ↓
┌─────────────────────────────────────┐
│   Core Pipeline: invokeNexusAI()    │
│   - Send original payload           │
│   - Retry with timeout              │
│   - Fallback from original          │
└──────────────┬──────────────────────┘
               ↓
         (TO EDGE FUNCTION)
         (TO FALLBACK GENERATOR)
               ↓
┌──────────────────────────────────────────────┐
│   Result with Metadata                       │
│   - AI response OR fallback                  │
│   - Source: "edge_function" OR "fallback"    │
│   - Confidence, requestId, etc.              │
└──────────────────────────────────────────────┘

OPTIONAL PARALLEL PATH:
┌──────────────────────────────────────────────┐
│   Advanced Callers (Optional)                │
│   - Import context builders                  │
│   - Import enrichment helpers                │
│   - Build context independently              │
│   - Combine with AI results for deeper AI    │
└──────────────────────────────────────────────┘
```

---

## Conclusion

The Nexus AI enhancement maintains a **two-tier architecture**:

**Tier 1: Standard Path (Default)**
- Uses original payloads
- Backward compatible
- No context overhead
- Suitable for all existing code

**Tier 2: Advanced Path (Optional)**
- Access context builders manually
- Use enrichment helpers
- Combine models for deeper analysis
- Available for power users

This design ensures:
- ✅ No breaking changes
- ✅ No performance impact on existing code
- ✅ Optional enhancement for advanced users
- ✅ Clear separation of concerns
- ✅ Flexible architecture for future evolution
