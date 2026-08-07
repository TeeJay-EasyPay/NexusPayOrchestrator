import { fetchLiveFxRate } from "../lib/fxFeed";
import { createTransferId } from "../lib/id";
import { supabase } from "../lib/supabase";
import type { CanonicalRoutePlan, RouteDataProvenance, RouteEvidence } from "../types/routePlan";
import type { Currency, FundingMethod, PayoutMethod, RouteQuote } from "../types/transfer";

const EVIDENCE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const QUOTE_TTL_MS = 15 * 60 * 1000;

type RouteGenerationInput = {
  amount: number;
  sourceCurrency?: Currency;
  destinationCurrency: Currency;
  destinationCountry: string;
  payoutMethod: PayoutMethod;
  fundingMethod?: FundingMethod;
  actualRlusdBalance?: number | null;
};

type ConnectionTest = {
  provider_id: string;
  status: "SUCCESS" | "FAILED" | "SKIPPED";
  readiness: string;
  response_time_ms: number | null;
  tested_at: string;
  institution_count: number | null;
};

type CorridorRecord = {
  provider_id: string;
  source_country: string;
  destination_country: string;
  source_currency: string;
  destination_currency: string;
  environment: string;
  readiness_status: string;
  provenance: string;
  last_validated_at: string | null;
};

type ExecutionRecord = {
  state: string;
  created_at?: string;
  completed_at?: string | null;
  snapshot?: {
    payout?: { providerId?: string; providerName?: string };
  } | null;
};

type CapabilityRecord = {
  provider_id: string;
  capability_code: string;
  readiness_status: string;
  provenance: string;
  last_validated_at: string | null;
};

function evidence<T>(
  value: T,
  provenance: RouteDataProvenance,
  source: string,
  observedAt: string,
  confidence: number,
  reason?: string,
): RouteEvidence<T> {
  return { value, provenance, source, observedAt, confidence, reason };
}

function unavailable<T>(value: T, source: string, reason: string, observedAt = new Date().toISOString()) {
  return evidence(value, "UNAVAILABLE", source, observedAt, 0, reason);
}

function isFresh(timestamp?: string | null) {
  if (!timestamp) return false;
  const parsed = Date.parse(timestamp);
  return Number.isFinite(parsed) && Date.now() - parsed <= EVIDENCE_MAX_AGE_MS;
}

function normalizeProvenance(value: string): RouteDataProvenance {
  const supported: RouteDataProvenance[] = [
    "LIVE", "SANDBOX", "TESTNET", "DERIVED", "ESTIMATED",
    "SIMULATED", "FALLBACK", "UNAVAILABLE", "DEMO",
  ];
  if (value === "NO_DATA" || value === "DIAGNOSTIC" || value === "DISABLED") {
    return "UNAVAILABLE";
  }
  return supported.includes(value as RouteDataProvenance)
    ? value as RouteDataProvenance
    : "DERIVED";
}

function latestByProvider(rows: ConnectionTest[]) {
  const result = new Map<string, ConnectionTest>();
  rows.forEach((row) => {
    if (!result.has(row.provider_id)) result.set(row.provider_id, row);
  });
  return result;
}

async function loadRouteEvidence() {
  const [testsResult, corridorsResult, capabilitiesResult, executionsResult] = await Promise.all([
    supabase
      .from("partner_connection_tests")
      .select("provider_id,status,readiness,response_time_ms,tested_at,institution_count")
      .in("provider_id", ["yapily", "airwallex", "ripple"])
      .eq("environment", "sandbox")
      .order("tested_at", { ascending: false })
      .limit(30),
    supabase
      .from("partner_supported_corridors")
      .select("provider_id,source_country,destination_country,source_currency,destination_currency,environment,readiness_status,provenance,last_validated_at")
      .in("provider_id", ["airwallex", "yapily"])
      .eq("environment", "sandbox"),
    supabase
      .from("partner_capabilities")
      .select("provider_id,capability_code,readiness_status,provenance,last_validated_at")
      .in("provider_id", ["airwallex", "yapily"])
      .eq("environment", "sandbox"),
    supabase
      .from("execution_sessions")
      .select("state,created_at,completed_at,snapshot")
      .in("state", ["COMPLETED", "FAILED"])
      .order("updated_at", { ascending: false })
      .limit(100),
  ]);

  return {
    tests: latestByProvider((testsResult.data ?? []) as ConnectionTest[]),
    corridors: (corridorsResult.data ?? []) as CorridorRecord[],
    capabilities: (capabilitiesResult.data ?? []) as CapabilityRecord[],
    executions: (executionsResult.data ?? []) as ExecutionRecord[],
  };
}

