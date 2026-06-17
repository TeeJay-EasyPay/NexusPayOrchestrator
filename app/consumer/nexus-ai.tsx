import { View } from "react-native";

import {
    ConsumerCard,
    ConsumerPill,
    ConsumerShell,
    consumerColors,
} from "../../src/components/consumer/ConsumerShell";
import { AppText } from "../../src/components/ui/AppText";
import { useNexusAISettings } from "../../src/hooks/useNexusAISettings";

function SettingRow({
  title,
  detail,
  enabled,
  onToggle,
}: {
  title: string;
  detail: string;
  enabled: boolean;
  onToggle: (next: boolean) => void;
}) {
  return (
    <ConsumerCard>
      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
        <View style={{ flex: 1 }}>
          <AppText color={consumerColors.text} style={{ fontWeight: "900", fontSize: 18 }}>
            {title}
          </AppText>
          <AppText color={consumerColors.muted}>{detail}</AppText>
        </View>
        <ConsumerPill label={enabled ? "On" : "Off"} tone={enabled ? "green" : "gold"} />
      </View>
      <View style={{ marginTop: 8 }}>
        <AppText
          onPress={() => onToggle(!enabled)}
          style={{ color: consumerColors.blue, fontWeight: "900" }}
        >
          {enabled ? "Disable" : "Enable"}
        </AppText>
      </View>
    </ConsumerCard>
  );
}

export default function ConsumerNexusAIScreen() {
  const { settings, loading, updateScreenEnabled } = useNexusAISettings();

  const masterEnabled = Boolean(settings?.master_enabled);

  return (
    <ConsumerShell
      eyebrow="NEXUS AI"
      title="Nexus AI controls"
      subtitle="Persisted personal account controls for route, tracking, corridor and home intelligence."
    >
      <ConsumerCard>
        <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <AppText color={consumerColors.text} style={{ fontSize: 20, fontWeight: "900" }}>
              Nexus AI status
            </AppText>
            <AppText color={consumerColors.muted}>
              {loading
                ? "Loading AI settings..."
                : "Controls are saved per user and account scope."}
            </AppText>
          </View>
          <ConsumerPill label={masterEnabled ? "Enabled" : "Limited"} tone={masterEnabled ? "green" : "gold"} />
        </View>
      </ConsumerCard>

      <SettingRow
        title="Home intelligence"
        detail="Enable insight cards and balance-aware assistant guidance on dashboard."
        enabled={Boolean(settings?.home_enabled)}
        onToggle={(next) => void updateScreenEnabled("home_enabled", next)}
      />

      <SettingRow
        title="Route intelligence"
        detail="Enable route-level recommendation and explanation before transfer confirmation."
        enabled={Boolean(settings?.route_enabled)}
        onToggle={(next) => void updateScreenEnabled("route_enabled", next)}
      />

      <SettingRow
        title="Tracking intelligence"
        detail="Enable timeline commentary and execution-state interpretation during transfer progress."
        enabled={Boolean(settings?.tracking_enabled)}
        onToggle={(next) => void updateScreenEnabled("tracking_enabled", next)}
      />

      <SettingRow
        title="Corridor intelligence"
        detail="Enable corridor-level confidence and liquidity insight indicators."
        enabled={Boolean(settings?.corridor_enabled)}
        onToggle={(next) => void updateScreenEnabled("corridor_enabled", next)}
      />

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
