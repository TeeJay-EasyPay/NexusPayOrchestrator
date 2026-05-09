import { Currency, RailType, RouteFamily } from "../types/transfer";

export type ProviderMode = "MOCK" | "SANDBOX" | "LIVE";

export type ProviderCapability =
  | "FX_QUOTE"
  | "PAYOUT"
  | "SETTLEMENT"
  | "LIQUIDITY_CHECK";

export type ProviderHealthStatus = "HEALTHY" | "WATCH" | "DEGRADED" | "OFFLINE";

export interface ProviderAdapter {
  id: string;
  displayName: string;
  mode: ProviderMode;
  rail: RailType;
  routeFamily: RouteFamily;
  capabilities: ProviderCapability[];
  baseLatencyMs: number;
  timeoutMs: number;
  maxRetries: number;
  quoteTtlSeconds: number;
  healthScore: number;
  healthStatus: ProviderHealthStatus;
  sandboxReliability: number;
  liveReliability: number;
}

export interface ProviderQuoteRequest {
  transactionId: string;
  routeId: string;
  amount: number;
  sourceCurrency: Currency;
  destinationCurrency: Currency;
}

export interface ProviderExecutionProfile {
  providerId: string;
  providerName: string;
  providerMode: ProviderMode;
  providerHealthScore: number;
  providerHealthStatus: ProviderHealthStatus;
  timeoutMs: number;
  maxRetries: number;
  retryBackoffMs: number[];
  idempotencyKey: string;
  quoteIssuedAt: number;
  quoteExpiresAt: number;
  quoteTtlSeconds: number;
  quoteExpired: boolean;
  providerReference: string;
  executionModeDescription: string;
}

export const DEFAULT_PROVIDER_MODE: ProviderMode = "MOCK";

const PROVIDER_ADAPTERS: ProviderAdapter[] = [
  {
    id: "fasttrack-bank-sandbox",
    displayName: "FastTrack Banking Rail",
    mode: "SANDBOX",
    rail: "FIAT",
    routeFamily: "FASTEST",
    capabilities: ["FX_QUOTE", "PAYOUT"],
    baseLatencyMs: 850,
    timeoutMs: 4500,
    maxRetries: 2,
    quoteTtlSeconds: 45,
    healthScore: 96,
    healthStatus: "HEALTHY",
    sandboxReliability: 98.8,
    liveReliability: 97.4,
  },
  {
    id: "partner-liquidity-sandbox",
    displayName: "Partner Liquidity Route",
    mode: "SANDBOX",
    rail: "FIAT",
    routeFamily: "BEST_LIQUIDITY",
    capabilities: ["FX_QUOTE", "PAYOUT", "LIQUIDITY_CHECK"],
    baseLatencyMs: 1100,
    timeoutMs: 5200,
    maxRetries: 2,
    quoteTtlSeconds: 50,
    healthScore: 91,
    healthStatus: "HEALTHY",
    sandboxReliability: 97.6,
    liveReliability: 96.8,
  },
  {
    id: "rlusd-bridge-mock",
    displayName: "RLUSD Bridge Settlement",
    mode: "MOCK",
    rail: "HYBRID",
    routeFamily: "DIGITAL_BRIDGE",
    capabilities: ["FX_QUOTE", "SETTLEMENT", "LIQUIDITY_CHECK"],
    baseLatencyMs: 700,
    timeoutMs: 3800,
    maxRetries: 3,
    quoteTtlSeconds: 30,
    healthScore: 89,
    healthStatus: "WATCH",
    sandboxReliability: 96.9,
    liveReliability: 0,
  },
  {
    id: "economy-payout-mock",
    displayName: "Economy Settlement Partner",
    mode: "MOCK",
    rail: "FIAT",
    routeFamily: "LOWEST_COST",
    capabilities: ["FX_QUOTE", "PAYOUT"],
    baseLatencyMs: 1700,
    timeoutMs: 6500,
    maxRetries: 1,
    quoteTtlSeconds: 60,
    healthScore: 74,
    healthStatus: "WATCH",
    sandboxReliability: 94.2,
    liveReliability: 92.8,
  },
  {
    id: "reserve-corridor-mock",
    displayName: "Reserve Corridor Rail",
    mode: "MOCK",
    rail: "FIAT",
    routeFamily: "BACKUP",
    capabilities: ["FX_QUOTE", "PAYOUT"],
    baseLatencyMs: 1400,
    timeoutMs: 6000,
    maxRetries: 2,
    quoteTtlSeconds: 55,
    healthScore: 86,
    healthStatus: "HEALTHY",
    sandboxReliability: 96.4,
    liveReliability: 95.9,
  },
];

function buildIdempotencyKey(request: ProviderQuoteRequest, providerId: string) {
  return [
    "nexuspay",
    request.transactionId || "preview",
    request.routeId,
    providerId,
    request.sourceCurrency,
    request.destinationCurrency,
    request.amount.toFixed(2),
  ].join(":");
}

function buildRetryBackoff(maxRetries: number, baseLatencyMs: number) {
  return Array.from({ length: maxRetries }, (_, index) =>
    Math.round(baseLatencyMs * Math.pow(1.7, index + 1))
  );
}

export function getProviderAdapterForRoute(providerName: string) {
  return (
    PROVIDER_ADAPTERS.find((adapter) => adapter.displayName === providerName) ??
    PROVIDER_ADAPTERS[PROVIDER_ADAPTERS.length - 1]
  );
}

export function listProviderAdapters() {
  return PROVIDER_ADAPTERS;
}

export function buildProviderExecutionProfile(
  request: ProviderQuoteRequest,
  providerName: string
): ProviderExecutionProfile {
  const adapter = getProviderAdapterForRoute(providerName);
  const quoteIssuedAt = Date.now();
  const quoteExpiresAt = quoteIssuedAt + adapter.quoteTtlSeconds * 1000;

  return {
    providerId: adapter.id,
    providerName: adapter.displayName,
    providerMode: adapter.mode,
    providerHealthScore: adapter.healthScore,
    providerHealthStatus: adapter.healthStatus,
    timeoutMs: adapter.timeoutMs,
    maxRetries: adapter.maxRetries,
    retryBackoffMs: buildRetryBackoff(adapter.maxRetries, adapter.baseLatencyMs),
    idempotencyKey: buildIdempotencyKey(request, adapter.id),
    quoteIssuedAt,
    quoteExpiresAt,
    quoteTtlSeconds: adapter.quoteTtlSeconds,
    quoteExpired: false,
    providerReference: `${adapter.mode}-${adapter.id}-${quoteIssuedAt}`,
    executionModeDescription:
      adapter.mode === "LIVE"
        ? "Live provider execution enabled."
        : adapter.mode === "SANDBOX"
        ? "Sandbox provider execution simulated against partner-style controls."
        : "Mock provider execution used for safe local orchestration testing.",
  };
}

export function isProviderQuoteExpired(profile: Pick<ProviderExecutionProfile, "quoteExpiresAt">) {
  return Date.now() > profile.quoteExpiresAt;
}
