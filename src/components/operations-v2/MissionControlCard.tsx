import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, View } from "react-native";

import { colors, spacing } from "../../theme";
import type { OperationsMissionStatus, OperationsStatusChip, OperationsStatusTone } from "../../utils/operationsCommandCentre";
import { AppCard } from "../ui/AppCard";
import { AppText } from "../ui/AppText";

type Props = {
  missionStatus: OperationsMissionStatus | null | undefined;
};

function toneColor(tone: OperationsStatusTone): string {
  if (tone === "healthy") return "#16A34A";
  if (tone === "warning") return "#D97706";
  if (tone === "critical") return "#DC2626";
  return "#2563EB";
}

function toneIcon(tone: OperationsStatusTone): React.ComponentProps<typeof Feather>["name"] {
  if (tone === "healthy") return "check-circle";
  if (tone === "warning") return "alert-triangle";
  if (tone === "critical") return "x-circle";
  return "info";
}

function StatusChip({ chip }: { chip: OperationsStatusChip }) {
  const color = toneColor(chip.tone ?? "neutral");
  const icon = toneIcon(chip.tone ?? "neutral");

  return (
    <View style={[styles.chip, { backgroundColor: `${color}12`, borderColor: `${color}28` }]}>
      <Feather name={icon} size={13} color={color} style={{ marginRight: 5 }} />
      <View style={{ flex: 1 }}>
        <AppText variant="caption" color={colors.textDarkMuted} style={styles.chipLabel}>
          {chip.label ?? ""}
        </AppText>
        <AppText variant="caption" style={[styles.chipValue, { color }]}>
          {chip.value ?? "—"}
        </AppText>
        {chip.detail ? (
          <AppText variant="caption" color={colors.textDarkSecondary} style={styles.chipDetail}>
            {chip.detail}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

export function MissionControlCard({ missionStatus }: Props) {
  const chips = missionStatus?.chips ?? [];
  const attentionSummary = missionStatus?.attentionSummary ?? "Awaiting operational telemetry";

  return (
    <AppCard style={styles.card}>
      <View style={styles.header}>
        <Feather name="monitor" size={18} color={colors.gold} style={{ marginRight: 8 }} />
        <AppText variant="subheading" color={colors.textDarkPrimary} style={styles.title}>
          Mission Control Status
        </AppText>
      </View>

      <View style={styles.chipsGrid}>
        {chips.length > 0
          ? chips.map((chip, idx) => <StatusChip key={chip.label ?? idx} chip={chip} />)
          : (
            <View style={styles.empty}>
              <AppText variant="caption" color={colors.textDarkMuted}>
                No status data available
              </AppText>
            </View>
          )}
      </View>

      <View style={styles.summaryRow}>
        <Feather name="activity" size={14} color={colors.textDarkMuted} style={{ marginRight: 6 }} />
        <AppText variant="caption" color={colors.textDarkSecondary} style={styles.summary}>
          {attentionSummary}
        </AppText>
      </View>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  title: {
    fontWeight: "700",
  },
  chipsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },
  chip: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minWidth: "47%",
    flex: 1,
  },
  chipLabel: {
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  chipValue: {
    fontWeight: "800",
    fontSize: 13,
  },
  chipDetail: {
    marginTop: 2,
    fontSize: 11,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  summary: {
    flex: 1,
    lineHeight: 18,
    fontSize: 13,
  },
  empty: {
    padding: 12,
  },
});
