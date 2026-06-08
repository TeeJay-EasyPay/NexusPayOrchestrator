import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";

import {
    ConsumerAction,
    ConsumerCard,
    ConsumerShell,
    consumerColors,
} from "../../src/components/consumer/ConsumerShell";
import { AppText } from "../../src/components/ui/AppText";
import {
    ConsumerPreferences,
    loadConsumerSettings,
    updateConsumerPreferences,
} from "../../src/services/consumerSettingsService";
import { useNexusAISettings } from "../../src/hooks/useNexusAISettings";
import { usePaymentMethods } from "../../src/state/PaymentMethodsContext";

function ToggleRow({
  title,
  subtitle,
  value,
  onToggle,
}: {
  title: string;
  subtitle: string;
  value: boolean;
  onToggle: (value: boolean) => void;
}) {
  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: consumerColors.border,
        borderRadius: 8,
        padding: 12,
        backgroundColor: consumerColors.white,
        gap: 6,
      }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
        <View style={{ flex: 1 }}>
          <AppText color={consumerColors.text} style={{ fontWeight: "900", fontSize: 17 }}>
            {title}
          </AppText>
          <AppText color={consumerColors.muted}>{subtitle}</AppText>
        </View>
        <Pressable
          onPress={() => onToggle(!value)}
          style={{
            borderRadius: 999,
            paddingHorizontal: 12,
            paddingVertical: 8,
            backgroundColor: value ? consumerColors.blue : consumerColors.blueSoft,
          }}
        >
          <AppText variant="caption" style={{ color: value ? consumerColors.white : consumerColors.blueDark, fontWeight: "900" }}>
            {value ? "On" : "Off"}
          </AppText>
        </Pressable>
      </View>
    </View>
  );
}

export default function ConsumerSettingsScreen() {
  const router = useRouter();
  const { primaryMethod } = usePaymentMethods();
  const { settings: aiSettings, updateMasterEnabled } = useNexusAISettings();
  const [preferences, setPreferences] = useState<ConsumerPreferences | null>(null);

  useEffect(() => {
    let mounted = true;

    loadConsumerSettings().then((settings) => {
      if (!mounted) return;
      setPreferences(settings.preferences);
    });

    return () => {
      mounted = false;
    };
  }, []);

  async function updatePref(updates: Partial<ConsumerPreferences>) {
    const next = await updateConsumerPreferences(updates);
    setPreferences(next);
  }

  const readyPreferences =
    preferences ??
    ({
      transferNotifications: true,
      marketingNotifications: false,
      securityNotifications: true,
      preferredLanding: "home",
    } as ConsumerPreferences);

  return (
    <ConsumerShell
      eyebrow="SETTINGS"
      title="Settings"
      subtitle="Simple controls for your money, privacy, and security in one place."
    >
      <ConsumerCard>
        <AppText color={consumerColors.text} style={{ fontWeight: "900", fontSize: 18 }}>
          Payment methods
        </AppText>
        <AppText color={consumerColors.muted}>
          Primary funding source: {primaryMethod?.label ?? "Not selected"}
        </AppText>
        <ConsumerAction label="Manage payment methods" icon="credit-card" onPress={() => router.push("/payment-methods" as never)} />
      </ConsumerCard>

      <ConsumerCard>
        <AppText color={consumerColors.text} style={{ fontWeight: "900", fontSize: 18 }}>
          Notification settings
        </AppText>
        <ToggleRow
          title="Transfer updates"
          subtitle="Receive status changes, delays and delivery confirmations."
          value={readyPreferences.transferNotifications}
          onToggle={(value) => updatePref({ transferNotifications: value })}
        />
        <ToggleRow
          title="Security alerts"
          subtitle="Get sign-in and suspicious activity alerts."
          value={readyPreferences.securityNotifications}
          onToggle={(value) => updatePref({ securityNotifications: value })}
        />
        <ToggleRow
          title="Product announcements"
          subtitle="Receive occasional product updates and tips."
          value={readyPreferences.marketingNotifications}
          onToggle={(value) => updatePref({ marketingNotifications: value })}
        />
      </ConsumerCard>

      <ConsumerCard>
        <AppText color={consumerColors.text} style={{ fontWeight: "900", fontSize: 18 }}>
          Workspace preferences
        </AppText>
        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
          {(["home", "send", "transfers"] as const).map((option) => (
            <Pressable
              key={option}
              onPress={() => updatePref({ preferredLanding: option })}
              style={{
                borderWidth: 1,
                borderColor:
                  readyPreferences.preferredLanding === option
                    ? consumerColors.blue
                    : consumerColors.border,
                borderRadius: 999,
                paddingHorizontal: 12,
                paddingVertical: 8,
                backgroundColor:
                  readyPreferences.preferredLanding === option
                    ? consumerColors.blueSoft
                    : consumerColors.white,
              }}
            >
              <AppText
                variant="caption"
                style={{
                  color:
                    readyPreferences.preferredLanding === option
                      ? consumerColors.blueDark
                      : consumerColors.muted,
                  fontWeight: "900",
                }}
              >
                {option.toUpperCase()}
              </AppText>
            </Pressable>
          ))}
        </View>
      </ConsumerCard>

      <ConsumerCard accent>
        <AppText color={consumerColors.text} style={{ fontWeight: "900", fontSize: 18 }}>
          Nexus AI
        </AppText>
        <AppText color={consumerColors.muted}>
          Choose how much guidance Nexus AI gives while sending and tracking money.
        </AppText>
        <ToggleRow
          title="Nexus AI assistant"
          subtitle="Turn AI guidance on or off for private account experiences."
          value={Boolean(aiSettings?.master_enabled)}
          onToggle={(value) => {
            void updateMasterEnabled(value);
          }}
        />
        <ConsumerAction label="Manage Nexus AI" icon="cpu" onPress={() => router.push("/consumer/nexus-ai" as never)} />
      </ConsumerCard>
    </ConsumerShell>
  );
}
