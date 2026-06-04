import { useRouter } from "expo-router";
import { View } from "react-native";

import {
    ConsumerAction,
    ConsumerCard,
    ConsumerPill,
    ConsumerShell,
    consumerColors,
} from "../../src/components/consumer/ConsumerShell";
import { AppText } from "../../src/components/ui/AppText";

export default function ConsumerProfileScreen() {
  const router = useRouter();

  return (
    <ConsumerShell
      eyebrow="PROFILE"
      title="Your profile"
      subtitle="Manage your identity, account controls and verification status."
    >
      <ConsumerCard>
        <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <AppText color={consumerColors.text} style={{ fontSize: 22, fontWeight: "900" }}>
              Tayo Jehonathan
            </AppText>
            <AppText color={consumerColors.muted}>Personal account</AppText>
          </View>
          <ConsumerPill label="Preview" tone="blue" />
        </View>
      </ConsumerCard>

      <ConsumerCard>
        <AppText color={consumerColors.text} style={{ fontWeight: "900", fontSize: 18 }}>
          Verification
        </AppText>
        <AppText color={consumerColors.muted}>
          Verification helps increase limits and keeps your transfers protected.
        </AppText>
        <ConsumerAction label="Start verification" icon="shield" onPress={() => undefined} />
      </ConsumerCard>

      <ConsumerCard>
        <AppText color={consumerColors.text} style={{ fontWeight: "900", fontSize: 18 }}>
          Account switching
        </AppText>
        <View style={{ gap: 10 }}>
          <ConsumerPill label="Personal active" tone="green" />
          <ConsumerPill label="Demo available" tone="blue" />
          <ConsumerPill label="Enterprise planned" tone="gold" />
        </View>
      </ConsumerCard>

      <ConsumerAction label="Open settings" icon="settings" secondary onPress={() => router.push("/consumer/settings" as never)} />
    </ConsumerShell>
  );
}
