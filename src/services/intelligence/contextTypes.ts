/**
 * Context Types for Nexus AI
 *
 * Strongly-typed models that aggregate operational telemetry and business intelligence
 * into AI-ready context structures. These models normalize data from existing services
 * without duplicating business logic.
 */

import { NexusAISensitivity } from "../nexusAISettingsService";
import { Currency, RailType, RouteQuote, PartnerHealth } from "../../types/transfer";

/**
 * Dashboard Executive Context
 *
 * Aggregates platform-wide intelligence for executive-level dashboard summaries.
 * Combines treasury, liquidity, corridor, and network health signals.
 */
export interface DashboardExecutiveContext {
  // Treasury Intelligence
  treasuryCapacity: {
    totalCapacity: number;
    utilizationPercent: number;
    status: "OPTIMAL" | "HEALTHY" | "WATCH" | "CRITICAL";
    primaryCurrency: Currency;
  };

  // Liquidity Coverage
  liquidityCoverage: {
    totalAvailable: number;
    primaryCorridorCoverage: string; // e.g., "85%"
    status: "STRONG" | "ADEQUATE" | "LOW" | "CONSTRAINED";
  };

  // Corridor Rankings
  corridorRankings: Array<{
    corridor: string;
    score: number;
    liquidityHealth: "STRONG" | "ADEQUATE" | "LOW";
    settlementEstimate: string;
    recommendationStatus: "PREFERRED" | "STANDARD" | "ALTERNATIVE";
  }>;

  // Network and Infrastructure Health
  networkHealth: {
    providerHealthStatus: "HEALTHY" | "WATCH" | "DEGRADED" | "OFFLINE";
    settlementNetworkStatus: "OPTIMAL" | "HEALTHY" | "WATCH" | "DEGRADED";
    fxConditions: "STABLE" | "VOLATILE" | "EXTREME";
  };

  // FX Intelligence
  fxSnapshot: {
    primaryPair: string;
    rate: number;
    provider: string;
    volatilityLevel: "LOW" | "MODERATE" | "HIGH";
    marketStatus: "OPEN" | "CLOSED";
    asOf: string;
  };

  // Active Operations
  activeTransfers: {
    count: number;
    largestByAmount: number;
    averageSettlementTime: string;
  };

  // Recent Operational Events
  recentOperationalEvents: Array<{
    type: string;
    severity: "INFO" | "WATCH" | "DEGRADED" | "FAILOVER";
    description: string;
    corridor?: string;
    asOf: string;
  }>;

  // Configuration
  sensitivity: NexusAISensitivity;
  timestamp: string;
}

/**
 * Route Intelligence Context
 *
 * Aggregates intelligence for explaining route selection decisions.
 * Provides detailed breakdown of scoring factors and operational considerations.
 */
export interface RouteIntelligenceContext {
  // Route Identity
  corridor: string;
  routeId: string;
  provider: string;
  rail: RailType;

  // Scoring Metrics
  routeScore: {
    overall: number;
    speed: number;
    cost: number;
    liquidity: number;
    reliability: number;
    confidence: number;
  };

  // Treasury Signals
  treasuryContext: {
    treasuryScore: number;
    treasurePressurePenalty: number;
    corridorLiquidityDepth: "HIGH" | "MEDIUM" | "LOW" | "CONSTRAINED";
    corridorPressure: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    corridorCapacityScore: number;
    partnerCapacityScore: number;
    railCapacityScore: number;
    preferredRail?: RailType;
    preferredBridgeAsset?: Currency;
    decision: string;
  };

  // Settlement Intelligence
  settlementContext: {
    estimatedTime: string;
    settlementStages: string[];
    marketConditions: "OPEN" | "CLOSED";
    expectedChallenges?: string[];
  };

  // Cost Metrics
  costMetrics: {
    fee: number;
    fxRate: number;
    estimatedTotalCost: number;
    costComparison: "LOWEST" | "COMPETITIVE" | "PREMIUM";
  };

  // Route Health
  routeHealth: {
    partnerHealth: PartnerHealth;
    partnerUptime: number;
    historicalSuccessRate: number;
    recentTrend: "IMPROVING" | "STABLE" | "DEGRADING";
    degradationScore: number;
  };

  // Liquidity Assessment
  liquidityAssessment: {
    requiredRlusd?: number;
    available: boolean;
    liquidityStatus: "AVAILABLE" | "LOW" | "INSUFFICIENT" | "NOT_REQUIRED";
    liquidityRecommendation: string;
  };

