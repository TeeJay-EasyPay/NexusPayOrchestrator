import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { View } from "react-native";

import {
    ConsumerAction,
    ConsumerCard,
    ConsumerPill,
    ConsumerShell,
    consumerColors,
} from "../../src/components/consumer/ConsumerShell";
import { recentConsumerTransfers, scheduledTransfer } from "../../src/components/consumer/consumerData";
import { AppText } from "../../src/components/ui/AppText";

export default function ConsumerHomeScreen() {
  const router = useRouter();

  return (
    <ConsumerShell
      eyebrow="HOME"
      title="Your money is ready"
      subtitle="A simple, trusted view for sending, tracking and managing transfers."
    >
      <ConsumerCard>
        <AppText color={consumerColors.muted} variant="caption">
          Available to send
        </AppText>
        <AppText color={consumerColors.text} style={{ fontSize: 34, fontWeight: "900" }}>
          GBP 1,240.00
        </AppText>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          <ConsumerAction label="Send money" icon="send" onPress={() => router.push("/consumer/send" as never)} />
          <ConsumerAction label="Manage settings" icon="settings" secondary onPress={() => router.push("/consumer/settings" as never)} />
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
              Protected login, transparent fees, and delivery updates at each step.
            </AppText>
          </View>
        </View>
      </ConsumerCard>

      <ConsumerCard>
        <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <AppText color={consumerColors.text} style={{ fontWeight: "900", fontSize: 18 }}>
              Last successful transfer
            </AppText>
            <AppText color={consumerColors.muted} style={{ marginTop: 4 }}>
              {recentConsumerTransfers[0].recipient} received {recentConsumerTransfers[0].received}
            </AppText>
          </View>
          <ConsumerPill label={recentConsumerTransfers[0].eta} tone="green" />
        </View>
      </ConsumerCard>

      <ConsumerCard accent>
        <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
          <Feather name="star" size={22} color={consumerColors.blue} />
          <View style={{ flex: 1 }}>
            <AppText color={consumerColors.text} style={{ fontWeight: "900", fontSize: 18 }}>
              Helpful insight
            </AppText>
            <AppText color={consumerColors.muted} style={{ marginTop: 4, lineHeight: 21 }}>
              Your usual transfer route looks steady today. Most reliable is best if timing matters.
            </AppText>
          </View>
        </View>
      </ConsumerCard>

      <ConsumerCard>
        <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <AppText color={consumerColors.text} style={{ fontWeight: "900", fontSize: 18 }}>
              Next scheduled transfer
            </AppText>
            <AppText color={consumerColors.muted} style={{ marginTop: 4 }}>
              {scheduledTransfer.note}
            </AppText>
          </View>
          <ConsumerPill label={scheduledTransfer.date} tone="blue" />
        </View>
        <AppText color={consumerColors.text} style={{ fontWeight: "900" }}>
          {scheduledTransfer.recipient} - {scheduledTransfer.amount}
        </AppText>
      </ConsumerCard>

      <ConsumerCard>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <AppText color={consumerColors.text} style={{ fontWeight: "900", fontSize: 18 }}>
            Recent activity
          </AppText>
          <ConsumerPill label="Updated" tone="green" />
        </View>
        {recentConsumerTransfers.map((transfer) => (
          <View key={transfer.id} style={{ borderTopWidth: 1, borderTopColor: consumerColors.border, paddingTop: 10 }}>
            <AppText color={consumerColors.text} style={{ fontWeight: "900" }}>
              {transfer.recipient}
            </AppText>
            <AppText color={consumerColors.muted}>
              {transfer.amount} sent to {transfer.destination} - {transfer.status}
            </AppText>
          </View>
        ))}
        <ConsumerAction label="View transfers" icon="list" secondary onPress={() => router.push("/consumer/transfers" as never)} />
      </ConsumerCard>
    </ConsumerShell>
  );
}
