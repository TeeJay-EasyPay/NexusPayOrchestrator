import {
  CreatePayoutRequest,
  PayoutProvider,
  PayoutResult,
  PayoutStatus,
} from "../payoutTypes";

const NIUM_BASE_URL = process.env.EXPO_PUBLIC_NIUM_BASE_URL;
const NIUM_API_KEY = process.env.EXPO_PUBLIC_NIUM_API_KEY;
const NIUM_CLIENT_ID = process.env.EXPO_PUBLIC_NIUM_CLIENT_ID;

export function hasNiumSandboxCredentials() {
  return Boolean(NIUM_BASE_URL && NIUM_API_KEY);
}

function buildDestinationLabel(req: CreatePayoutRequest) {
  if (req.payoutMethod === "BANK") {
    return `${req.recipient.bankName || "Bank"} • ****${req.recipient.accountNumber?.slice(-4) || "0000"}`;
  }

  return `${req.recipient.mobileWalletProvider || "Wallet"}`;
}

function buildNiumReference() {
  return `NIUM-SBX-${Date.now().toString().slice(-8)}`;
}

export const niumSandboxProvider: PayoutProvider = {
  id: "NIUM_SANDBOX",
  name: "Nium Sandbox",

  async createPayout(req: CreatePayoutRequest): Promise<PayoutResult> {
    if (!hasNiumSandboxCredentials()) {
      throw new Error("Nium sandbox credentials are not configured");
    }

    // Credential-ready connector.
    // Once Nium sandbox access is issued, this is where we map NexusPay's
    // internal payout request into Nium's exact payout endpoint payload.
    // Keeping the result shaped like PayoutResult means the UI and Track
    // screen do not need to change when live sandbox calls are enabled.

    const now = new Date().toISOString();

    return {
      providerId: "NIUM_SANDBOX",
      providerName: "Nium Sandbox",
      payoutReference: buildNiumReference(),
      payoutRail: req.payoutMethod === "BANK" ? "BANK_ACCOUNT" : "MOBILE_WALLET",
      status: "INITIATED",
      amount: req.amount,
      currency: req.currency,
      country: req.country,
      recipientName: req.recipient.name,
      destinationLabel: buildDestinationLabel(req),
      estimatedArrival: "Live sandbox ETA pending",
      createdAt: now,
      updatedAt: now,
      sandbox: true,
      providerMessage: `Nium sandbox credentials detected. Ready to submit via ${NIUM_BASE_URL}${NIUM_CLIENT_ID ? " for configured client" : ""}.`,
      routingReason: "Selected by NexusPay payout routing engine",
      fallbackUsed: false,
    };
  },

  async getPayoutStatus(): Promise<PayoutStatus> {
    if (!hasNiumSandboxCredentials()) {
      throw new Error("Nium sandbox credentials are not configured");
    }

    return "PAID_OUT";
  },
};
