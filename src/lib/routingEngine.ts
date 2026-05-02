import { RouteOption, ScoredRoute } from "../types";

function normaliseLowerIsBetter(value: number, min: number, max: number) {
  if (max === min) return 100;
  return ((max - value) / (max - min)) * 100;
}

function normaliseHigherIsBetter(value: number, min: number, max: number) {
  if (max === min) return 100;
  return ((value - min) / (max - min)) * 100;
}

function riskToScore(riskLevel: RouteOption["riskLevel"]) {
  if (riskLevel === "Low") return 100;
  if (riskLevel === "Medium") return 70;
  return 40;
}

export function scoreRoutes(routes: RouteOption[]): ScoredRoute[] {
  const fees = routes.map((route) => route.feeGbp);
  const speeds = routes.map((route) => route.etaMinutes);
  const fxRates = routes.map((route) => route.fxRate);
  const reliability = routes.map((route) => route.reliabilityPercent);

  const minFee = Math.min(...fees);
  const maxFee = Math.max(...fees);

  const minSpeed = Math.min(...speeds);
  const maxSpeed = Math.max(...speeds);

  const minFx = Math.min(...fxRates);
  const maxFx = Math.max(...fxRates);

  const minReliability = Math.min(...reliability);
  const maxReliability = Math.max(...reliability);

  return routes.map((route) => {
    const costScore = normaliseLowerIsBetter(route.feeGbp, minFee, maxFee);
    const speedScore = normaliseLowerIsBetter(route.etaMinutes, minSpeed, maxSpeed);
    const reliabilityScore = normaliseHigherIsBetter(
      route.reliabilityPercent,
      minReliability,
      maxReliability
    );
    const fxScore = normaliseHigherIsBetter(route.fxRate, minFx, maxFx);
    const riskScore = riskToScore(route.riskLevel);

    const finalScore =
      costScore * 0.35 +
      speedScore * 0.25 +
      reliabilityScore * 0.2 +
      fxScore * 0.1 +
      riskScore * 0.1;

    return {
      ...route,
      costScore,
      speedScore,
      reliabilityScore,
      fxScore,
      riskScore,
      finalScore,
    };
  });
}

export function labelRoutes(routes: ScoredRoute[]): ScoredRoute[] {
  const best = [...routes].sort((a, b) => b.finalScore - a.finalScore)[0];
  const cheapest = [...routes].sort((a, b) => a.feeGbp - b.feeGbp)[0];
  const fastest = [...routes].sort((a, b) => a.etaMinutes - b.etaMinutes)[0];

  return routes.map((route) => {
    if (route.id === best.id) return { ...route, label: "Best Overall" };
    if (route.id === cheapest.id) return { ...route, label: "Cheapest" };
    if (route.id === fastest.id) return { ...route, label: "Fastest" };
    return route;
  });
}

export function getRankedRoutes(routes: RouteOption[]) {
  return labelRoutes(scoreRoutes(routes)).sort(
    (a, b) => b.finalScore - a.finalScore
  );
}