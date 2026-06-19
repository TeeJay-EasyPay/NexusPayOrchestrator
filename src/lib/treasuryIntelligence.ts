import { Currency, RailType } from "../types/transfer";

export type LiquidityDepth = "HIGH" | "MEDIUM" | "LOW" | "CONSTRAINED";
export type LiquidityPressure = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type TreasurySignalStatus = "STRONG" | "STABLE" | "WATCH" | "DEGRADED";

export type CorridorLiquiditySignal = {
  corridor: string;
  currency: Currency;
  liquidityDepth: LiquidityDepth;
  pressure: LiquidityPressure;
  availableCapacityScore: number;
  preferredRail: RailType;
  preferredBridgeAsset?: Currency;
  insight: string;
};

export type PartnerLiquiditySignal = {
  provider: string;
  liquidityDepth: LiquidityDepth;
  pressure: LiquidityPressure;
  availableCapacityScore: number;
  settlementCapacity: TreasurySignalStatus;
  insight: string;
};

export type RailLiquiditySignal = {
  rail: RailType;
  bridgeAsset?: Currency;
  liquidityDepth: LiquidityDepth;
  pressure: LiquidityPressure;
  availableCapacityScore: number;
  settlementCapacity: TreasurySignalStatus;
  insight: string;
};

export type TreasuryIntelligenceSignal = {
  corridor: CorridorLiquiditySignal;
  partner: PartnerLiquiditySignal;
  rail: RailLiquiditySignal;
  treasuryScore: number;
  treasuryPressurePenalty: number;
  liquidityRecommendation: string;
  decisionFactors: string[];
};

type TreasuryInput = {
  amount: number;
  currency: Currency;
  provider: string;
  rail: RailType;
  bridgeAsset?: Currency;
  simulatedRlusdBalance: number;
  liquidityRequiredRlusd?: number;
};

function clampScore(value: number) {
  return Math.max(1, Math.min(100, Math.round(value)));
}

function getPressurePenalty(pressure: LiquidityPressure) {
  if (pressure === "CRITICAL") return 24;
  if (pressure === "HIGH") return 14;
  if (pressure === "MEDIUM") return 7;
  return 0;
}

function getStatusFromScore(score: number): TreasurySignalStatus {
  if (score >= 90) return "STRONG";
  if (score >= 75) return "STABLE";
  if (score >= 55) return "WATCH";
  return "DEGRADED";
}

type CorridorLiquidityProfile = {
  corridor: string;
  baseLiquidityDepth: LiquidityDepth;
  highValueLiquidityDepth: LiquidityDepth;
  basePressure: LiquidityPressure;
  highValuePressure: LiquidityPressure;
  normalCapacityScore: number;
  highValueCapacityScore: number;
  highValueThreshold: number;
  preferredRail: RailType;
  preferredBridgeAsset?: Currency;
  normalInsight: string;
  highValueInsight: string;
};

