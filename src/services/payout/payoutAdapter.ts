import { CreatePayoutRequest, PayoutProviderError } from "./payoutTypes";
import { selectBestPayoutPartner } from "./payoutRoutingEngine";
import { airwallexSandboxProvider } from "./providers/airwallexSandboxProvider";
import { niumSandboxProvider, hasNiumSandboxCredentials } from "./providers/niumSandboxProvider";

export async function createPayout(request: CreatePayoutRequest) {
  const resolvedSelection = selectBestPayoutPartner(request);
  const selection = request.providerId
    ? {
        ...resolvedSelection,
        selectedProviderId: request.providerId,
        selectedProviderName:
          request.providerId === "AIRWALLEX_SANDBOX"
            ? "Airwallex Sandbox"
            : resolvedSelection.evaluatedProviders.find((item) => item.id === request.providerId)?.name ?? request.providerId,
        reason: "Provider fixed by the approved canonical route plan.",
      }
    : resolvedSelection;

  console.log("Payout partner selection:", selection);

  let result;

  if (selection.selectedProviderId === "AIRWALLEX_SANDBOX") {
    result = await airwallexSandboxProvider.createPayout(request);
  } else if (
    selection.selectedProviderId === "NIUM_SANDBOX" &&
    hasNiumSandboxCredentials()
  ) {
    result = await niumSandboxProvider.createPayout(request);
  } else {
    throw new PayoutProviderError(
      "The approved route does not have an evidence-backed payout provider.",
      selection.selectedProviderId,
      selection.selectedProviderName,
      false,
      "PROVIDER_UNAVAILABLE",
      "create_payout",
    );
  }

  return {
    ...result,
    providerId: selection.selectedProviderId,
    providerName: selection.selectedProviderName,
    routingReason: selection.reason,
    fallbackUsed: false,
    providerMessage: result.providerMessage,
  };
}

export async function getPayoutStatus(reference: string) {
  if (reference.startsWith("airwallex:")) {
    return airwallexSandboxProvider.getPayoutStatus(reference);
  }

  if (reference.startsWith("nium:") && hasNiumSandboxCredentials()) {
    return niumSandboxProvider.getPayoutStatus(reference);
  }

  throw new PayoutProviderError(
    "No evidence-backed provider owns this payout reference.",
    "MOCK_PAYOUT_SANDBOX",
    "Unavailable provider",
    false,
    "PROVIDER_REFERENCE_UNAVAILABLE",
    "get_payout_status",
  );
}
