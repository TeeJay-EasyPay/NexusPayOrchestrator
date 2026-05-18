import { RouteQuote } from "../../types/transfer";

export type ProviderExecutionMetrics = {
  provider: string;
  healthScore: number;
  successRate: number;
  averageLatencyMinutes: number;
  degradationRisk: number;
  failoverRisk: number;
  recommendation: string;
};

function bounded(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

export function buildProviderExecutionMetrics(route: RouteQuote): ProviderExecutionMetrics {
  const healthScore = bounded(route.providerHealthScore ?? 82);
  const successRate = bounded(route.providerHistoricalSuccessRate ?? 96);
  const averageLatencyMinutes = route.providerAverageLatencyMinutes ?? 4;

  const degradationRisk = bounded(
    100 - ((healthScore * 0.6) + (successRate * 0.4))
  );

  const failoverRisk = bounded(
    degradationRisk + (route.predictedFailureRisk ?? 0) * 0.35
  );

  let recommendation = "Provider operating normally.";

  if (failoverRisk >= 70) {
    recommendation = "High degradation risk detected. Warm failover route should remain active.";
  } else if (failoverRisk >= 45) {
    recommendation = "Provider should remain under orchestration watch.";
  } else if (healthScore >= 90 && successRate >= 95) {
    recommendation = "Provider performing strongly with high execution reliability.";
  }

  return {
    provider: route.provider,
    healthScore,
    successRate,
    averageLatencyMinutes,
    degradationRisk,
    failoverRisk,
    recommendation,
  };
}