function providerAvailability(
  providerName: string,
  test?: ConnectionTest,
  provenance: RouteDataProvenance = "SANDBOX",
) {
  if (!test) {
    return unavailable<"UNAVAILABLE">(
      "UNAVAILABLE",
      "partner_connection_tests",
      `No ${providerName} sandbox connection evidence is available.`,
    );
  }
  if (test.status !== "SUCCESS" || !isFresh(test.tested_at)) {
    return unavailable<"UNAVAILABLE">(
      "UNAVAILABLE",
      "partner_connection_tests",
      test.status !== "SUCCESS"
        ? `Latest ${providerName} sandbox connection test did not pass.`
        : `Latest ${providerName} sandbox connection evidence is stale.`,
      test.tested_at,
    );
  }
  return evidence<"AVAILABLE">(
    "AVAILABLE",
    provenance,
    "partner_connection_tests",
    test.tested_at,
    90,
    `Authenticated ${providerName} sandbox connection test passed.`,
  );
}

function capabilityEvidence(
  providerId: "airwallex" | "yapily",
  capabilityCode: string,
  capabilities: CapabilityRecord[],
  executions: ExecutionRecord[],
  observedAt: string,
) {
  const capability = capabilities.find((row) =>
    row.provider_id === providerId && row.capability_code === capabilityCode
  );
  const validated = capability
    && capability.readiness_status === "Validated"
    && isFresh(capability.last_validated_at);
  if (validated) {
    return evidence<boolean | null>(
      true,
      normalizeProvenance(capability.provenance),
      `partner_capabilities.${capabilityCode}`,
      capability.last_validated_at ?? observedAt,
      85,
      `${providerId === "airwallex" ? "Airwallex" : "Yapily"} sandbox capability is recorded as validated.`,
    );
  }

  const completed = providerId === "airwallex" ? executions.find((row) => {
    const payout = row.snapshot?.payout;
    return row.state === "COMPLETED"
      && (payout?.providerId === "AIRWALLEX_SANDBOX" || payout?.providerName === "Airwallex Sandbox");
  }) : null;
  if (completed) {
    return evidence<boolean | null>(
      true,
      "DERIVED",
      "execution_sessions",
      completed.completed_at ?? observedAt,
      80,
      `A completed authenticated Airwallex sandbox execution proves ${capabilityCode.toLowerCase().replace(/_/g, " ")}.`,
    );
  }

  return unavailable<boolean | null>(
    null,
    `partner_capabilities.${capabilityCode}`,
    capability?.readiness_status
      ? `${providerId === "airwallex" ? "Airwallex" : "Yapily"} capability status is ${capability.readiness_status}.`
      : `No validated ${providerId === "airwallex" ? "Airwallex" : "Yapily"} capability evidence is available.`,
    capability?.last_validated_at ?? observedAt,
  );
}

