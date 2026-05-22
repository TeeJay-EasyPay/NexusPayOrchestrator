import { Switch, useWindowDimensions, View } from "react-native";

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

  const statusLabel = enabled ? "Enabled" : "Disabled";

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
          alignItems: compactLayout ? "stretch" : "flex-start",
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
        </View>

        <View style={{ alignItems: compactLayout ? "flex-start" : "center", gap: 8 }}>
          <Switch
            value={enabled}
            onValueChange={(nextValue) => {
              if (toggleDisabled) return;
              onToggle(nextValue);
            }}
            disabled={toggleDisabled}
            trackColor={{ false: "#CBD5E1", true: "#0E8A92" }}
            thumbColor={enabled ? "#FFFFFF" : "#F8FAFC"}
          />

          <View
            style={{
              minWidth: 78,
              paddingHorizontal: 12,
              paddingVertical: 4,
              borderRadius: 999,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: enabled ? "#DCFCE7" : "#E2E8F0",
            }}
          >
            <AppText
              variant="caption"
              style={{
                color: enabled ? "#15803D" : "#64748B",
                fontWeight: "900",
              }}
            >
              {statusLabel}
            </AppText>
          </View>

          {disabled ? (
            <AppText variant="caption" color={colors.textDarkMuted} style={{ textAlign: compactLayout ? "left" : "center" }}>
              AI disabled globally
            </AppText>
          ) : null}
        </View>
      </View>
    </AppCard>
  );
}