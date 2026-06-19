import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, View } from "react-native";

import { colors, spacing } from "../../theme";
import type { OperationsCorridorRow, OperationsTransferRow } from "../../utils/operationsCommandCentre";
import { AppCard } from "../ui/AppCard";
import { AppText } from "../ui/AppText";
import { DataProvenanceBadge } from "./DataProvenanceBadge";

type Props = {
  activeTransfers: OperationsTransferRow[] | null | undefined;
  corridorRows: OperationsCorridorRow[] | null | undefined;
  showDataSources?: boolean;
};

function progressColor(progress: number): string {
  if (progress >= 80) return "#16A34A";
  if (progress >= 50) return "#D97706";
  return "#2563EB";
}

function TransferItem({ row }: { row: OperationsTransferRow }) {
  const pc = progressColor(row.progress ?? 0);

  return (
    <View style={styles.transferItem}>
      <View style={styles.transferTopRow}>
        <View style={styles.transferLeft}>
          <AppText variant="caption" color={colors.textDarkPrimary} style={styles.transferId}>
            {(row.id ?? "").slice(0, 8).toUpperCase()}
          </AppText>
          <AppText variant="caption" color={colors.textDarkMuted} style={styles.transferCorridor}>
            {row.corridor ?? "Unknown"}
          </AppText>
        </View>
        <View style={styles.transferRight}>
          <AppText variant="caption" color={colors.textDarkPrimary} style={styles.transferAmount}>
            {row.currency ?? ""} {(row.amount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </AppText>
          <AppText variant="caption" color={pc} style={styles.transferStatus}>
            {row.status ?? "—"}
          </AppText>
        </View>
      </View>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${Math.max(0, Math.min(100, row.progress ?? 0))}%`, backgroundColor: pc }]} />
      </View>

      <View style={styles.transferFooter}>
        <AppText variant="caption" color={colors.textDarkMuted} style={styles.transferEst}>
          Est. {row.settlementEstimate ?? "Pending"}
        </AppText>
        <AppText variant="caption" style={[styles.transferPct, { color: pc }]}>
          {row.progress ?? 0}%
        </AppText>
      </View>
    </View>
  );
}

function CorridorSummaryRow({ row }: { row: OperationsCorridorRow }) {
  const sc = row.status === "HEALTHY" ? "#16A34A" : row.status === "DEGRADED" ? "#D97706" : "#DC2626";
  return (
    <View style={styles.corridorSummary}>
      <View style={[styles.corridorDot, { backgroundColor: sc }]} />
      <AppText variant="caption" color={colors.textDarkSecondary} style={styles.corridorSummaryName}>
        {row.corridor ?? ""}
      </AppText>
      <AppText variant="caption" style={[styles.corridorSummaryScore, { color: sc }]}>
        {row.score ?? 0}
      </AppText>
    </View>
  );
}

export function GlobalFlowCard({ activeTransfers, corridorRows, showDataSources = true }: Props) {
  const safeTransfers = Array.isArray(activeTransfers) ? activeTransfers : [];
  const safeCorridors = Array.isArray(corridorRows) ? corridorRows : [];

  return (
    <AppCard style={styles.card}>
      <View style={styles.header}>
        <Feather name="activity" size={18} color={colors.gold} style={{ marginRight: 8 }} />
        <AppText variant="subheading" color={colors.textDarkPrimary} style={styles.title}>
          Global Flow Overview
        </AppText>
        {showDataSources && <DataProvenanceBadge classification="DERIVED" />}
        <View style={styles.activeBadge}>
          <AppText variant="caption" style={styles.activeText}>
            {safeTransfers.length} active
          </AppText>
        </View>
      </View>

      {safeTransfers.length > 0 ? (
        <View style={styles.transferList}>
          {safeTransfers.slice(0, 5).map((row) => (
            <TransferItem key={row.id} row={row} />
          ))}
        </View>
      ) : (
        <View style={styles.emptyTransfers}>
          <AppText variant="caption" color={colors.textDarkMuted}>
            No active transfers in progress
          </AppText>
        </View>
      )}

      {safeCorridors.length > 0 && (
        <>
          <View style={styles.divider} />
          <AppText variant="caption" color={colors.textDarkMuted} style={styles.subsectionLabel}>
            Corridor Activity
          </AppText>
          {showDataSources && (
            <View style={styles.subsectionBadge}>
              <DataProvenanceBadge classification="SIMULATED" />
            </View>
          )}
          <View style={styles.corridorGrid}>
            {safeCorridors.slice(0, 6).map((row) => (
              <CorridorSummaryRow key={row.corridor} row={row} />
            ))}
          </View>
        </>
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
  activeBadge: {
    backgroundColor: "#2563EB14",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: "#2563EB28",
  },
  activeText: {
    color: "#2563EB",
    fontWeight: "700",
    fontSize: 11,
  },
  transferList: {
    gap: 12,
  },
  transferItem: {
    gap: 6,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  transferTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  transferLeft: {
    gap: 2,
  },
  transferRight: {
    alignItems: "flex-end",
    gap: 2,
  },
  transferId: {
    fontWeight: "800",
    fontSize: 12,
    fontFamily: "monospace",
  },
  transferCorridor: {
    fontSize: 11,
  },
  transferAmount: {
    fontWeight: "700",
    fontSize: 13,
  },
  transferStatus: {
    fontWeight: "700",
    fontSize: 10,
    letterSpacing: 0.4,
  },
  progressTrack: {
    height: 4,
    borderRadius: 3,
    backgroundColor: colors.cardBorder,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  transferFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  transferEst: {
    fontSize: 11,
  },
  transferPct: {
    fontWeight: "800",
    fontSize: 11,
  },
  emptyTransfers: {
    paddingVertical: 20,
    alignItems: "center",
  },
  divider: {
    height: 1,
    backgroundColor: colors.cardBorder,
    marginVertical: 14,
  },
  subsectionLabel: {
    fontWeight: "600",
    fontSize: 10,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  subsectionBadge: {
    alignSelf: "flex-start",
    marginBottom: 10,
  },
  corridorGrid: {
    gap: 8,
  },
  corridorSummary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  corridorDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  corridorSummaryName: {
    flex: 1,
    fontSize: 13,
    fontWeight: "500",
  },
  corridorSummaryScore: {
    fontWeight: "800",
    fontSize: 13,
  },
});
