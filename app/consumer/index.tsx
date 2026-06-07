import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useMemo } from "react";
import { View } from "react-native";

import {
    ConsumerAction,
    ConsumerCard,
    ConsumerPill,
    ConsumerShell,
    consumerColors,
} from "../../src/components/consumer/ConsumerShell";
import { AppText } from "../../src/components/ui/AppText";
import { useTransfer } from "../../src/state/TransferContext";
import { useWallet } from "../../src/state/WalletContext";

function formatGbp(value: number) {
  return `GBP ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function ConsumerHomeScreen() {
  const router = useRouter();
  const { transfer, completedTransfers, hydrateTransfers } = useTransfer();
  const { gbpBalance } = useWallet();

  useEffect(() => {
    void hydrateTransfers();
  }, [hydrateTransfers]);

  const recent = useMemo(() => completedTransfers.slice(0, 3), [completedTransfers]);
  const totalSent = useMemo(
    () => completedTransfers.reduce((sum, item) => sum + item.senderAmount, 0),
    [completedTransfers]
  );

  return (
    <ConsumerShell
      eyebrow="HOME"
      title="Good afternoon"
      subtitle="Your money movement is ready. Clear actions, trusted controls, and fast transfer visibility."
    >
      <ConsumerCard accent>
        <AppText color={consumerColors.muted} variant="caption">
          Available to send
        </AppText>
        <AppText color={consumerColors.blueDark} style={{ fontSize: 40, fontWeight: "900" }}>
          {formatGbp(gbpBalance)}
        </AppText>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          <ConsumerAction label="Send money" icon="send" onPress={() => router.push("/consumer/send" as never)} />
          <ConsumerAction label="Add funding source" icon="plus-circle" secondary onPress={() => router.push("/payment-methods" as never)} />
        </View>
      </ConsumerCard>

      <ConsumerCard accent>
        <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
          <Feather name="shield" size={22} color={consumerColors.blue} />
          <View style={{ flex: 1 }}>
            <AppText color={consumerColors.text} style={{ fontWeight: "900", fontSize: 18 }}>
              Trust indicators
            </AppText>
            <AppText color={consumerColors.muted} style={{ marginTop: 4, lineHeight: 21 }}>
              Biometric-protected access, transparent route scoring, and timeline events on every transfer.
            </AppText>
          </View>
        </View>
      </ConsumerCard>

      <ConsumerCard>
        <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <AppText color={consumerColors.text} style={{ fontWeight: "900", fontSize: 18 }}>
              Active transfer status
            </AppText>
            <AppText color={consumerColors.muted} style={{ marginTop: 4 }}>
              {transfer
                ? `${transfer.recipient?.name ?? "Recipient"} • ${transfer.status}`
                : "No active transfer"}
            </AppText>
          </View>
          <ConsumerPill label={transfer ? "LIVE" : "IDLE"} tone={transfer ? "green" : "blue"} />
        </View>
        <ConsumerAction label="View transfer" icon="arrow-right" secondary onPress={() => router.push("/consumer/track" as never)} />
      </ConsumerCard>

      <ConsumerCard accent>
        <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
          <Feather name="star" size={22} color={consumerColors.blue} />
          <View style={{ flex: 1 }}>
            <AppText color={consumerColors.text} style={{ fontWeight: "900", fontSize: 18 }}>
              Helpful insight
            </AppText>
            <AppText color={consumerColors.muted} style={{ marginTop: 4, lineHeight: 21 }}>
              {recent.length > 0
                ? `You've sent ${formatGbp(totalSent)} across ${completedTransfers.length} transfers. Your most-used destination is ${recent[0].recipient?.country ?? "saved in history"}.`
                : "Start your first transfer and NexusPay will build personalized route intelligence."}
            </AppText>
          </View>
        </View>
      </ConsumerCard>

      <ConsumerCard>
        <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <AppText color={consumerColors.text} style={{ fontWeight: "900", fontSize: 18 }}>
              Profile and controls
            </AppText>
            <AppText color={consumerColors.muted} style={{ marginTop: 4 }}>
              Manage payment methods, notification settings, and Nexus AI assistance.
            </AppText>
          </View>
          <ConsumerPill label="Secure" tone="blue" />
        </View>
        <ConsumerAction label="Open settings" icon="settings" secondary onPress={() => router.push("/consumer/settings" as never)} />
      </ConsumerCard>

      <ConsumerCard>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <AppText color={consumerColors.text} style={{ fontWeight: "900", fontSize: 18 }}>
            Recent activity
          </AppText>
          <ConsumerPill label={recent.length > 0 ? "Updated" : "New"} tone="green" />
        </View>
        {recent.length === 0 ? (
          <AppText color={consumerColors.muted}>No completed transfers yet.</AppText>
        ) : null}
        {recent.map((item) => (
          <View key={item.id} style={{ borderTopWidth: 1, borderTopColor: consumerColors.border, paddingTop: 10 }}>
            <AppText color={consumerColors.text} style={{ fontWeight: "900" }}>
              {item.recipient?.name ?? "Recipient"}
            </AppText>
            <AppText color={consumerColors.muted}>
              {formatGbp(item.senderAmount)} sent to {item.recipient?.country ?? "Destination"} - {item.status}
            </AppText>
          </View>
        ))}
        <ConsumerAction label="View transfers" icon="list" secondary onPress={() => router.push("/consumer/transfers" as never)} />
      </ConsumerCard>
    </ConsumerShell>
  );
}
