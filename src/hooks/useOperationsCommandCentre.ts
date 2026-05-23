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
import { buildOperationsInsights, OperationsAlertFilter, OperationsInsights } from "../utils/operationsCommandCentre";
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
      setFeeds(feedData);
      setFeedsRefreshedAt(feedData.refreshedAt);
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

  useEffect(() => {
    let active = true;

    async function generateMissionSummary() {
      if (!operationsAIEnabled) {
        setMissionSummary(null);
        setMissionSummaryStatus("Nexus AI disabled for this screen");
        return;
      }

      setMissionSummaryLoading(true);
      setMissionSummaryStatus("Generating live mission interpretation");

      const topCorridor = insights.corridorRows[0]?.corridor ?? "Unknown";
      const criticalCount = events.filter((item) => item.severity === "FAILOVER" || item.severity === "DEGRADED").length;

      const result = await generateIntelligenceReport(
        {
          reportType: "corridor_analysis",
          focus: "Operations command centre mission health",
          telemetry: {
            live: realtimeStatus,
            transfers24h: insights.kpis.find((item) => item.key === "transfers")?.value ?? "0",
            successRate: insights.kpis.find((item) => item.key === "success")?.value ?? "0%",
            activeExecutions: insights.activeTransfers.length,
            activeAlerts: events.length,
            criticalAlerts: criticalCount,
            topCorridor,
            treasuryPressure: insights.treasurySummary.pressure,
            treasuryUtilization: insights.treasurySummary.utilization,
            marketOpenCount: feeds?.marketHours.filter((item) => item.status === "OPEN").length ?? 0,
            fxFeedsLive: feeds?.fx.length ?? 0,
          },
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
        setMissionSummaryStatus("Nexus AI mission summary currently unavailable");
      }

      setMissionSummaryLoading(false);
    }

    void generateMissionSummary();

    return () => {
      active = false;
    };
  }, [
    events,
    feeds,
    insights.activeTransfers.length,
    insights.corridorRows,
    insights.kpis,
    insights.treasurySummary.pressure,
    insights.treasurySummary.utilization,
    operationsAIEnabled,
    realtimeStatus,
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
