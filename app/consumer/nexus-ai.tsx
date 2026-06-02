import { View } from "react-native";

import {
  ConsumerCard,
  ConsumerPill,
  ConsumerShell,
  consumerColors,
} from "../../src/components/consumer/ConsumerShell";
import { AppText } from "../../src/components/ui/AppText";

const capabilities = [
  ["Spending insights", "Spot patterns in who you send to and how often."],
  ["Transfer insights", "Explain timing, confidence and next steps."],
  ["Cost-saving insights", "Show when a cheaper option may be available."],
];

export default function ConsumerNexusAIScreen() {
  return (
    <ConsumerShell
      eyebrow="NEXUS AI"
      title="Helpful guidance"
      subtitle="Nexus AI explains your transfers in simple, reassuring language."
    >
      <ConsumerCard>
        <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <AppText color={consumerColors.text} style={{ fontSize: 20, fontWeight: "900" }}>
              AI guidance
            </AppText>
            <AppText color={consumerColors.muted}>Calm, concise and focused on what matters to you.</AppText>
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
          What Nexus AI will not do
        </AppText>
        <AppText color={consumerColors.muted}>
          It will not move money by itself, change recipients or hide fees. You stay in control.
        </AppText>
      </ConsumerCard>
    </ConsumerShell>
  );
}
