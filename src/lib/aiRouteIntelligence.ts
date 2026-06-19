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

type CorridorHealthProfile = {
  corridor: string;
  congestion: CorridorHealthSignal["congestion"];
  baseLiquidityPressure: CorridorHealthSignal["liquidityPressure"];
  highValueLiquidityPressure: CorridorHealthSignal["liquidityPressure"];
  payoutRisk: CorridorHealthSignal["payoutRisk"];
  normalHealthScore: number;
  highValueHealthScore: number;
  highValueThreshold: number;
  normalInsight: string;
  highValueInsight: string;
};

const CORRIDOR_HEALTH_PROFILES: Partial<Record<Currency, CorridorHealthProfile>> = {
  PHP: {
    corridor: "GBP → PHP",
    congestion: "LOW",
    baseLiquidityPressure: "LOW",
    highValueLiquidityPressure: "MEDIUM",
    payoutRisk: "LOW",
    normalHealthScore: 93,
    highValueHealthScore: 88,
    highValueThreshold: 750,
    normalInsight: "Philippines corridor operating strongly with low payout risk.",
    highValueInsight:
      "Philippines corridor healthy, with moderate liquidity sensitivity for larger transfers.",
  },
  MYR: {
    corridor: "GBP → MYR",
    congestion: "MEDIUM",
    baseLiquidityPressure: "MEDIUM",
    highValueLiquidityPressure: "HIGH",
    payoutRisk: "MEDIUM",
    normalHealthScore: 84,
    highValueHealthScore: 79,
    highValueThreshold: 600,
    normalInsight: "Malaysia corridor stable with balanced payout reliability.",
    highValueInsight:
      "Malaysia corridor stable, but AI is applying additional liquidity and payout-risk weighting.",
  },
  AED: {
    corridor: "GBP → AED",
    congestion: "LOW",
    baseLiquidityPressure: "LOW",
    highValueLiquidityPressure: "MEDIUM",
    payoutRisk: "LOW",
    normalHealthScore: 91,
    highValueHealthScore: 86,
    highValueThreshold: 900,
    normalInsight: "UAE corridor remains strong with consistent payout performance.",
    highValueInsight: "UAE corridor remains stable with moderate pressure for larger transfers.",
  },
  SAR: {
    corridor: "GBP → SAR",
    congestion: "MEDIUM",
    baseLiquidityPressure: "MEDIUM",
    highValueLiquidityPressure: "HIGH",
    payoutRisk: "MEDIUM",
    normalHealthScore: 85,
    highValueHealthScore: 80,
    highValueThreshold: 850,
    normalInsight: "Saudi corridor is healthy with strong weekday operating windows.",
    highValueInsight: "Saudi corridor remains available with elevated route capacity sensitivity.",
  },
  QAR: {
    corridor: "GBP → QAR",
    congestion: "MEDIUM",
    baseLiquidityPressure: "MEDIUM",
    highValueLiquidityPressure: "HIGH",
    payoutRisk: "MEDIUM",
    normalHealthScore: 84,
    highValueHealthScore: 79,
    highValueThreshold: 800,
    normalInsight: "Qatar corridor stable with managed payout partner concentration.",
    highValueInsight: "Qatar corridor is operational with tighter liquidity guardrails.",
  },
  KWD: {
    corridor: "GBP → KWD",
    congestion: "MEDIUM",
    baseLiquidityPressure: "MEDIUM",
    highValueLiquidityPressure: "HIGH",
    payoutRisk: "MEDIUM",
    normalHealthScore: 83,
    highValueHealthScore: 78,
    highValueThreshold: 750,
    normalInsight: "Kuwait corridor is stable with monitored payout throughput.",
    highValueInsight: "Kuwait corridor remains usable with increased liquidity pressure.",
  },
  BHD: {
    corridor: "GBP → BHD",
    congestion: "MEDIUM",
    baseLiquidityPressure: "MEDIUM",
    highValueLiquidityPressure: "HIGH",
    payoutRisk: "MEDIUM",
    normalHealthScore: 82,
    highValueHealthScore: 77,
    highValueThreshold: 700,
    normalInsight: "Bahrain corridor is operating with normal route capacity controls.",
    highValueInsight: "Bahrain corridor remains active with elevated liquidity monitoring.",
  },
  OMR: {
    corridor: "GBP → OMR",
    congestion: "MEDIUM",
    baseLiquidityPressure: "MEDIUM",
    highValueLiquidityPressure: "HIGH",
    payoutRisk: "MEDIUM",
    normalHealthScore: 82,
    highValueHealthScore: 76,
    highValueThreshold: 700,
    normalInsight: "Oman corridor is healthy with stable operational controls.",
    highValueInsight: "Oman corridor remains serviceable with tighter liquidity buffers.",
  },
  SGD: {
    corridor: "GBP → SGD",
    congestion: "LOW",
    baseLiquidityPressure: "LOW",
    highValueLiquidityPressure: "MEDIUM",
    payoutRisk: "LOW",
    normalHealthScore: 92,
    highValueHealthScore: 88,
    highValueThreshold: 950,
    normalInsight: "Singapore corridor is high quality with very strong market depth.",
    highValueInsight: "Singapore corridor remains strong with mild pressure at higher ticket sizes.",
  },
  THB: {
    corridor: "GBP → THB",
    congestion: "MEDIUM",
    baseLiquidityPressure: "MEDIUM",
    highValueLiquidityPressure: "HIGH",
    payoutRisk: "MEDIUM",
    normalHealthScore: 84,
    highValueHealthScore: 79,
    highValueThreshold: 700,
    normalInsight: "Thailand corridor is stable with good payout rail availability.",
    highValueInsight: "Thailand corridor remains available with rising liquidity pressure.",
  },
  IDR: {
    corridor: "GBP → IDR",
    congestion: "MEDIUM",
    baseLiquidityPressure: "MEDIUM",
    highValueLiquidityPressure: "HIGH",
    payoutRisk: "MEDIUM",
    normalHealthScore: 83,
    highValueHealthScore: 78,
    highValueThreshold: 650,
    normalInsight: "Indonesia corridor is healthy with managed partner risk.",
    highValueInsight: "Indonesia corridor remains usable with stricter liquidity controls.",
  },
  VND: {
    corridor: "GBP → VND",
    congestion: "MEDIUM",
    baseLiquidityPressure: "MEDIUM",
    highValueLiquidityPressure: "HIGH",
    payoutRisk: "MEDIUM",
    normalHealthScore: 82,
    highValueHealthScore: 77,
    highValueThreshold: 650,
    normalInsight: "Vietnam corridor is operational with stable settlement coverage.",
    highValueInsight: "Vietnam corridor remains active with heightened route capacity sensitivity.",
  },
};

export function getCorridorHealth(currency: Currency, amount: number): CorridorHealthSignal {
  const profile = CORRIDOR_HEALTH_PROFILES[currency];

  if (profile) {
    const highValue = amount >= profile.highValueThreshold;
    return {
      corridor: profile.corridor,
      congestion: profile.congestion,
      liquidityPressure: highValue
        ? profile.highValueLiquidityPressure
        : profile.baseLiquidityPressure,
      payoutRisk: profile.payoutRisk,
      healthScore: highValue ? profile.highValueHealthScore : profile.normalHealthScore,
      insight: highValue ? profile.highValueInsight : profile.normalInsight,
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
