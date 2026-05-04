import { mockPayoutProvider } from "./mockPayoutProvider";
import { CreatePayoutRequest } from "./payoutTypes";
import { selectBestPayoutPartner } from "./payoutRoutingEngine";
import { niumSandboxProvider, hasNiumSandboxCredentials } from "./providers/niumSandboxProvider";

export async function createPayout(request: CreatePayoutRequest) {
  const selection = selectBestPayoutPartner(request);

  console.log("Payout partner selection:", selection);

  let result;
  let usingRealProvider = false;

  if (
    selection.selectedProviderId === "NIUM_SANDBOX" &&
    hasNiumSandboxCredentials()
  ) {
    try {
      result = await niumSandboxProvider.createPayout(request);
      usingRealProvider = true;
    } catch (error) {
      console.warn("Nium sandbox failed, falling back to mock:", error);
      result = await mockPayoutProvider.createPayout(request);
    }
  } else {
    result = await mockPayoutProvider.createPayout(request);
  }

  return {
    ...result,
    providerId: selection.selectedProviderId,
    providerName: selection.selectedProviderName,
    routingReason: selection.reason,
    fallbackUsed: !usingRealProvider,
    providerMessage: usingRealProvider
      ? `Executing via Nium sandbox (${process.env.EXPO_PUBLIC_NIUM_BASE_URL})`
      : `Selected ${selection.selectedProviderName} by payout routing engine. Executed through mock sandbox fallback until credentials are configured.`,
  };
}

export async function getPayoutStatus(reference: string) {
  if (hasNiumSandboxCredentials()) {
    try {
      return await niumSandboxProvider.getPayoutStatus(reference);
    } catch {
      return mockPayoutProvider.getPayoutStatus(reference);
    }
  }

  return mockPayoutProvider.getPayoutStatus(reference);
}
