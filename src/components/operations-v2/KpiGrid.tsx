import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";

import { colors, spacing } from "../../theme";
import type { OperationsKpiItem } from "../../utils/operationsCommandCentre";
import { DataProvenanceBadge } from "./DataProvenanceBadge";
import { AppText } from "../ui/AppText";

type Props = {
  kpis: OperationsKpiItem[] | null | undefined;
  showDataSources?: boolean;
};

function trendColor(trend: OperationsKpiItem["trend"]): string {
  if (trend === "up") return "#16A34A";
  if (trend === "down") return "#DC2626";
  return "#2563EB";
}

function trendIcon(trend: OperationsKpiItem["trend"]): React.ComponentProps<typeof Feather>["name"] {
  if (trend === "up") return "arrow-up-right";
  if (trend === "down") return "arrow-down-right";
  return "minus";
}

function KpiCell({ item, cellWidth, showDataSources }: { item: OperationsKpiItem; cellWidth: number; showDataSources: boolean }) {
  const tc = trendColor(item.trend ?? "flat");
  const ti = trendIcon(item.trend ?? "flat");

  return (
    <View style={[styles.cell, { width: cellWidth }]}>
      <View style={styles.cellTopRow}>
        <View style={[styles.iconBubble, { backgroundColor: `${item.tint ?? colors.gold}15` }]}>
          <Feather name={(item.icon as React.ComponentProps<typeof Feather>["name"]) ?? "activity"} size={16} color={item.tint ?? colors.gold} />
        </View>
        {showDataSources && <DataProvenanceBadge classification={item.provenance ?? "DERIVED"} />}
      </View>

      <AppText variant="caption" color={colors.textDarkMuted} style={styles.kpiLabel}>
        {item.label ?? ""}
      </AppText>

      <AppText variant="subheading" color={colors.textDarkPrimary} style={styles.kpiValue}>
        {item.value ?? "—"}
      </AppText>

      <View style={styles.deltaRow}>
        <Feather name={ti} size={12} color={tc} />
        <AppText variant="caption" style={[styles.delta, { color: tc }]}>
          {item.delta ?? ""}
        </AppText>
      </View>
    </View>
  );
}

export function KpiGrid({ kpis, showDataSources = true }: Props) {
  const { width } = useWindowDimensions();

  const cols = width >= 768 ? 4 : width >= 480 ? 3 : 2;
  const gap = 10;
  const containerPad = 32;
  const totalGapWidth = gap * (cols - 1);
  const cellWidth = (width - containerPad - totalGapWidth) / cols;

  const safeKpis = Array.isArray(kpis) ? kpis : [];

  return (
    <View style={styles.outer}>
      <AppText variant="caption" style={styles.sectionLabel}>
        KEY PERFORMANCE INDICATORS
      </AppText>

      <View style={[styles.grid, { gap }]}>
        {safeKpis.map((item) => (
          <KpiCell key={item.key ?? item.label} item={item} cellWidth={cellWidth} showDataSources={showDataSources} />
        ))}
        {safeKpis.length === 0 && (
          <View style={styles.empty}>
            <AppText variant="caption" color={colors.textMuted}>
              No KPI data available
            </AppText>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    marginHorizontal: 16,
    marginBottom: 12,
  },
  sectionLabel: {
    color: colors.textMuted,
    fontWeight: "700",
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 10,
    marginLeft: 4,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  cell: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    gap: 6,
    shadowColor: '#020713',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  cellTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  iconBubble: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.4,
    color: colors.textDarkMuted,
  },
  kpiValue: {
    fontWeight: "800",
    color: colors.textDarkPrimary,
    fontSize: 20,
  },
  deltaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  delta: {
    fontWeight: "700",
    fontSize: 11,
  },
  empty: {
    padding: 16,
  },
});
