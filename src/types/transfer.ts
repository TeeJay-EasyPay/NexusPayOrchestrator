export type Currency =
  | "GBP"
  | "PHP"
  | "MYR"
  | "AED"
  | "SAR"
  | "QAR"
  | "KWD"
  | "BHD"
  | "OMR"
  | "SGD"
  | "THB"
  | "IDR"
  | "VND"
  | "XRP"
  | "RLUSD";

export type RailType = "FIAT" | "CRYPTO" | "HYBRID";

export type PayoutMethod = "BANK" | "MOBILE_WALLET";
export type AirwallexTransferMethod = "LOCAL" | "SWIFT";

export type FundingMethod = "OPEN_BANKING" | "CARD";
export type AccountScope = "demo" | "personal";
export type OpenBankingStepStatus = "PENDING" | "DONE" | "FAILED";
export type OpenBankingProvenance = "LIVE" | "SANDBOX" | "DERIVED" | "FALLBACK" | "NO_DATA";

export type FundingStatus =
  | "NOT_STARTED"
  | "AUTHORISING"
  | "AUTHORISED"
  | "SETTLED"
  | "FAILED";

export type LiquidityStatus =
  | "AVAILABLE"
  | "LOW"
  | "INSUFFICIENT"
  | "NOT_REQUIRED";

export type PartnerHealth =
  | "EXCELLENT"
  | "GOOD"
  | "WATCH"
  | "DEGRADED";

export type RouteFamily =
  | "FASTEST"
  | "LOWEST_COST"
  | "BEST_LIQUIDITY"
  | "DIGITAL_BRIDGE"
  | "BACKUP";

export type RouteOptimisationMode = "BALANCED" | "SPEED" | "LOW_COST" | "RESILIENCE";

export type TreasuryLiquidityDepth = "HIGH" | "MEDIUM" | "LOW" | "CONSTRAINED";
export type TreasuryLiquidityPressure = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type TreasurySignalStatus = "STRONG" | "STABLE" | "WATCH" | "DEGRADED";

export type ProviderMode = "MOCK" | "SANDBOX" | "LIVE";
export type ProviderHealthStatus = "HEALTHY" | "WATCH" | "DEGRADED" | "OFFLINE";
export type OrchestrationSafetyStatus = "PASS" | "WATCH" | "BLOCK" | "FAILOVER";

export type TransferStatus =
  | "CREATED"
  | "ROUTES_FETCHED"
  | "ROUTE_SELECTED"
  | "FUNDING_SELECTED"
  | "FUNDING_AUTHORISED"
  | "IN_PROGRESS"
  | "RECONNECTING"
  | "VERIFYING_STATUS"
  | "RECONCILING_PROVIDER"
  | "RESUMING_EXECUTION"
  | "COMPLETED"
  | "FAILED";

export interface Recipient {
  name: string;
  firstName?: string;
  middleName?: string;
  surname?: string;
  country: string;
  currency: Currency;
  payoutMethod: PayoutMethod;

  bankName?: string;
  bankCode?: string;
  accountNumber?: string;
  airwallexTransferMethod?: AirwallexTransferMethod;
  airwallexBeneficiaryFields?: Record<string, string>;
  airwallexSchemaFetchedAt?: string;

  mobileWalletProvider?: string;
  mobileNumber?: string;
}

export interface RouteQuote {
  id: string;
  rail: RailType;
  provider: string;

  sendAmount: number;
  receiveAmount: number;
  fxRate: number;
  fee: number;

  estimatedTime: string;
  score: number;

