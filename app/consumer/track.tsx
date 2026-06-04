import { View } from "react-native";

import {
    ConsumerAction,
    ConsumerCard,
    ConsumerPill,
    ConsumerShell,
    consumerColors,
} from "../../src/components/consumer/ConsumerShell";
import { transferTimeline } from "../../src/components/consumer/consumerData";
import { AppText } from "../../src/components/ui/AppText";

export default function ConsumerTrackScreen() {
  return (
    <ConsumerShell
      eyebrow="TRACK"
      title="Track transfer"
      subtitle="Clear progress updates and helpful guidance while your transfer is delivered."
    >
      <ConsumerCard>
        <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <AppText color={consumerColors.text} style={{ fontSize: 20, fontWeight: "900" }}>
              Maria Santos
            </AppText>
            <AppText color={consumerColors.muted}>Reference NXP-2026-004981</AppText>
          </View>
          <ConsumerPill label="On track" tone="green" />
        </View>
        <View style={{ height: 10, borderRadius: 999, backgroundColor: consumerColors.blueSoft, overflow: "hidden" }}>
          <View style={{ width: "72%", height: "100%", backgroundColor: consumerColors.blue }} />
        </View>
        <AppText color={consumerColors.muted}>Estimated arrival: 4 minutes</AppText>
      </ConsumerCard>

      <ConsumerCard>
        <AppText color={consumerColors.text} style={{ fontSize: 18, fontWeight: "900" }}>
          Transfer timeline
        </AppText>
        {transferTimeline.map((step) => (
          <View key={step.title} style={{ flexDirection: "row", gap: 10 }}>
            <View
              style={{
                width: 12,
                height: 12,
                borderRadius: 6,
                marginTop: 4,
                backgroundColor: step.state === "Done" ? consumerColors.success : consumerColors.blue,
              }}
            />
            <View style={{ flex: 1 }}>
              <AppText color={consumerColors.text} style={{ fontWeight: "900" }}>
                {step.title}
              </AppText>
              <AppText color={consumerColors.muted}>{step.detail}</AppText>
            </View>
          </View>
        ))}
      </ConsumerCard>

      <ConsumerCard accent>
        <AppText color={consumerColors.text} style={{ fontSize: 18, fontWeight: "900" }}>
          Nexus AI explanation panel
        </AppText>
        <AppText color={consumerColors.muted}>
          Your transfer is moving normally. We will notify you if delivery time changes or if you need to take action.
        </AppText>
      </ConsumerCard>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        <ConsumerAction label="Delivery confirmation" icon="check-circle" onPress={() => undefined} />
        <ConsumerAction label="View receipt" icon="file-text" secondary onPress={() => undefined} />
      </View>
    </ConsumerShell>
  );
}
