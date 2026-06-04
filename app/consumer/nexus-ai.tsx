import { View } from "react-native";

import {
    ConsumerCard,
    ConsumerPill,
    ConsumerShell,
    consumerColors,
} from "../../src/components/consumer/ConsumerShell";
import { AppText } from "../../src/components/ui/AppText";

const capabilities = [
  ["Transfer assistance", "Get clear guidance before you confirm a transfer."],
  ["Fee explanation", "Understand costs in plain language before sending."],
  ["Delivery insights", "See simple explanations for timing and progress."],
  ["Helpful recommendations", "Receive suggestions that can reduce cost or delay."],
];

export default function ConsumerNexusAIScreen() {
  return (
    <ConsumerShell
      eyebrow="NEXUS AI"
      title="Helpful guidance"
      subtitle="Nexus AI explains transfers in simple, confidence-building language."
    >
      <ConsumerCard>
        <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <AppText color={consumerColors.text} style={{ fontSize: 20, fontWeight: "900" }}>
              What Nexus AI can do
            </AppText>
            <AppText color={consumerColors.muted}>Calm, concise guidance for decisions and delivery confidence.</AppText>
          </View>
          <ConsumerPill label="On" tone="green" />
        </View>
      </ConsumerCard>

      {capabilities.map(([title, detail]) => (
        <ConsumerCard key={title}>
          <AppText color={consumerColors.text} style={{ fontWeight: "900", fontSize: 18 }}>
            {title}
          </AppText>
          <AppText color={consumerColors.muted}>{detail}</AppText>
        </ConsumerCard>
      ))}

      <ConsumerCard accent>
        <AppText color={consumerColors.text} style={{ fontWeight: "900", fontSize: 18 }}>
          You stay in control
        </AppText>
        <AppText color={consumerColors.muted}>
          Nexus AI does not move money by itself, change recipients, or hide fees.
        </AppText>
      </ConsumerCard>
    </ConsumerShell>
  );
}
