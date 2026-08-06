import type { Currency, FundingMethod, PayoutMethod, RailType } from "./transfer";

export type RouteDataProvenance =
  | "LIVE"
  | "SANDBOX"
  | "TESTNET"
  | "DERIVED"
  | "ESTIMATED"
  | "SIMULATED"
  | "FALLBACK"
  | "UNAVAILABLE"
  | "DEMO";

export type RouteEvidence<T> = {
  value: T;
  provenance: RouteDataProvenance;
  source: string;
  observedAt: string;
  confidence: number;
  reason?: string;
};

export type RoutePlanStatus =
  | "CANDIDATE"
  | "APPROVED"
  | "EXECUTING"
  | "FAILED"
  | "SUPERSEDED"
  | "COMPLETED";

export type RouteProviderLeg = {
  providerId: string;
  providerName: string;
  environment: "sandbox" | "testnet" | "live";
  status: RouteEvidence<"AVAILABLE" | "UNAVAILABLE" | "PENDING" | "COMPLETED" | "FAILED">;
  quoteReference?: RouteEvidence<string | null>;
};

export type CanonicalRoutePlan = {
  schemaVersion: "1.0";
  id: string;
  version: number;
  transferId?: string;
  status: RoutePlanStatus;
  eligible: boolean;
  eligibilityReasons: string[];
  rank: number | null;
  score: RouteEvidence<number | null>;
  funding: {
    method: FundingMethod;
    provider: RouteProviderLeg;
    fundingQuote: RouteEvidence<number | null>;
  };
  bridge: {
    required: boolean;
    rail: RouteEvidence<RailType | null>;
    asset: RouteEvidence<Currency | null>;
    provider: RouteProviderLeg | null;
    pathQuote: RouteEvidence<number | null>;
    networkFee: RouteEvidence<number | null>;
    slippageBps: RouteEvidence<number | null>;
  };
  payout: {
    method: PayoutMethod;
    provider: RouteProviderLeg;
    corridorSupported: RouteEvidence<boolean>;
    beneficiaryCapability: RouteEvidence<boolean | null>;
    transferCapability: RouteEvidence<boolean | null>;
    providerFee: RouteEvidence<number | null>;
    providerLimit: RouteEvidence<number | null>;
  };
  settlementMethod: RouteEvidence<"DIRECT_BANKING" | "XRPL_BRIDGE">;
  economics: {
    sourceCurrency: Currency;
    destinationCurrency: Currency;
    sendAmount: number;
    fxRate: RouteEvidence<number | null>;
    fxSpreadBps: RouteEvidence<number | null>;
    providerFees: RouteEvidence<number | null>;
    networkFees: RouteEvidence<number | null>;
    totalCost: RouteEvidence<number | null>;
    estimatedRecipientAmount: RouteEvidence<number | null>;
  };
  intelligence: {
    etaMinutes: RouteEvidence<number | null>;
    confidence: RouteEvidence<number>;
    risk: RouteEvidence<number>;
    liquidity: RouteEvidence<number | null>;
    capacity: RouteEvidence<number | null>;
    historicalSuccessRate: RouteEvidence<number | null>;
    settlementLatencyMinutes: RouteEvidence<number | null>;
    complianceEligible: RouteEvidence<boolean>;
    evidenceCoverage: number;
    decisionFactors: string[];
  };
  sourceProvenance: RouteDataProvenance[];
  generatedAt: string;
  quoteExpiresAt: string;
};
