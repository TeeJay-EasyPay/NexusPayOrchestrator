import { View } from "react-native";

import type { CanonicalRoutePlan, RouteDataProvenance } from "../../types/routePlan";
import type { DataProvenanceClassification } from "../../utils/operationsCommandCentre";
import { DataProvenanceBadge } from "../operations-v2/DataProvenanceBadge";
import { AppText } from "../ui/AppText";

function amount(value: number | null, currency: string) {
  return value == null
    ? "Unavailable"
    : `${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })} ${currency}`;
}

function CostRow({ label, value, provenance }: { label: string; value: string; provenance: RouteDataProvenance }) {
  return (
    <View style={{ minHeight: 34, flexDirection: "row", alignItems: "center", gap: 8 }}>
      <AppText variant="caption" color="#64748B" style={{ flex: 1 }}>{label}</AppText>
      <AppText variant="caption" color="#0F172A" style={{ flex: 1.2, textAlign: "right", fontWeight: "800" }}>{value}</AppText>
      <DataProvenanceBadge classification={provenance as DataProvenanceClassification} />
    </View>
  );
}

export function PreSendCostSummary({ plan }: { plan: CanonicalRoutePlan }) {
  const quoteReference = plan.payout.provider.quoteReference?.value;
  return (
    <View style={{ gap: 6, borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 8, padding: 12, backgroundColor: "#F8FAFC" }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <AppText variant="body" color="#0F172A" style={{ fontWeight: "900" }}>Pre-send cost quotation</AppText>
        <DataProvenanceBadge classification="SANDBOX" />
      </View>
      <CostRow label="You send" value={amount(plan.economics.sendAmount, plan.economics.sourceCurrency)} provenance="DERIVED" />
      <CostRow label="Airwallex FX rate" value={plan.economics.fxRate.value == null ? "Unavailable" : plan.economics.fxRate.value.toFixed(6)} provenance={plan.economics.fxRate.provenance} />
      <CostRow label="Recipient quoted" value={amount(plan.economics.estimatedRecipientAmount.value, plan.economics.destinationCurrency)} provenance={plan.economics.estimatedRecipientAmount.provenance} />
      <CostRow label="Payout provider fee" value={amount(plan.economics.providerFees.value, plan.economics.sourceCurrency)} provenance={plan.economics.providerFees.provenance} />
      <CostRow label="Network fee" value={amount(plan.economics.networkFees.value, plan.economics.sourceCurrency)} provenance={plan.economics.networkFees.provenance} />
      <CostRow label="Total additional cost" value={amount(plan.economics.totalCost.value, plan.economics.sourceCurrency)} provenance={plan.economics.totalCost.provenance} />
      <AppText variant="caption" color="#64748B">
        {quoteReference
          ? `Airwallex quote ending ${quoteReference.slice(-8)} expires ${new Date(plan.quoteExpiresAt).toLocaleTimeString()}. Payout fees remain unavailable until Airwallex creates the sandbox transfer.`
          : "No Airwallex quote is available, so this Route Plan cannot be approved."}
      </AppText>
    </View>
  );
}