const CORRIDOR_LIQUIDITY_PROFILES: Partial<Record<Currency, CorridorLiquidityProfile>> = {
  PHP: {
    corridor: "GBP → PHP",
    baseLiquidityDepth: "HIGH",
    highValueLiquidityDepth: "MEDIUM",
    basePressure: "LOW",
    highValuePressure: "MEDIUM",
    normalCapacityScore: 94,
    highValueCapacityScore: 86,
    highValueThreshold: 750,
    preferredRail: "HYBRID",
    preferredBridgeAsset: "RLUSD",
    normalInsight:
      "Philippines corridor has strong liquidity depth and is suitable for faster bridge-assisted routing.",
    highValueInsight:
      "Philippines liquidity remains healthy, but larger transfers are monitored for bridge and payout capacity.",
  },
  MYR: {
    corridor: "GBP → MYR",
    baseLiquidityDepth: "MEDIUM",
    highValueLiquidityDepth: "LOW",
    basePressure: "MEDIUM",
    highValuePressure: "HIGH",
    normalCapacityScore: 80,
    highValueCapacityScore: 72,
    highValueThreshold: 600,
    preferredRail: "FIAT",
    normalInsight: "Malaysia liquidity is stable with balanced treasury headroom.",
    highValueInsight:
      "Malaysia liquidity is available, but payout capacity is monitored more conservatively than Philippines routes.",
  },
  AED: {
    corridor: "GBP → AED",
    baseLiquidityDepth: "HIGH",
    highValueLiquidityDepth: "MEDIUM",
    basePressure: "LOW",
    highValuePressure: "MEDIUM",
    normalCapacityScore: 91,
    highValueCapacityScore: 84,
    highValueThreshold: 900,
    preferredRail: "FIAT",
    normalInsight: "UAE corridor shows strong treasury depth across partner rails.",
    highValueInsight: "UAE corridor remains liquid with moderate treasury pressure at higher amounts.",
  },
  SAR: {
    corridor: "GBP → SAR",
    baseLiquidityDepth: "MEDIUM",
    highValueLiquidityDepth: "LOW",
    basePressure: "MEDIUM",
    highValuePressure: "HIGH",
    normalCapacityScore: 83,
    highValueCapacityScore: 75,
    highValueThreshold: 850,
    preferredRail: "FIAT",
    normalInsight: "Saudi corridor capacity is stable with normal treasury controls.",
    highValueInsight: "Saudi corridor remains available with elevated treasury pressure for larger transfers.",
  },
  QAR: {
    corridor: "GBP → QAR",
    baseLiquidityDepth: "MEDIUM",
    highValueLiquidityDepth: "LOW",
    basePressure: "MEDIUM",
    highValuePressure: "HIGH",
    normalCapacityScore: 82,
    highValueCapacityScore: 74,
    highValueThreshold: 800,
    preferredRail: "FIAT",
    normalInsight: "Qatar corridor capacity is stable with measured payout concentration risk.",
    highValueInsight: "Qatar corridor is operational with tighter liquidity controls on larger tickets.",
  },
  KWD: {
    corridor: "GBP → KWD",
    baseLiquidityDepth: "MEDIUM",
    highValueLiquidityDepth: "LOW",
    basePressure: "MEDIUM",
    highValuePressure: "HIGH",
    normalCapacityScore: 81,
    highValueCapacityScore: 73,
    highValueThreshold: 750,
    preferredRail: "FIAT",
    normalInsight: "Kuwait corridor liquidity is healthy with steady settlement throughput.",
    highValueInsight: "Kuwait corridor remains usable with increased treasury pressure.",
  },
  BHD: {
    corridor: "GBP → BHD",
    baseLiquidityDepth: "MEDIUM",
    highValueLiquidityDepth: "LOW",
    basePressure: "MEDIUM",
    highValuePressure: "HIGH",
    normalCapacityScore: 80,
    highValueCapacityScore: 72,
    highValueThreshold: 700,
    preferredRail: "FIAT",
    normalInsight: "Bahrain corridor remains stable with predictable treasury utilisation.",
    highValueInsight: "Bahrain corridor remains operational with tighter liquidity margins.",
  },
  OMR: {
    corridor: "GBP → OMR",
    baseLiquidityDepth: "MEDIUM",
    highValueLiquidityDepth: "LOW",
    basePressure: "MEDIUM",
    highValuePressure: "HIGH",
    normalCapacityScore: 79,
    highValueCapacityScore: 71,
    highValueThreshold: 700,
    preferredRail: "FIAT",
    normalInsight: "Oman corridor liquidity is serviceable with stable treasury posture.",
    highValueInsight: "Oman corridor remains active with elevated pressure for larger payouts.",
  },
  SGD: {
    corridor: "GBP → SGD",
    baseLiquidityDepth: "HIGH",
    highValueLiquidityDepth: "MEDIUM",
    basePressure: "LOW",
    highValuePressure: "MEDIUM",
    normalCapacityScore: 93,
    highValueCapacityScore: 87,
    highValueThreshold: 950,
    preferredRail: "FIAT",
    normalInsight: "Singapore corridor has deep liquidity and strong settlement optionality.",
    highValueInsight: "Singapore corridor remains strong with mild treasury pressure at scale.",
  },
  THB: {
    corridor: "GBP → THB",
    baseLiquidityDepth: "MEDIUM",
    highValueLiquidityDepth: "LOW",
    basePressure: "MEDIUM",
    highValuePressure: "HIGH",
    normalCapacityScore: 82,
    highValueCapacityScore: 74,
    highValueThreshold: 700,
    preferredRail: "FIAT",
    normalInsight: "Thailand corridor liquidity is stable across primary payout banks.",
    highValueInsight: "Thailand corridor remains available with increased treasury pressure.",
  },
  IDR: {
    corridor: "GBP → IDR",
    baseLiquidityDepth: "MEDIUM",
    highValueLiquidityDepth: "LOW",
    basePressure: "MEDIUM",
    highValuePressure: "HIGH",
    normalCapacityScore: 81,
    highValueCapacityScore: 73,
    highValueThreshold: 650,
    preferredRail: "FIAT",
    normalInsight: "Indonesia corridor liquidity is stable with managed operational buffers.",
    highValueInsight: "Indonesia corridor remains usable with stricter treasury controls.",
  },
  VND: {
    corridor: "GBP → VND",
    baseLiquidityDepth: "MEDIUM",
    highValueLiquidityDepth: "LOW",
    basePressure: "MEDIUM",
    highValuePressure: "HIGH",
    normalCapacityScore: 80,
    highValueCapacityScore: 72,
    highValueThreshold: 650,
    preferredRail: "FIAT",
    normalInsight: "Vietnam corridor liquidity remains stable across supported payout windows.",
    highValueInsight: "Vietnam corridor remains operational with elevated treasury pressure.",
  },
};

