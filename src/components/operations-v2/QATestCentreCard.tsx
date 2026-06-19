import { Feather } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { getQATestCentreSummary, QATestCentreSummary } from "../../testing/qaExecutionLogger";
import { colors, spacing } from "../../theme";
import { AppCard } from "../ui/AppCard";
import { AppText } from "../ui/AppText";
import { DataProvenanceBadge } from "./DataProvenanceBadge";

function resultColor(result: "PASS" | "FAIL" | null): string {
  if (result === "PASS") return "#16A34A";
  if (result === "FAIL") return "#DC2626";
  return colors.textDarkMuted;
}

function formatLastResult(summary: QATestCentreSummary): string {
  if (!summary.lastTestResult) {
    return "No execution logs yet";
  }

  const ts = new Date(summary.lastTestResult.timestamp).toLocaleString();
  return `${summary.lastTestResult.testId} • ${summary.lastTestResult.result} • ${ts}`;
}

function formatLastPilotResult(summary: QATestCentreSummary): string {
  if (!summary.lastPilotResult) {
    return "No pilot certification runs yet";
  }

  const ts = new Date(summary.lastPilotResult.timestamp).toLocaleString();
  return `${summary.lastPilotResult.testId} • ${summary.lastPilotResult.result} • ${ts}`;
}

function MetricTile({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: number;
  valueColor?: string;
}) {
  return (
    <View style={styles.metricTile}>
      <AppText variant="caption" color={colors.textDarkMuted} style={styles.metricLabel}>
        {label}
      </AppText>
      <AppText
        variant="subheading"
        color={valueColor ?? colors.textDarkPrimary}
        style={styles.metricValue}
      >
        {value}
      </AppText>
    </View>
  );
}

type Props = {
  showDataSources?: boolean;
};

export function QATestCentreCard({ showDataSources = true }: Props) {
  const [summary, setSummary] = useState<QATestCentreSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const loadSummary = useCallback(async () => {
    setLoading(true);

    try {
      const next = await getQATestCentreSummary();
      setSummary(next);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadSummary();
    }, [loadSummary])
  );

  const totalExecuted = summary?.totalExecuted ?? 0;
  const passed = summary?.passed ?? 0;
  const failed = summary?.failed ?? 0;
  const openDefects = summary?.openDefects ?? 0;
  const pilotRuns = summary?.pilotRuns ?? 0;
  const pilotPassed = summary?.pilotPassed ?? 0;
  const pilotFailed = summary?.pilotFailed ?? 0;
  const lastResultColor = resultColor(summary?.lastTestResult?.result ?? null);
  const lastPilotResultColor = resultColor(summary?.lastPilotResult?.result ?? null);

  return (
    <AppCard style={styles.card}>
      <View style={styles.header}>
        <Feather name="shield" size={18} color={colors.gold} style={{ marginRight: 8 }} />
        <AppText variant="subheading" color={colors.textDarkPrimary} style={styles.title}>
          QA Test Centre
        </AppText>
        {showDataSources && <DataProvenanceBadge classification="LIVE" />}
      </View>

      {loading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={colors.gold} />
          <AppText variant="caption" color={colors.textDarkMuted}>
            Loading QA telemetry...
          </AppText>
        </View>
      ) : (
        <>
          <View style={styles.metricsGrid}>
            <MetricTile label="Total Executed" value={totalExecuted} />
            <MetricTile label="Passed" value={passed} valueColor="#16A34A" />
            <MetricTile label="Failed" value={failed} valueColor="#DC2626" />
            <MetricTile label="Open Defects" value={openDefects} valueColor="#D97706" />
            <MetricTile label="Pilot Runs" value={pilotRuns} valueColor="#2563EB" />
            <MetricTile label="Pilot Passed" value={pilotPassed} valueColor="#16A34A" />
            <MetricTile label="Pilot Failed" value={pilotFailed} valueColor="#DC2626" />
          </View>

          <View style={styles.lastResultBlock}>
            <AppText variant="caption" color={colors.textDarkMuted} style={styles.lastResultLabel}>
              Last test result
            </AppText>
            <AppText variant="caption" style={[styles.lastResultValue, { color: lastResultColor }]}> 
              {formatLastResult(
                summary ?? {
                  totalExecuted: 0,
                  passed: 0,
                  failed: 0,
                  openDefects: 0,
                  lastTestResult: null,
                  pilotRuns: 0,
                  pilotPassed: 0,
                  pilotFailed: 0,
                  lastPilotResult: null,
                }
              )}
            </AppText>
          </View>

          <View style={styles.lastResultBlock}>
            <AppText variant="caption" color={colors.textDarkMuted} style={styles.lastResultLabel}>
              Last pilot certification result
            </AppText>
            <AppText variant="caption" style={[styles.lastResultValue, { color: lastPilotResultColor }]}> 
              {formatLastPilotResult(
                summary ?? {
                  totalExecuted: 0,
                  passed: 0,
                  failed: 0,
                  openDefects: 0,
                  lastTestResult: null,
                  pilotRuns: 0,
                  pilotPassed: 0,
                  pilotFailed: 0,
                  lastPilotResult: null,
                }
              )}
            </AppText>
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
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },
  metricTile: {
    flexBasis: "48%",
    flexGrow: 1,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.cardSoft,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 3,
  },
  metricLabel: {
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    fontWeight: "700",
  },
  metricValue: {
    fontWeight: "800",
    fontSize: 18,
  },
  lastResultBlock: {
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    paddingTop: 12,
    gap: 4,
  },
  lastResultLabel: {
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    fontSize: 10,
  },
  lastResultValue: {
    fontWeight: "700",
    fontSize: 12,
  },
});
