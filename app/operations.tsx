import { useFocusEffect } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { RefreshControl, ScrollView, View } from "react-native";

import { AppCard } from "../src/components/ui/AppCard";
import { AppText } from "../src/components/ui/AppText";
import { Screen } from "../src/components/ui/Screen";
import {
  loadRecentTreasurySnapshots,
  TreasuryLiquiditySnapshotRow,
} from "../src/services/treasuryIntelligenceService";
import { colors } from "../src/theme";

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <View
      style={{
        flex: 1,
        padding: 11,
        borderRadius: 16,
        backgroundColor: "#F8FAFC",
        borderWidth: 1,
        borderColor: "#E2E8F0",
        gap: 4,
      }}
    >
      <AppText variant="caption" color={colors.textDarkMuted}>
        {label}
      </AppText>

      <AppText variant="body" color={colors.textDarkPrimary} style={{ fontWeight: "900" }}>
        {value}
      </AppText>
    </View>
  );
}

function getPressureColor(pressure: string) {
  if (pressure === "LOW") return "#16A34A";
  if (pressure === "MEDIUM") return "#0EA5E9";
  if (pressure === "HIGH") return "#F59E0B";
  return "#DC2626";
}

function formatDate(date: string) {
  return new Date(date).toLocaleString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    day: "2-digit",
    month: "short",
  });
}

function SnapshotCard({ item }: { item: TreasuryLiquiditySnapshotRow }) {
  return (
    <View
      style={{
        padding: 16,
        borderRadius: 22,
        backgroundColor: "#FFFFFF",
        borderWidth: 1,
        borderColor: "#E2E8F0",
        gap: 12,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <View style={{ flex: 1, gap: 4 }}>
          <AppText variant="caption" color={colors.textDarkMuted}>
            Treasury orchestration snapshot
          </AppText>

          <AppText variant="subheading" color={colors.textDarkPrimary}>
            {item.corridor}
          </AppText>

          <AppText variant="caption" color={colors.textDarkSecondary}>
            {item.provider} • {item.rail}
          </AppText>
        </View>

        <View
          style={{
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 999,
            backgroundColor: getPressureColor(item.corridor_pressure),
          }}
        >
          <AppText variant="caption" style={{ color: "#FFFFFF", fontWeight: "900" }}>
            {item.corridor_pressure}
          </AppText>
        </View>
      </View>

      <View
        style={{
          padding: 14,
          borderRadius: 18,
          backgroundColor: "#0B3F4A",
          gap: 8,
        }}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <View>
            <AppText variant="caption" color="#BFEAF1">
              Treasury score
            </AppText>

            <AppText variant="title" color={colors.gold}>
              {item.treasury_score}/100
            </AppText>
          </View>

          <View style={{ alignItems: "flex-end" }}>
            <AppText variant="caption" color="#BFEAF1">
              Route pressure
            </AppText>

            <AppText variant="title" color="#FFFFFF">
              {item.rail_pressure}
            </AppText>
          </View>
        </View>
      </View>

      <View style={{ flexDirection: "row", gap: 8 }}>
        <MiniMetric
          label="Corridor"
          value={`${item.corridor_capacity_score}/100`}
        />

        <MiniMetric
          label="Partner"
          value={`${item.partner_capacity_score}/100`}
        />

        <MiniMetric
          label="Rail"
          value={`${item.rail_capacity_score}/100`}
        />
      </View>

      <View
        style={{
          padding: 12,
          borderRadius: 18,
          backgroundColor: "#F8FAFC",
          borderWidth: 1,
          borderColor: "#E2E8F0",
          gap: 6,
        }}
      >
        <AppText variant="caption" color={colors.textDarkMuted}>
          Treasury recommendation
        </AppText>

        <AppText variant="body" color={colors.textDarkPrimary} style={{ fontWeight: "900" }}>
          {item.liquidity_recommendation}
        </AppText>
      </View>

      <View style={{ gap: 4 }}>
        <AppText variant="caption" color={colors.textDarkMuted}>
          Decision factors
        </AppText>

        {item.decision_factors?.map((factor, index) => (
          <AppText
            key={`${item.id}-${index}`}
            variant="caption"
            color={colors.textDarkSecondary}
          >
            • {factor}
          </AppText>
        ))}
      </View>

      <AppText variant="caption" color={colors.textDarkMuted}>
        Snapshot recorded {formatDate(item.created_at)}
      </AppText>
    </View>
  );
}

export default function OperationsScreen() {
  const [snapshots, setSnapshots] = useState<TreasuryLiquiditySnapshotRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const summary = useMemo(() => {
    if (snapshots.length === 0) {
      return {
        averageTreasuryScore: 0,
        highestPressure: "LOW",
        activeCorridors: 0,
      };
    }

    const averageTreasuryScore = Math.round(
      snapshots.reduce((sum, item) => sum + item.treasury_score, 0) /
        snapshots.length
    );

    const activeCorridors = new Set(
      snapshots.map((item) => item.corridor)
    ).size;

    const highestPressure = snapshots.some(
      (item) => item.corridor_pressure === "CRITICAL"
    )
      ? "CRITICAL"
      : snapshots.some((item) => item.corridor_pressure === "HIGH")
      ? "HIGH"
      : snapshots.some((item) => item.corridor_pressure === "MEDIUM")
      ? "MEDIUM"
      : "LOW";

    return {
      averageTreasuryScore,
      highestPressure,
      activeCorridors,
    };
  }, [snapshots]);

  const loadSnapshots = useCallback(async () => {
    try {
      const data = await loadRecentTreasurySnapshots(20);
      setSnapshots(data);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSnapshots();
    }, [loadSnapshots])
  );

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadSnapshots();
            }}
          />
        }
      >
        <View style={{ gap: 18, paddingBottom: 40 }}>
          <View style={{ gap: 6 }}>
            <AppText variant="caption" color={colors.gold}>
              NexusPay operations command centre
            </AppText>

            <AppText variant="title" color={colors.textPrimary}>
              Operations Intelligence
            </AppText>

            <AppText variant="body" color={colors.textSecondary}>
              Live orchestration telemetry, treasury intelligence and liquidity observability.
            </AppText>
          </View>

          <View
            style={{
              padding: 18,
              borderRadius: 26,
              backgroundColor: "#0B3F4A",
              gap: 14,
            }}
          >
            <View style={{ gap: 4 }}>
              <AppText variant="caption" color="#BFEAF1">
                Orchestration health
              </AppText>

              <AppText variant="title" color="#FFFFFF">
                Treasury telemetry active
              </AppText>
            </View>

            <View style={{ flexDirection: "row", gap: 8 }}>
              <MiniMetric
                label="Treasury"
                value={`${summary.averageTreasuryScore}/100`}
              />

              <MiniMetric
                label="Pressure"
                value={summary.highestPressure}
              />

              <MiniMetric
                label="Corridors"
                value={String(summary.activeCorridors)}
              />
            </View>
          </View>

          {loading ? (
            <AppCard>
              <AppText variant="body" color={colors.textDarkSecondary}>
                Loading treasury orchestration telemetry...
              </AppText>
            </AppCard>
          ) : snapshots.length === 0 ? (
            <AppCard>
              <AppText variant="body" color={colors.textDarkSecondary}>
                No treasury intelligence snapshots yet. Generate route intelligence first.
              </AppText>
            </AppCard>
          ) : (
            <View style={{ gap: 12 }}>
              {snapshots.map((item) => (
                <SnapshotCard key={item.id} item={item} />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}
