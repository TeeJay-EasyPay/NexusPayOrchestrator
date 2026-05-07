import { Currency, PartnerHealth, RouteFamily } from "../types/transfer";

export type RouteOptimisationMode = "BALANCED" | "SPEED" | "LOW_COST" | "RESILIENCE";

export type ProviderIntelligenceProfile = {
  provider: string;
  historicalSuccessRate: number;
  averageLatencyMinutes: number;
  failureRisk: number;
  recentTrend: "IMPROVING" | "STABLE" | "DEGRADING";
  confidenceAdjustment: number;
};

export type CorridorHealthSignal = {
  corridor: string;
  congestion: "LOW" | "MEDIUM" | "HIGH";
  liquidityPressure: "LOW" | "MEDIUM" | "HIGH";
  payoutRisk: "LOW" | "MEDIUM" | "HIGH";
  healthScore: number;
  insight: string;
};

type ScoreInput = {
  provider: string;
  routeFamily: RouteFamily;
  currency: Currency;
  baseReliability: number;
  speedScore: number;
  costScore: number;
  liquidityScore: number;
  liquidityPenalty: number;
  amount: number;
  optimisationMode?: RouteOptimisationMode;
};

const PROVIDER_INTELLIGENCE: ProviderIntelligenceProfile[] = [
  {
    provider: "FastTrack Banking Rail",
    historicalSuccessRate: 98.7,
    averageLatencyMinutes: 11,
    failureRisk: 1.3,
    recentTrend: "STABLE",
    confidenceAdjustment: 2,
  },
  {
    provider: "Partner Liquidity Route",
    historicalSuccessRate: 97.8,
    averageLatencyMinutes: 23,
    failureRisk: 2.2,
    recentTrend: "IMPROVING",
    confidenceAdjustment: 3,
  },
  {
    provider: "RLUSD Bridge Settlement",
    historicalSuccessRate: 96.9,
    averageLatencyMinutes: 4,
    failureRisk: 2.8,
    recentTrend: "IMPROVING",
    confidenceAdjustment: 4,
  },
  {
    provider: "Economy Settlement Partner",
    historicalSuccessRate: 94.1,
    averageLatencyMinutes: 38,
    failureRisk: 5.9,
    recentTrend: "DEGRADING",
    confidenceAdjustment: -5,
  },
  {
    provider: "Reserve Corridor Rail",
    historicalSuccessRate: 96.2,
    averageLatencyMinutes: 29,
    failureRisk: 3.8,
    recentTrend: "STABLE",
    confidenceAdjustment: 0,
  },
];

const DEFAULT_PROVIDER_PROFILE: ProviderIntelligenceProfile = {
  provider: "Unknown Provider",
  historicalSuccessRate: 95,
  averageLatencyMinutes: 25,
  failureRisk: 4,
  recentTrend: "STABLE",
  confidenceAdjustment: 0,
};

export function getProviderIntelligence(provider: string) {
  return (
    PROVIDER_INTELLIGENCE.find((profile) => profile.provider === provider) ??
    DEFAULT_PROVIDER_PROFILE
  );
}

export function getCorridorHealth(currency: Currency, amount: number): CorridorHealthSignal {
  if (currency === "PHP") {
    const highValue = amount >= 750;

    return {
      corridor: "GBP → PHP",
      congestion: highValue ? "MEDIUM" : "LOW",
      liquidityPressure: highValue ? "MEDIUM" : "LOW",
      payoutRisk: "LOW",
      healthScore: highValue ? 88 : 93,
      insight: highValue
        ? "Philippines corridor healthy, with moderate liquidity sensitivity for larger transfers."
        : "Philippines corridor operating strongly with low payout risk.",
    };
  }

  if (currency === "MYR") {
    return {
      corridor: "GBP → MYR",
      congestion: "MEDIUM",
      liquidityPressure: amount >= 600 ? "HIGH" : "MEDIUM",
      payoutRisk: "MEDIUM",
      healthScore: amount >= 600 ? 79 : 84,
      insight: "Malaysia corridor stable, but AI is applying additional liquidity and payout-risk weighting.",
    };
  }

  return {
    corridor: `GBP → ${currency}`,
    congestion: "MEDIUM",
    liquidityPressure: "MEDIUM",
    payoutRisk: "MEDIUM",
    healthScore: 82,
    insight: "Corridor has limited live history, so the AI engine is applying conservative weighting.",
  };
}