  // Operational Events
  operationalEvents: Array<{
    eventType: string;
    severity: "INFO" | "WATCH" | "DEGRADED" | "FAILOVER";
    message: string;
    recommendation: string;
  }>;

  // Configuration
  sensitivity: NexusAISensitivity;
}

/**
 * Transfer Intelligence Context
 *
 * Aggregates all intelligence for analyzing transfer progress and settlement.
 * Provides execution state, milestone analysis, and operational observations.
 */
export interface TransferIntelligenceContext {
  // Transfer Identity
  transferId: string;
  transferReference: string;

  // Status and Progress
  status: {
    currentStatus: string;
    humanReadableStatus: string;
    progressPercent: number;
    estimatedCompletion: string;
  };

  // Corridor and Route
  routeContext: {
    corridor: string;
    selectedRoute: RouteQuote;
    activeRoute: RouteQuote;
    failoverUsed: boolean;
  };

  // Settlement Intelligence
  settlementContext: {
    settlementState: string;
    settlementCommentary: string;
    expectedSettlementTime: string;
    settlementRisk: "LOW" | "MEDIUM" | "HIGH";
  };

  // Treasury State at Execution
  treasuryStateSnapshot: {
    treasuryStatus: "OPTIMAL" | "HEALTHY" | "WATCH" | "CRITICAL";
    corridorLiquidity: "STRONG" | "ADEQUATE" | "LOW";
    corridorPressure: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  };

  // FX Snapshot
  fxSnapshot: {
    pair: string;
    rate: number;
    volatilityAtExecution: "STABLE" | "VOLATILE" | "EXTREME";
    asOf: string;
  };

  // Execution Milestones
  milestones: Array<{
    title: string;
    status: "PENDING" | "RUNNING" | "DONE" | "FAILED" | "SKIPPED";
    estimatedTime?: string;
    completedAt?: string;
  }>;

  // Operational Events During Execution
  operationalEvents: Array<{
    type: string;
    severity: "INFO" | "WATCH" | "DEGRADED" | "FAILOVER";
    message: string;
    timestamp: string;
  }>;

  // Financial Details
  financial: {
    senderAmount: number;
    senderCurrency: Currency;
    expectedReceiveAmount: number;
    recipientCurrency: Currency;
    feeAmount: number;
    exchangeRate: number;
  };

  // Configuration
  sensitivity: NexusAISensitivity;
}

/**
 * Operations Centre Context
 *
 * Comprehensive view of operational metrics for executive-level intelligence reports.
 * Aggregates treasury, corridor, FX, transfer, and health metrics.
 */
export interface OperationsCentreContext {
  // Treasury Metrics
  treasuryMetrics: {
    totalCapacity: number;
    utilizationPercent: number;
    pressureLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    primaryCurrency: Currency;
    secondaryCurrencies: Currency[];
  };

  // Corridor Metrics
  corridorMetrics: Array<{
    corridor: string;
    healthScore: number;
    liquidityStatus: "STRONG" | "ADEQUATE" | "LOW" | "CONSTRAINED";
    settlementPerformance: "EXCELLENT" | "GOOD" | "WATCH" | "DEGRADED";
    activeTransfers: number;
    volumeToday: number;
  }>;

  // FX Metrics
  fxMetrics: Array<{
    pair: string;
    rate: number;
    volatility: "LOW" | "MODERATE" | "HIGH";
    marketStatus: "OPEN" | "CLOSED";
    trendDirection: "STRENGTHENING" | "STABLE" | "WEAKENING";
  }>;

  // Transfer Metrics
  transferMetrics: {
    activeCount: number;
    completedToday: number;
    averageSettlementTime: string;
    successRate: number;
    failureRate: number;
  };

  // Health Indicators
  healthIndicators: {
    platformHealth: "OPTIMAL" | "HEALTHY" | "WATCH" | "DEGRADED";
    providerHealth: "HEALTHY" | "WATCH" | "DEGRADED" | "OFFLINE";
    networkHealth: "OPTIMAL" | "HEALTHY" | "WATCH" | "DEGRADED";
    settlementHealth: "OPTIMAL" | "HEALTHY" | "WATCH" | "DEGRADED";
  };

  // Operational Alerts
  operationalAlerts: Array<{
    type: string;
    severity: "INFO" | "WATCH" | "DEGRADED" | "CRITICAL";
    message: string;
    affectedCorridor?: string;
    recommendedAction?: string;
  }>;

  // Telemetry Summary
  telemetrySummary: {
    dataPointsAvailable: number;
    lastUpdate: string;
    dataFreshness: "CURRENT" | "RECENT" | "STALE";
  };

  // Configuration
  sensitivity: NexusAISensitivity;
}
