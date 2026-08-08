/**
 * Nexus AI Context Builder
 *
 * Aggregates operational telemetry and business intelligence from existing services
 * into structured, AI-ready context models.
 *
 * This service acts as an intelligent data aggregation layer that:
 * - Collects data from existing services without duplication
 * - Normalizes data into strongly-typed context models
 * - Maintains single source of truth principles
 * - Provides reusable context building blocks for AI operations
 *
 * Design Principle: Data flows FROM existing services TO context models.
 * Context builders never create new business logic.
 */

import { getWalletBalance } from "../../lib/simulatedRLusdWallet";
import { getTreasurySignal } from "../../lib/treasuryIntelligence";
import { RouteQuote, Transfer } from "../../types/transfer";
import { ExecutionSnapshot } from "../execution/executionEngine";
import { liveIntelligenceFeedsService } from "../liveIntelligenceFeedService";
import { NexusAISensitivity } from "../nexusAISettingsService";
import { loadRecentRouteOperationalEvents } from "../routeOperationalEventService";
import {
    DashboardExecutiveContext,
    OperationsCentreContext,
    RouteIntelligenceContext,
    TransferIntelligenceContext,
} from "./contextTypes";

function dashboardOperationalEvidenceAvailable() {
  return false;
}

/**
 * Build Dashboard Executive Context
 *
 * Aggregates platform-wide intelligence for home screen summaries.
 * Sources:
 * - Treasury Intelligence Service (capacity, signals)
 * - Live Intelligence Feeds (FX, Treasury, Market Hours)
 * - Route Operational Events (recent alerts)
 * - Wallet context (active transfer counts)
 */
export async function buildDashboardExecutiveContext(
  sensitivity: NexusAISensitivity
): Promise<DashboardExecutiveContext> {
  if (!dashboardOperationalEvidenceAvailable()) {
    throw new Error("Dashboard AI is unavailable until evidence-backed capacity and liquidity telemetry is configured.");
  }

  const now = new Date().toISOString();

  // Get live feeds (FX, Treasury, Market Hours)
  const feeds = await liveIntelligenceFeedsService.getLatest();

  // Get recent operational events
  const recentEvents = await loadRecentRouteOperationalEvents(10);

  // Build treasury capacity assessment
  const walletBalance = await getWalletBalance();
  const treasuryScore = await getTreasurySignal("GBP→PHP", 1000);

  // Extract Treasury Status from the signal
  const treasuryStatus =
    treasuryScore?.corridor?.pressure === "CRITICAL" ||
    treasuryScore?.corridor?.pressure === "HIGH"
      ? "CRITICAL"
      : treasuryScore?.corridor?.pressure === "MEDIUM"
        ? "WATCH"
        : treasuryScore?.corridor?.pressure === "LOW"
          ? "HEALTHY"
          : "OPTIMAL";

  // Extract FX from feeds
  const fxFeed = feeds.fx[0] ?? { pair: "GBP/--", rate: 0, provider: "Unknown", asOf: now };

  // Extract Market Status
  const marketFeed = feeds.marketHours[0] ?? { status: "CLOSED" as const, asOf: now };

  return {
    treasuryCapacity: {
      totalCapacity: walletBalance,
      utilizationPercent: treasuryScore?.corridor?.pressure === "CRITICAL" ? 85 : 45,
      status: treasuryStatus as "OPTIMAL" | "HEALTHY" | "WATCH" | "CRITICAL",
      primaryCurrency: "GBP",
    },
    liquidityCoverage: {
      totalAvailable: walletBalance,
      primaryCorridorCoverage: `${treasuryScore?.corridor?.availableCapacityScore ? Math.round(treasuryScore.corridor.availableCapacityScore * 100) : 75}%`,
      status:
        treasuryScore?.corridor?.liquidityDepth === "HIGH"
          ? "STRONG"
          : treasuryScore?.corridor?.liquidityDepth === "MEDIUM"
            ? "ADEQUATE"
            : treasuryScore?.corridor?.liquidityDepth === "LOW"
              ? "LOW"
              : "CONSTRAINED",
    },
    corridorRankings: feeds.treasury
      .slice(0, 3)
      .map((feed) => ({
        corridor: feed.corridor,
        score: feed.corridor.includes("PHP") ? 95 : feed.corridor.includes("MYR") ? 85 : 75,
        liquidityHealth:
          feed.liquidityHealth === "STRONG"
            ? "STRONG"
            : feed.liquidityHealth === "ADEQUATE"
              ? "ADEQUATE"
              : "LOW",
        settlementEstimate: feed.corridor.includes("PHP")
          ? "2-4 hours"
          : feed.corridor.includes("MYR")
            ? "1-2 hours"
            : "4-6 hours",
        recommendationStatus: feed.corridor.includes("PHP")
          ? "PREFERRED"
          : feed.corridor.includes("MYR")
            ? "STANDARD"
            : "ALTERNATIVE",
      })),
    networkHealth: {
      providerHealthStatus: treasuryScore ? "HEALTHY" : "WATCH",
      settlementNetworkStatus:
        feeds.treasury.some((f) => f.liquidityHealth === "STRONG") && marketFeed.status === "OPEN"
          ? "OPTIMAL"
          : "HEALTHY",
      fxConditions:
        Math.abs((fxFeed.rate ?? 0) - 50) > 5
          ? "VOLATILE"
          : Math.abs((fxFeed.rate ?? 0) - 50) > 2
            ? "STABLE"
            : "STABLE",
    },
    fxSnapshot: {
      primaryPair: fxFeed?.pair ?? "GBP/PHP",
      rate: fxFeed?.rate ?? 0,
      provider: fxFeed?.provider ?? "Frankfurter",
      volatilityLevel: "MODERATE",
      marketStatus: (marketFeed?.status ?? "CLOSED") as "OPEN" | "CLOSED",
      asOf: fxFeed?.asOf ?? now,
    },
    activeTransfers: {
      count: 0,
      largestByAmount: 0,
      averageSettlementTime: "2-4 hours",
    },
    recentOperationalEvents: recentEvents
      .slice(0, 5)
      .map((event) => ({
        type: event.event_type,
        severity: (event.severity as "INFO" | "WATCH" | "DEGRADED" | "FAILOVER") ?? "INFO",
        description: event.message,
        corridor: event.corridor ?? undefined,
        asOf: event.created_at,
      })),
    sensitivity,
    timestamp: now,
  };
}

