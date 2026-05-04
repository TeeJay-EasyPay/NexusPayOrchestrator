import { mockPayoutProvider } from "./mockPayoutProvider";
import { CreatePayoutRequest } from "./payoutTypes";
import { selectBestPayoutPartner } from "./payoutRoutingEngine";

export async function createPayout(request: CreatePayoutRequest) {
  const selection = selectBestPayoutPartner(request);

  console.log("Payout partner selection:", selection);

  // For now we still execute through mock until real sandbox credentials are configured.
  const result = await mockPayoutProvider.createPayout(request);

  return {
    ...result,
    providerId: selection.selectedProviderId,
    providerName: selection.selectedProviderName,
    routingReason: selection.reason,
    fallbackUsed: true,
    providerMessage: `Selected ${selection.selectedProviderName} by payout routing engine. Executed through mock sandbox fallback until credentials are configured.`,
  };
}

export async function getPayoutStatus(reference: string) {
  return mockPayoutProvider.getPayoutStatus(reference);
}
