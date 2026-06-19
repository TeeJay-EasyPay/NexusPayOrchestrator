import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { AppCard } from "../ui/AppCard";
import { AppText } from "../ui/AppText";

import {
  loadTelemetryIntelligence,
  TelemetryIntelligenceSummary,
} from "../../services/intelligence/telemetryIntelligenceService";

import {
  buildExecutiveInsight,
} from "../../services/intelligence/executiveInsightService";

export default function AICorridorIntelligenceCard() {
  const [telemetry, setTelemetry] =
    useState<TelemetryIntelligenceSummary | null>(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadTelemetry() {
      try {
        const summary = await loadTelemetryIntelligence();

        if (mounted) {
          setTelemetry(summary);
        }
      } catch (error) {
        console.warn("Telemetry load failed", error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadTelemetry();

    return () => {
      mounted = false;
    };
  }, []);

  const executiveInsight = useMemo(() => {
    if (!telemetry) {
      return null;
    }

    return buildExecutiveInsight({
      transfersAnalysed: telemetry.transferCount,
      completedTransfers: telemetry.completedCount,
      successRate: telemetry.successRate,
      mostActiveCorridor: telemetry.mostActiveCorridor,
      highestConfidenceCorridor:
        telemetry.highestConfidenceCorridor,
      averageRouteScore: telemetry.averageRouteScore,
      routeConfidence:
        telemetry.averageRouteConfidence,
      xrplUtilisation:
        telemetry.xrplUtilisationPercent,
    });
  }, [telemetry]);

  return (
    <AppCard style={styles.card}>
      <AppText variant="heading">
        🌍 Global Value Transfer Intelligence Insights
      </AppText>

      <AppText variant="caption" style={styles.subtitle}>
        Live orchestration intelligence generated from transfer execution,
        corridor liquidity activity and operational telemetry.
      </AppText>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator />

          <AppText style={styles.loadingText}>
            Analysing telemetry...
          </AppText>
        </View>
      ) : telemetry ? (
        <>
          {executiveInsight && (
            <>
              <View style={styles.insightPanel}>
                <AppText variant="subheading">
                  Executive Insight
                </AppText>

                <AppText style={styles.executiveText}>
                  {executiveInsight.summary}
                </AppText>
              </View>

              <View style={styles.recommendationPanel}>
                <AppText variant="subheading">
                  Recommendation
                </AppText>

                <AppText>
                  {executiveInsight.recommendation}
                </AppText>

                <AppText style={styles.riskText}>
                  Risk Level: {executiveInsight.riskLevel}
                </AppText>
              </View>
            </>
          )}

          <View style={styles.section}>
            <AppText variant="subheading">
              Operational Intelligence
            </AppText>

            <MetricRow
              label="Transfers Analysed"
              value={String(telemetry.transferCount)}
            />

            <MetricRow
              label="Completed Transfers"
              value={String(telemetry.completedCount)}
            />

            <MetricRow
              label="Success Rate"
              value={`${telemetry.successRate}%`}
            />

            <MetricRow
              label="Most Active Corridor"
              value={telemetry.mostActiveCorridor}
            />

            <MetricRow
              label="Highest Confidence"
              value={telemetry.highestConfidenceCorridor}
            />
          </View>

          <View style={styles.section}>
            <AppText variant="subheading">
              Route Intelligence
            </AppText>

            <MetricRow
              label="Average Route Score"
              value={String(telemetry.averageRouteScore)}
            />

            <MetricRow
              label="Route Confidence"
              value={`${telemetry.averageRouteConfidence}%`}
            />

            <MetricRow
              label="XRPL Utilisation"
              value={`${telemetry.xrplUtilisationPercent}%`}
            />

            <MetricRow
              label="Sample Quality"
              value={telemetry.sampleQuality}
            />
          </View>

          <View style={styles.telemetryPanel}>
            <AppText variant="subheading">
              Supporting Telemetry Signals
            </AppText>

            {telemetry.insights.map((insight) => (
              <View
                key={insight.id}
                style={styles.insightRow}
              >
                <AppText style={styles.insightTitle}>
                  {insight.severity}: {insight.title}
                </AppText>

                <AppText style={styles.insightText}>
                  {insight.message}
                </AppText>
              </View>
            ))}
          </View>
        </>
      ) : (
        <AppText>
          Telemetry intelligence unavailable.
        </AppText>
      )}
    </AppCard>
  );
}

function MetricRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.metricRow}>
      <AppText>{label}</AppText>

      <AppText style={styles.metricValue}>
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 16,
  },

  subtitle: {
    marginTop: 6,
    opacity: 0.7,
  },

  loadingContainer: {
    marginTop: 24,
    alignItems: "center",
  },

  loadingText: {
    marginTop: 8,
  },

  section: {
    marginTop: 20,
  },

  metricRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },

  metricValue: {
    fontWeight: "700",
  },

  insightPanel: {
    marginTop: 20,
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#F4F7FB",
  },

  executiveText: {
    marginTop: 8,
    lineHeight: 24,
  },

  recommendationPanel: {
    marginTop: 16,
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#FAF6EA",
  },

  riskText: {
    marginTop: 12,
    fontWeight: "700",
  },

  telemetryPanel: {
    marginTop: 20,
    padding: 14,
    borderRadius: 16,
    backgroundColor: "#F7F8FA",
  },

  insightRow: {
    marginTop: 12,
  },

  insightTitle: {
    fontWeight: "700",
  },

  insightText: {
    marginTop: 4,
  },
});
