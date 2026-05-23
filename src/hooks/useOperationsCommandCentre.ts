import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
    loadRecoverableExecutionSessions,
    PersistedExecutionSession,
} from "../services/execution/executionPersistenceService";
import { subscribeToRecentExecutionSessions } from "../services/execution/executionRealtimeService";
import { getLiveIntelligenceFeeds, LiveIntelligenceFeeds } from "../services/liveIntelligenceFeedService";
import {
    generateIntelligenceReport,
    IntelligenceReportResult,
} from "../services/nexusAIService";
import {
    loadRecentRouteOperationalEvents,
    RouteOperationalEventRow,
} from "../services/routeOperationalEventService";
import { loadCompletedTransfers } from "../services/transferService";
import {
    loadRecentTreasurySnapshots,
    TreasuryLiquiditySnapshotRow,
} from "../services/treasuryIntelligenceService";
import { Transfer } from "../types/transfer";
import {
    buildActiveTransfers,
    buildCorridorRows,
    buildKpis,
    buildOperationsInsights,
    buildTreasurySummary,
    OperationsAlertFilter,
    OperationsInsights,
} from "../utils/operationsCommandCentre";
import { useNexusAIScreenSetting } from "./useNexusAISettings";

export type OperationsCommandCentreState = OperationsInsights & {
  events: RouteOperationalEventRow[];
  loading: boolean;
  refreshing: boolean;
  realtimeStatus: string;
  lastUpdatedAt: string;
  feedsRefreshedAt: string | null;
  missionSummary: IntelligenceReportResult | null;
  missionSummaryLoading: boolean;
  missionSummaryStatus: string;
  operationsAIEnabled: boolean;
  operationsAIDisabled: boolean;
  nexusAILoading: boolean;
  toggleOperationsAI: (value: boolean) => void;
  settingsSensitivity: "conservative" | "balanced" | "aggressive" | undefined;
  refresh: () => Promise<void>;
  setRefreshing: (value: boolean) => void;
  setSeverityFilter: (value: OperationsAlertFilter) => void;
  setCorridorFilter: (value: string) => void;
  severityFilter: OperationsAlertFilter;
  corridorFilter: string;
  corridorOptions: string[];
  corridorFilterOptions: string[];
  feedData: LiveIntelligenceFeeds | null;
};

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

