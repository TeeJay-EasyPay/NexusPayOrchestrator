import { Feather } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

import { NexusAIToggleCard } from "../src/components/intelligence/NexusAIToggleCard";
import { AppCard } from "../src/components/ui/AppCard";
import { AppText } from "../src/components/ui/AppText";
import { Screen } from "../src/components/ui/Screen";
import { useNexusAIScreenSetting } from "../src/hooks/useNexusAISettings";
import {
  loadRecoverableExecutionSessions,
  PersistedExecutionSession,
} from "../src/services/execution/executionPersistenceService";
import { subscribeToRecentExecutionSessions } from "../src/services/execution/executionRealtimeService";
import { getLiveIntelligenceFeeds } from "../src/services/liveIntelligenceFeedService";
import {
  generateIntelligenceReport,
  IntelligenceReportResult,
} from "../src/services/nexusAIService";
import {
  loadRecentRouteOperationalEvents,
  RouteOperationalEventRow,
} from "../src/services/routeOperationalEventService";
import { loadCompletedTransfers } from "../src/services/transferService";
import {
  loadRecentTreasurySnapshots,
  TreasuryLiquiditySnapshotRow,
} from "../src/services/treasuryIntelligenceService";
import { colors } from "../src/theme";
import { Transfer } from "../src/types/transfer";

type OperationalPressure = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
type AlertFilter = "ALL" | "CRITICAL" | "WARNING" | "INFO";

type CorridorHealthRow = {
  corridor: string;
  score: number;
  trend: number;
  capacity: number;
  status: "HEALTHY" | "DEGRADED" | "AT_RISK";
  pressure: OperationalPressure;
};

type KPIItem = {
  key: string;
  label: string;
  value: string;
  delta: string;
  trend: "up" | "down" | "flat";
  tint: string;
  icon: keyof typeof Feather.glyphMap;
};

type ActiveTransferRow = {
  id: string;
  corridor: string;
  amount: number;
  currency: string;
  status: string;
  progress: number;
  settlementEstimate: string;
  routeId: string;
  updatedAt: string;
};

function getPressureWeight(pressure: string) {
  if (pressure === "CRITICAL") return 4;
  if (pressure === "HIGH") return 3;
  if (pressure === "MEDIUM") return 2;
  return 1;
}

function getPressureFromWeight(weight: number): OperationalPressure {
  if (weight >= 4) return "CRITICAL";
  if (weight >= 3) return "HIGH";
  if (weight >= 2) return "MEDIUM";
  return "LOW";
}

function getOverallOperationalPressure(item: TreasuryLiquiditySnapshotRow): OperationalPressure {
  const componentPressure = Math.max(
    getPressureWeight(item.corridor_pressure),
    getPressureWeight(item.partner_pressure),
    getPressureWeight(item.rail_pressure)
  );

  const scorePressure = item.treasury_score < 55 ? 4 : item.treasury_score < 70 ? 3 : item.treasury_score < 82 ? 2 : 1;
  return getPressureFromWeight(Math.max(componentPressure, scorePressure));
}

