import React, { useEffect, useState } from "react";
import { View } from "react-native";

import { AppCard } from "../src/components/ui/AppCard";
import { AppText } from "../src/components/ui/AppText";
import { loadReceivedTransfers } from "../src/services/multiEntityOrchestrationService";
import { usePersona } from "../src/state/PersonaContext";
import { ConsumerShell, consumerColors } from "../src/components/consumer/ConsumerShell";

function formatDate(ts: string): string {
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

function formatStatus(status: string): string {
  if (status === "DELIVERED") return "Delivered";
  if (status === "IN_PROGRESS") return "In Progress";
  if (status === "ROUTING") return "Routing";
  return "Created";
}

const businessColors = {
  teal: "#087C89",
  green: "#108A5F",
  gold: "#B7791F",
  border: "#D7E7E5",
  text: "#0F2239",
  muted: "#5F728A",
};

export default function ReceivedTransfersScreen() {
  const { selectedPersona } = usePersona();
  const participantId = selectedPersona.participantId;

  const [rows, setRows] = useState<{
    id: string;
    createdAt: string;
    senderName: string;
    amount: number;
    status: string;
  }[]>([]);
  const [loading, setLoading] = useState(true);
  const isCorporatePersona = selectedPersona.id === "corporate-demo";
  const isBusinessPersona = selectedPersona.participantType === "BUSINESS";

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      const data = participantId ? await loadReceivedTransfers(participantId) : [];
      if (mounted) {
        setRows(data);
        setLoading(false);
      }
    }

    void load();

    return () => {
      mounted = false;
    };
  }, [participantId]);

  return (
    <ConsumerShell
      eyebrow={isCorporatePersona ? "CORPORATE RECEIVED" : isBusinessPersona ? "BUSINESS RECEIVABLES" : "RECEIVED"}
      title={isCorporatePersona ? "Corporate received transfers" : isBusinessPersona ? "Received payments" : "Received transfers"}
      subtitle={isCorporatePersona ? "Incoming value movements relevant to the corporate workspace." : isBusinessPersona ? "Incoming business payments from batch activity." : "Persona-specific incoming transfers from corporate payout batches."}
    >
        <AppCard>
          <View style={{ gap: 4 }}>
            <AppText variant="caption" color={consumerColors.muted}>{isCorporatePersona ? "Workspace details" : "Persona details"}</AppText>
            <AppText variant="caption" color={consumerColors.text}>
              {selectedPersona.bankName
                ? `${selectedPersona.bankName} ****${selectedPersona.accountLast4 ?? ""}`
                : "No participant bank account linked"}
            </AppText>
            <AppText variant="caption" color={consumerColors.muted}>
              {selectedPersona.country ?? "Personal account"}
            </AppText>
          </View>
        </AppCard>

        {loading ? (
          <AppCard>
            <AppText variant="body" color={consumerColors.text}>Loading transfer history...</AppText>
          </AppCard>
        ) : !participantId ? (
          <AppCard>
            <AppText variant="body" color={consumerColors.text}>
              No persona-specific received-transfer ledger is linked to this account.
            </AppText>
          </AppCard>
        ) : rows.length === 0 ? (
          <AppCard>
            <AppText variant="body" color={consumerColors.text}>No received transfers yet.</AppText>
          </AppCard>
        ) : (
          rows.map((item) => (
            <AppCard key={item.id}>
              <View style={{ gap: 12 }}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <AppText variant="caption" color={businessColors.muted}>Sender</AppText>
                    <AppText variant="subheading" color={businessColors.text} style={{ fontWeight: "900" }}>
                      {item.senderName}
                    </AppText>
                  </View>
                  <View style={{
                    borderRadius: 999,
                    backgroundColor: item.status === "DELIVERED" ? "#DFF7EC" : "#FFF4D6",
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                  }}>
                    <AppText variant="caption" color={item.status === "DELIVERED" ? businessColors.green : businessColors.gold} style={{ fontWeight: "900" }}>
                      {formatStatus(item.status)}
                    </AppText>
                  </View>
                </View>

                <View style={{
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: businessColors.border,
                  backgroundColor: "#F7FBFA",
                  padding: 12,
                  flexDirection: "row",
                  justifyContent: "space-between",
                  gap: 12,
                }}>
                  <View style={{ flex: 1 }}>
                    <AppText variant="caption" color={businessColors.muted}>Amount</AppText>
                    <AppText variant="heading" color={businessColors.teal} style={{ fontWeight: "900" }}>
                      {(selectedPersona.currency ?? "GBP")} {item.amount.toLocaleString()}
                    </AppText>
                  </View>
                  <View style={{ alignItems: "flex-end", justifyContent: "center" }}>
                    <AppText variant="caption" color={businessColors.muted}>Date</AppText>
                    <AppText variant="body" color={businessColors.text} style={{ fontWeight: "900" }}>
                      {formatDate(item.createdAt)}
                    </AppText>
                  </View>
                </View>
              </View>
            </AppCard>
          ))
        )}

    </ConsumerShell>
  );
}

