import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  loadRecentExecutionSessions,
  loadRecoverableExecutionSessions,
  PersistedExecutionSession,
} from "../services/execution/executionPersistenceService";
import { subscribeToRecentExecutionSessions } from "../services/execution/executionRealtimeService";
import { getLiveIntelligenceFeeds, LiveIntelligenceFeeds } from "../services/liveIntelligenceFeedService";
import {
  loadPartnerConnectionTests,
  type PartnerConnectionTestRecord,
} from "../services/platformAdministrationService";
import type { IntelligenceReportResult } from "../services/nexusAIService";
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
  debugStage: string;
};

type OperationsAITelemetry = {
  live: string;
  transfers24h: string;
  successRate: string;
  activeExecutions: number;
  activeAlerts: number;
  criticalAlerts: number;
  topCorridor: string;
  treasuryPressure: OperationsInsights["treasurySummary"]["pressure"];
  treasuryUtilization: number;
  marketOpenCount: number;
  fxFeedsLive: number;
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
  const [partnerConnectionTests, setPartnerConnectionTests] = useState<PartnerConnectionTestRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [realtimeStatus, setRealtimeStatus] = useState("Connecting");
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string>(new Date().toISOString());
  const [feedsRefreshedAt, setFeedsRefreshedAt] = useState<string | null>(null);
  const [missionSummary] = useState<IntelligenceReportResult | null>(null);
  const [missionSummaryLoading] = useState(false);
  const [missionSummaryStatus] = useState("Waiting for telemetry");
  const [aiRefreshNonce, setAiRefreshNonce] = useState(0);
  const [severityFilter, setSeverityFilter] = useState<OperationsAlertFilter>("ALL");
  const [corridorFilter, setCorridorFilter] = useState("ALL");
  const [debugStage, setDebugStage] = useState("OPS_DEBUG: initializing");
  const isMountedRef = useRef(true);
  const aiInFlightRef = useRef(false);
  const aiRequestIdRef = useRef(0);
  const aiTelemetryRef = useRef<OperationsAITelemetry>({
    live: "Connecting",
    transfers24h: "0",
    successRate: "0%",
    activeExecutions: 0,
    activeAlerts: 0,
    criticalAlerts: 0,
    topCorridor: "Unknown",
    treasuryPressure: "LOW",
    treasuryUtilization: 0,
    marketOpenCount: 0,
    fxFeedsLive: 0,
  });

  const {
    loading: nexusAILoading,
    enabled: operationsAIEnabled,
    disabled: operationsAIDisabled,
    settings,
    toggle: toggleOperationsAI,
  } = useNexusAIScreenSetting("corridor_enabled");

  console.log("OPS_DEBUG: hook render start", {
    snapshots: snapshots.length,
    events: events.length,
    sessions: sessions.length,
    transfers: transfers.length,
    hasFeeds: Boolean(feeds),
    operationsAIEnabled,
    missionSummaryLoading,
  });

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      aiRequestIdRef.current += 1;
      aiInFlightRef.current = false;
    };
  }, []);

  const loadTelemetry = useCallback(async () => {
    console.log("OPS_DEBUG: telemetry loading start");
    setDebugStage("OPS_DEBUG: telemetry loading start");

    try {
      const [snapshotData, eventData, recoverableSessionData, recentSessionData, transferData, feedData, partnerTestData] = await Promise.all([
        loadRecentTreasurySnapshots(60),
        loadRecentRouteOperationalEvents(60),
        loadRecoverableExecutionSessions(),
        loadRecentExecutionSessions(60),
        loadCompletedTransfers(),
        getLiveIntelligenceFeeds(),
        loadPartnerConnectionTests(10),
      ]);
      const sessionData = [...recoverableSessionData, ...recentSessionData].reduce(
        upsertSession,
        [] as PersistedExecutionSession[]
      );

      if (!isMountedRef.current) return;

      console.log("OPS_DEBUG: telemetry loaded", {
        snapshots: snapshotData.length,
        events: eventData.length,
        sessions: sessionData.length,
        transfers: transferData.length,
        hasFeeds: Boolean(feedData),
        partnerTests: partnerTestData.length,
      });
      setDebugStage(`OPS_DEBUG: telemetry loaded (snap=${snapshotData.length} ev=${eventData.length} sess=${sessionData.length} tx=${transferData.length})`);

      setSnapshots([]);
      setEvents(eventData.filter((event) => event.status !== "SIMULATED"));
      setSessions((current) => sessionData.reduce(upsertSession, current));
      setTransfers(transferData);
      setFeeds(feedData ?? null);
      setPartnerConnectionTests(partnerTestData);
      setFeedsRefreshedAt(feedData?.refreshedAt ?? null);
      setLastUpdatedAt(new Date().toISOString());
    } catch (error) {
      console.warn("OPS_DEBUG: telemetry loading failed", error);
      setDebugStage(`OPS_DEBUG: telemetry loading failed - ${error instanceof Error ? error.message : String(error)}`);
      console.warn("[Operations] Failed to refresh telemetry", error);
    } finally {
      console.log("OPS_DEBUG: telemetry loading complete");
      if (isMountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  const refresh = useCallback(async () => {
    await loadTelemetry();

    if (isMountedRef.current) {
      setAiRefreshNonce((current) => current + 1);
    }
  }, [loadTelemetry]);

  useFocusEffect(
    useCallback(() => {
      void loadTelemetry();
    }, [loadTelemetry])
  );

  // Realtime subscription remains disabled until the diagnostic crash path is cleared.
  // The OCC labels this explicitly instead of implying live monitoring.
  void subscribeToRecentExecutionSessions; // keep import live for the restore path
  useEffect(() => {
    console.log("OPS_DEBUG: realtime subscription disabled (diagnostic mode)");
    setDebugStage("OPS_DEBUG: realtime subscription disabled");
    setRealtimeStatus("Diagnostic Mode");
  }, []);

  const insights = useMemo(() => {
    console.log("OPS_DEBUG: insights calculation start");

    try {
      const nextInsights = buildOperationsInsights({
        snapshots,
        events,
        transfers,
        sessions,
        feeds,
        missionSummary,
        missionSummaryLoading,
        missionSummaryEnabled: operationsAIEnabled,
        realtimeStatus,
        partnerConnectionTests,
      });

      console.log("OPS_DEBUG: insights calculation complete", {
        kpis: nextInsights.kpis.length,
        corridorRows: nextInsights.corridorRows.length,
        alerts: events.length,
      });

      return nextInsights;
    } catch (error) {
      console.warn("OPS_DEBUG: insights calculation failed", error);
      throw error;
    }
  }, [events, feeds, missionSummary, missionSummaryLoading, operationsAIEnabled, partnerConnectionTests, realtimeStatus, sessions, snapshots, transfers]);

  const corridorOptions = useMemo(() => {
    console.log("OPS_DEBUG: corridor options calculation start");

    try {
    const set = new Set<string>();
    insights.corridorRows.forEach((item) => set.add(item.corridor));
    events.forEach((item) => set.add(item.corridor ?? "Unknown corridor"));
      const options = ["ALL", ...Array.from(set).sort((a, b) => a.localeCompare(b))];

      console.log("OPS_DEBUG: corridor options calculation complete", {
        options: options.length,
      });

      return options;
    } catch (error) {
      console.warn("OPS_DEBUG: corridor options calculation failed", error);
      throw error;
    }
  }, [events, insights.corridorRows]);

  const aiTelemetry = useMemo<OperationsAITelemetry>(() => {
    console.log("OPS_DEBUG: mission telemetry calculation start");

    try {
      console.log("OPS_DEBUG: corridor calculations start");
      const corridorRows = buildCorridorRows(snapshots);
      console.log("OPS_DEBUG: corridor rows built", { rows: corridorRows.length });

      console.log("OPS_DEBUG: KPI calculations start");
      const kpiResult = buildKpis({ transfers, sessions, snapshots, events });
      console.log("OPS_DEBUG: KPI calculations complete", { kpis: kpiResult.items.length });

      console.log("OPS_DEBUG: alert calculations start");
      const criticalAlerts = events.filter((item) => item.severity === "FAILOVER" || item.severity === "DEGRADED").length;
      console.log("OPS_DEBUG: alerts processed", { total: events.length, critical: criticalAlerts });

      const treasurySummary = buildTreasurySummary(snapshots, transfers);
      const activeTransfers = buildActiveTransfers(sessions, transfers);

      const telemetry = {
        live: realtimeStatus,
        transfers24h: kpiResult.items.find((item) => item.key === "transfers")?.value ?? "0",
        successRate: kpiResult.items.find((item) => item.key === "success")?.value ?? "0%",
        activeExecutions: activeTransfers.length,
        activeAlerts: events.length,
        criticalAlerts,
        topCorridor: corridorRows[0]?.corridor ?? "Unknown",
        treasuryPressure: treasurySummary.pressure,
        treasuryUtilization: treasurySummary.utilization,
        marketOpenCount: feeds?.marketHours.filter((item) => item.status === "OPEN").length ?? 0,
        fxFeedsLive: feeds?.fx.length ?? 0,
      };

      console.log("OPS_DEBUG: mission telemetry calculation complete", telemetry);
      return telemetry;
    } catch (error) {
      console.warn("OPS_DEBUG: mission telemetry calculation failed", error);
      throw error;
    }
  }, [events, feeds, realtimeStatus, sessions, snapshots, transfers]);

  const aiTelemetrySignature = useMemo(
    () =>
      [
        aiTelemetry.live,
        aiTelemetry.transfers24h,
        aiTelemetry.successRate,
        aiTelemetry.activeExecutions,
        aiTelemetry.activeAlerts,
        aiTelemetry.criticalAlerts,
        aiTelemetry.topCorridor,
        aiTelemetry.treasuryPressure,
        aiTelemetry.treasuryUtilization,
        aiTelemetry.marketOpenCount,
        aiTelemetry.fxFeedsLive,
      ].join("|"),
    [aiTelemetry]
  );

  const hasTelemetry = useMemo(
    () => snapshots.length > 0 || events.length > 0 || sessions.length > 0 || transfers.length > 0 || Boolean(feeds),
    [events.length, feeds, sessions.length, snapshots.length, transfers.length]
  );

  useEffect(() => {
    aiTelemetryRef.current = aiTelemetry;
  }, [aiTelemetry]);

  useEffect(() => {
    console.log("OPS_DEBUG: mission summary calculation effect start");
    console.log("OPS_DEBUG: mission summary effect bypassed");
    setDebugStage("OPS_DEBUG: mission summary effect bypassed");
  }, [
    aiRefreshNonce,
    aiTelemetrySignature,
    hasTelemetry,
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
    refresh,
    setRefreshing,
    setSeverityFilter,
    setCorridorFilter,
    severityFilter,
    corridorFilter,
    corridorOptions,
    corridorFilterOptions: corridorOptions,
    feedData: feeds,
    debugStage,
  };
}
