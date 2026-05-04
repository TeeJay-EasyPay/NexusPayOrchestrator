import { CreatePayoutRequest, PayoutProvider, PayoutResult, PayoutStatus } from "./payoutTypes";

const wait = (ms: number) => new Promise((res) => setTimeout(res, ms));

function buildDestination(req: CreatePayoutRequest) {
  if (req.payoutMethod === "BANK") {
    return `${req.recipient.bankName || "Bank"} • ****${req.recipient.accountNumber?.slice(-4) || "0000"}`;
  }
  return `${req.recipient.mobileWalletProvider || "Wallet"}`;
}

export const mockPayoutProvider: PayoutProvider = {
  id: "MOCK_PAYOUT_SANDBOX",
  name: "Mock Payout Sandbox",

  async createPayout(req: CreatePayoutRequest): Promise<PayoutResult> {
    await wait(400);

    const reference = `PO-MOCK-${Date.now().toString().slice(-6)}`;

    return {
      providerId: "MOCK_PAYOUT_SANDBOX",
      providerName: "Mock Payout Sandbox",
      payoutReference: reference,
      payoutRail: req.payoutMethod === "BANK" ? "BANK_ACCOUNT" : "MOBILE_WALLET",
      status: "INITIATED",
      amount: req.amount,
      currency: req.currency,
      country: req.country,
      recipientName: req.recipient.name,
      destinationLabel: buildDestination(req),
      estimatedArrival: "~2 mins (simulated)",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sandbox: true,
      providerMessage: "Sandbox payout accepted",
    };
  },

  async getPayoutStatus(): Promise<PayoutStatus> {
    await wait(700);
    return "PAID_OUT";
  },
};