function buildCorridorLiquidity(currency: Currency, amount: number): CorridorLiquiditySignal {
  const profile = CORRIDOR_LIQUIDITY_PROFILES[currency];

  if (profile) {
    const largerTransfer = amount >= profile.highValueThreshold;
    const availableCapacityScore = largerTransfer
      ? profile.highValueCapacityScore
      : profile.normalCapacityScore;

    return {
      corridor: profile.corridor,
      currency,
      liquidityDepth: largerTransfer
        ? profile.highValueLiquidityDepth
        : profile.baseLiquidityDepth,
      pressure: largerTransfer ? profile.highValuePressure : profile.basePressure,
      availableCapacityScore,
      preferredRail: profile.preferredRail,
      preferredBridgeAsset: profile.preferredBridgeAsset,
      insight: largerTransfer ? profile.highValueInsight : profile.normalInsight,
    };
  }

  return {
    corridor: `GBP → ${currency}`,
    currency,
    liquidityDepth: "MEDIUM",
    pressure: "MEDIUM",
    availableCapacityScore: 76,
    preferredRail: "FIAT",
    insight: "Corridor liquidity has limited operating history, so treasury applies conservative capacity assumptions.",
  };
}

function buildPartnerLiquidity(provider: string, amount: number): PartnerLiquiditySignal {
  const largeTransferPressure = amount >= 900;

  if (provider === "FastTrack Banking Rail") {
    const score = largeTransferPressure ? 86 : 92;

    return {
      provider,
      liquidityDepth: largeTransferPressure ? "MEDIUM" : "HIGH",
      pressure: largeTransferPressure ? "MEDIUM" : "LOW",
      availableCapacityScore: score,
      settlementCapacity: getStatusFromScore(score),
      insight: "FastTrack has strong immediate payout capacity for priority settlement routes.",
    };
  }

  if (provider === "Partner Liquidity Route") {
    const score = largeTransferPressure ? 82 : 88;

    return {
      provider,
      liquidityDepth: "MEDIUM",
      pressure: largeTransferPressure ? "MEDIUM" : "LOW",
      availableCapacityScore: score,
      settlementCapacity: getStatusFromScore(score),
      insight: "Partner liquidity is stable and suitable for resilience-focused routing.",
    };
  }

  if (provider === "RLUSD Bridge Settlement") {
    const score = largeTransferPressure ? 80 : 91;

    return {
      provider,
      liquidityDepth: largeTransferPressure ? "MEDIUM" : "HIGH",
      pressure: largeTransferPressure ? "MEDIUM" : "LOW",
      availableCapacityScore: score,
      settlementCapacity: getStatusFromScore(score),
      insight: "RLUSD bridge provider liquidity is strongest when bridge reserves are available.",
    };
  }

  if (provider === "Economy Settlement Partner") {
    const score = largeTransferPressure ? 58 : 68;

    return {
      provider,
      liquidityDepth: largeTransferPressure ? "CONSTRAINED" : "LOW",
      pressure: largeTransferPressure ? "HIGH" : "MEDIUM",
      availableCapacityScore: score,
      settlementCapacity: getStatusFromScore(score),
      insight: "Economy route liquidity is cost-efficient but more sensitive to payout pressure.",
    };
  }

  const score = largeTransferPressure ? 76 : 84;

  return {
    provider,
    liquidityDepth: "MEDIUM",
    pressure: largeTransferPressure ? "MEDIUM" : "LOW",
    availableCapacityScore: score,
    settlementCapacity: getStatusFromScore(score),
    insight: "Reserve route maintains usable fallback liquidity for failover resilience.",
  };
}

