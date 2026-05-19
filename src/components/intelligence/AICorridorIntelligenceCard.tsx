import React from "react";
import { StyleSheet, View } from "react-native";

import { AppCard } from "../ui/AppCard";
import { AppText } from "../ui/AppText";

export default function AICorridorIntelligenceCard() {
  return (
    <AppCard style={styles.card}>
      <AppText variant="heading">
        🌍 Global Value Transfer Intelligence Insights
      </AppText>

      <AppText variant="caption" style={styles.subtitle}>
        AI-powered orchestration intelligence derived from provider,
        corridor and treasury telemetry.
      </AppText>

      <View style={styles.section}>
        <AppText variant="subheading">
          Provider Intelligence
        </AppText>

        <MetricRow label="Provider Health" value="96 / 100" />
        <MetricRow label="Success Rate" value="98%" />
        <MetricRow label="Average Latency" value="4 mins" />
        <MetricRow label="Failover Risk" value="Low" />
      </View>

      <View style={styles.section}>
        <AppText variant="subheading">
          Treasury Intelligence
        </AppText>

        <MetricRow label="Liquidity Position" value="Healthy" />
        <MetricRow label="Corridor Capacity" value="Strong" />
        <MetricRow label="Settlement Rail" value="XRPL Preferred" />
      </View>

      <View style={styles.insightPanel}>
        <AppText variant="subheading">
          Executive Insight
        </AppText>

        <AppText style={styles.insightText}>
          Current corridor telemetry indicates healthy provider
          performance with low predicted failover risk. Treasury
          positioning remains stable and available liquidity appears
          sufficient for expected transfer demand.
        </AppText>
      </View>

      <View style={styles.recommendationPanel}>
        <AppText variant="subheading">
          Recommendation
        </AppText>

        <AppText>
          Continue routing via preferred execution paths while
          monitoring provider degradation signals and corridor
          liquidity pressure.
        </AppText>
      </View>
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

  insightText: {
    marginTop: 8,
  },

  recommendationPanel: {
    marginTop: 16,
    padding: 14,
    borderRadius: 16,
    backgroundColor: "#FAF6EA",
  },
});