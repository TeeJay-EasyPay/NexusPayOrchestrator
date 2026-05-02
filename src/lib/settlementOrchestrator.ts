import {
    Currency,
    LiquidityStatus,
    PartnerHealth,
    RailType,
    RouteFamily,
    RouteQuote,
} from "../types/transfer";

type BuildRouteQuoteInput = {
  amount: number;
  currency: Currency;
  simulatedRlusdBalance: number;
};

type RouteTemplate = {
  id: string;
  rail: RailType;
  provider: string;
  routeFamily: RouteFamily;
  feeRate: number;
  minimumFee: number;
  estimatedTime: string;
  reliability: number;
  speedScore: number;
  costScore: number;
  partnerHealth: PartnerHealth;
  partnerUptime: number;
  bridgeAsset?: Currency;
  orchestrationReason: string;
};

const BASE_FX_RATES: Partial<Record<Currency, number>> = {
  PHP: 70.25,
  MYR: 5.85,
  AED: 4.65,
};

const GBP_TO_RLUSD_RATE = 1.27;

const ROUTE_TEMPLATES: RouteTemplate[] = [
  {
    id: "fast-fiat",
    rail: "FIAT",
    provider: "FastTrack Banking Rail",
    routeFamily: "FASTEST",
    feeRate: 0.021,
    minimumFee: 1.99,
    estimatedTime: "8-15 mins",
    reliability: 96,
    speedScore: 97,
    costScore: 82,
    partnerHealth: "EXCELLENT",
    partnerUptime: 99.91,
    orchestrationReason:
      "Optimised for fastest payout execution and settlement confirmation.",
  },
  {
    id: "partner-liquidity",
    rail: "FIAT",
    provider: "Partner Liquidity Route",
    routeFamily: "BEST_LIQUIDITY",
    feeRate: 0.0175,
    minimumFee: 1.49,
    estimatedTime: "15-30 mins",
    reliability: 94,
    speedScore: 78,
    costScore: 90,
    partnerHealth: "GOOD",
    partnerUptime: 99.42,
    orchestrationReason:
      "Selected for strong payout corridor liquidity coverage.",
  },
  {
    id: "rlusd-bridge",
    rail: "HYBRID",
    provider: "RLUSD Bridge Settlement",
    routeFamily: "DIGITAL_BRIDGE",
    feeRate: 0.011,
    minimumFee: 0.89,
    estimatedTime: "2-5 mins",
    reliability: 91,
    speedScore: 99,
    costScore: 96,
    partnerHealth: "GOOD",
    partnerUptime: 99.12,
    bridgeAsset: "RLUSD",
    orchestrationReason:
      "XRPL bridge settlement selected for ultra-fast hybrid payout routing.",
  },
  {
    id: "economy-route",
    rail: "FIAT",
    provider: "Economy Settlement Partner",
    routeFamily: "LOWEST_COST",
    feeRate: 0.009,
    minimumFee: 0.79,
    estimatedTime: "25-45 mins",
    reliability: 88,
    speedScore: 65,
    costScore: 99,
    partnerHealth: "WATCH",
    partnerUptime: 98.14,
    orchestrationReason:
      "Low-cost payout path selected for fee optimisation.",
  },
  {
    id: "backup-corridor",
    rail: "FIAT",
    provider: "Reserve Corridor Rail",
    routeFamily: "BACKUP",
    feeRate: 0.019,
    minimumFee: 1.59,
    estimatedTime: "20-35 mins",
    reliability: 90,
    speedScore: 74,
    costScore: 80,
    partnerHealth: "GOOD",
    partnerUptime: 99.31,
    orchestrationReason:
      "Backup corridor route available for failover resilience.",
  },
];

function roundMoney(value: number) {
  return Number(value.toFixed(2));
}

function getLiquidityStatus(
  required: number,
  available: number
): LiquidityStatus {
  if (required <= 0) return "NOT_REQUIRED";
  if (available >= required) return "AVAILABLE";
  if (available >= required * 0.5) return "LOW";
  return "INSUFFICIENT";
}

