import { useRouter } from "expo-router";
import { View } from "react-native";

import {
    ConsumerAction,
    ConsumerCard,
    ConsumerShell,
    consumerColors,
} from "../../src/components/consumer/ConsumerShell";
import { AppText } from "../../src/components/ui/AppText";

const settings = [
  ["Payment methods", "Cards and connected bank accounts"],
  ["Security", "Password, trusted devices and alerts"],
  ["Notifications", "Transfer updates and reminders"],
  ["Privacy", "Data, consent and account controls"],
  ["Verification", "Identity checks for higher transfer limits"],
];

export default function ConsumerSettingsScreen() {
  const router = useRouter();

  return (
    <ConsumerShell
      eyebrow="SETTINGS"
      title="Settings"
      subtitle="Simple controls for your money, privacy and security."
    >
      {settings.map(([title, subtitle]) => (
        <ConsumerCard key={title}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <AppText color={consumerColors.text} style={{ fontWeight: "900", fontSize: 18 }}>
                {title}
              </AppText>
              <AppText color={consumerColors.muted}>{subtitle}</AppText>
            </View>
            <AppText color={consumerColors.blue} style={{ fontWeight: "900" }}>
              Manage
            </AppText>
          </View>
        </ConsumerCard>
      ))}

      <ConsumerCard accent>
        <AppText color={consumerColors.text} style={{ fontWeight: "900", fontSize: 18 }}>
          Nexus AI
        </AppText>
        <AppText color={consumerColors.muted}>
          Choose how much guidance Nexus AI gives while sending and tracking money.
        </AppText>
        <ConsumerAction label="Manage Nexus AI" icon="cpu" onPress={() => router.push("/consumer/nexus-ai" as never)} />
      </ConsumerCard>
    </ConsumerShell>
  );
}
