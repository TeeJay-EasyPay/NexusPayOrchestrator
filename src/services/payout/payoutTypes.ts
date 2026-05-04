import { PayoutMethod, Recipient } from "../../types/transfer";

export type PayoutProviderId = "MOCK_PAYOUT_SANDBOX" | "THUNES_SANDBOX" | "NIUM_SANDBOX";

export type PayoutStatus =
  | "NOT_STARTED"
  | "INITIATED"
  | "PROCESSING"
  | "PAID_OUT"
  | "FAILED";

export type PayoutRail = "BANK_ACCOUNT" | "MOBILE_WALLET";

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
}

export interface PayoutProvider {
  id: PayoutProviderId;
  name: string;
  createPayout: (request: CreatePayoutRequest) => Promise<PayoutResult>;
  getPayoutStatus: (payoutReference: string) => Promise<PayoutStatus>;
}
