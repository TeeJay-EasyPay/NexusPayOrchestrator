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
      eyebrow="RECEIVED"
      title="Received transfers"
      subtitle="Persona-specific incoming transfers from corporate payout batches."
    >
        <AppCard>
          <View style={{ gap: 4 }}>
            <AppText variant="caption" color={consumerColors.muted}>Persona details</AppText>
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
              <View style={{ gap: 6 }}>
                <AppText variant="caption" color={consumerColors.muted}>{formatDate(item.createdAt)}</AppText>

                <AppText variant="caption" color={consumerColors.muted}>Sender:</AppText>
                <AppText variant="body" color={consumerColors.text} style={{ fontWeight: "700" }}>
                  {item.senderName}
                </AppText>

                <AppText variant="caption" color={consumerColors.muted}>Amount:</AppText>
                <AppText variant="body" color={consumerColors.text} style={{ fontWeight: "700" }}>
                  £{item.amount.toLocaleString()}
                </AppText>

                <AppText variant="caption" color={consumerColors.muted}>Status:</AppText>
                <AppText variant="body" color={consumerColors.success} style={{ fontWeight: "700" }}>
                  {formatStatus(item.status)}
                </AppText>
              </View>
            </AppCard>
          ))
        )}

    </ConsumerShell>
  );
}
