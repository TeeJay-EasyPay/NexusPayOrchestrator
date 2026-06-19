import { RouteQuote } from "../types/transfer";

export type OperationalEventSeverity =
  | "INFO"
  | "WATCH"
  | "DEGRADED"
  | "FAILOVER";

export interface RouteOperationalEvent {
  eventType: string;
  severity: OperationalEventSeverity;
  status: "OPEN" | "RESOLVED" | "SIMULATED";
  message: string;
  recommendation: string;
  degradationScore: number;
  failoverRecommended: boolean;
  preferredAction: string;
  payload: Record<string, unknown>;
}

function randomBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function buildRouteOperationalEvent(
  route: RouteQuote
): RouteOperationalEvent {
  const treasuryScore = route.treasuryScore ?? 80;
  const risk = route.predictedFailureRisk ?? 8;
  const pressure = route.treasuryCorridorPressure ?? "LOW";

  const degradationScore = Math.max(
    10,
    Math.min(
      100,
      Math.round((100 - treasuryScore) * 0.7 + risk * 2)
    )
  );

  if (pressure === "CRITICAL" || degradationScore >= 85) {
    return {
      eventType: "FAILOVER_ESCALATION",
      severity: "FAILOVER",
      status: "SIMULATED",
      message:
        `${route.provider} route experiencing critical operational strain.`,
      recommendation:
        "Promote secondary liquidity rail and reduce corridor exposure.",
      degradationScore,
      failoverRecommended: true,
      preferredAction: "FAILOVER_TO_SECONDARY_ROUTE",
      payload: {
        provider: route.provider,
        rail: route.rail,
        corridorPressure: pressure,
        treasuryScore,
      },
    };
  }

  if (pressure === "HIGH" || degradationScore >= 70) {
    return {
      eventType: "ROUTE_DEGRADATION",
      severity: "DEGRADED",
      status: "SIMULATED",
      message:
        `${route.provider} liquidity conditions degraded under elevated corridor pressure.`,
      recommendation:
        "Reduce route priority and monitor route capacity utilisation.",
      degradationScore,
      failoverRecommended: true,
      preferredAction: "PROMOTE_BACKUP_ROUTE",
      payload: {
        provider: route.provider,
        rail: route.rail,
        treasuryScore,
        risk,
      },
    };
  }

  if (pressure === "MEDIUM" || degradationScore >= 45) {
    return {
      eventType: "TREASURY_WATCH",
      severity: "WATCH",
      status: "SIMULATED",
      message:
        `${route.provider} route operating normally with moderate corridor liquidity pressure.`,
      recommendation:
        "Continue monitoring liquidity and corridor conditions.",
      degradationScore,
      failoverRecommended: false,
      preferredAction: "MONITOR_ROUTE",
      payload: {
        provider: route.provider,
        rail: route.rail,
        corridorPressure: pressure,
      },
    };
  }

  return {
    eventType: "ROUTE_HEALTHY",
    severity: "INFO",
    status: "SIMULATED",
    message: `${route.provider} route operating within healthy parameters.`,
    recommendation: "Maintain standard orchestration weighting.",
    degradationScore: randomBetween(8, 30),
    failoverRecommended: false,
    preferredAction: "NO_ACTION_REQUIRED",
    payload: {
      provider: route.provider,
      rail: route.rail,
      treasuryScore,
    },
  };
}
