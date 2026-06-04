import { View } from "react-native";

import {
    ConsumerAction,
    ConsumerCard,
    ConsumerPill,
    ConsumerShell,
    consumerColors,
} from "../../src/components/consumer/ConsumerShell";
import { routeOptions } from "../../src/components/consumer/consumerData";
import { AppText } from "../../src/components/ui/AppText";

export default function ConsumerSendScreen() {
  return (
    <ConsumerShell
      eyebrow="SEND"
      title="Send money"
      subtitle="Choose the amount, recipient and delivery option that best fits your needs."
    >
      <ConsumerCard>
        <AppText variant="caption" color={consumerColors.muted}>
          You send
        </AppText>
        <AppText color={consumerColors.text} style={{ fontSize: 32, fontWeight: "900" }}>
          GBP 250.00
        </AppText>
        <AppText color={consumerColors.muted}>Recipient: Maria Santos - Philippines</AppText>
      </ConsumerCard>

      <ConsumerCard accent>
        <AppText color={consumerColors.text} style={{ fontWeight: "900", fontSize: 18 }}>
          Choose delivery option
        </AppText>
        {routeOptions.map((option) => (
          <View
            key={option.title}
            style={{
              borderWidth: 1,
              borderColor: consumerColors.border,
              borderRadius: 8,
              padding: 12,
              gap: 7,
              backgroundColor: consumerColors.white,
            }}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
              <View style={{ flex: 1 }}>
                <AppText color={consumerColors.text} style={{ fontWeight: "900", fontSize: 17 }}>
                  {option.title}
                </AppText>
                <AppText color={consumerColors.muted}>{option.subtitle}</AppText>
              </View>
              <ConsumerPill label={option.eta} tone={option.title === "Cheapest" ? "gold" : "green"} />
            </View>
            <AppText color={consumerColors.text} style={{ fontWeight: "900" }}>
              Amount received: {option.received}
            </AppText>
            <AppText color={consumerColors.muted}>FX rate: {option.rate}</AppText>
            <AppText color={consumerColors.muted}>Fee: {option.fee}</AppText>
          </View>
        ))}
      </ConsumerCard>

      <ConsumerCard>
        <AppText color={consumerColors.text} style={{ fontWeight: "900", fontSize: 18 }}>
          Before you continue
        </AppText>
        <AppText color={consumerColors.muted}>
          You will see the final receipt, estimated arrival time, and all costs before confirmation.
        </AppText>
        <ConsumerAction label="Continue" icon="arrow-right" onPress={() => undefined} />
      </ConsumerCard>
    </ConsumerShell>
  );
}
