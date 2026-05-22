import { Pressable, useWindowDimensions, View } from "react-native";

import { colors } from "../../theme";
import { AppCard } from "../ui/AppCard";
import { AppText } from "../ui/AppText";

type NexusAIToggleCardProps = {
  title: string;
  description: string;
  enabled: boolean;
  disabled: boolean;
  onToggle: (nextValue: boolean) => void;
  loading?: boolean;
};

export function NexusAIToggleCard({
  title,
  description,
  enabled,
  disabled,
  onToggle,
  loading = false,
}: NexusAIToggleCardProps) {
  const { width } = useWindowDimensions();
  const compactLayout = width < 430;
  const toggleDisabled = disabled || loading;

  const statusLabel = loading ? "LOADING" : enabled ? "ON" : "OFF";
  const statusText = disabled
    ? "AI disabled globally"
    : enabled
      ? "Nexus AI active for this screen"
      : "Nexus AI disabled for this screen";

  const statusPillStyle = disabled
    ? {
        backgroundColor: "#E2E8F0",
        borderColor: "#CBD5E1",
      }
    : enabled
      ? {
          backgroundColor: colors.goldSoft,
          borderColor: "#F1D99B",
        }
      : {
          backgroundColor: "#F8FAFC",
          borderColor: "#E2E8F0",
        };

  const statusTextStyle = disabled
    ? { color: colors.textDarkSecondary }
    : enabled
      ? { color: colors.gold }
      : { color: colors.textDarkSecondary };

  return (
    <AppCard
      style={{
        padding: 16,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: "#E2E8F0",
        backgroundColor: "#FFFFFF",
      }}
    >
      <View
        style={{
          flexDirection: compactLayout ? "column" : "row",
          alignItems: compactLayout ? "stretch" : "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <View style={{ flex: 1, gap: 4, minWidth: 0 }}>
          <AppText variant="subheading" color={colors.textDarkPrimary} style={{ fontWeight: "900" }}>
            {title}
          </AppText>

          <AppText variant="caption" color={colors.textDarkSecondary}>
            {description}
          </AppText>

          <AppText variant="caption" color={disabled ? colors.textDarkMuted : colors.textDarkSecondary}>
            {statusText}
          </AppText>
        </View>

        <View style={{ alignItems: compactLayout ? "flex-start" : "flex-end", gap: 8 }}>
          <Pressable
            accessibilityRole="switch"
            accessibilityState={{ checked: enabled, disabled: toggleDisabled }}
            onPress={() => {
              if (toggleDisabled) return;
              onToggle(!enabled);
            }}
            style={({ pressed }) => [
              {
                minWidth: 78,
                paddingVertical: 10,
                paddingHorizontal: 16,
                borderRadius: 999,
                borderWidth: 1,
                alignItems: "center",
                justifyContent: "center",
                opacity: toggleDisabled ? 0.82 : 1,
                transform: [{ scale: pressed && !toggleDisabled ? 0.98 : 1 }],
              },
              statusPillStyle,
            ]}
          >
            <AppText variant="caption" style={{ ...statusTextStyle, fontWeight: "900" }}>
              {statusLabel}
            </AppText>
          </Pressable>

          {disabled ? (
            <AppText variant="caption" color={colors.textDarkMuted} style={{ textAlign: compactLayout ? "left" : "right" }}>
              AI disabled globally
            </AppText>
          ) : null}
        </View>
      </View>
    </AppCard>
  );
}