  bridgeAsset?: Currency;
  liquidityRequiredRlusd?: number;
  liquidityAvailable?: boolean;
  liquidityStatus?: LiquidityStatus;
  routeFamily?: RouteFamily;
  routeRankLabel?: string;
  evaluatedRoutesCount?: number;
  partnerHealth?: PartnerHealth;
  partnerUptime?: number;
  speedScore?: number;
  costScore?: number;
  liquidityScore?: number;
  reliabilityScore?: number;
  orchestrationReason?: string;
  settlementStages?: string[];
  routeConfidence?: number;
  aiConfidence?: number;
  predictedFailureRisk?: number;
  optimisationMode?: RouteOptimisationMode;
  aiRecommendation?: string;
  aiDecisionFactors?: string[];
  corridorHealthScore?: number;
  corridorInsight?: string;
  providerHistoricalSuccessRate?: number;
  providerAverageLatencyMinutes?: number;
  providerRecentTrend?: "IMPROVING" | "STABLE" | "DEGRADING";
  treasuryScore?: number;
  treasuryPressurePenalty?: number;
  treasuryRecommendation?: string;
  treasuryDecisionFactors?: string[];
  treasuryCorridor?: string;
  treasuryCorridorLiquidityDepth?: TreasuryLiquidityDepth;
  treasuryCorridorPressure?: TreasuryLiquidityPressure;
  treasuryCorridorCapacityScore?: number;
  treasuryCorridorPreferredRail?: RailType;
  treasuryCorridorPreferredBridgeAsset?: Currency;
  treasuryPartnerLiquidityDepth?: TreasuryLiquidityDepth;
  treasuryPartnerPressure?: TreasuryLiquidityPressure;
  treasuryPartnerCapacityScore?: number;
  treasuryPartnerSettlementCapacity?: TreasurySignalStatus;
  treasuryRailLiquidityDepth?: TreasuryLiquidityDepth;
  treasuryRailPressure?: TreasuryLiquidityPressure;
  treasuryRailCapacityScore?: number;
  treasuryRailSettlementCapacity?: TreasurySignalStatus;
  treasurySnapshotPayload?: Record<string, unknown>;
  providerAdapterId?: string;
  providerMode?: ProviderMode;
  providerHealthScore?: number;
  providerHealthStatus?: ProviderHealthStatus;
  providerTimeoutMs?: number;
  providerMaxRetries?: number;
  providerRetryBackoffMs?: number[];
  providerIdempotencyKey?: string;
  providerQuoteIssuedAt?: number;
  providerQuoteExpiresAt?: number;
  providerQuoteTtlSeconds?: number;
  providerQuoteExpired?: boolean;
  providerReference?: string;
  providerExecutionModeDescription?: string;
  orchestrationSafetyScore?: number;
  orchestrationSafetyStatus?: OrchestrationSafetyStatus;
  orchestrationSafetyReason?: string;
  failoverRecommended?: boolean;
  failoverRouteId?: string;
  accountScope?: AccountScope;
  personaId?: string;
  routePlan?: import("./routePlan").CanonicalRoutePlan;

  steps: string[];
}

export interface OpenBankingPaymentFlowStep {
  id: string;
  flowId: string;
  transferId: string;
  stepKey: string;
  label: string;
  status: OpenBankingStepStatus;
  provider: string;
  provenance: OpenBankingProvenance;
  sequence: number;
  responseTimeMs?: number | null;
  httpStatus?: number | null;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface OpenBankingPaymentFlow {
  id: string;
  transferId: string;
  providerId: string;
  environment: string;
  institutionId?: string | null;
  institutionName?: string | null;
  paymentRequestId?: string | null;
  consentId?: string | null;
  authorizationUrl?: string | null;
  providerPaymentId?: string | null;
  providerPaymentStatus?: string | null;
  failureCode?: string | null;
  failureReason?: string | null;
  status: string;
  amount: number;
  currency: Currency;
  fundingReference?: string | null;
  provenance: OpenBankingProvenance;
  createdAt: string;
  updatedAt: string;
  steps: OpenBankingPaymentFlowStep[];
}

export interface Transfer {
  id: string;
  senderCurrency: Currency;
  senderAmount: number;
  recipient: Recipient;
  routes: RouteQuote[];
  selectedRoute?: RouteQuote;
  fundingMethod?: FundingMethod;
  fundingStatus?: FundingStatus;
  fundingReference?: string;
  fundingAuthorisedAt?: number;
  openBankingFlow?: OpenBankingPaymentFlow;
  status: TransferStatus;
  createdAt: number;
  accountScope?: AccountScope;
  personaId?: string;
}
