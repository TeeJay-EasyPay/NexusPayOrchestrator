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

import { Transfer, TransferStatus, RouteQuote, Currency, RailType } from "../../types/transfer";
import {
  DashboardExecutiveContext,
  RouteIntelligenceContext,
  TransferIntelligenceContext,
  OperationsCentreContext,
} from "./contextTypes";
import { NexusAISensitivity } from "../nexusAISettingsService";
import { liveIntelligenceFeedsService } from "../liveIntelligenceFeedService";
import { loadRecentRouteOperationalEvents } from "../routeOperationalEventService";
import { TreasuryIntelligenceSignal, getTreasurySignal } from "../../lib/treasuryIntelligence";
import { getWalletBalance } from "../../lib/simulatedRLusdWallet";
import { ExecutionSnapshot } from "../execution/executionEngine";

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
      volatilityLevel: "STABLE",
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
  // Get treasury signal for this corridor
  const treasurySignal = await getTreasurySignal(
    route.treasuryCorridor ?? "GBP→PHP",
    route.sendAmount ?? 1000
  );

  // Get recent operational events for this corridor
  const allEvents = await loadRecentRouteOperationalEvents(50);
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
      treasuryScore: route.treasuryScore ?? 0,
      treasurePressurePenalty: route.treasurePressurePenalty ?? 0,
      corridorLiquidityDepth:
        (route.treasuryCorridorLiquidityDepth as
          | "HIGH"
          | "MEDIUM"
          | "LOW"
          | "CONSTRAINED") ?? "MEDIUM",
      corridorPressure: (route.treasuryCorridorPressure as "LOW" | "MEDIUM" | "HIGH" | "CRITICAL") ?? "MEDIUM",
      corridorCapacityScore: route.treasuryCorridorCapacityScore ?? 0,
      partnerCapacityScore: route.treasuryPartnerCapacityScore ?? 0,
      railCapacityScore: route.treasuryRailCapacityScore ?? 0,
      preferredRail: route.treasuryCorridorPreferredRail,
      preferredBridgeAsset: route.treasuryCorridorPreferredBridgeAsset,
      decision: treasurySignal?.corridor?.insight ?? "Route meets capacity requirements",
    },

    settlementContext: {
      estimatedTime: route.estimatedTime ?? "2-4 hours",
      settlementStages: route.settlementStages ?? ["Initiate", "Settle", "Notify"],
      marketConditions: "OPEN",
      expectedChallenges: corridorEvents
        .filter((e) => e.severity === "WATCH" || e.severity === "DEGRADED")
        .map((e) => e.message)
        .slice(0, 2),
    },

    costMetrics: {
      fee: route.fee ?? 0,
      fxRate: route.fxRate ?? 0,
      estimatedTotalCost: (route.fee ?? 0) + ((route.sendAmount ?? 0) - (route.receiveAmount ?? 0)),
      costComparison: (route.costScore ?? 0) >= 80 ? "LOWEST" : (route.costScore ?? 0) >= 60 ? "COMPETITIVE" : "PREMIUM",
    },

    routeHealth: {
      partnerHealth: route.partnerHealth ?? "GOOD",
      partnerUptime: route.partnerUptime ?? 99.5,
      historicalSuccessRate: route.providerHistoricalSuccessRate ?? 99.2,
      recentTrend: route.providerRecentTrend ?? "STABLE",
      degradationScore: corridorEvents
        .filter((e) => e.severity === "DEGRADED")
        .reduce((sum, e) => sum + e.degradation_score, 0),
    },

    liquidityAssessment: {
      requiredRlusd: route.liquidityRequiredRlusd,
      available: route.liquidityAvailable ?? true,
      liquidityStatus: route.liquidityStatus ?? "AVAILABLE",
      liquidityRecommendation: treasurySignal?.corridor?.insight ?? "Liquidity conditions support this route",
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
  const now = new Date().toISOString();

  // Get treasury signal
  const treasurySignal = await getTreasurySignal(
    selectedRoute?.treasuryCorridor ?? "GBP→PHP",
    transfer.senderAmount
  );

  // Get live feeds
  const feeds = await liveIntelligenceFeedsService.getLatest();

  // Get corridor operational events
  const allEvents = await loadRecentRouteOperationalEvents(50);
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
          : selectedRoute?.estimatedTime ?? "2-4 hours",
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
        executionSnapshot?.selectedRoute?.corridorInsight ??
        "Settlement proceeds through standard channels with monitoring active",
      expectedSettlementTime: selectedRoute?.estimatedTime ?? "2-4 hours",
      settlementRisk:
        corridorEvents.some((e) => e.severity === "DEGRADED") ||
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
        treasurySignal?.corridor?.pressure === "CRITICAL"
          ? "CRITICAL"
          : treasurySignal?.corridor?.pressure === "HIGH"
            ? "WATCH"
            : treasurySignal?.corridor?.pressure === "MEDIUM"
              ? "HEALTHY"
              : "OPTIMAL",
      corridorLiquidity:
        treasurySignal?.corridor?.liquidityDepth === "HIGH"
          ? "STRONG"
          : treasurySignal?.corridor?.liquidityDepth === "MEDIUM"
            ? "ADEQUATE"
            : "LOW",
      corridorPressure: treasurySignal?.corridor?.pressure ?? "MEDIUM",
    },

    fxSnapshot: {
      pair: `${transfer.senderCurrency}/${transfer.recipient.currency}`,
      rate: selectedRoute?.fxRate ?? 0,
      volatilityAtExecution:
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
      expectedReceiveAmount: selectedRoute?.receiveAmount ?? transfer.senderAmount,
      recipientCurrency: transfer.recipient.currency,
      feeAmount: selectedRoute?.fee ?? 0,
      exchangeRate: selectedRoute?.fxRate ?? 0,
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
      secondaryCurrencies: ["PHP", "MYR", "AED"],
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