/**
 * Build Route Intelligence Context
 *
 * Aggregates intelligence for route explanation and selection reasoning.
 * Sources:
 * - Route Quote (scoring, settlement, cost, liquidity)
 * - Treasury Intelligence Signal (corridor capacity, pressure)
 * - Live FX Feeds (current rates, volatility)
 * - Route Operational Events (recent issues)
 */
export async function buildRouteIntelligenceContext(
  route: RouteQuote,
  sensitivity: NexusAISensitivity
): Promise<RouteIntelligenceContext> {
  const canonicalPlan = route.routePlan;
  if (!canonicalPlan) {
    throw new Error("Route AI requires a persisted canonical route plan with field-level provenance.");
  }
  const treasurySignal = canonicalPlan
    ? null
    : await getTreasurySignal(
        route.treasuryCorridor ?? "GBP→PHP",
        route.sendAmount ?? 1000
      );

  // Get recent operational events for this corridor
  const allEvents = canonicalPlan ? [] : await loadRecentRouteOperationalEvents(50);
  const corridorEvents = allEvents.filter(
    (e) => e.corridor === route.treasuryCorridor || e.corridor === route.treasuryCorridor
  );

  return {
    corridor: route.treasuryCorridor ?? "Unknown",
    routeId: route.id,
    provider: route.provider,
    rail: route.rail,

    routeScore: {
      overall: route.score ?? 0,
      speed: route.speedScore ?? 0,
      cost: route.costScore ?? 0,
      liquidity: route.liquidityScore ?? 0,
      reliability: route.reliabilityScore ?? 0,
      confidence: route.routeConfidence ?? route.aiConfidence ?? 0,
    },

    treasuryContext: {
      treasuryScore: canonicalPlan?.intelligence.capacity.value ?? route.treasuryScore ?? 0,
      treasurePressurePenalty: canonicalPlan ? 0 : route.treasuryPressurePenalty ?? 0,
      corridorLiquidityDepth:
        (route.treasuryCorridorLiquidityDepth as
          | "HIGH"
          | "MEDIUM"
          | "LOW"
          | "CONSTRAINED") ?? "MEDIUM",
      corridorPressure: (route.treasuryCorridorPressure as "LOW" | "MEDIUM" | "HIGH" | "CRITICAL") ?? "MEDIUM",
      corridorCapacityScore: canonicalPlan?.intelligence.capacity.value ?? route.treasuryCorridorCapacityScore ?? 0,
      partnerCapacityScore: canonicalPlan?.intelligence.capacity.value ?? route.treasuryPartnerCapacityScore ?? 0,
      railCapacityScore: canonicalPlan?.intelligence.liquidity.value ?? route.treasuryRailCapacityScore ?? 0,
      preferredRail: route.treasuryCorridorPreferredRail,
      preferredBridgeAsset: route.treasuryCorridorPreferredBridgeAsset,
      decision: canonicalPlan?.intelligence.decisionFactors.join(" ") ?? treasurySignal?.corridor?.insight ?? "Route evidence unavailable",
    },

    settlementContext: {
      estimatedTime: route.estimatedTime ?? "2-4 hours",
      settlementStages: route.settlementStages ?? ["Initiate", "Settle", "Notify"],
      marketConditions: canonicalPlan ? "UNAVAILABLE" : "OPEN",
      expectedChallenges: corridorEvents
        .filter((e) => e.severity === "WATCH" || e.severity === "DEGRADED")
        .map((e) => e.message)
        .slice(0, 2),
    },

    costMetrics: {
      fee: route.fee ?? 0,
      fxRate: route.fxRate ?? 0,
      estimatedTotalCost: canonicalPlan?.economics.totalCost.value ?? route.fee ?? 0,
      costComparison: (route.costScore ?? 0) >= 80 ? "LOWEST" : (route.costScore ?? 0) >= 60 ? "COMPETITIVE" : "PREMIUM",
    },

    routeHealth: {
      partnerHealth: canonicalPlan?.eligible ? "GOOD" : route.partnerHealth ?? "DEGRADED",
      partnerUptime: canonicalPlan ? 0 : route.partnerUptime ?? 0,
      historicalSuccessRate: canonicalPlan?.intelligence.historicalSuccessRate.value ?? route.providerHistoricalSuccessRate ?? 0,
      recentTrend: route.providerRecentTrend ?? "STABLE",
      degradationScore: corridorEvents
        .filter((e) => e.severity === "DEGRADED")
        .reduce((sum, e) => sum + e.degradation_score, 0),
    },

    liquidityAssessment: {
      requiredRlusd: route.liquidityRequiredRlusd,
      available: canonicalPlan ? canonicalPlan.intelligence.liquidity.value !== null : route.liquidityAvailable ?? false,
      liquidityStatus: canonicalPlan?.intelligence.liquidity.value == null ? "UNAVAILABLE" : route.liquidityStatus ?? "AVAILABLE",
      liquidityRecommendation: canonicalPlan?.intelligence.liquidity.reason ?? treasurySignal?.corridor?.insight ?? "Liquidity evidence unavailable",
    },

    operationalEvents: corridorEvents
      .slice(0, 3)
      .map((event) => ({
        eventType: event.event_type,
        severity: (event.severity as "INFO" | "WATCH" | "DEGRADED" | "FAILOVER") ?? "INFO",
        message: event.message,
        recommendation: event.recommendation,
      })),

    sensitivity,
  };
}

