import { FxRate } from "./fxFeed";

export type CorridorHealth = {
  corridor: string;
  from: string;
  to: string;
  fxRate: number;
  liquidityScore: number;
  partnerHealth: number;
  volatilityRisk: number;
  overallScore: number;
  status: "Excellent" | "Healthy" | "Watch" | "Restricted";
  source: "LIVE" | "MOCK_FALLBACK";
};

function calculateOverallScore(
  liquidityScore: number,
  partnerHealth: number,
  volatilityRisk: number
) {
  return Math.round(
    liquidityScore * 0.45 +
      partnerHealth * 0.35 +
      (100 - volatilityRisk) * 0.2
  );
}

function getStatus(score: number): CorridorHealth["status"] {
  if (score >= 85) return "Excellent";
  if (score >= 70) return "Healthy";
  if (score >= 55) return "Watch";
  return "Restricted";
}

export function buildCorridorHealth(fxRates: FxRate[]): CorridorHealth[] {
  return fxRates.map((rate, index) => {
    const liquidityScore = rate.to === "PHP" ? 88 : 81;
    const partnerHealth = rate.to === "PHP" ? 92 : 84;
    const volatilityRisk = rate.to === "PHP" ? 18 : 24;

    const overallScore = calculateOverallScore(
      liquidityScore,
      partnerHealth,
      volatilityRisk
    );

    return {
      corridor: `${rate.from} → ${rate.to}`,
      from: rate.from,
      to: rate.to,
      fxRate: rate.rate,
      liquidityScore,
      partnerHealth,
      volatilityRisk,
      overallScore,
      status: getStatus(overallScore),
      source: rate.source,
    };
  });
}