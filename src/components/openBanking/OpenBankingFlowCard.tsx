import { View } from "react-native";

import { OpenBankingPaymentFlow } from "../../types/transfer";
import { AppCard } from "../ui/AppCard";
import { AppText } from "../ui/AppText";
import { colors } from "../../theme";

function provenanceColor(provenance: string) {
  if (provenance === "LIVE") return "#16A34A";
  if (provenance === "SANDBOX") return "#D6A84F";
  if (provenance === "DERIVED") return "#2563EB";
  if (provenance === "NO_DATA") return "#64748B";
  return "#94A3B8";
}

function statusColor(status: string) {
  if (status === "DONE" || status === "READY_FOR_EXECUTION") return "#16A34A";
  if (status === "FAILED") return "#DC2626";
  return "#D6A84F";
}

function Pill({ label, color }: { label: string; color: string }) {
  return (
    <View
      style={{
        alignSelf: "flex-start",
        paddingHorizontal: 9,
        paddingVertical: 4,
        borderRadius: 999,
        backgroundColor: `${color}20`,
      }}
    >
      <AppText variant="caption" style={{ color, fontWeight: "900" }}>
        {label}
      </AppText>
    </View>
  );
}

function formatMetadata(metadata?: Record<string, unknown>) {
  if (!metadata) return [];

  return Object.entries(metadata)
    .filter(([, value]) => value !== null && value !== undefined && value !== "")
    .slice(0, 3)
    .map(([key, value]) => {
      const displayValue = typeof value === "object" ? JSON.stringify(value) : String(value);
      return `${key.replace(/_/g, " ")}: ${displayValue}`;
    });
}

export function OpenBankingFlowCard({
  flow,
  emptyMessage = "Open banking flow data appears here when a bank-funded transfer is authorised.",
}: {
  flow?: OpenBankingPaymentFlow | null;
  emptyMessage?: string;
}) {
  return (
    <AppCard>
      <View style={{ gap: 12 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
          <View style={{ flex: 1, gap: 4 }}>
            <AppText variant="subheading" color={colors.textDarkPrimary}>
              Yapily open banking payment flow
            </AppText>
            <AppText variant="caption" color={colors.textDarkSecondary}>
              Sender-visible evidence trail for the funding leg.
            </AppText>
          </View>
          {flow ? <Pill label={flow.provenance} color={provenanceColor(flow.provenance)} /> : null}
        </View>

        {!flow ? (
          <View
            style={{
              padding: 14,
              borderRadius: 18,
              backgroundColor: "#F8FAFC",
              borderWidth: 1,
              borderColor: "#E2E8F0",
            }}
          >
            <AppText variant="caption" color={colors.textDarkSecondary}>
              {emptyMessage}
            </AppText>
          </View>
        ) : (
          <>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              <Pill label={flow.status} color={statusColor(flow.status)} />
              <Pill label={flow.providerId.toUpperCase()} color="#0B3F4A" />
              <Pill label={flow.environment.toUpperCase()} color="#64748B" />
            </View>

            <View
              style={{
                padding: 14,
                borderRadius: 18,
                backgroundColor: "#F8FAFC",
                borderWidth: 1,
                borderColor: "#E2E8F0",
                gap: 5,
              }}
            >
              <AppText variant="caption" color={colors.textDarkMuted}>
                Institution
              </AppText>
              <AppText variant="body" color={colors.textDarkPrimary} style={{ fontWeight: "900" }}>
                {flow.institutionName ?? "Not selected"}
              </AppText>
              <AppText variant="caption" color={colors.textDarkSecondary}>
                Payment request {flow.paymentRequestId ?? "Not created"} - Consent {flow.consentId ?? "Not created"}
              </AppText>
            </View>

            <View style={{ gap: 10 }}>
              {flow.steps.map((step, index) => {
                const color = statusColor(step.status);
                const metadataLines = formatMetadata(step.metadata);

                return (
                  <View key={step.id} style={{ flexDirection: "row", gap: 11 }}>
                    <View style={{ alignItems: "center" }}>
                      <View
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 14,
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: color,
                        }}
                      >
                        <AppText variant="caption" style={{ color: "#FFFFFF", fontWeight: "900" }}>
                          {step.status === "DONE" ? "OK" : step.status === "FAILED" ? "!" : index + 1}
                        </AppText>
                      </View>
                      {index < flow.steps.length - 1 ? (
                        <View style={{ width: 2, height: metadataLines.length > 0 ? 72 : 46, backgroundColor: "#E2E8F0" }} />
                      ) : null}
                    </View>

                    <View style={{ flex: 1, gap: 4, paddingBottom: 8 }}>
                      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                        <AppText variant="body" color={colors.textDarkPrimary} style={{ fontWeight: "900" }}>
                          {step.label}
                        </AppText>
                        <Pill label={step.provenance} color={provenanceColor(step.provenance)} />
                      </View>
                      <AppText variant="caption" color={colors.textDarkSecondary}>
                        {step.provider}
                        {step.httpStatus ? ` - HTTP ${step.httpStatus}` : ""}
                        {step.responseTimeMs ? ` - ${step.responseTimeMs}ms` : ""}
                      </AppText>
                      {metadataLines.map((line) => (
                        <AppText key={line} variant="caption" color={colors.textDarkMuted}>
                          {line}
                        </AppText>
                      ))}
                    </View>
                  </View>
                );
              })}
            </View>
          </>
        )}
      </View>
    </AppCard>
  );
}