function getLiquidityPenalty(status: LiquidityStatus) {
  if (status === "AVAILABLE") return 0;
  if (status === "LOW") return 12;
  if (status === "INSUFFICIENT") return 28;
  return 0;
}

function getLiquidityScore(status: LiquidityStatus) {
  if (status === "AVAILABLE") return 100;
  if (status === "LOW") return 62;
  if (status === "INSUFFICIENT") return 20;
  return 90;
}

function buildSettlementStages(
  route: RouteTemplate,
  liquidityStatus: LiquidityStatus
): string[] {
  if (route.rail === "HYBRID") {
    return [
      "GBP funds reserved from sender wallet",
      "RLUSD bridge liquidity checked",
      liquidityStatus === "AVAILABLE"
        ? "RLUSD bridge liquidity reserved"
        : "RLUSD liquidity shortfall flagged for treasury top-up",
      "XRPL settlement rail prepared",
      "Local payout partner receives fiat payout instruction",
      "Recipient payout completed",
    ];
  }

  return [
    "GBP funds reserved from sender wallet",
    "Compliance and payout checks completed",
    "Fiat liquidity partner selected",
    "Payout instruction submitted to local partner",
    "Recipient payout completed",
  ];
}

function getRouteRankLabel(family: RouteFamily) {
  switch (family) {
    case "FASTEST":
      return "Fastest Route";
    case "LOWEST_COST":
      return "Lowest Cost";
    case "BEST_LIQUIDITY":
      return "Best Liquidity";
    case "DIGITAL_BRIDGE":
      return "Digital Bridge";
    case "BACKUP":
      return "Backup Route";
    default:
      return "Optimised";
  }
}

export function buildOrchestratedRouteQuotes({
  amount,
  currency,
  simulatedRlusdBalance,
}: BuildRouteQuoteInput): RouteQuote[] {
  const fxRate = BASE_FX_RATES[currency] ?? 1;

  const routes = ROUTE_TEMPLATES.map((route) => {
    const fee = roundMoney(Math.max(route.minimumFee, amount * route.feeRate));

    const netSendAmount = Math.max(0, amount - fee);

    const receiveAmount = roundMoney(netSendAmount * fxRate);

    const liquidityRequiredRlusd =
      route.bridgeAsset === "RLUSD"
        ? roundMoney(netSendAmount * GBP_TO_RLUSD_RATE)
        : 0;

    const liquidityStatus = getLiquidityStatus(
      liquidityRequiredRlusd,
      simulatedRlusdBalance
    );

    const liquidityPenalty = getLiquidityPenalty(liquidityStatus);

    const liquidityScore = getLiquidityScore(liquidityStatus);

    const score = Math.max(
      1,
      Math.round(
        route.reliability * 0.35 +
          route.speedScore * 0.25 +
          route.costScore * 0.2 +
          liquidityScore * 0.2 -
          liquidityPenalty
      )
    );

    const settlementStages = buildSettlementStages(route, liquidityStatus);

    return {
      id: route.id,
      rail: route.rail,
      provider: route.provider,

      routeFamily: route.routeFamily,
      routeRankLabel: getRouteRankLabel(route.routeFamily),

      sendAmount: amount,
      receiveAmount,
      fxRate,
      fee,

      estimatedTime: route.estimatedTime,
      score,

      speedScore: route.speedScore,
      costScore: route.costScore,
      liquidityScore,
      reliabilityScore: route.reliability,

      bridgeAsset: route.bridgeAsset,
      liquidityRequiredRlusd,
      liquidityAvailable:
        liquidityStatus === "AVAILABLE" || liquidityStatus === "NOT_REQUIRED",
      liquidityStatus,

      partnerHealth: route.partnerHealth,
      partnerUptime: route.partnerUptime,

      orchestrationReason: route.orchestrationReason,
      routeConfidence: score,
      settlementStages,

      steps: settlementStages,
    };
  });

  const sortedRoutes = routes.sort((a, b) => b.score - a.score);

  return sortedRoutes.map((route) => ({
    ...route,
    evaluatedRoutesCount: sortedRoutes.length,
  }));
}