function executionPerformance(executions: ExecutionRecord[], observedAt: string) {
  const airwallex = executions.filter((row) => {
    const payout = row.snapshot?.payout;
    return payout?.providerId === "AIRWALLEX_SANDBOX" || payout?.providerName === "Airwallex Sandbox";
  });
  if (airwallex.length === 0) {
    return {
      success: unavailable<number | null>(null, "execution_sessions", "No terminal Airwallex execution history is available.", observedAt),
      latency: unavailable<number | null>(null, "execution_sessions", "No completed Airwallex settlement duration is available.", observedAt),
    };
  }
  const completed = airwallex.filter((row) => row.state === "COMPLETED");
  const durations = completed
    .map((row) => {
      const start = Date.parse(row.created_at ?? "");
      const end = Date.parse(row.completed_at ?? "");
      return Number.isFinite(start) && Number.isFinite(end) ? Math.max(0, (end - start) / 60000) : null;
    })
    .filter((value): value is number => value !== null);
  const successRate = (completed.length / airwallex.length) * 100;
  const averageLatency = durations.length > 0
    ? durations.reduce((sum, value) => sum + value, 0) / durations.length
    : null;
  const confidence = Math.min(95, 45 + airwallex.length * 5);
  return {
    success: evidence(successRate, "DERIVED", "execution_sessions", observedAt, confidence, `${airwallex.length} terminal Airwallex sandbox execution(s).`),
    latency: averageLatency === null
      ? unavailable<number | null>(null, "execution_sessions", "Completed sessions do not contain usable duration timestamps.", observedAt)
      : evidence(averageLatency, "DERIVED", "execution_sessions", observedAt, confidence, `${durations.length} completed Airwallex sandbox execution(s).`),
  };
}

function weightedScore(items: { value: number | null; weight: number }[]) {
  const available = items.filter((item) => item.value !== null);
  const weight = available.reduce((sum, item) => sum + item.weight, 0);
  if (weight === 0) return { score: null, coverage: 0 };
  return {
    score: Math.round(available.reduce((sum, item) => sum + (item.value ?? 0) * item.weight, 0) / weight),
    coverage: Math.round(weight * 100),
  };
}

function planToRouteQuote(plan: CanonicalRoutePlan): RouteQuote {
  const recipientAmount = plan.economics.estimatedRecipientAmount.value ?? 0;
  const providerFee = plan.economics.providerFees.value ?? 0;
  const fxRate = plan.economics.fxRate.value ?? 0;
  const eta = plan.intelligence.etaMinutes.value;
  const payoutProvider = plan.payout.provider;
  const providerPath = plan.bridge.required
    ? `${plan.funding.provider.providerName} → ${plan.bridge.provider?.providerName ?? "Bridge unavailable"} → ${payoutProvider.providerName}`
    : `${plan.funding.provider.providerName} → ${payoutProvider.providerName}`;
  return {
    id: plan.id,
    rail: plan.bridge.required ? "HYBRID" : "FIAT",
    provider: providerPath,
    sendAmount: plan.economics.sendAmount,
    receiveAmount: recipientAmount,
    fxRate,
    fee: providerFee,
    estimatedTime: eta === null ? "Unavailable" : `${Math.max(1, Math.round(eta))} mins`,
    score: plan.score.value ?? 0,
    bridgeAsset: plan.bridge.asset.value ?? undefined,
    liquidityAvailable: plan.bridge.required ? (plan.intelligence.liquidity.value ?? 0) >= 100 : true,
    liquidityStatus: plan.bridge.required
      ? (plan.intelligence.liquidity.value ?? 0) >= 100 ? "AVAILABLE" : "INSUFFICIENT"
      : "NOT_REQUIRED",
    routeFamily: plan.bridge.required ? "DIGITAL_BRIDGE" : "BEST_LIQUIDITY",
    routeRankLabel: plan.eligible ? "Evidence ranked" : "Unavailable",
    partnerHealth: plan.eligible ? "GOOD" : "DEGRADED",
    liquidityScore: plan.intelligence.liquidity.value ?? 0,
    reliabilityScore: plan.intelligence.historicalSuccessRate.value ?? 0,
    routeConfidence: plan.intelligence.confidence.value,
    aiConfidence: plan.intelligence.confidence.value,
    predictedFailureRisk: plan.intelligence.risk.value,
    providerHistoricalSuccessRate: plan.intelligence.historicalSuccessRate.value ?? undefined,
    providerAverageLatencyMinutes: plan.intelligence.settlementLatencyMinutes.value ?? undefined,
    orchestrationReason: plan.intelligence.decisionFactors.join(" "),
    aiRecommendation: plan.eligible
      ? "Evidence-supported sandbox route."
      : plan.eligibilityReasons.join(" "),
    aiDecisionFactors: plan.intelligence.decisionFactors,
    providerAdapterId: payoutProvider.providerId,
    providerMode: payoutProvider.environment === "live" ? "LIVE" : "SANDBOX",
    orchestrationSafetyStatus: plan.eligible ? "PASS" : "BLOCK",
    orchestrationSafetyReason: plan.eligible ? "All mandatory route evidence passed." : plan.eligibilityReasons.join(" "),
    providerQuoteIssuedAt: Date.parse(plan.generatedAt),
    providerQuoteExpiresAt: Date.parse(plan.quoteExpiresAt),
    providerQuoteTtlSeconds: QUOTE_TTL_MS / 1000,
    providerQuoteExpired: Date.now() >= Date.parse(plan.quoteExpiresAt),
    routePlan: plan,
    settlementStages: plan.bridge.required
      ? ["Yapily funding", "RLUSD bridge", "Airwallex payout"]
      : ["Yapily funding", "Airwallex payout"],
    steps: plan.bridge.required
      ? ["Yapily funding", "RLUSD bridge", "Airwallex payout"]
      : ["Yapily funding", "Airwallex payout"],
  };
}

