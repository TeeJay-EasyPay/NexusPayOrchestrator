export type RouteType = "fiat" | "xrp" | "stablecoin";

export type RouteOption = {
  id: string;
  title: string;
  type: RouteType;
  path: string;
  feeGbp: number;
  etaMinutes: number;
  reliabilityPercent: number;
  recipientReceivesPhp: number;
  fxRate: number;
  riskLevel: "Low" | "Medium" | "High";
  reason: string;
};

export type ScoredRoute = RouteOption & {
  costScore: number;
  speedScore: number;
  reliabilityScore: number;
  fxScore: number;
  riskScore: number;
  finalScore: number;
  label?: "Best Overall" | "Cheapest" | "Fastest";
};