export function useOperationsCommandCentre(): OperationsCommandCentreState {
  const [snapshots, setSnapshots] = useState<TreasuryLiquiditySnapshotRow[]>([]);
  const [events, setEvents] = useState<RouteOperationalEventRow[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [sessions, setSessions] = useState<PersistedExecutionSession[]>([]);
  const [feeds, setFeeds] = useState<LiveIntelligenceFeeds | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [realtimeStatus, setRealtimeStatus] = useState("Connecting");
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string>(new Date().toISOString());
  const [feedsRefreshedAt, setFeedsRefreshedAt] = useState<string | null>(null);
  const [missionSummary, setMissionSummary] = useState<IntelligenceReportResult | null>(null);
  const [missionSummaryLoading, setMissionSummaryLoading] = useState(false);
  const [missionSummaryStatus, setMissionSummaryStatus] = useState("Waiting for telemetry");
  const [severityFilter, setSeverityFilter] = useState<OperationsAlertFilter>("ALL");
  const [corridorFilter, setCorridorFilter] = useState("ALL");

  const {
    loading: nexusAILoading,
    enabled: operationsAIEnabled,
    disabled: operationsAIDisabled,
    settings,
    toggle: toggleOperationsAI,
  } = useNexusAIScreenSetting("corridor_enabled");

  const loadTelemetry = useCallback(async () => {
    try {
      const [snapshotData, eventData, sessionData, transferData, feedData] = await Promise.all([
        loadRecentTreasurySnapshots(60),
        loadRecentRouteOperationalEvents(60),
        loadRecoverableExecutionSessions(),
        loadCompletedTransfers(),
        getLiveIntelligenceFeeds(),
      ]);

      setSnapshots(snapshotData);
      setEvents(eventData);
      setSessions((current) => sessionData.reduce(upsertSession, current));
      setTransfers(transferData);
      setFeeds(feedData ?? null);
      setFeedsRefreshedAt(feedData?.refreshedAt ?? null);
      setLastUpdatedAt(new Date().toISOString());
    } catch (error) {
      console.warn("[Operations] Failed to refresh telemetry", error);
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
        setSessions((current) => upsertSession(current, session));
      },
      onError: () => setRealtimeStatus("Polling"),
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const insights = useMemo(
    () =>
      buildOperationsInsights({
        snapshots,
        events,
        transfers,
        sessions,
        feeds,
        missionSummary,
        missionSummaryLoading,
        missionSummaryEnabled: operationsAIEnabled,
        realtimeStatus,
      }),
    [events, feeds, missionSummary, missionSummaryLoading, operationsAIEnabled, realtimeStatus, sessions, snapshots, transfers]
  );

  const corridorOptions = useMemo(() => {
    const set = new Set<string>();
    insights.corridorRows.forEach((item) => set.add(item.corridor));
    events.forEach((item) => set.add(item.corridor ?? "Unknown corridor"));
    return ["ALL", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [events, insights.corridorRows]);

  const aiTelemetry = useMemo(() => {
    const corridorRows = buildCorridorRows(snapshots);
    const kpiResult = buildKpis({ transfers, sessions, snapshots, events });
    const treasurySummary = buildTreasurySummary(snapshots, transfers);
    const activeTransfers = buildActiveTransfers(sessions, transfers);

    return {
      live: realtimeStatus,
      transfers24h: kpiResult.items.find((item) => item.key === "transfers")?.value ?? "0",
      successRate: kpiResult.items.find((item) => item.key === "success")?.value ?? "0%",
      activeExecutions: activeTransfers.length,
      activeAlerts: events.length,
      criticalAlerts: events.filter((item) => item.severity === "FAILOVER" || item.severity === "DEGRADED").length,
      topCorridor: corridorRows[0]?.corridor ?? "Unknown",
      treasuryPressure: treasurySummary.pressure,
      treasuryUtilization: treasurySummary.utilization,
      marketOpenCount: feeds?.marketHours.filter((item) => item.status === "OPEN").length ?? 0,
      fxFeedsLive: feeds?.fx.length ?? 0,
    };
  }, [events, feeds, realtimeStatus, sessions, snapshots, transfers]);

  useEffect(() => {
    let active = true;

    async function generateMissionSummary() {
      if (!operationsAIEnabled) {
        setMissionSummary(null);
        setMissionSummaryLoading(false);
        setMissionSummaryStatus("Nexus AI disabled for this screen");
        return;
      }

      setMissionSummaryLoading(true);
      setMissionSummaryStatus("Generating live mission interpretation");

      try {
        const result = await generateIntelligenceReport(
          {
            reportType: "corridor_analysis",
            focus: "Operations command centre mission health",
            telemetry: aiTelemetry,
          },
          settings?.sensitivity ?? "balanced",
          { timeoutMs: 7000, maxRetries: 1 }
        );

        if (!active) return;

        if (result.ok) {
          setMissionSummary(result.data);
          setMissionSummaryStatus("Live Nexus AI interpretation");
        } else {
          setMissionSummary(null);
          setMissionSummaryStatus("Mission summary unavailable. Using live telemetry and operational status cards.");
        }
      } catch (error) {
        if (!active) return;
        console.warn("[Operations] Failed to generate mission summary", error);
        setMissionSummary(null);
        setMissionSummaryStatus("Mission summary unavailable. Using live telemetry and operational status cards.");
      } finally {
        if (active) {
          setMissionSummaryLoading(false);
        }
      }
    }

    void generateMissionSummary();

    return () => {
      active = false;
    };
  }, [
    aiTelemetry,
    operationsAIEnabled,
    settings?.sensitivity,
  ]);

  return {
    ...insights,
    events,
    loading,
    refreshing,
    realtimeStatus,
    lastUpdatedAt,
    feedsRefreshedAt,
    missionSummary,
    missionSummaryLoading,
    missionSummaryStatus,
    operationsAIEnabled,
    operationsAIDisabled,
    nexusAILoading,
    toggleOperationsAI,
    settingsSensitivity: settings?.sensitivity,
    refresh: loadTelemetry,
    setRefreshing,
    setSeverityFilter,
    setCorridorFilter,
    severityFilter,
    corridorFilter,
    corridorOptions,
    corridorFilterOptions: corridorOptions,
    feedData: feeds,
  };
}