function buildRailLiquidity({
  rail,
  bridgeAsset,
  simulatedRlusdBalance,
  liquidityRequiredRlusd = 0,
}: Pick<
  TreasuryInput,
  "rail" | "bridgeAsset" | "simulatedRlusdBalance" | "liquidityRequiredRlusd"
>): RailLiquiditySignal {
  if (rail === "HYBRID" && bridgeAsset === "RLUSD") {
    const coverageRatio =
      liquidityRequiredRlusd <= 0
        ? 1
        : simulatedRlusdBalance / liquidityRequiredRlusd;

    const availableCapacityScore = clampScore(coverageRatio >= 1 ? 96 : coverageRatio * 90);
    const pressure: LiquidityPressure =
      coverageRatio >= 1
        ? "LOW"
        : coverageRatio >= 0.7
        ? "MEDIUM"
        : coverageRatio >= 0.45
        ? "HIGH"
        : "CRITICAL";

    const liquidityDepth: LiquidityDepth =
      coverageRatio >= 1
        ? "HIGH"
        : coverageRatio >= 0.7
        ? "MEDIUM"
        : coverageRatio >= 0.45
        ? "LOW"
        : "CONSTRAINED";

    return {
      rail,
      bridgeAsset,
      liquidityDepth,
      pressure,
      availableCapacityScore,
      settlementCapacity: getStatusFromScore(availableCapacityScore),
      insight:
        pressure === "LOW"
          ? "RLUSD bridge reserves are sufficient for this route."
          : "RLUSD bridge reserves are under pressure, so treasury reduces hybrid route preference.",
    };
  }

  if (rail === "FIAT") {
    return {
      rail,
      liquidityDepth: "MEDIUM",
      pressure: "LOW",
      availableCapacityScore: 84,
      settlementCapacity: "STABLE",
      insight: "Fiat rail liquidity is stable, with slower settlement but lower bridge-reserve dependency.",
    };
  }

  return {
    rail,
    bridgeAsset,
    liquidityDepth: "MEDIUM",
    pressure: "MEDIUM",
    availableCapacityScore: 74,
    settlementCapacity: "WATCH",
    insight: "Crypto rail liquidity is usable but monitored for market depth and volatility.",
  };
}

export function getTreasuryIntelligence(input: TreasuryInput): TreasuryIntelligenceSignal {
  const corridor = buildCorridorLiquidity(input.currency, input.amount);
  const partner = buildPartnerLiquidity(input.provider, input.amount);
  const rail = buildRailLiquidity(input);

  const pressurePenalty =
    getPressurePenalty(corridor.pressure) +
    getPressurePenalty(partner.pressure) +
    getPressurePenalty(rail.pressure);

  const treasuryScore = clampScore(
    corridor.availableCapacityScore * 0.38 +
      partner.availableCapacityScore * 0.32 +
      rail.availableCapacityScore * 0.3 -
      pressurePenalty * 0.45
  );

  const treasuryPressurePenalty = Math.round(pressurePenalty * 0.55);

  const liquidityRecommendation =
    treasuryScore >= 90
      ? "Treasury preferred: strong liquidity depth across corridor, partner and settlement rail."
      : treasuryScore >= 78
      ? "Treasury approved: sufficient liquidity available with manageable pressure."
      : treasuryScore >= 62
      ? "Treasury watch: route is usable, but liquidity pressure should be monitored."
      : "Treasury constrained: preserve this route for fallback unless stronger liquidity becomes available.";

  const decisionFactors = [
    `${corridor.corridor} liquidity ${corridor.liquidityDepth.toLowerCase()} with ${corridor.pressure.toLowerCase()} pressure`,
    `${partner.provider} capacity ${partner.availableCapacityScore}/100`,
    `${rail.rail}${rail.bridgeAsset ? `/${rail.bridgeAsset}` : ""} rail capacity ${rail.availableCapacityScore}/100`,
    `Treasury liquidity score ${treasuryScore}/100`,
  ];

  return {
    corridor,
    partner,
    rail,
    treasuryScore,
    treasuryPressurePenalty,
    liquidityRecommendation,
    decisionFactors,
  };
}

export async function getTreasurySignal(
  corridor: string,
  amount: number
): Promise<TreasuryIntelligenceSignal> {
  const currency = (corridor.split("→").pop()?.trim() || "PHP") as Currency;

  return getTreasuryIntelligence({
    amount,
    currency,
    provider: "Partner Liquidity Route",
    rail: "FIAT",
    simulatedRlusdBalance: 0,
  });
}
