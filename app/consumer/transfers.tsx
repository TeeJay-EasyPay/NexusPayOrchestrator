import { useRouter } from "expo-router";
import { View } from "react-native";

import {
  ConsumerAction,
  ConsumerCard,
  ConsumerPill,
  ConsumerShell,
  consumerColors,
} from "../../src/components/consumer/ConsumerShell";
import { recentConsumerTransfers } from "../../src/components/consumer/consumerData";
import { AppText } from "../../src/components/ui/AppText";

export default function ConsumerTransfersScreen() {
  const router = useRouter();

  return (
    <ConsumerShell
      eyebrow="TRANSFERS"
      title="Your transfers"
      subtitle="Find receipts, repeat payments and check status in plain language."
    >
      <ConsumerCard>
        <AppText color={consumerColors.text} style={{ fontWeight: "900", fontSize: 18 }}>
          Search and filters
        </AppText>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          <ConsumerPill label="All status" />
          <ConsumerPill label="All destinations" />
          <ConsumerPill label="30 days" />
        </View>
      </ConsumerCard>

      {recentConsumerTransfers.map((transfer) => (
        <ConsumerCard key={transfer.id}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <AppText color={consumerColors.text} style={{ fontWeight: "900", fontSize: 18 }}>
                {transfer.recipient}
              </AppText>
              <AppText color={consumerColors.muted}>
                {transfer.amount} to {transfer.destination}
              </AppText>
              <AppText color={consumerColors.muted}>{transfer.id}</AppText>
            </View>
            <ConsumerPill label={transfer.status} tone="green" />
          </View>
          <AppText color={consumerColors.text} style={{ fontWeight: "900" }}>
            Recipient received {transfer.received}
          </AppText>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            <ConsumerAction label="Repeat" icon="repeat" onPress={() => router.push("/consumer/send" as never)} />
            <ConsumerAction label="Receipt" icon="file-text" secondary onPress={() => undefined} />
          </View>
        </ConsumerCard>
      ))}
    </ConsumerShell>
  );
}