function formatDateTime(input?: string) {
  if (!input) return "--";
  return new Date(input).toLocaleString([], {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatRelativeTime(input?: string) {
  if (!input) return "just now";
  const deltaMs = Date.now() - new Date(input).getTime();
  const minutes = Math.max(1, Math.floor(deltaMs / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function trendFromDelta(delta: number): "up" | "down" | "flat" {
  if (delta > 0) return "up";
  if (delta < 0) return "down";
  return "flat";
}

function formatDelta(delta: number, suffix = "") {
  const rounded = Math.abs(delta) < 10 ? delta.toFixed(1) : Math.round(delta).toString();
  return `${delta >= 0 ? "+" : ""}${rounded}${suffix}`;
}

function mapEventToAlertFilter(event: RouteOperationalEventRow): AlertFilter {
  if (event.severity === "FAILOVER" || event.severity === "DEGRADED") return "CRITICAL";
  if (event.severity === "WATCH") return "WARNING";
  return "INFO";
}

function getAlertColor(level: AlertFilter) {
  if (level === "CRITICAL") return "#DC2626";
  if (level === "WARNING") return "#D97706";
  return "#2563EB";
}

function getStatusColor(status: CorridorHealthRow["status"]) {
  if (status === "HEALTHY") return "#16A34A";
  if (status === "DEGRADED") return "#D97706";
  return "#DC2626";
}

function toTransferMap(transfers: Transfer[]) {
  const map = new Map<string, Transfer>();
  transfers.forEach((item) => map.set(item.id, item));
  return map;
}

function buildCorridorRows(snapshots: TreasuryLiquiditySnapshotRow[]): CorridorHealthRow[] {
  const grouped = new Map<string, TreasuryLiquiditySnapshotRow[]>();

  snapshots.forEach((item) => {
    const next = grouped.get(item.corridor) ?? [];
    next.push(item);
    grouped.set(item.corridor, next);
  });

  return Array.from(grouped.entries())
    .map(([corridor, rows]) => {
      const sorted = [...rows].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      const latest = sorted[0];
      const previous = sorted[1] ?? sorted[0];
      const trend = latest.treasury_score - previous.treasury_score;
      const capacity = Math.round(
        (latest.corridor_capacity_score + latest.partner_capacity_score + latest.rail_capacity_score) /
          3
      );
      const pressure = getOverallOperationalPressure(latest);
      const status: CorridorHealthRow["status"] =
        latest.treasury_score >= 82 && pressure !== "CRITICAL"
          ? "HEALTHY"
          : latest.treasury_score >= 65
            ? "DEGRADED"
            : "AT_RISK";

      return {
        corridor,
        score: latest.treasury_score,
        trend,
        capacity,
        status,
        pressure,
      };
    })
    .sort((a, b) => b.score - a.score);
}

function buildActiveTransfers(
  sessions: PersistedExecutionSession[],
  transfers: Transfer[]
): ActiveTransferRow[] {
  const transferMap = toTransferMap(transfers);

  return sessions
    .filter((item) => item.state !== "COMPLETED" && item.state !== "FAILED")
    .map((session) => {
      const transfer = transferMap.get(session.transfer_id);
      const route = session.snapshot?.activeRoute ?? transfer?.selectedRoute;

      return {
        id: session.transfer_id,
        corridor: route?.treasuryCorridor ?? "Unknown corridor",
        amount: transfer?.senderAmount ?? route?.sendAmount ?? 0,
        currency: transfer?.senderCurrency ?? "GBP",
        status: session.state,
        progress: Math.max(0, Math.min(100, session.progress_percent ?? 0)),
        settlementEstimate: route?.estimatedTime ?? "Pending",
        routeId: route?.id ?? "--",
        updatedAt: session.updated_at ?? session.created_at ?? new Date().toISOString(),
      };
    })
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

function buildKpis(params: {
  transfers: Transfer[];
  sessions: PersistedExecutionSession[];
  snapshots: TreasuryLiquiditySnapshotRow[];
  events: RouteOperationalEventRow[];
}): KPIItem[] {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const currentStart = now - day;
  const previousStart = now - day * 2;

  const transfersCurrent = params.transfers.filter((item) => item.createdAt >= currentStart);
  const transfersPrevious = params.transfers.filter(
    (item) => item.createdAt >= previousStart && item.createdAt < currentStart
  );

  const terminalCurrent = params.sessions.filter(
    (item) =>
      (item.state === "COMPLETED" || item.state === "FAILED") &&
      new Date(item.updated_at ?? 0).getTime() >= currentStart
  );
  const terminalPrevious = params.sessions.filter(
    (item) =>
      (item.state === "COMPLETED" || item.state === "FAILED") &&
      new Date(item.updated_at ?? 0).getTime() >= previousStart &&
      new Date(item.updated_at ?? 0).getTime() < currentStart
  );

  const successCurrent = terminalCurrent.length
    ? (terminalCurrent.filter((item) => item.state === "COMPLETED").length / terminalCurrent.length) * 100
    : 0;
  const successPrevious = terminalPrevious.length
    ? (terminalPrevious.filter((item) => item.state === "COMPLETED").length / terminalPrevious.length) * 100
    : 0;

  const completedCurrent = terminalCurrent.filter((item) => item.state === "COMPLETED");
  const completedPrevious = terminalPrevious.filter((item) => item.state === "COMPLETED");

  const settleSeconds = (items: PersistedExecutionSession[]) => {
    if (!items.length) return 0;
    const avgMs =
      items.reduce((sum, item) => {
        const created = new Date(item.created_at ?? item.updated_at ?? 0).getTime();
        const updated = new Date(item.updated_at ?? item.created_at ?? 0).getTime();
        return sum + Math.max(0, updated - created);
      }, 0) / items.length;
    return Math.round(avgMs / 1000);
  };

  const settlementCurrent = settleSeconds(completedCurrent);
  const settlementPrevious = settleSeconds(completedPrevious);

  const latestSnapshots = [...params.snapshots]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 10);

  const avgCapacity = latestSnapshots.length
    ? latestSnapshots.reduce(
        (sum, item) =>
          sum +
          (item.corridor_capacity_score + item.partner_capacity_score + item.rail_capacity_score) / 3,
        0
      ) / latestSnapshots.length
    : 0;

  const previousCapacity = latestSnapshots.length > 4
    ? latestSnapshots.slice(4).reduce(
        (sum, item) =>
          sum +
          (item.corridor_capacity_score + item.partner_capacity_score + item.rail_capacity_score) / 3,
        0
      ) / latestSnapshots.slice(4).length
    : avgCapacity;

  const activeAlerts = params.events.filter((item) => item.status !== "RESOLVED");
  const highestSeverity = activeAlerts.reduce((max, item) => {
    const level = mapEventToAlertFilter(item);
    const weight = level === "CRITICAL" ? 3 : level === "WARNING" ? 2 : 1;
    const maxWeight = max === "CRITICAL" ? 3 : max === "WARNING" ? 2 : 1;
    return weight > maxWeight ? level : max;
  }, "INFO" as AlertFilter);

  const transferDelta = transfersCurrent.length - transfersPrevious.length;
  const successDelta = successCurrent - successPrevious;
  const settlementDelta = settlementPrevious - settlementCurrent;
  const capacityDelta = avgCapacity - previousCapacity;

  return [
    {
      key: "transfers",
      label: "Transfers (24h)",
      value: transfersCurrent.length.toLocaleString(),
      delta: `${formatDelta(transferDelta)} vs prev`,
      trend: trendFromDelta(transferDelta),
      tint: "#F59E0B",
      icon: "repeat",
    },
    {
      key: "success",
      label: "Success Rate",
      value: `${successCurrent.toFixed(2)}%`,
      delta: `${formatDelta(successDelta, "%")}`,
      trend: trendFromDelta(successDelta),
      tint: "#16A34A",
      icon: "trending-up",
    },
    {
      key: "settlement",
      label: "Avg Settlement",
      value: settlementCurrent > 0 ? `${settlementCurrent}s` : "--",
      delta: `${formatDelta(settlementDelta, "s")}`,
      trend: trendFromDelta(settlementDelta),
      tint: "#2563EB",
      icon: "clock",
    },
    {
      key: "treasury",
      label: "Treasury Capacity",
      value: `${Math.round(avgCapacity)}%`,
      delta: `${formatDelta(capacityDelta, "%")}`,
      trend: trendFromDelta(capacityDelta),
      tint: "#7C3AED",
      icon: "database",
    },
    {
      key: "alerts",
      label: "Active Alerts",
      value: String(activeAlerts.length),
      delta: `Highest: ${highestSeverity}`,
      trend: highestSeverity === "CRITICAL" ? "down" : highestSeverity === "WARNING" ? "flat" : "up",
      tint: highestSeverity === "CRITICAL" ? "#DC2626" : highestSeverity === "WARNING" ? "#D97706" : "#2563EB",
      icon: "alert-triangle",
    },
  ];
}

function upsertSession(
  sessions: PersistedExecutionSession[],
  incoming: PersistedExecutionSession
) {
  const next = sessions.filter((item) => item.id !== incoming.id);
  return [incoming, ...next]
    .sort(
      (a, b) =>
        new Date(b.updated_at ?? b.created_at ?? 0).getTime() -
        new Date(a.updated_at ?? a.created_at ?? 0).getTime()
    )
    .slice(0, 30);
}

function KpiCard({ item }: { item: KPIItem }) {
  const trendColor = item.trend === "up" ? "#16A34A" : item.trend === "down" ? "#DC2626" : "#2563EB";

  return (
    <View style={styles.kpiCard}>
      <View style={styles.kpiHeader}>
        <View style={[styles.kpiIconBubble, { backgroundColor: `${item.tint}1A` }]}>
          <Feather name={item.icon} size={18} color={item.tint} />
        </View>
        <AppText variant="caption" color={colors.textDarkMuted} style={styles.kpiLabel}>
          {item.label}
        </AppText>
      </View>

      <AppText variant="heading" color={colors.textDarkPrimary} style={styles.kpiValue}>
        {item.value}
      </AppText>

      <View style={styles.kpiDeltaRow}>
        <Feather
          name={item.trend === "up" ? "arrow-up-right" : item.trend === "down" ? "arrow-down-right" : "minus"}
          size={14}
          color={trendColor}
        />
        <AppText variant="caption" style={{ color: trendColor, fontWeight: "800" }}>
          {item.delta}
        </AppText>
      </View>
    </View>
  );
}

function MetricPill({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metricPill}>
      <AppText variant="caption" color={colors.textDarkMuted}>
        {label}
      </AppText>
      <AppText variant="body" color={colors.textDarkPrimary} style={{ fontWeight: "900" }}>
        {value}
      </AppText>
    </View>
  );
}

export default function OperationsScreen() {
  const [snapshots, setSnapshots] = useState<TreasuryLiquiditySnapshotRow[]>([]);
  const [events, setEvents] = useState<RouteOperationalEventRow[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [executionSessions, setExecutionSessions] = useState<PersistedExecutionSession[]>([]);
  const [feedsRefreshedAt, setFeedsRefreshedAt] = useState<string | null>(null);
  const [marketOpenCount, setMarketOpenCount] = useState(0);
  const [fxFeedCount, setFxFeedCount] = useState(0);
  const [realtimeStatus, setRealtimeStatus] = useState("Connecting");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string>(new Date().toISOString());
  const [filterVisible, setFilterVisible] = useState(false);
  const [severityFilter, setSeverityFilter] = useState<AlertFilter>("ALL");
  const [corridorFilter, setCorridorFilter] = useState("ALL");
  const [missionSummary, setMissionSummary] = useState<IntelligenceReportResult | null>(null);
  const [missionSummaryLoading, setMissionSummaryLoading] = useState(false);
  const [missionSummaryStatus, setMissionSummaryStatus] = useState("Waiting for telemetry");

  const {
    settings,
    loading: nexusAILoading,
    enabled: operationsAIEnabled,
    disabled: operationsAIDisabled,
    toggle: toggleOperationsAI,
  } = useNexusAIScreenSetting("corridor_enabled");

  const loadTelemetry = useCallback(async () => {
    try {
      const [snapshotData, eventData, executionData, transferData, feedData] = await Promise.all([
        loadRecentTreasurySnapshots(60),
        loadRecentRouteOperationalEvents(60),
        loadRecoverableExecutionSessions(),
        loadCompletedTransfers(),
        getLiveIntelligenceFeeds(),
      ]);

      setSnapshots(snapshotData);
      setEvents(eventData);
      setTransfers(transferData);
      setExecutionSessions((current) => executionData.reduce(upsertSession, current));
      setFeedsRefreshedAt(feedData.refreshedAt);
      setMarketOpenCount(feedData.marketHours.filter((item) => item.status === "OPEN").length);
      setFxFeedCount(feedData.fx.length);
      setLastUpdatedAt(new Date().toISOString());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadTelemetry();
    }, [loadTelemetry])
  );

  useEffect(() => {
    const unsubscribe = subscribeToRecentExecutionSessions({
      onSession: (session) => {
        setRealtimeStatus("Live");
        setExecutionSessions((current) => upsertSession(current, session));
      },
      onError: () => setRealtimeStatus("Polling"),
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const corridorRows = useMemo(() => buildCorridorRows(snapshots), [snapshots]);

  const filteredEvents = useMemo(() => {
    return events.filter((item) => {
      const severityMatch =
        severityFilter === "ALL" ? true : mapEventToAlertFilter(item) === severityFilter;
      const corridorMatch =
        corridorFilter === "ALL" ? true : (item.corridor ?? "Unknown corridor") === corridorFilter;
      return severityMatch && corridorMatch;
    });
  }, [corridorFilter, events, severityFilter]);

  const activeTransfers = useMemo(
    () => buildActiveTransfers(executionSessions, transfers),
    [executionSessions, transfers]
  );

  const filteredCorridors = useMemo(() => {
    if (corridorFilter === "ALL") return corridorRows;
    return corridorRows.filter((item) => item.corridor === corridorFilter);
  }, [corridorFilter, corridorRows]);

  const kpis = useMemo(
    () =>
      buildKpis({
        transfers,
        sessions: executionSessions,
        snapshots,
        events,
      }),
    [events, executionSessions, snapshots, transfers]
  );

  const treasurySummary = useMemo(() => {
    if (snapshots.length === 0) {
      return {
        utilization: 0,
        availableCapacity: 0,
        forecast: "No treasury telemetry yet",
        pressure: "LOW" as OperationalPressure,
      };
    }

    const latest = snapshots[0];
    const utilization = 100 - Math.round(
      (latest.corridor_capacity_score + latest.partner_capacity_score + latest.rail_capacity_score) / 3
    );
    const availableCapacity = Math.max(0, 100 - utilization);
    const pressure = getOverallOperationalPressure(latest);

    const forecast =
      pressure === "CRITICAL"
        ? "Capacity risk elevated across one or more rails"
        : pressure === "HIGH"
          ? "Watch liquidity buffers for near-term settlement windows"
          : "Liquidity coverage supports current transfer load";

    return {
      utilization,
      availableCapacity,
      forecast,
      pressure,
    };
  }, [snapshots]);

  const walletDistribution = useMemo(() => {
    const grouped = new Map<string, number>();

    transfers.forEach((item) => {
      const next = grouped.get(item.senderCurrency) ?? 0;
      grouped.set(item.senderCurrency, next + item.senderAmount);
    });

    const total = Array.from(grouped.values()).reduce((sum, value) => sum + value, 0);

    return Array.from(grouped.entries())
      .map(([currency, amount]) => ({
        currency,
        amount,
        percentage: total > 0 ? Math.round((amount / total) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [transfers]);

  const corridorOptions = useMemo(() => {
    const set = new Set<string>();
    corridorRows.forEach((item) => set.add(item.corridor));
    events.forEach((item) => set.add(item.corridor ?? "Unknown corridor"));
    return ["ALL", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [corridorRows, events]);

  const activeAlerts = useMemo(() => filteredEvents.slice(0, 8), [filteredEvents]);

  const serviceHealth = useMemo(() => {
    const criticalAlerts = events.filter((item) => mapEventToAlertFilter(item) === "CRITICAL").length;
    const warningAlerts = events.filter((item) => mapEventToAlertFilter(item) === "WARNING").length;

    const routingStatus = criticalAlerts > 1 ? "OFFLINE" : warningAlerts > 0 ? "DEGRADED" : "HEALTHY";
    const treasuryStatus =
      treasurySummary.pressure === "CRITICAL"
        ? "OFFLINE"
        : treasurySummary.pressure === "HIGH"
          ? "DEGRADED"
          : "HEALTHY";
    const fxStatus = fxFeedCount > 0 ? "HEALTHY" : "OFFLINE";
    const marketStatus = marketOpenCount > 0 ? "HEALTHY" : "DEGRADED";
    const aiStatus = operationsAIEnabled
      ? missionSummary
        ? "HEALTHY"
        : missionSummaryLoading
          ? "DEGRADED"
          : "OFFLINE"
      : "DEGRADED";
    const executionStatus = realtimeStatus === "Live" ? "HEALTHY" : "DEGRADED";

    return [
      { label: "Orchestration Engine", status: executionStatus },
      { label: "Routing Engine", status: routingStatus },
      { label: "Treasury Service", status: treasuryStatus },
      { label: "FX Feed Service", status: fxStatus },
      { label: "Market Feed Service", status: marketStatus },
      { label: "Nexus AI Service", status: aiStatus },
      { label: "Notification Service", status: criticalAlerts > 2 ? "DEGRADED" : "HEALTHY" },
    ] as const;
  }, [events, fxFeedCount, marketOpenCount, missionSummary, missionSummaryLoading, operationsAIEnabled, realtimeStatus, treasurySummary.pressure]);

  useEffect(() => {
    let active = true;

    async function generateMissionSummary() {
      if (!operationsAIEnabled) {
        setMissionSummary(null);
        setMissionSummaryStatus("Nexus AI disabled for this screen");
        return;
      }

      const topCorridor = corridorRows[0]?.corridor ?? "Unknown";
      const criticalCount = events.filter((item) => mapEventToAlertFilter(item) === "CRITICAL").length;

      setMissionSummaryLoading(true);
      setMissionSummaryStatus("Generating live mission interpretation");

      const result = await generateIntelligenceReport(
        {
          reportType: "corridor_analysis",
          focus: "Operations command centre mission health",
          telemetry: {
            live: realtimeStatus,
            transfers24h: kpis.find((item) => item.key === "transfers")?.value ?? "0",
            successRate: kpis.find((item) => item.key === "success")?.value ?? "0%",
            activeExecutions: activeTransfers.length,
            activeAlerts: activeAlerts.length,
            criticalAlerts: criticalCount,
            topCorridor,
            treasuryPressure: treasurySummary.pressure,
            treasuryUtilization: treasurySummary.utilization,
            marketOpenCount,
            fxFeedsLive: fxFeedCount,
          },
        },
        settings?.sensitivity ?? "balanced",
        {
          timeoutMs: 7000,
          maxRetries: 1,
        }
      );

      if (!active) return;

      if (result.ok) {
        setMissionSummary(result.data);
        setMissionSummaryStatus("Live Nexus AI interpretation");
      } else {
        setMissionSummary(null);
        setMissionSummaryStatus("Nexus AI mission summary currently unavailable");
      }

      setMissionSummaryLoading(false);
    }

    void generateMissionSummary();

    return () => {
      active = false;
    };
  }, [
    activeAlerts.length,
    activeTransfers.length,
    corridorRows,
    events,
    fxFeedCount,
    kpis,
    marketOpenCount,
    operationsAIEnabled,
    realtimeStatus,
    settings?.sensitivity,
    treasurySummary.pressure,
    treasurySummary.utilization,
  ]);

  return (
    <Screen>
      <View style={styles.screenBackground} />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            tintColor="#FFFFFF"
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void loadTelemetry();
            }}
          />
        }
      >
        <View style={styles.headerBlock}>
          <AppText variant="title" color={colors.textPrimary}>
            Operations Command Centre
          </AppText>
          <AppText variant="body" color={colors.textSecondary}>
            Real-time platform operations overview
          </AppText>

          <View style={styles.headerRow}>
            <View style={styles.liveBadge}>
              <View style={[styles.liveDot, { backgroundColor: realtimeStatus === "Live" ? "#10B981" : "#D97706" }]} />
              <AppText variant="caption" style={styles.liveBadgeText}>
                {realtimeStatus}
              </AppText>
            </View>

            <View style={styles.headerActions}>
              <Pressable style={styles.actionButton} onPress={() => setFilterVisible(true)}>
                <Feather name="filter" size={15} color="#DDEAF4" />
                <AppText variant="caption" color="#DDEAF4" style={{ fontWeight: "800" }}>
                  Filter
                </AppText>
              </Pressable>

              <Pressable
                style={styles.actionButton}
                onPress={() => {
                  setRefreshing(true);
                  void loadTelemetry();
                }}
              >
                <Feather name="refresh-cw" size={15} color="#DDEAF4" />
                <AppText variant="caption" color="#DDEAF4" style={{ fontWeight: "800" }}>
                  Refresh
                </AppText>
              </Pressable>
            </View>
          </View>

          <AppText variant="caption" color={colors.textMuted}>
            Last sync: {formatDateTime(lastUpdatedAt)}{feedsRefreshedAt ? ` • Feeds ${formatDateTime(feedsRefreshedAt)}` : ""}
          </AppText>
        </View>

        <NexusAIToggleCard
          title="Nexus AI"
          description="Controls mission interpretation and operational intelligence on this screen."
          enabled={operationsAIEnabled}
          disabled={operationsAIDisabled}
          loading={nexusAILoading}
          onToggle={toggleOperationsAI}
        />

        <FlatList
          data={kpis}
          horizontal
          keyExtractor={(item) => item.key}
          showsHorizontalScrollIndicator={false}
          style={styles.kpiList}
          contentContainerStyle={{ gap: 10, paddingRight: 8 }}
          renderItem={({ item }) => <KpiCard item={item} />}
        />

        <AppCard>
          <View style={styles.cardHeaderRow}>
            <View>
              <AppText variant="subheading" color={colors.textDarkPrimary} style={styles.cardTitle}>
                Corridor Health
              </AppText>
              <AppText variant="caption" color={colors.textDarkMuted}>
                Live corridor intelligence from treasury and route telemetry
              </AppText>
            </View>
          </View>

          {loading ? (
            <ActivityIndicator color="#0B3F4A" style={styles.loaderSpacing} />
          ) : filteredCorridors.length === 0 ? (
            <AppText variant="body" color={colors.textDarkSecondary}>
              No corridor intelligence available for the selected filters.
            </AppText>
          ) : (
            <View style={styles.stackList}>
              {filteredCorridors.slice(0, 8).map((item) => {
                const statusColor = getStatusColor(item.status);
                const trendColor = item.trend >= 0 ? "#16A34A" : "#DC2626";

                return (
                  <View key={item.corridor} style={styles.rowCard}>
                    <View style={styles.rowCardTop}>
                      <AppText variant="body" color={colors.textDarkPrimary} style={{ fontWeight: "900" }}>
                        {item.corridor}
                      </AppText>
                      <View style={[styles.tagPill, { backgroundColor: `${statusColor}1A` }]}>
                        <AppText variant="caption" style={{ color: statusColor, fontWeight: "900" }}>
                          {item.status}
                        </AppText>
                      </View>
                    </View>

                    <View style={styles.metricsGrid}>
                      <MetricPill label="Health score" value={`${item.score.toFixed(1)}`} />
                      <MetricPill label="Capacity" value={`${item.capacity}%`} />
                      <MetricPill label="Pressure" value={item.pressure} />
                    </View>

                    <View style={styles.progressTrack}>
                      <View style={[styles.progressFill, { width: `${Math.max(6, Math.min(100, item.score))}%`, backgroundColor: statusColor }]} />
                    </View>

                    <View style={styles.deltaRow}>
                      <Feather
                        name={item.trend >= 0 ? "trending-up" : "trending-down"}
                        size={14}
                        color={trendColor}
                      />
                      <AppText variant="caption" style={{ color: trendColor, fontWeight: "800" }}>
                        {formatDelta(item.trend)} vs previous snapshot
                      </AppText>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </AppCard>

        <AppCard>
          <View style={styles.cardHeaderRow}>
            <View>
              <AppText variant="subheading" color={colors.textDarkPrimary} style={styles.cardTitle}>
                Active Alerts
              </AppText>
              <AppText variant="caption" color={colors.textDarkMuted}>
                Critical, warning and informational events from the operational stream
              </AppText>
            </View>
          </View>

          {loading ? (
            <ActivityIndicator color="#0B3F4A" style={styles.loaderSpacing} />
          ) : activeAlerts.length === 0 ? (
            <AppText variant="body" color={colors.textDarkSecondary}>
              No active alerts for the current filter set.
            </AppText>
          ) : (
            <FlatList
              data={activeAlerts}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
              renderItem={({ item }) => {
                const level = mapEventToAlertFilter(item);
                const alertColor = getAlertColor(level);
                return (
                  <View style={styles.alertRow}>
                    <View style={[styles.alertIcon, { backgroundColor: `${alertColor}1A` }]}>
                      <Feather name="alert-triangle" size={16} color={alertColor} />
                    </View>

                    <View style={{ flex: 1, gap: 3 }}>
                      <View style={styles.alertTop}>
                        <AppText variant="body" color={colors.textDarkPrimary} style={{ fontWeight: "900", flex: 1 }}>
                          {item.event_type.replace(/_/g, " ")}
                        </AppText>
                        <AppText variant="caption" style={{ color: alertColor, fontWeight: "900" }}>
                          {level}
                        </AppText>
                      </View>

                      <AppText variant="caption" color={colors.textDarkSecondary}>
                        {item.provider} • {item.rail} • {item.corridor ?? "Unknown corridor"}
                      </AppText>

                      <AppText variant="caption" color={colors.textDarkSecondary}>
                        {item.message}
                      </AppText>

                      <AppText variant="caption" color={colors.textDarkMuted}>
                        {formatRelativeTime(item.created_at)} • {formatDateTime(item.created_at)}
                      </AppText>
                    </View>
                  </View>
                );
              }}
            />
          )}
        </AppCard>

        <AppCard>
          <View style={styles.cardHeaderRow}>
            <View>
              <AppText variant="subheading" color={colors.textDarkPrimary} style={styles.cardTitle}>
                Treasury and Liquidity
              </AppText>
              <AppText variant="caption" color={colors.textDarkMuted}>
                Utilisation, available liquidity, currency distribution and capacity forecast
              </AppText>
            </View>
          </View>

          <View style={styles.metricsGrid}>
            <MetricPill label="Utilisation" value={`${treasurySummary.utilization}%`} />
            <MetricPill label="Available" value={`${treasurySummary.availableCapacity}%`} />
            <MetricPill label="FX feeds live" value={`${fxFeedCount}`} />
          </View>

          <View style={styles.progressTrackLarge}>
            <View
              style={{
                width: `${Math.max(4, Math.min(100, treasurySummary.utilization))}%`,
                height: "100%",
                backgroundColor:
                  treasurySummary.pressure === "CRITICAL"
                    ? "#DC2626"
                    : treasurySummary.pressure === "HIGH"
                      ? "#D97706"
                      : "#16A34A",
                borderRadius: 999,
              }}
            />
          </View>

          <AppText variant="body" color={colors.textDarkPrimary} style={{ fontWeight: "700" }}>
            {treasurySummary.forecast}
          </AppText>

          {walletDistribution.length > 0 ? (
            <View style={styles.stackList}>
              {walletDistribution.map((item) => (
                <View key={item.currency} style={styles.currencyRow}>
                  <AppText variant="body" color={colors.textDarkPrimary} style={{ fontWeight: "800" }}>
                    {item.currency}
                  </AppText>
                  <AppText variant="caption" color={colors.textDarkSecondary}>
                    {item.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })} ({item.percentage.toFixed(1)}%)
                  </AppText>
                </View>
              ))}
            </View>
          ) : (
            <AppText variant="caption" color={colors.textDarkSecondary}>
              Wallet distribution will populate from live transfer history.
            </AppText>
          )}
        </AppCard>

        <AppCard>
          <View style={styles.cardHeaderRow}>
            <View>
              <AppText variant="subheading" color={colors.textDarkPrimary} style={styles.cardTitle}>
                Live Transfers
              </AppText>
              <AppText variant="caption" color={colors.textDarkMuted}>
                Active transfers from transaction history and execution state services
              </AppText>
            </View>
          </View>

          {activeTransfers.length === 0 ? (
            <AppText variant="body" color={colors.textDarkSecondary}>
              No active transfers in-flight right now.
            </AppText>
          ) : (
            <FlatList
              data={activeTransfers.slice(0, 12)}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
              renderItem={({ item }) => (
                <View style={styles.transferRow}>
                  <View style={{ flex: 1, gap: 3 }}>
                    <AppText variant="body" color={colors.textDarkPrimary} style={{ fontWeight: "900" }}>
                      {item.corridor}
                    </AppText>
                    <AppText variant="caption" color={colors.textDarkSecondary}>
                      {item.currency} {item.amount.toLocaleString()} • Route {item.routeId}
                    </AppText>
                    <AppText variant="caption" color={colors.textDarkSecondary}>
                      Settlement {item.settlementEstimate} • {formatRelativeTime(item.updatedAt)}
                    </AppText>
                  </View>

                  <View style={{ minWidth: 92, alignItems: "flex-end", gap: 6 }}>
                    <View style={[styles.tagPill, { backgroundColor: "#EFF6FF" }]}>
                      <AppText variant="caption" style={{ color: "#1D4ED8", fontWeight: "900" }}>
                        {item.status}
                      </AppText>
                    </View>
                    <AppText variant="caption" color={colors.textDarkMuted}>
                      {item.progress}%
                    </AppText>
                  </View>
                </View>
              )}
            />
          )}
        </AppCard>

        <AppCard>
          <View style={styles.cardHeaderRow}>
            <View>
              <AppText variant="subheading" color={colors.textDarkPrimary} style={styles.cardTitle}>
                Global Flow Map
              </AppText>
              <AppText variant="caption" color={colors.textDarkMuted}>
                Active route volume and utilization across live corridors
              </AppText>
            </View>
          </View>

          {corridorRows.length === 0 ? (
            <AppText variant="body" color={colors.textDarkSecondary}>
              Flow map will appear once corridor telemetry is available.
            </AppText>
          ) : (
            <View style={styles.stackList}>
              {corridorRows.slice(0, 6).map((item, index) => {
                const transferVolume = activeTransfers.filter((transfer) => transfer.corridor === item.corridor).length;
                return (
                  <View key={item.corridor} style={styles.mapRow}>
                    <View style={[styles.mapNode, { backgroundColor: ["#F59E0B", "#7C3AED", "#2563EB", "#10B981"][index % 4] }]} />

                    <View style={{ flex: 1, gap: 4 }}>
                      <View style={styles.rowCardTop}>
                        <AppText variant="body" color={colors.textDarkPrimary} style={{ fontWeight: "800" }}>
                          {item.corridor}
                        </AppText>
                        <AppText variant="caption" color={colors.textDarkMuted}>
                          Volume {transferVolume}
                        </AppText>
                      </View>

                      <View style={styles.progressTrack}>
                        <View style={[styles.progressFill, { width: `${Math.max(6, Math.min(100, item.capacity))}%` }]} />
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </AppCard>

        <AppCard>
          <View style={styles.cardHeaderRow}>
            <View>
              <AppText variant="subheading" color={colors.textDarkPrimary} style={styles.cardTitle}>
                Operational Health
              </AppText>
              <AppText variant="caption" color={colors.textDarkMuted}>
                Real-time service telemetry and platform subsystem status
              </AppText>
            </View>
          </View>

          <View style={styles.stackList}>
            {serviceHealth.map((item) => {
              const color = item.status === "HEALTHY" ? "#16A34A" : item.status === "DEGRADED" ? "#D97706" : "#DC2626";
              return (
                <View key={item.label} style={styles.healthRow}>
                  <View style={styles.healthLabelRow}>
                    <View style={[styles.healthDot, { backgroundColor: color }]} />
                    <AppText variant="body" color={colors.textDarkPrimary} style={{ fontWeight: "700" }}>
                      {item.label}
                    </AppText>
                  </View>

                  <AppText variant="caption" style={{ color, fontWeight: "900" }}>
                    {item.status}
                  </AppText>
                </View>
              );
            })}
          </View>
        </AppCard>

        <AppCard style={styles.missionCard}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.missionIconBubble}>
              <Feather name="cpu" size={18} color="#7C3AED" />
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="subheading" color={colors.textDarkPrimary} style={styles.cardTitle}>
                Nexus AI Mission Summary
              </AppText>
              <AppText variant="caption" color={colors.textDarkMuted}>
                Mission Control interpretation based on live operational telemetry
              </AppText>
            </View>
          </View>

          {missionSummaryLoading ? (
            <View style={styles.aiLoadingRow}>
              <ActivityIndicator color="#7C3AED" />
              <AppText variant="body" color={colors.textDarkSecondary}>
                Generating live mission interpretation...
              </AppText>
            </View>
          ) : missionSummary ? (
            <View style={styles.stackList}>
              <AppText variant="body" color={colors.textDarkPrimary} style={{ lineHeight: 22, fontWeight: "700" }}>
                {missionSummary.executiveSummary}
              </AppText>
              {missionSummary.keyFindings.slice(0, 3).map((line, index) => (
                <View key={`finding-${index}`} style={styles.aiBulletRow}>
                  <View style={styles.aiBullet} />
                  <AppText variant="caption" color={colors.textDarkSecondary} style={{ flex: 1 }}>
                    {line}
                  </AppText>
                </View>
              ))}
            </View>
          ) : (
            <AppText variant="body" color={colors.textDarkSecondary}>
              {missionSummaryStatus}
            </AppText>
          )}
        </AppCard>
      </ScrollView>

      <Modal visible={filterVisible} transparent animationType="fade" onRequestClose={() => setFilterVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <AppText variant="subheading" color={colors.textDarkPrimary} style={styles.cardTitle}>
                Operations Filters
              </AppText>
              <Pressable onPress={() => setFilterVisible(false)}>
                <Feather name="x" size={20} color={colors.textDarkPrimary} />
              </Pressable>
            </View>

            <View style={{ gap: 10 }}>
              <AppText variant="caption" color={colors.textDarkMuted}>
                Alert severity
              </AppText>
              <View style={styles.filterRowWrap}>
                {(["ALL", "CRITICAL", "WARNING", "INFO"] as AlertFilter[]).map((level) => (
                  <Pressable
                    key={level}
                    onPress={() => setSeverityFilter(level)}
                    style={[
                      styles.filterChip,
                      severityFilter === level && styles.filterChipSelected,
                    ]}
                  >
                    <AppText
                      variant="caption"
                      style={{
                        color: severityFilter === level ? "#0B3F4A" : colors.textDarkSecondary,
                        fontWeight: "800",
                      }}
                    >
                      {level}
                    </AppText>
                  </Pressable>
                ))}
              </View>

              <AppText variant="caption" color={colors.textDarkMuted}>
                Corridor
              </AppText>
              <View style={styles.filterRowWrap}>
                {corridorOptions.map((value) => (
                  <Pressable
                    key={value}
                    onPress={() => setCorridorFilter(value)}
                    style={[
                      styles.filterChip,
                      corridorFilter === value && styles.filterChipSelected,
                    ]}
                  >
                    <AppText
                      variant="caption"
                      style={{
                        color: corridorFilter === value ? "#0B3F4A" : colors.textDarkSecondary,
                        fontWeight: "800",
                      }}
                    >
                      {value}
                    </AppText>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.modalFooter}>
              <Pressable
                style={styles.modalGhostButton}
                onPress={() => {
                  setSeverityFilter("ALL");
                  setCorridorFilter("ALL");
                }}
              >
                <AppText variant="caption" color={colors.textDarkPrimary} style={{ fontWeight: "900" }}>
                  Reset
                </AppText>
              </Pressable>

              <Pressable style={styles.modalPrimaryButton} onPress={() => setFilterVisible(false)}>
                <AppText variant="caption" color="#FFFFFF" style={{ fontWeight: "900" }}>
                  Apply
                </AppText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.background,
  },
  content: {
    gap: 14,
    paddingTop: 10,
    paddingBottom: 42,
  },
  headerBlock: {
    gap: 6,
  },
  headerRow: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(11,63,74,0.55)",
    borderWidth: 1,
    borderColor: "rgba(191,234,241,0.35)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  liveBadgeText: {
    color: "#DDEAF4",
    fontWeight: "900",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(159,191,216,0.35)",
    backgroundColor: "rgba(12,35,56,0.48)",
  },
  kpiList: {
    marginTop: 2,
  },
  kpiCard: {
    width: 168,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 14,
    gap: 10,
    shadowColor: "#020713",
    shadowOpacity: 0.14,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  kpiHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  kpiIconBubble: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  kpiLabel: {
    flex: 1,
    fontWeight: "700",
  },
  kpiValue: {
    fontWeight: "900",
  },
  kpiDeltaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  cardTitle: {
    fontWeight: "900",
  },
  loaderSpacing: {
    marginVertical: 6,
  },
  stackList: {
    gap: 10,
  },
  rowCard: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    padding: 12,
    gap: 10,
    backgroundColor: "#FAFCFF",
  },
  rowCardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  tagPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  metricsGrid: {
    flexDirection: "row",
    gap: 8,
  },
  metricPill: {
    flex: 1,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    gap: 4,
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: "#E2E8F0",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#16A34A",
  },
  deltaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  alertRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FAFCFF",
  },
  alertIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  alertTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  progressTrackLarge: {
    marginVertical: 10,
    height: 11,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: "#E2E8F0",
  },
  currencyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 11,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
  },
  transferRow: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    padding: 12,
    backgroundColor: "#FAFCFF",
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  mapRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 10,
    backgroundColor: "#FFFFFF",
  },
  mapNode: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  healthRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  healthLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  healthDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  missionCard: {
    borderColor: "#EADDFD",
    backgroundColor: "#FEFBFF",
  },
  missionIconBubble: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3E8FF",
  },
  aiLoadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 4,
  },
  aiBulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  aiBullet: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#7C3AED",
    marginTop: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(3,9,18,0.64)",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 16,
    gap: 14,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  filterRowWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#D1DCE8",
    backgroundColor: "#F8FAFC",
  },
  filterChipSelected: {
    borderColor: "#67C7D4",
    backgroundColor: "#E7FAFD",
  },
  modalFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 4,
  },
  modalGhostButton: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  modalPrimaryButton: {
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#0B3F4A",
  },
});
