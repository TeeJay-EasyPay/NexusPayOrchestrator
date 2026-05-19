import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { AppCard } from "../ui/AppCard";
import { AppText } from "../ui/AppText";

import {
  loadTelemetryIntelligence,
  TelemetryIntelligenceSummary,
} from "../../services/intelligence/telemetryIntelligenceService";

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

  return (
    <AppCard style={styles.card}>
      <AppText variant="heading">
        🌍 Global Value Transfer Intelligence Insights
      </AppText>

      <AppText variant="caption" style={styles.subtitle}>
        Live orchestration intelligence generated from transfer execution,
        treasury activity and operational telemetry.
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

          <View style={styles.insightPanel}>
            <AppText variant="subheading">
              Executive Insight
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

          <View style={styles.recommendationPanel}>
            <AppText variant="subheading">
              Recommendation
            </AppText>

            <AppText>
              Continue building telemetry history to improve predictive
              corridor analysis and future AI-driven route optimisation.
            </AppText>
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
    marginTop: 18,
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
    padding: 14,
    borderRadius: 16,
    backgroundColor: "#F4F7FB",
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

  recommendationPanel: {
    marginTop: 16,
    padding: 14,
    borderRadius: 16,
    backgroundColor: "#FAF6EA",
  },
});