import { PayoutMethod, Recipient } from "../../types/transfer";

export type PayoutProviderId =
  | "MOCK_PAYOUT_SANDBOX"
  | "AIRWALLEX_SANDBOX"
  | "THUNES_SANDBOX"
  | "NIUM_SANDBOX"
  | "TRANGLO_SANDBOX"
  | "NEXTPAY_SANDBOX";

export type PayoutStatus =
  | "NOT_STARTED"
  | "INITIATED"
  | "PROCESSING"
  | "PAID_OUT"
  | "FAILED";

export type PayoutRail = "BANK_ACCOUNT" | "MOBILE_WALLET";

export type ProviderJourneyStep = {
  key: string;
  label: string;
  description: string;
  status: "PENDING" | "DONE" | "FAILED";
  provider: string;
  provenance: "SANDBOX" | "LIVE" | "DERIVED";
  providerStatus?: string;
  occurredAt?: string;
};

export class PayoutProviderError extends Error {
  constructor(
    message: string,
    public readonly providerId: PayoutProviderId,
    public readonly providerName: string,
    public readonly retryable: boolean,
    public readonly code?: string,
    public readonly operation?: string,
  ) {
    super(message);
    this.name = "PayoutProviderError";
  }
}

export interface CreatePayoutRequest {
  transferId: string;
  providerId?: PayoutProviderId;
  amount: number;
  currency: string;
  country: string;
  recipient: Recipient;
  payoutMethod: PayoutMethod;
  payoutProviderName?: string;
}

export interface PayoutResult {
  providerId: PayoutProviderId;
  providerName: string;
  payoutReference: string;
  payoutRail: PayoutRail;
  status: PayoutStatus;
  amount: number;
  currency: string;
  country: string;
  recipientName: string;
  destinationLabel: string;
  estimatedArrival: string;
  createdAt: string;
  updatedAt: string;
  sandbox: boolean;
  providerMessage: string;
  routingReason?: string;
  fallbackUsed?: boolean;
  providerRequestId?: string;
  providerStatus?: string;
  evidenceId?: string;
  evidenceSummary?: string;
  providerJourney?: ProviderJourneyStep[];
}

export interface PayoutProvider {
  id: PayoutProviderId;
  name: string;
  createPayout: (request: CreatePayoutRequest) => Promise<PayoutResult>;
  getPayoutStatus: (payoutReference: string) => Promise<PayoutStatus>;
}

export interface PayoutPartnerProfile {
  id: PayoutProviderId;
  name: string;
  supportedCountries: string[];
  supportedCurrencies: string[];
  supportedPayoutMethods: PayoutMethod[];
  supportedBanks: string[];
  priority: number;
  estimatedMinutes: number;
  reliabilityScore: number;
  feeScore: number;
  sandboxReady: boolean;
  requiresCredentials: boolean;
}

export interface PayoutPartnerSelection {
  selectedProviderId: PayoutProviderId;
  selectedProviderName: string;
  score: number;
  reason: string;
  fallbackProviderId: PayoutProviderId;
  evaluatedProviders: {
    id: PayoutProviderId;
    name: string;
    score: number;
    supported: boolean;
    reason: string;
  }[];
}
