import { mockPayoutProvider } from "./mockPayoutProvider";
import { CreatePayoutRequest } from "./payoutTypes";
import { selectBestPayoutPartner } from "./payoutRoutingEngine";
import { airwallexSandboxProvider } from "./providers/airwallexSandboxProvider";
import { niumSandboxProvider, hasNiumSandboxCredentials } from "./providers/niumSandboxProvider";

export async function createPayout(request: CreatePayoutRequest) {
  const selection = selectBestPayoutPartner(request);

  console.log("Payout partner selection:", selection);

  let result;
  let usingRealProvider = false;

  if (selection.selectedProviderId === "AIRWALLEX_SANDBOX") {
    result = await airwallexSandboxProvider.createPayout(request);
    usingRealProvider = true;
  } else if (
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
      ? result.providerMessage
      : `Selected ${selection.selectedProviderName} through the partner capability resolver. Executed through mock sandbox fallback until credentials are configured.`,
  };
}

export async function getPayoutStatus(reference: string) {
  if (reference.startsWith("airwallex:")) {
    return airwallexSandboxProvider.getPayoutStatus(reference);
  }

  if (hasNiumSandboxCredentials()) {
    try {
      return await niumSandboxProvider.getPayoutStatus(reference);
    } catch {
      return mockPayoutProvider.getPayoutStatus(reference);
    }
  }

  return mockPayoutProvider.getPayoutStatus(reference);
}
