import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, View } from "react-native";

import { colors, spacing } from "../../theme";
import type { OperationsCorridorRow, OperationsPressure } from "../../utils/operationsCommandCentre";
import { AppCard } from "../ui/AppCard";
import { AppText } from "../ui/AppText";

type Props = {
  corridorRows: OperationsCorridorRow[] | null | undefined;
};

function statusColor(status: OperationsCorridorRow["status"]): string {
  if (status === "HEALTHY") return "#16A34A";
  if (status === "DEGRADED") return "#D97706";
  return "#DC2626";
}

function pressureLabel(pressure: OperationsPressure): string {
  if (pressure === "CRITICAL") return "Critical";
  if (pressure === "HIGH") return "High";
  if (pressure === "MEDIUM") return "Medium";
  return "Low";
}

function pressureColor(pressure: OperationsPressure): string {
  if (pressure === "CRITICAL") return "#DC2626";
  if (pressure === "HIGH") return "#D97706";
  if (pressure === "MEDIUM") return "#F59E0B";
  return "#16A34A";
}

function ScoreBar({ value, color }: { value: number; color: string }) {
  const safe = Math.max(0, Math.min(100, value ?? 0));
  return (
    <View style={styles.barTrack}>
      <View style={[styles.barFill, { width: `${safe}%`, backgroundColor: color }]} />
    </View>
  );
}

function CorridorRow({ row }: { row: OperationsCorridorRow }) {
  const sc = statusColor(row.status ?? "AT_RISK");
  const pc = pressureColor(row.pressure ?? "LOW");
  const trendPositive = (row.trend ?? 0) >= 0;

  return (
    <View style={styles.corridorRow}>
      <View style={styles.rowHeader}>
        <View style={[styles.statusDot, { backgroundColor: sc }]} />
        <AppText variant="body" color={colors.textDarkPrimary} style={styles.corridorName}>
          {row.corridor ?? "Unknown"}
        </AppText>
        <View style={[styles.statusBadge, { backgroundColor: `${sc}14`, borderColor: `${sc}28` }]}>
          <AppText variant="caption" style={[styles.statusBadgeText, { color: sc }]}>
            {row.status ?? "—"}
          </AppText>
        </View>
      </View>

      <View style={styles.metricsRow}>
        <View style={styles.metricItem}>
          <AppText variant="caption" color={colors.textDarkMuted} style={styles.metricLabel}>Health</AppText>
          <AppText variant="caption" color={colors.textDarkPrimary} style={styles.metricValue}>
            {row.score ?? 0}
          </AppText>
        </View>
        <View style={styles.metricItem}>
          <AppText variant="caption" color={colors.textDarkMuted} style={styles.metricLabel}>Capacity</AppText>
          <AppText variant="caption" color={colors.textDarkPrimary} style={styles.metricValue}>
            {row.capacity ?? 0}%
          </AppText>
        </View>
        <View style={styles.metricItem}>
          <AppText variant="caption" color={colors.textDarkMuted} style={styles.metricLabel}>Pressure</AppText>
          <AppText variant="caption" style={[styles.metricValue, { color: pc }]}>
            {pressureLabel(row.pressure ?? "LOW")}
          </AppText>
        </View>
        <View style={styles.metricItem}>
          <AppText variant="caption" color={colors.textDarkMuted} style={styles.metricLabel}>Trend</AppText>
          <View style={styles.trendCell}>
            <Feather
              name={trendPositive ? "arrow-up-right" : "arrow-down-right"}
              size={12}
              color={trendPositive ? "#16A34A" : "#DC2626"}
            />
            <AppText
              variant="caption"
              style={[styles.metricValue, { color: trendPositive ? "#16A34A" : "#DC2626" }]}
            >
              {Math.abs(row.trend ?? 0).toFixed(1)}
            </AppText>
          </View>
        </View>
      </View>

      <ScoreBar value={row.score ?? 0} color={sc} />
    </View>
  );
}

export function CorridorHealthCard({ corridorRows }: Props) {
  const rows = Array.isArray(corridorRows) ? corridorRows : [];

  return (
    <AppCard style={styles.card}>
      <View style={styles.header}>
        <Feather name="globe" size={18} color={colors.gold} style={{ marginRight: 8 }} />
        <AppText variant="subheading" color={colors.textDarkPrimary} style={styles.title}>
          Corridor Health
        </AppText>
        <View style={styles.countBadge}>
          <AppText variant="caption" style={styles.countText}>{rows.length} corridors</AppText>
        </View>
      </View>

      {rows.length > 0
        ? rows.map((row) => <CorridorRow key={row.corridor} row={row} />)
        : (
          <View style={styles.empty}>
            <AppText variant="caption" color={colors.textDarkMuted}>No corridor data available</AppText>
          </View>
        )}
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
    flex: 1,
  },
  countBadge: {
    backgroundColor: `${colors.gold}18`,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: `${colors.gold}30`,
  },
  countText: {
    color: colors.gold,
    fontWeight: "700",
    fontSize: 11,
  },
  corridorRow: {
    marginBottom: 14,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    gap: 8,
  },
  rowHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  corridorName: {
    fontWeight: "600",
    flex: 1,
    fontSize: 14,
  },
  statusBadge: {
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontWeight: "700",
    fontSize: 10,
    letterSpacing: 0.5,
  },
  metricsRow: {
    flexDirection: "row",
    gap: 8,
  },
  metricItem: {
    flex: 1,
    gap: 2,
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.4,
  },
  metricValue: {
    fontWeight: "700",
    fontSize: 13,
  },
  trendCell: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  barTrack: {
    height: 5,
    borderRadius: 4,
    backgroundColor: colors.cardBorder,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 4,
  },
  empty: {
    paddingVertical: 20,
    alignItems: "center",
  },
});