export async function generateCanonicalRouteQuotes(input: RouteGenerationInput): Promise<RouteQuote[]> {
  const sourceCurrency = input.sourceCurrency ?? "GBP";
  const generatedAt = new Date().toISOString();
  const quoteExpiresAt = new Date(Date.now() + QUOTE_TTL_MS).toISOString();
  const [fx, routeEvidence] = await Promise.all([
    fetchLiveFxRate(sourceCurrency, input.destinationCurrency).catch(() => null),
    loadRouteEvidence(),
  ]);
  const yapilyTest = routeEvidence.tests.get("yapily");
  const airwallexTest = routeEvidence.tests.get("airwallex");
  const rippleTest = routeEvidence.tests.get("ripple");
  const usesOpenBanking = (input.fundingMethod ?? "OPEN_BANKING") === "OPEN_BANKING";
  const yapilyConnectionStatus = providerAvailability("Yapily", yapilyTest);
  const institutionCapability = capabilityEvidence(
    "yapily",
    "INSTITUTION_DISCOVERY",
    routeEvidence.capabilities,
    routeEvidence.executions,
    generatedAt,
  );
  const paymentInitiationCapability = capabilityEvidence(
    "yapily",
    "PAYMENT_INITIATION",
    routeEvidence.capabilities,
    routeEvidence.executions,
    generatedAt,
  );
  const fundingStatus = usesOpenBanking
    && yapilyConnectionStatus.value === "AVAILABLE"
    && institutionCapability.value === true
    && paymentInitiationCapability.value === true
    && (yapilyTest?.institution_count ?? 0) > 0
    ? yapilyConnectionStatus
    : unavailable<"UNAVAILABLE">(
        "UNAVAILABLE",
        usesOpenBanking ? "Yapily payment capability" : "card funding adapter",
        usesOpenBanking
          ? paymentInitiationCapability.reason
            ?? institutionCapability.reason
            ?? "Yapily did not return a selectable institution in the latest sandbox test."
          : "No evidence-backed card collection adapter is implemented.",
        yapilyTest?.tested_at ?? generatedAt,
      );
  const payoutStatus = providerAvailability("Airwallex", airwallexTest);
  const beneficiaryCapability = capabilityEvidence(
    "airwallex",
    "BENEFICIARY_VALIDATION",
    routeEvidence.capabilities,
    routeEvidence.executions,
    generatedAt,
  );
  const transferCapability = capabilityEvidence(
    "airwallex",
    "TRANSFER_CREATION",
    routeEvidence.capabilities,
    routeEvidence.executions,
    generatedAt,
  );
  const corridor = routeEvidence.corridors.find((row) =>
    row.source_country === "United Kingdom" &&
    row.destination_country === input.destinationCountry &&
    row.source_currency === sourceCurrency &&
    row.destination_currency === input.destinationCurrency &&
    row.readiness_status === "Validated" &&
    isFresh(row.last_validated_at),
  );
  const corridorEvidence = corridor
    ? evidence(true, normalizeProvenance(corridor.provenance), "partner_supported_corridors", corridor.last_validated_at ?? generatedAt, 80, `Airwallex sandbox corridor readiness is ${corridor.readiness_status}.`)
    : unavailable(false, "partner_supported_corridors", "No validated Airwallex sandbox corridor record matches this payment.");
  const fxEvidence = fx
    ? evidence<number | null>(fx.rate, "LIVE", fx.provider, fx.date, 95, fx.providerStatus)
    : unavailable<number | null>(null, "live FX provider chain", "All live FX providers are unavailable; route approval is blocked.", generatedAt);
  const performance = executionPerformance(routeEvidence.executions, generatedAt);
  const recipientAmount = fxEvidence.value === null ? null : Number((input.amount * fxEvidence.value).toFixed(2));
  const mandatoryBankingEvidence = [
    fundingStatus.value === "AVAILABLE",
    payoutStatus.value === "AVAILABLE",
    beneficiaryCapability.value === true,
    transferCapability.value === true,
    corridorEvidence.value,
    fx !== null,
    input.payoutMethod === "BANK",
    usesOpenBanking,
  ];
  const bankingReasons = [
    fundingStatus.value !== "AVAILABLE" ? fundingStatus.reason : null,
    payoutStatus.value !== "AVAILABLE" ? payoutStatus.reason : null,
    beneficiaryCapability.value !== true ? beneficiaryCapability.reason : null,
    transferCapability.value !== true ? transferCapability.reason : null,
    !corridorEvidence.value ? corridorEvidence.reason : null,
    !fx ? "A live FX quote is required before this route can be approved." : null,
    input.payoutMethod !== "BANK" ? "Airwallex V1 supports bank payouts only." : null,
    !usesOpenBanking ? "Card funding is not connected to an evidence-backed collection provider." : null,
  ].filter((value): value is string => Boolean(value));
  const availabilityScore = mandatoryBankingEvidence.slice(0, 5).every(Boolean) ? 100 : 0;
  const latencyScore = performance.latency.value === null
    ? null
    : Math.max(0, Math.min(100, Math.round(100 - performance.latency.value * 2)));
  const ranking = weightedScore([
    { value: availabilityScore, weight: 0.35 },
    { value: fx ? 100 : 0, weight: 0.15 },
    { value: performance.success.value, weight: 0.2 },
    { value: latencyScore, weight: 0.1 },
    { value: corridorEvidence.value && input.payoutMethod === "BANK" ? 100 : 0, weight: 0.2 },
  ]);
  const evidenceConfidence = Math.round(
    (fundingStatus.confidence + payoutStatus.confidence + corridorEvidence.confidence + fxEvidence.confidence + performance.success.confidence) / 5,
  );
  const bankingEligible = mandatoryBankingEvidence.every(Boolean);
  const bankingPlan: CanonicalRoutePlan = {
    schemaVersion: "1.0",
    id: createTransferId(),
    version: 1,
    status: "CANDIDATE",
    eligible: bankingEligible,
    eligibilityReasons: bankingReasons,
    rank: bankingEligible ? 1 : null,
    score: evidence(bankingEligible ? ranking.score : null, "DERIVED", "canonical_route_engine_v1", generatedAt, evidenceConfidence, "Weighted only from available operational evidence."),
    funding: {
      method: input.fundingMethod ?? "OPEN_BANKING",
      provider: {
        providerId: usesOpenBanking ? "yapily" : "card-unavailable",
        providerName: usesOpenBanking ? "Yapily" : "Card funding unavailable",
        environment: "sandbox",
        status: fundingStatus,
      },
      fundingQuote: unavailable<number | null>(null, "Yapily", "Yapily does not provide a funding fee quote in the current integration.", generatedAt),
    },
    bridge: {
      required: false,
      rail: evidence("FIAT", "DERIVED", "canonical_route_engine_v1", generatedAt, 100, "No bridge is required for the direct banking route."),
      asset: evidence<Currency | null>(null, "UNAVAILABLE", "canonical_route_engine_v1", generatedAt, 100, "No bridge asset is used."),
      provider: null,
      pathQuote: unavailable<number | null>(null, "XRPL", "No bridge is used by this route.", generatedAt),
      networkFee: evidence<number | null>(0, "DERIVED", "canonical_route_engine_v1", generatedAt, 100, "No bridge network fee applies."),
      slippageBps: evidence<number | null>(0, "DERIVED", "canonical_route_engine_v1", generatedAt, 100, "No bridge conversion applies."),
    },
    payout: {
      method: input.payoutMethod,
      provider: { providerId: "AIRWALLEX_SANDBOX", providerName: "Airwallex Sandbox", environment: "sandbox", status: payoutStatus },
      corridorSupported: corridorEvidence,
        beneficiaryCapability,
        transferCapability,
      providerFee: unavailable<number | null>(null, "Airwallex Sandbox", "The current Airwallex integration does not expose a pre-transfer provider fee quote.", generatedAt),
      providerLimit: unavailable<number | null>(null, "Airwallex Sandbox", "Funding-limit connectivity is proven but a corridor-specific payout limit is not exposed.", generatedAt),
    },
    settlementMethod: evidence("DIRECT_BANKING", "DERIVED", "canonical_route_engine_v1", generatedAt, 100, "Direct settlement from funded value to the Airwallex payout leg."),
    economics: {
      sourceCurrency,
      destinationCurrency: input.destinationCurrency,
      sendAmount: input.amount,
      fxRate: fxEvidence,
      fxSpreadBps: unavailable<number | null>(null, "Airwallex Sandbox", "Provider execution FX spread is not available before submission.", generatedAt),
      providerFees: unavailable<number | null>(null, "Airwallex Sandbox", "Provider fee quote unavailable.", generatedAt),
      networkFees: evidence<number | null>(0, "DERIVED", "canonical_route_engine_v1", generatedAt, 100, "Direct banking route has no XRPL network fee."),
      totalCost: unavailable<number | null>(null, "canonical_route_engine_v1", "Total cost cannot be stated until provider fee and spread are available.", generatedAt),
      estimatedRecipientAmount: recipientAmount === null
        ? unavailable<number | null>(null, "live FX provider chain", "Recipient amount unavailable without a live FX quote.", generatedAt)
        : evidence(recipientAmount, "ESTIMATED", fx?.provider ?? "live FX provider chain", generatedAt, 85, "Uses current FX before unavailable provider fees and spread."),
    },
    intelligence: {
      etaMinutes: performance.latency,
      confidence: evidence(evidenceConfidence, "DERIVED", "canonical_route_engine_v1", generatedAt, 90, "Confidence reflects evidence freshness and completeness."),
      risk: evidence(Math.max(0, 100 - evidenceConfidence), "DERIVED", "canonical_route_engine_v1", generatedAt, 85, "Evidence risk, not predicted provider failure probability."),
      liquidity: unavailable<number | null>(null, "Airwallex Sandbox", "Corridor liquidity depth is not exposed by the current provider APIs.", generatedAt),
      capacity: unavailable<number | null>(null, "Airwallex Sandbox", "Corridor payout capacity is not exposed by the current provider APIs.", generatedAt),
      historicalSuccessRate: performance.success,
      settlementLatencyMinutes: performance.latency,
      complianceEligible: evidence(Boolean(corridorEvidence.value && input.payoutMethod === "BANK"), "DERIVED", "provider corridor and payout method", generatedAt, 85),
      evidenceCoverage: ranking.coverage,
      decisionFactors: [
        "Yapily sandbox funding availability is taken from the latest authenticated connection test.",
        "Airwallex sandbox payout availability and corridor support are mandatory.",
        "FX is sourced from the live FX failover service; fallback FX blocks approval.",
        "Unavailable provider fees, limits, liquidity and spread are disclosed and are not invented.",
      ],
    },
    sourceProvenance: Array.from(new Set<RouteDataProvenance>([
      fxEvidence.provenance,
      fundingStatus.provenance,
      payoutStatus.provenance,
      beneficiaryCapability.provenance,
      transferCapability.provenance,
      corridorEvidence.provenance,
      "DERIVED",
      "ESTIMATED",
      "UNAVAILABLE",
    ])),
    generatedAt,
    quoteExpiresAt,
  };

  const xrplStatus = providerAvailability("XRPL", rippleTest, "TESTNET");
  const actualBalance = input.actualRlusdBalance;
  const xrplReasons = [
    xrplStatus.value !== "AVAILABLE" ? xrplStatus.reason : null,
    actualBalance == null ? "Validated RLUSD trustline and balance evidence is unavailable." : null,
    "No executable GBP-to-RLUSD path quote, order-book/AMM depth or slippage quote is implemented.",
    "The current XRPL executor submits XRP rather than the advertised RLUSD asset.",
  ].filter((value): value is string => Boolean(value));
  const xrplPlan: CanonicalRoutePlan = {
    ...bankingPlan,
    id: createTransferId(),
    eligible: false,
    eligibilityReasons: xrplReasons,
    rank: null,
    score: unavailable<number | null>(null, "canonical_route_engine_v1", "XRPL/RLUSD route is excluded until all mandatory bridge evidence exists.", generatedAt),
    bridge: {
      required: true,
      rail: evidence("HYBRID", "DERIVED", "canonical_route_engine_v1", generatedAt, 100),
      asset: evidence<Currency | null>("RLUSD", "TESTNET", "XRPL testnet trustline", generatedAt, actualBalance == null ? 0 : 80),
      provider: { providerId: "ripple", providerName: "XRPL Testnet", environment: "testnet", status: xrplStatus },
      pathQuote: unavailable<number | null>(null, "XRPL pathfinding", "No executable GBP-to-RLUSD path quote is available.", generatedAt),
      networkFee: unavailable<number | null>(null, "XRPL fee RPC", "A transaction-specific network fee has not been quoted.", generatedAt),
      slippageBps: unavailable<number | null>(null, "XRPL order book / AMM", "Market depth and slippage have not been quoted.", generatedAt),
    },
    settlementMethod: evidence("XRPL_BRIDGE", "DERIVED", "canonical_route_engine_v1", generatedAt, 100, "Candidate bridge settlement; blocked until executable evidence exists."),
    economics: {
      ...bankingPlan.economics,
      networkFees: unavailable<number | null>(null, "XRPL fee RPC", "Network fee unavailable.", generatedAt),
      totalCost: unavailable<number | null>(null, "canonical_route_engine_v1", "Bridge economics are incomplete.", generatedAt),
      estimatedRecipientAmount: unavailable<number | null>(null, "canonical_route_engine_v1", "Recipient amount cannot be calculated without an executable bridge quote.", generatedAt),
    },
    intelligence: {
      ...bankingPlan.intelligence,
      etaMinutes: unavailable<number | null>(null, "XRPL pathfinding", "Settlement time is unavailable without an executable XRPL path quote.", generatedAt),
      confidence: evidence(0, "DERIVED", "canonical_route_engine_v1", generatedAt, 100, "Mandatory bridge evidence is missing."),
      risk: evidence(100, "DERIVED", "canonical_route_engine_v1", generatedAt, 100, "Route is blocked, not risk-scored."),
      liquidity: actualBalance == null
        ? unavailable<number | null>(null, "XRPL account_lines", "RLUSD balance unavailable.", generatedAt)
        : evidence(actualBalance, "TESTNET", "XRPL account_lines", generatedAt, 80, "Actual testnet trustline balance; not production liquidity."),
      capacity: unavailable<number | null>(null, "XRPL order book / AMM", "Executable path capacity unavailable.", generatedAt),
      evidenceCoverage: 0,
      decisionFactors: xrplReasons,
    },
    sourceProvenance: ["TESTNET", "DERIVED", "UNAVAILABLE"],
  };

  return [bankingPlan, xrplPlan].map(planToRouteQuote);
}

export function bindRouteQuotesToTransfer(routes: RouteQuote[], transferId: string) {
  return routes.map((route) => route.routePlan
    ? { ...route, routePlan: { ...route.routePlan, transferId } }
    : route);
}
