import { mockPayoutProvider } from "./mockPayoutProvider";
import { CreatePayoutRequest } from "./payoutTypes";
import { selectBestPayoutPartner } from "./payoutRoutingEngine";

export async function createPayout(request: CreatePayoutRequest) {
  const selection = selectBestPayoutPartner(request);

  console.log("Payout partner selection:", selection);

  // For now fallback to mock provider (until credentials added)
  const result = await mockPayoutProvider.createPayout(request);

  return {
    ...result,
    routingReason: selection.reason,
    fallbackUsed: true,
  };
}

export async function getPayoutStatus(reference: string) {
  return mockPayoutProvider.getPayoutStatus(reference);
}
