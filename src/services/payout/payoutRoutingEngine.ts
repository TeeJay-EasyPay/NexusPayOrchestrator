import { payoutPartnerDirectory } from "./payoutPartnerDirectory";
import { CreatePayoutRequest, PayoutPartnerSelection } from "./payoutTypes";

export function selectBestPayoutPartner(request: CreatePayoutRequest): PayoutPartnerSelection {
  const candidates = payoutPartnerDirectory.map((partner) => {
    let score = 0;
    let supported = true;
    let reason = [];

    if (!partner.supportedCountries.includes(request.country)) {
      supported = false;
      reason.push("Country not supported");
    } else {
      score += 30;
    }

    if (!partner.supportedCurrencies.includes(request.currency)) {
      supported = false;
      reason.push("Currency not supported");
    } else {
      score += 20;
    }

    if (!partner.supportedPayoutMethods.includes(request.payoutMethod)) {
      supported = false;
      reason.push("Payout method not supported");
    } else {
      score += 20;
    }

    score += partner.reliabilityScore * 0.2;
    score += partner.feeScore * 0.1;

    return {
      id: partner.id,
      name: partner.name,
      score,
      supported,
      reason: reason.join(", ") || "Fully supported",
    };
  });

  const sorted = candidates
    .filter((c) => c.supported)
    .sort((a, b) => b.score - a.score);

  const selected = sorted[0];
  const fallback = candidates[0];

  return {
    selectedProviderId: selected?.id || "MOCK_PAYOUT_SANDBOX",
    selectedProviderName: selected?.name || "Mock Payout Sandbox",
    score: selected?.score || 0,
    reason: selected?.reason || "Fallback to mock",
    fallbackProviderId: fallback?.id || "MOCK_PAYOUT_SANDBOX",
    evaluatedProviders: candidates,
  };
}