function getPartnerHealthFromRisk(failureRisk: number, trend: ProviderIntelligenceProfile["recentTrend"]): PartnerHealth {
  if (failureRisk <= 1.8 && trend !== "DEGRADING") return "EXCELLENT";
  if (failureRisk <= 3.5) return "GOOD";
  if (failureRisk <= 6.5) return "WATCH";
  return "DEGRADED";
}

function getWeights(mode: RouteOptimisationMode) {
  if (mode === "SPEED") {
    return { reliability: 0.25, speed: 0.38, cost: 0.12, liquidity: 0.15, intelligence: 0.1 };
  }

  if (mode === "LOW_COST") {
    return { reliability: 0.24, speed: 0.12, cost: 0.38, liquidity: 0.16, intelligence: 0.1 };
  }

  if (mode === "RESILIENCE") {
    return { reliability: 0.38, speed: 0.14, cost: 0.14, liquidity: 0.18, intelligence: 0.16 };
  }

  return { reliability: 0.31, speed: 0.22, cost: 0.2, liquidity: 0.17, intelligence: 0.1 };
}

function getOptimisationModeForRoute(routeFamily: RouteFamily): RouteOptimisationMode {
  if (routeFamily === "FASTEST" || routeFamily === "DIGITAL_BRIDGE") return "SPEED";
  if (routeFamily === "LOWEST_COST") return "LOW_COST";
  if (routeFamily === "BACKUP" || routeFamily === "BEST_LIQUIDITY") return "RESILIENCE";
  return "BALANCED";
}

export function calculateAiRouteScore(input: ScoreInput) {
  const providerProfile = getProviderIntelligence(input.provider);
  const corridorHealth = getCorridorHealth(input.currency, input.amount);
  const optimisationMode = input.optimisationMode ?? getOptimisationModeForRoute(input.routeFamily);
  const weights = getWeights(optimisationMode);

  const intelligenceScore = Math.max(
    1,
    Math.min(
      100,
      providerProfile.historicalSuccessRate -
        providerProfile.failureRisk +
        providerProfile.confidenceAdjustment +
        (corridorHealth.healthScore - 85) * 0.35
    )
  );

  const rawScore =
    input.baseReliability * weights.reliability +
    input.speedScore * weights.speed +
    input.costScore * weights.cost +
    input.liquidityScore * weights.liquidity +
    intelligenceScore * weights.intelligence -
    input.liquidityPenalty;

  const score = Math.max(1, Math.min(100, Math.round(rawScore)));
  const predictedFailureRisk = Number(
    Math.max(
      0.3,
      providerProfile.failureRisk +
        (100 - corridorHealth.healthScore) * 0.04 +
        input.liquidityPenalty * 0.08
    ).toFixed(1)
  );

  const aiConfidence = Math.max(
    1,
    Math.min(100, Math.round((score * 0.65 + intelligenceScore * 0.35) - predictedFailureRisk * 0.3))
  );

  const partnerHealth = getPartnerHealthFromRisk(predictedFailureRisk, providerProfile.recentTrend);

  const aiDecisionFactors = [
    `${providerProfile.historicalSuccessRate.toFixed(1)}% historical provider success`,
    `${providerProfile.averageLatencyMinutes} min average payout latency`,
    `${predictedFailureRisk.toFixed(1)}% predicted failure risk`,
    `${corridorHealth.corridor} corridor health ${corridorHealth.healthScore}/100`,
    `${optimisationMode.toLowerCase().replace("_", " ")} optimisation weighting applied`,
  ];

  const aiRecommendation =
    score >= 92
      ? "AI preferred route: strongest balance of speed, cost, liquidity and provider reliability."
      : score >= 84
      ? "AI approved route: strong option with manageable operational risk."
      : score >= 74
      ? "AI watch route: usable, but monitored for latency or liquidity pressure."
      : "AI fallback route: retained for resilience but not preferred unless primary routes degrade.";

  return {
    score,
    aiConfidence,
    predictedFailureRisk,
    optimisationMode,
    partnerHealth,
    providerProfile,
    corridorHealth,
    aiDecisionFactors,
    aiRecommendation,
  };
}
