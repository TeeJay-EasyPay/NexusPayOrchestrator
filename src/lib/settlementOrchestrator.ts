import { Currency, RailType, RouteQuote } from "../types/transfer";

type LiquidityStatus =
  | "AVAILABLE"
  | "LOW"
  | "INSUFFICIENT"
  | "NOT_REQUIRED";

type BuildRouteQuoteInput = {
  amount: number;
  currency: Currency;
  simulatedRlusdBalance: number;
};

type RouteTemplate = {
  id: string;
  rail: RailType;
  provider: string;
  feeRate: number;
  minimumFee: number;
  estimatedTime: string;
  reliability: number;
  speedScore: number;
  costScore: number;
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
    feeRate: 0.021,
    minimumFee: 1.99,
    estimatedTime: "8-15 mins",
    reliability: 96,
    speedScore: 92,
    costScore: 82,
    orchestrationReason:
      "Selected when direct banking rails provide strong certainty and fast payout confirmation.",
  },
  {
    id: "partner-liquidity",
    rail: "FIAT",
    provider: "Partner Liquidity Route",
    feeRate: 0.0175,
    minimumFee: 1.49,
    estimatedTime: "15-30 mins",
    reliability: 94,
    speedScore: 78,
    costScore: 90,
    orchestrationReason:
      "Selected when NexusPay can reserve partner payout liquidity at a lower cost.",
  },
  {
    id: "rlusd-bridge",
    rail: "HYBRID",
    provider: "RLUSD Bridge Settlement",
    feeRate: 0.011,
    minimumFee: 0.89,
    estimatedTime: "2-5 mins",
    reliability: 91,
    speedScore: 98,
    costScore: 96,
    bridgeAsset: "RLUSD",
    orchestrationReason:
      "Selected when simulated RLUSD bridge liquidity is available for fast digital settlement and local fiat payout.",
  },
];

function roundMoney(value: number) {
  return Number(value.toFixed(2));
}

function getLiquidityStatus(required: number, available: number): LiquidityStatus {
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

export function buildOrchestratedRouteQuotes({
  amount,
  currency,
  simulatedRlusdBalance,
}: BuildRouteQuoteInput): RouteQuote[] {
  const fxRate = BASE_FX_RATES[currency] ?? 1;

  return ROUTE_TEMPLATES.map((route) => {
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

    const score = Math.max(
      1,
      Math.round(
        route.reliability * 0.4 +
          route.speedScore * 0.3 +
          route.costScore * 0.2 +
          (liquidityStatus === "AVAILABLE" ? 10 : 0) -
          liquidityPenalty
      )
    );

    const settlementStages = buildSettlementStages(route, liquidityStatus);

    return {
      id: route.id,
      rail: route.rail,
      provider: route.provider,

      sendAmount: amount,
      receiveAmount,
      fxRate,
      fee,

      estimatedTime: route.estimatedTime,
      score,

      bridgeAsset: route.bridgeAsset,
      liquidityRequiredRlusd,
      liquidityAvailable:
        liquidityStatus === "AVAILABLE" || liquidityStatus === "NOT_REQUIRED",
      liquidityStatus,

      orchestrationReason: route.orchestrationReason,
      routeConfidence: score,
      settlementStages,

      steps: settlementStages,
    };
  }).sort((a, b) => b.score - a.score);
}