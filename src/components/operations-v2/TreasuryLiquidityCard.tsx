import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, View } from "react-native";

import type { LiveIntelligenceFeeds } from "../../services/liveIntelligenceFeedService";
import { colors, spacing } from "../../theme";
import type { OperationsTreasurySummary } from "../../utils/operationsCommandCentre";
import { AppCard } from "../ui/AppCard";
import { AppText } from "../ui/AppText";

type Props = {
  treasurySummary: OperationsTreasurySummary | null | undefined;
  feedData: LiveIntelligenceFeeds | null | undefined;
};

function pressureColor(pressure: string): string {
  if (pressure === "CRITICAL") return "#DC2626";
  if (pressure === "HIGH") return "#D97706";
  if (pressure === "MEDIUM") return "#F59E0B";
  return "#16A34A";
}

function UtilisationBar({ value, color }: { value: number; color: string }) {
  const safe = Math.max(0, Math.min(100, value ?? 0));
  return (
    <View style={styles.barTrack}>
      <View style={[styles.barFill, { width: `${safe}%`, backgroundColor: color }]} />
    </View>
  );
}

function MetricRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={styles.metricRow}>
      <AppText variant="caption" color={colors.textDarkMuted} style={styles.metricLabel}>
        {label}
      </AppText>
      <AppText variant="caption" style={[styles.metricValue, color ? { color } : {}]}>
        {value}
      </AppText>
    </View>
  );
}

export function TreasuryLiquidityCard({ treasurySummary, feedData }: Props) {
  const utilization = treasurySummary?.utilization ?? 0;
  const available = treasurySummary?.availableCapacity ?? 0;
  const pressure = treasurySummary?.pressure ?? "LOW";
  const forecast = treasurySummary?.forecast ?? "No treasury data available";
  const distribution = Array.isArray(treasurySummary?.currencyDistribution)
    ? treasurySummary.currencyDistribution
    : [];

  const pc = pressureColor(pressure);

  const fxFeedsLive = feedData?.fxRates
    ? Object.keys(feedData.fxRates).length
    : 0;

  const feedHealthy = fxFeedsLive > 0;
  const feedColor = feedHealthy ? "#16A34A" : "#D97706";
  const feedLabel = feedHealthy ? `${fxFeedsLive} feeds live` : "No live feeds";

  return (
    <AppCard style={styles.card}>
      <View style={styles.header}>
        <Feather name="database" size={18} color={colors.gold} style={{ marginRight: 8 }} />
        <AppText variant="subheading" color={colors.textDarkPrimary} style={styles.title}>
          Treasury & Liquidity
        </AppText>
        <View style={[styles.pressureBadge, { backgroundColor: `${pc}12`, borderColor: `${pc}28` }]}>
          <AppText variant="caption" style={[styles.pressureText, { color: pc }]}>
            {pressure}
          </AppText>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.utilRow}>
          <AppText variant="caption" color={colors.textDarkMuted}>Utilisation</AppText>
          <AppText variant="caption" style={[styles.utilPct, { color: pc }]}>
            {utilization}%
          </AppText>
        </View>
        <UtilisationBar value={utilization} color={pc} />
      </View>

      <View style={styles.metricsBlock}>
        <MetricRow label="Available Capacity" value={`${available}%`} color="#16A34A" />
        <MetricRow label="FX Feed Status" value={feedLabel} color={feedColor} />
        <MetricRow label="Pressure Level" value={pressure} color={pc} />
      </View>

      {distribution.length > 0 && (
        <View style={styles.distribution}>
          <AppText variant="caption" color={colors.textDarkMuted} style={styles.distLabel}>
            Currency Distribution
          </AppText>
          <View style={styles.distList}>
            {distribution.map((item) => (
              <View key={item.currency} style={styles.distRow}>
                <View style={styles.distCurrencyRow}>
                  <View style={[styles.distDot, { backgroundColor: colors.gold }]} />
                  <AppText variant="caption" color={colors.textDarkSecondary} style={styles.distCurrency}>
                    {item.currency ?? ""}
                  </AppText>
                </View>
                <AppText variant="caption" color={colors.textDarkPrimary} style={styles.distPct}>
                  {item.percentage ?? 0}%
                </AppText>
              </View>
            ))}
          </View>
        </View>
      )}

      <View style={styles.forecastRow}>
        <Feather name="trending-up" size={13} color={colors.textDarkMuted} style={{ marginRight: 6 }} />
        <AppText variant="caption" color={colors.textDarkSecondary} style={styles.forecastText}>
          {forecast}
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
    flex: 1,
  },
  pressureBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
  },
  pressureText: {
    fontWeight: "700",
    fontSize: 10,
    letterSpacing: 0.5,
  },
  section: {
    marginBottom: 14,
    gap: 8,
  },
  utilRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  utilPct: {
    fontWeight: "800",
    fontSize: 15,
  },
  barTrack: {
    height: 8,
    borderRadius: 6,
    backgroundColor: colors.cardBorder,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 6,
  },
  metricsBlock: {
    gap: 8,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    marginBottom: 14,
  },
  metricRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  metricLabel: {
    fontSize: 12,
  },
  metricValue: {
    fontWeight: "700",
    fontSize: 13,
    color: colors.textDarkPrimary,
  },
  distribution: {
    marginBottom: 14,
  },
  distLabel: {
    fontWeight: "600",
    fontSize: 10,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  distList: {
    gap: 6,
  },
  distRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  distCurrencyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  distDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  distCurrency: {
    fontWeight: "600",
  },
  distPct: {
    fontWeight: "700",
  },
  forecastRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  forecastText: {
    flex: 1,
    lineHeight: 18,
    fontSize: 12,
  },
});