/**
 * Build Transfer Intelligence Context
 *
 * Aggregates intelligence for transfer progress and settlement analysis.
 * Sources:
 * - Transfer object (status, route, financial details)
 * - Execution Snapshot (progress, milestones, events)
 * - Treasury Signal (current corridor capacity)
 * - Live FX Feeds (current rates)
 * - Route Operational Events (recent corridor issues)
 */
export async function buildTransferIntelligenceContext(
  transfer: Transfer,
  executionSnapshot: ExecutionSnapshot | undefined,
  sensitivity: NexusAISensitivity
): Promise<TransferIntelligenceContext> {
  const selectedRoute = transfer.selectedRoute ?? transfer.routes?.[0];
  const activeRoute = executionSnapshot?.activeRoute ?? selectedRoute;
  const canonicalPlan = selectedRoute?.routePlan;
  if (!canonicalPlan) {
    throw new Error("Transfer AI requires a persisted canonical route plan with provider evidence.");
  }
  const now = new Date().toISOString();

  const treasurySignal = canonicalPlan
    ? null
    : await getTreasurySignal(selectedRoute?.treasuryCorridor ?? "GBP→PHP", transfer.senderAmount);
  const allEvents = canonicalPlan ? [] : await loadRecentRouteOperationalEvents(50);
  const corridorEvents = allEvents.filter(
    (e) => e.corridor === selectedRoute?.treasuryCorridor
  );

  // Determine settlement state description
  const settlementStateDescription =
    transfer.status === "COMPLETED"
      ? "Settlement confirmed - value delivered"
      : transfer.status === "IN_PROGRESS"
        ? "Transfer in execution - settlement in progress"
        : transfer.status === "RECONNECTING" || transfer.status === "VERIFYING_STATUS"
          ? "Transfer reconnecting - verifying current state"
          : "Transfer initiated - awaiting execution";

  return {
    transferId: transfer.id,
    transferReference: transfer.id.substring(0, 8).toUpperCase(),

    status: {
      currentStatus: transfer.status,
      humanReadableStatus: settlementStateDescription,
      progressPercent: executionSnapshot?.progressPercent ?? 0,
      estimatedCompletion:
        transfer.status === "COMPLETED"
          ? "Completed"
          : canonicalPlan?.intelligence.etaMinutes.value == null
            ? "Unavailable"
            : selectedRoute?.estimatedTime ?? "Unavailable",
    },

    routeContext: {
      corridor: selectedRoute?.treasuryCorridor ?? "Unknown",
      selectedRoute: selectedRoute ?? ({} as RouteQuote),
      activeRoute: activeRoute ?? ({} as RouteQuote),
      failoverUsed: executionSnapshot?.failoverUsed ?? false,
    },

    settlementContext: {
      settlementState: transfer.status,
      settlementCommentary:
        canonicalPlan?.intelligence.decisionFactors.join(" ")
        ?? executionSnapshot?.selectedRoute?.corridorInsight
        ?? "Settlement evidence is unavailable.",
      expectedSettlementTime: canonicalPlan?.intelligence.etaMinutes.value == null
        ? "Unavailable"
        : selectedRoute?.estimatedTime ?? "Unavailable",
      settlementRisk:
        canonicalPlan
          ? canonicalPlan.intelligence.risk.value >= 67
            ? "HIGH"
            : canonicalPlan.intelligence.risk.value >= 34
              ? "MEDIUM"
              : "LOW"
          : corridorEvents.some((e) => e.severity === "DEGRADED") ||
        (treasurySignal?.corridor?.pressure === "HIGH" ||
          treasurySignal?.corridor?.pressure === "CRITICAL")
          ? "HIGH"
          : corridorEvents.some((e) => e.severity === "WATCH") ||
              treasurySignal?.corridor?.pressure === "MEDIUM"
            ? "MEDIUM"
            : "LOW",
    },

    treasuryStateSnapshot: {
      treasuryStatus:
        canonicalPlan ? "UNAVAILABLE" : treasurySignal?.corridor?.pressure === "CRITICAL"
          ? "CRITICAL"
          : treasurySignal?.corridor?.pressure === "HIGH"
            ? "WATCH"
            : treasurySignal?.corridor?.pressure === "MEDIUM"
              ? "HEALTHY"
              : "OPTIMAL",
      corridorLiquidity:
        canonicalPlan ? "UNAVAILABLE" : treasurySignal?.corridor?.liquidityDepth === "HIGH"
          ? "STRONG"
          : treasurySignal?.corridor?.liquidityDepth === "MEDIUM"
            ? "ADEQUATE"
            : "LOW",
      corridorPressure: canonicalPlan ? "UNAVAILABLE" : treasurySignal?.corridor?.pressure ?? "MEDIUM",
    },

    fxSnapshot: {
      pair: `${transfer.senderCurrency}/${transfer.recipient.currency}`,
      rate: selectedRoute?.fxRate ?? 0,
      volatilityAtExecution: canonicalPlan ? "UNAVAILABLE" :
        Math.abs((selectedRoute?.fxRate ?? 50) - 50) > 5
          ? "EXTREME"
          : Math.abs((selectedRoute?.fxRate ?? 50) - 50) > 2
            ? "VOLATILE"
            : "STABLE",
      asOf: now,
    },

    milestones:
      executionSnapshot?.steps?.map((step) => ({
        title: step.title,
        status: (step.status as "PENDING" | "RUNNING" | "DONE" | "FAILED" | "SKIPPED") ?? "PENDING",
        estimatedTime: step.description,
        completedAt: step.completedAt ? new Date(step.completedAt).toISOString() : undefined,
      })) ?? [],

    operationalEvents: corridorEvents
      .slice(0, 5)
      .map((event) => ({
        type: event.event_type,
        severity: (event.severity as "INFO" | "WATCH" | "DEGRADED" | "FAILOVER") ?? "INFO",
        message: event.message,
        timestamp: event.created_at,
      })),

    financial: {
      senderAmount: transfer.senderAmount,
      senderCurrency: transfer.senderCurrency,
      expectedReceiveAmount: canonicalPlan?.economics.estimatedRecipientAmount.value
        ?? (canonicalPlan ? null : selectedRoute?.receiveAmount ?? transfer.senderAmount),
      recipientCurrency: transfer.recipient.currency,
      feeAmount: canonicalPlan?.economics.providerFees.value
        ?? (canonicalPlan ? null : selectedRoute?.fee ?? 0),
      exchangeRate: canonicalPlan?.economics.fxRate.value
        ?? (canonicalPlan ? null : selectedRoute?.fxRate ?? 0),
    },

    sensitivity,
  };
}

