import { payoutPartnerDirectory } from "./payout/payoutPartnerDirectory";
import type { CreatePayoutRequest, PayoutPartnerSelection } from "./payout/payoutTypes";

export type PartnerCapabilityCode =
  | "OPEN_BANKING_COLLECTION"
  | "INTERNATIONAL_PAYOUT"
  | "SETTLEMENT"
  | "FX_QUOTE"
  | "INSTITUTION_DISCOVERY";

export type PartnerResolutionRequest = {
  capability: PartnerCapabilityCode;
  sourceCountry?: string;
  destinationCountry?: string;
  sourceCurrency?: string;
  destinationCurrency?: string;
  payoutMethod?: CreatePayoutRequest["payoutMethod"];
  environment?: "mock" | "sandbox" | "live";
};

export type PartnerResolutionCandidate = {
  providerId: string;
  providerName: string;
  capability: PartnerCapabilityCode;
  score: number;
  supported: boolean;
  reason: string;
  environment: string;
};

export type PartnerResolutionResult = {
  selectedProviderId: string;
  selectedProviderName: string;
  capability: PartnerCapabilityCode;
  environment: string;
  score: number;
  reason: string;
  candidates: PartnerResolutionCandidate[];
};

const OPEN_BANKING_PROVIDERS: PartnerResolutionCandidate[] = [
  {
    providerId: "yapily",
    providerName: "Yapily",
    capability: "OPEN_BANKING_COLLECTION",
    score: 82,
    supported: true,
    reason: "Sandbox credentials are configured server-side and institution discovery is implemented.",
    environment: "sandbox",
  },
  {
    providerId: "truelayer",
    providerName: "TrueLayer",
    capability: "OPEN_BANKING_COLLECTION",
    score: 35,
    supported: false,
    reason: "Provider metadata exists but no live adapter is implemented yet.",
    environment: "sandbox",
  },
  {
    providerId: "banked",
    providerName: "Banked",
    capability: "OPEN_BANKING_COLLECTION",
    score: 20,
    supported: false,
    reason: "Future provider candidate.",
    environment: "sandbox",
  },
];

export function resolvePartnerByCapability(request: PartnerResolutionRequest): PartnerResolutionResult {
  if (request.capability === "OPEN_BANKING_COLLECTION" || request.capability === "INSTITUTION_DISCOVERY") {
    const candidates = OPEN_BANKING_PROVIDERS.map((candidate) => ({
      ...candidate,
      capability: request.capability,
      supported:
        candidate.supported &&
        (!request.sourceCountry || request.sourceCountry === "GB" || request.sourceCountry === "United Kingdom") &&
        (!request.sourceCurrency || request.sourceCurrency === "GBP"),
    }));
    return selectHighestScoring(request, candidates);
  }

  if (request.capability === "INTERNATIONAL_PAYOUT") {
    const candidates = payoutPartnerDirectory.map<PartnerResolutionCandidate>((partner) => {
      const supportedCountry = request.destinationCountry ? partner.supportedCountries.includes(request.destinationCountry) : true;
      const supportedCurrency = request.destinationCurrency ? partner.supportedCurrencies.includes(request.destinationCurrency) : true;
      const supportedMethod = request.payoutMethod ? partner.supportedPayoutMethods.includes(request.payoutMethod) : true;
      const supported = supportedCountry && supportedCurrency && supportedMethod;
      return {
        providerId: partner.id,
        providerName: partner.name,
        capability: request.capability,
        score: supported ? partner.reliabilityScore * 0.6 + partner.feeScore * 0.3 + partner.priority * 2 : 0,
        supported,
        reason: supported ? "Capability, corridor and payout method supported." : "Capability requested but corridor or payout method is not supported.",
        environment: request.environment ?? "sandbox",
      };
    });
    return selectHighestScoring(request, candidates);
  }

  return selectHighestScoring(request, []);
}

export function resolvePayoutPartnerThroughCapabilities(request: CreatePayoutRequest): PayoutPartnerSelection {
  const resolution = resolvePartnerByCapability({
    capability: "INTERNATIONAL_PAYOUT",
    destinationCountry: request.country,
    destinationCurrency: request.currency,
    payoutMethod: request.payoutMethod,
    environment: "sandbox",
  });

  return {
    selectedProviderId: resolution.selectedProviderId as PayoutPartnerSelection["selectedProviderId"],
    selectedProviderName: resolution.selectedProviderName,
    score: resolution.score,
    reason: resolution.reason,
    fallbackProviderId: "MOCK_PAYOUT_SANDBOX",
    evaluatedProviders: resolution.candidates.map((candidate) => ({
      id: candidate.providerId as PayoutPartnerSelection["selectedProviderId"],
      name: candidate.providerName,
      score: candidate.score,
      supported: candidate.supported,
      reason: candidate.reason,
    })),
  };
}

function selectHighestScoring(
  request: PartnerResolutionRequest,
  candidates: PartnerResolutionCandidate[],
): PartnerResolutionResult {
  const selected = candidates
    .filter((candidate) => candidate.supported)
    .sort((a, b) => b.score - a.score)[0];

  return {
    selectedProviderId: selected?.providerId ?? "MOCK_PAYOUT_SANDBOX",
    selectedProviderName: selected?.providerName ?? "Mock Payout Sandbox",
    capability: request.capability,
    environment: request.environment ?? "sandbox",
    score: selected?.score ?? 0,
    reason: selected?.reason ?? "No live partner currently satisfies this capability; fallback path required.",
    candidates,
  };
}
