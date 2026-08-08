import { FxRate } from "./fxFeed";

export type VolatilityLevel = "Low" | "Moderate" | "Elevated" | "High";

export type CorridorHealth = {
  corridor: string;
  from: string;
  to: string;
  fxRate: number;
  liquidityScore: number;
  partnerHealth: number;
  volatilityRisk: number;
  volatilityLevel: VolatilityLevel;
  routeConfidence: number;
  overallScore: number;
  status: "Excellent" | "Healthy" | "Watch" | "Restricted";
  source: "LIVE";
  provider: string;
  providerStatus: string;
  activeRail: string;
  fallbackRail: string;
  intelligenceSummary: string;
};

function getProviderConfidence(provider: string, source: FxRate["source"]) {
  switch (provider) {
    case "Frankfurter":
      return 96;
    case "ExchangeRate API":
      return 91;
    case "Currency API CDN":
      return 88;
    case "FloatRates":
      return 84;
    case "Open Exchange Rates":
      return 93;
    case "Fixer":
      return 90;
    case "CurrencyLayer":
      return 89;
    default:
      return 80;
  }
}

function getVolatilityRisk(to: string, provider: string, source: FxRate["source"]) {
  let baseRisk = to === "PHP" ? 18 : 24;

  if (provider !== "Frankfurter") baseRisk += 4;

  return Math.min(baseRisk, 75);
}

function getVolatilityLevel(risk: number): VolatilityLevel {
  if (risk <= 20) return "Low";
  if (risk <= 35) return "Moderate";
  if (risk <= 55) return "Elevated";
  return "High";
}

function calculateOverallScore(
  liquidityScore: number,
  partnerHealth: number,
  volatilityRisk: number,
  providerConfidence: number
) {
  return Math.round(
    liquidityScore * 0.35 +
      partnerHealth * 0.25 +
      (100 - volatilityRisk) * 0.2 +
      providerConfidence * 0.2
  );
}

function calculateRouteConfidence(
  overallScore: number,
  providerConfidence: number,
  source: FxRate["source"]
) {
  const confidence = Math.round(overallScore * 0.65 + providerConfidence * 0.35);

  return confidence;
}

function getStatus(score: number): CorridorHealth["status"] {
  if (score >= 85) return "Excellent";
  if (score >= 70) return "Healthy";
  if (score >= 55) return "Watch";
  return "Restricted";
}

function getActiveRail(to: string) {
  if (to === "PHP") return "XRPL + RLUSD bridge";
  if (to === "MYR") return "Hybrid FX + payout rail";
  return "Optimised payout rail";
}

function getFallbackRail(to: string) {
  if (to === "PHP") return "Bank payout partner";
  if (to === "MYR") return "Secondary liquidity provider";
  return "Manual route capacity review";
}

export function buildCorridorHealth(fxRates: FxRate[]): CorridorHealth[] {
  return fxRates.map((rate) => {
    const liquidityScore = rate.to === "PHP" ? 88 : 81;
    const partnerHealth = rate.to === "PHP" ? 92 : 84;

    const providerConfidence = getProviderConfidence(rate.provider, rate.source);
    const volatilityRisk = getVolatilityRisk(rate.to, rate.provider, rate.source);
    const volatilityLevel = getVolatilityLevel(volatilityRisk);

    const overallScore = calculateOverallScore(
      liquidityScore,
      partnerHealth,
      volatilityRisk,
      providerConfidence
    );

    const routeConfidence = calculateRouteConfidence(
      overallScore,
      providerConfidence,
      rate.source
    );

    const status = getStatus(overallScore);

    return {
      corridor: `${rate.from} → ${rate.to}`,
      from: rate.from,
      to: rate.to,
      fxRate: rate.rate,
      liquidityScore,
      partnerHealth,
      volatilityRisk,
      volatilityLevel,
      routeConfidence,
      overallScore,
      status,
      source: rate.source,
      provider: rate.provider,
      providerStatus: rate.providerStatus,
      activeRail: getActiveRail(rate.to),
      fallbackRail: getFallbackRail(rate.to),
      intelligenceSummary: `Live FX via ${rate.provider}; non-FX corridor inputs are configured estimates and are not operational evidence.`,
    };
  });
}
