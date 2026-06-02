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
      subtitle="A simpler view for sending, tracking and saving on transfers."
    >
      <ConsumerCard>
        <AppText color={consumerColors.muted} variant="caption">
          Available to send
        </AppText>
        <AppText color={consumerColors.text} style={{ fontSize: 34, fontWeight: "900" }}>
          GBP 1.00
        </AppText>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          <ConsumerAction label="Send money" icon="send" onPress={() => router.push("/consumer/send" as never)} />
          <ConsumerAction label="Add money" icon="plus" secondary onPress={() => router.push("/payment-methods" as never)} />
        </View>
      </ConsumerCard>

      <ConsumerCard accent>
        <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
          <Feather name="star" size={22} color={consumerColors.blue} />
          <View style={{ flex: 1 }}>
            <AppText color={consumerColors.text} style={{ fontWeight: "900", fontSize: 18 }}>
              Nexus AI insight
            </AppText>
            <AppText color={consumerColors.muted} style={{ marginTop: 4, lineHeight: 21 }}>
              Your usual Philippines transfer looks steady today. Most reliable is the calmer choice if timing matters.
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
          <ConsumerPill label="2 days" tone="green" />
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
