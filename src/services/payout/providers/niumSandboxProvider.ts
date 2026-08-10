import { supabase } from "../../../lib/supabase";
import {
  CreatePayoutRequest,
  PayoutProvider,
  PayoutProviderError,
  PayoutResult,
  PayoutStatus,
  ProviderJourneyStep,
} from "../payoutTypes";

type EdgePayoutResponse = Omit<PayoutResult, "providerId"> & {
  providerId: string;
  providerJourney?: ProviderJourneyStep[];
};

type EdgePayoutError = {
  error?: string;
  code?: string;
  operation?: string;
  providerName?: string;
  retryable?: boolean;
  fieldSources?: string[];
  action?: string;
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
  const action = payload?.action ? ` ${payload.action}` : "";

  return new PayoutProviderError(
    `${payload?.error ?? (error instanceof Error ? error.message : "Nium sandbox request failed.")}${fields}${action}`,
    "NIUM_SANDBOX",
    payload?.providerName ?? "Nium Sandbox",
    payload?.retryable ?? false,
    payload?.code,
    payload?.operation,
  );
}

function assertResult(data: EdgePayoutResponse | null): PayoutResult {
  if (!data?.payoutReference || !data.status) {
    throw new Error("Nium payout function did not return a valid payout result.");
  }
  return { ...data, providerId: "NIUM_SANDBOX", sandbox: true, fallbackUsed: false };
}

export const niumSandboxProvider: PayoutProvider = {
  id: "NIUM_SANDBOX",
  name: "Nium Sandbox",

  async createPayout(req: CreatePayoutRequest): Promise<PayoutResult> {
    const { data, error } = await supabase.functions.invoke<EdgePayoutResponse>("nexuspay-submit-payout", {
      body: {
        providerId: "nium",
        environment: "sandbox",
        transferId: req.transferId,
        sourceAmount: req.amount,
        sourceCurrency: "GBP",
        destinationCurrency: req.currency,
        country: req.country,
        recipient: req.recipient,
        payoutMethod: req.payoutMethod,
        quoteId: req.quoteId,
      },
    });

    if (error) throw await toProviderError(error);
    return assertResult(data ?? null);
  },

  async getPayoutStatus(reference: string): Promise<PayoutStatus> {
    const { data, error } = await supabase.functions.invoke<{ status: PayoutStatus }>("nexuspay-submit-payout", {
      body: {
        providerId: "nium",
        environment: "sandbox",
        operation: "retrieve",
        payoutReference: reference,
      },
    });

    if (error) throw await toProviderError(error);
    return data?.status ?? "PROCESSING";
  },
};
