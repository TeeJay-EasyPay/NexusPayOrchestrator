import { View } from "react-native";

import type { CanonicalRoutePlan, RouteDataProvenance } from "../../types/routePlan";
import type { DataProvenanceClassification } from "../../utils/operationsCommandCentre";
import { DataProvenanceBadge } from "../operations-v2/DataProvenanceBadge";
import { AppText } from "../ui/AppText";

function money(value: number | null, currency: string) {
  return value == null ? "Unavailable" : `${value.toLocaleString(undefined, { maximumFractionDigits: 4 })} ${currency}`;
}

function badgeValue(value: RouteDataProvenance) {
  return value as DataProvenanceClassification;
}

function EvidenceRow({ label, value, provenance }: { label: string; value: string; provenance: RouteDataProvenance }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, minHeight: 30 }}>
      <AppText variant="caption" color="#64748B" style={{ flex: 1 }}>{label}</AppText>
      <AppText variant="caption" color="#0F172A" style={{ flex: 1.4, textAlign: "right", fontWeight: "800" }}>{value}</AppText>
      <DataProvenanceBadge classification={badgeValue(provenance)} />
    </View>
  );
}

export function RoutePlanComparison({ plan }: { plan: CanonicalRoutePlan }) {
  return (
    <View style={{ gap: 6, paddingTop: 4 }}>
      <EvidenceRow label="Funding provider" value={plan.funding.provider.providerName} provenance={plan.funding.provider.status.provenance} />
      <EvidenceRow label="Bridge provider" value={plan.bridge.required ? plan.bridge.provider?.providerName ?? "Unavailable" : "Not required"} provenance={plan.bridge.required ? plan.bridge.provider?.status.provenance ?? "UNAVAILABLE" : "DERIVED"} />
      <EvidenceRow label="Payout provider" value={plan.payout.provider.providerName} provenance={plan.payout.provider.status.provenance} />
      <EvidenceRow label="Settlement method" value={plan.settlementMethod.value.replace(/_/g, " ")} provenance={plan.settlementMethod.provenance} />
      <EvidenceRow label="FX rate" value={plan.economics.fxRate.value == null ? "Unavailable" : plan.economics.fxRate.value.toFixed(4)} provenance={plan.economics.fxRate.provenance} />
      <EvidenceRow label="FX spread" value={plan.economics.fxSpreadBps.value == null ? "Unavailable" : `${plan.economics.fxSpreadBps.value} bps`} provenance={plan.economics.fxSpreadBps.provenance} />
      <EvidenceRow label="Provider fee" value={money(plan.economics.providerFees.value, plan.economics.sourceCurrency)} provenance={plan.economics.providerFees.provenance} />
      <EvidenceRow label="Network fee" value={money(plan.economics.networkFees.value, plan.economics.sourceCurrency)} provenance={plan.economics.networkFees.provenance} />
      <EvidenceRow label="Total cost" value={money(plan.economics.totalCost.value, plan.economics.sourceCurrency)} provenance={plan.economics.totalCost.provenance} />
      <EvidenceRow label="Estimated recipient" value={money(plan.economics.estimatedRecipientAmount.value, plan.economics.destinationCurrency)} provenance={plan.economics.estimatedRecipientAmount.provenance} />
      <EvidenceRow label="ETA" value={plan.intelligence.etaMinutes.value == null ? "Unavailable" : `${Math.round(plan.intelligence.etaMinutes.value)} min`} provenance={plan.intelligence.etaMinutes.provenance} />
      <EvidenceRow label="Evidence risk" value={`${plan.intelligence.risk.value}/100`} provenance={plan.intelligence.risk.provenance} />
      <EvidenceRow label="Confidence" value={`${plan.intelligence.confidence.value}/100`} provenance={plan.intelligence.confidence.provenance} />
      <EvidenceRow label="Historical success" value={plan.intelligence.historicalSuccessRate.value == null ? "Unavailable" : `${plan.intelligence.historicalSuccessRate.value.toFixed(1)}%`} provenance={plan.intelligence.historicalSuccessRate.provenance} />
      <EvidenceRow label="Liquidity" value={plan.intelligence.liquidity.value == null ? "Unavailable" : String(plan.intelligence.liquidity.value)} provenance={plan.intelligence.liquidity.provenance} />
      <EvidenceRow label="Capacity" value={plan.intelligence.capacity.value == null ? "Unavailable" : String(plan.intelligence.capacity.value)} provenance={plan.intelligence.capacity.provenance} />
      <EvidenceRow label="Compliance eligibility" value={plan.intelligence.complianceEligible.value ? "Eligible" : "Unavailable"} provenance={plan.intelligence.complianceEligible.provenance} />
      <EvidenceRow label="Quote expiry" value={new Date(plan.quoteExpiresAt).toLocaleTimeString()} provenance="DERIVED" />
      <EvidenceRow label="Plan version" value={`v${plan.version} • ${plan.status}`} provenance="DERIVED" />
    </View>
  );
}