/**
 * Build Operations Centre Context
 *
 * Comprehensive view of operational metrics for advanced intelligence reports.
 * Aggregates treasury, corridor, FX, transfer, and health metrics.
 * Sources:
 * - All previous context builders
 * - Route Operational Events aggregations
 * - Live Intelligence Feeds (comprehensive)
 */
export async function buildOperationsCentreContext(
  sensitivity: NexusAISensitivity
): Promise<OperationsCentreContext> {
  const feeds = await liveIntelligenceFeedsService.getLatest();
  const allOperationalEvents = await loadRecentRouteOperationalEvents(100);
  const dashboardContext = await buildDashboardExecutiveContext(sensitivity);

  // Aggregate operational events by type
  const alertsByType = allOperationalEvents.reduce(
    (acc, event) => {
      if (!acc[event.event_type]) acc[event.event_type] = [];
      acc[event.event_type].push(event);
      return acc;
    },
    {} as Record<string, typeof allOperationalEvents>
  );

  return {
    treasuryMetrics: {
      totalCapacity: dashboardContext.treasuryCapacity.totalCapacity,
      utilizationPercent: dashboardContext.treasuryCapacity.utilizationPercent,
      pressureLevel: "MEDIUM",
      primaryCurrency: "GBP",
      secondaryCurrencies: [
        "PHP",
        "MYR",
        "AED",
        "SAR",
        "QAR",
        "KWD",
        "BHD",
        "OMR",
        "SGD",
        "THB",
        "IDR",
        "VND",
      ],
    },

    corridorMetrics: dashboardContext.corridorRankings.map((ranking) => ({
      corridor: ranking.corridor,
      healthScore: ranking.score,
      liquidityStatus: ranking.liquidityHealth as "STRONG" | "ADEQUATE" | "LOW" | "CONSTRAINED",
      settlementPerformance:
        ranking.score >= 85 ? "EXCELLENT" : ranking.score >= 70 ? "GOOD" : "WATCH",
      activeTransfers: 0,
      volumeToday: 0,
    })),

    fxMetrics: feeds.fx.map((fx) => ({
      pair: fx.pair,
      rate: fx.rate,
      volatility: "LOW",
      marketStatus: feeds.marketHours.some((m) => m.status === "OPEN") ? "OPEN" : "CLOSED",
      trendDirection: "STABLE",
    })),

    transferMetrics: {
      activeCount: 0,
      completedToday: 0,
      averageSettlementTime: "2-4 hours",
      successRate: 99.2,
      failureRate: 0.8,
    },

    healthIndicators: {
      platformHealth: dashboardContext.networkHealth.settlementNetworkStatus as
        | "OPTIMAL"
        | "HEALTHY"
        | "WATCH"
        | "DEGRADED",
      providerHealth: dashboardContext.networkHealth.providerHealthStatus as "HEALTHY" | "WATCH" | "DEGRADED" | "OFFLINE",
      networkHealth: dashboardContext.networkHealth.settlementNetworkStatus as
        | "OPTIMAL"
        | "HEALTHY"
        | "WATCH"
        | "DEGRADED",
      settlementHealth: dashboardContext.networkHealth.settlementNetworkStatus as
        | "OPTIMAL"
        | "HEALTHY"
        | "WATCH"
        | "DEGRADED",
    },

    operationalAlerts: Object.entries(alertsByType)
      .slice(0, 10)
      .flatMap(([type, events]) =>
        events
          .slice(0, 2)
          .map((event) => ({
            type: event.event_type,
            severity: (event.severity as "INFO" | "WATCH" | "DEGRADED" | "CRITICAL") ?? "INFO",
            message: event.message,
            affectedCorridor: event.corridor ?? undefined,
            recommendedAction: event.recommendation,
          }))
      ),

    telemetrySummary: {
      dataPointsAvailable: allOperationalEvents.length,
      lastUpdate: feeds.refreshedAt,
      dataFreshness:
        new Date(feeds.refreshedAt).getTime() > Date.now() - 5 * 60 * 1000
          ? "CURRENT"
          : new Date(feeds.refreshedAt).getTime() > Date.now() - 30 * 60 * 1000
            ? "RECENT"
            : "STALE",
    },

    sensitivity,
  };
}
