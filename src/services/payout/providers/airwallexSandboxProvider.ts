import { supabase } from "../../../lib/supabase";
import {
  CreatePayoutRequest,
  PayoutProvider,
  PayoutProviderError,
  PayoutResult,
  PayoutStatus,
  ProviderJourneyStep,
} from "../payoutTypes";

type EdgePayoutResponse = {
  providerId: string;
  providerName: string;
  payoutReference: string;
  payoutRail: "BANK_ACCOUNT" | "MOBILE_WALLET";
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
  providerRequestId?: string;
  providerStatus?: string;
  evidenceId?: string;
  evidenceSummary?: string;
  providerJourney?: ProviderJourneyStep[];
};

type EdgePayoutError = {
  error?: string;
  code?: string;
  operation?: string;
  providerId?: string;
  providerName?: string;
  retryable?: boolean;
  fieldSources?: string[];
};

async function toProviderError(error: unknown) {
  let payload: EdgePayoutError | null = null;
  const context = error && typeof error === "object" && "context" in error
    ? (error as { context?: unknown }).context
    : null;

  if (context instanceof Response) {
    payload = await context.clone().json().catch(() => null) as EdgePayoutError | null;
  }

  const fields = payload?.fieldSources?.length
    ? ` Required fields: ${payload.fieldSources.join(", ")}.`
    : "";
  const message = payload?.error
    ? `${payload.error}${fields}`
    : error instanceof Error
      ? error.message
      : "Airwallex sandbox request failed.";

  return new PayoutProviderError(
    message,
    "AIRWALLEX_SANDBOX",
    payload?.providerName ?? "Airwallex Sandbox",
    payload?.retryable ?? true,
    payload?.code,
    payload?.operation,
  );
}

function assertEdgeResult(data: EdgePayoutResponse | null): PayoutResult {
  if (!data?.payoutReference || !data.providerId || !data.status) {
    throw new Error("Airwallex payout function did not return a valid payout result.");
  }

  return {
    providerId: "AIRWALLEX_SANDBOX",
    providerName: data.providerName,
    payoutReference: data.payoutReference,
    payoutRail: data.payoutRail,
    status: data.status,
    amount: Number(data.amount),
    currency: data.currency,
    country: data.country,
    recipientName: data.recipientName,
    destinationLabel: data.destinationLabel,
    estimatedArrival: data.estimatedArrival,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    sandbox: true,
    providerMessage: data.providerMessage,
    fallbackUsed: false,
    providerRequestId: data.providerRequestId,
    providerStatus: data.providerStatus,
    evidenceId: data.evidenceId,
    evidenceSummary: data.evidenceSummary,
    providerJourney: data.providerJourney,
  };
}

export const airwallexSandboxProvider: PayoutProvider = {
  id: "AIRWALLEX_SANDBOX",
  name: "Airwallex Sandbox",

  async createPayout(req: CreatePayoutRequest): Promise<PayoutResult> {
    const { data, error } = await supabase.functions.invoke<EdgePayoutResponse>("nexuspay-submit-payout", {
      body: {
        providerId: "airwallex",
        environment: "sandbox",
        transferId: req.transferId,
        amount: req.amount,
        sourceCurrency: "GBP",
        destinationCurrency: req.currency,
        destinationAmount: req.amount,
        recipient: req.recipient,
        payoutMethod: req.payoutMethod,
        reference: `NexusPay ${req.transferId.slice(0, 8)}`,
      },
    });

    if (error) {
      throw await toProviderError(error);
    }

    return assertEdgeResult(data ?? null);
  },

  async getPayoutStatus(reference: string): Promise<PayoutStatus> {
    const { data, error } = await supabase.functions.invoke<{ status: PayoutStatus }>("nexuspay-submit-payout", {
      body: {
        providerId: "airwallex",
        environment: "sandbox",
        operation: "retrieve",
        payoutReference: reference,
      },
    });

    if (error) {
      throw await toProviderError(error);
    }

    return data?.status ?? "PROCESSING";
  },
};
