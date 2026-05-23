import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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

const AI_MIN_REFRESH_INTERVAL_MS = 30_000;

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
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [realtimeStatus, setRealtimeStatus] = useState("Connecting");
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string>(new Date().toISOString());
  const [feedsRefreshedAt, setFeedsRefreshedAt] = useState<string | null>(null);
  const [missionSummary, setMissionSummary] = useState<IntelligenceReportResult | null>(null);
  const [missionSummaryLoading, setMissionSummaryLoading] = useState(false);
  const [missionSummaryStatus, setMissionSummaryStatus] = useState("Waiting for telemetry");
  const [aiRefreshNonce, setAiRefreshNonce] = useState(0);
  const [severityFilter, setSeverityFilter] = useState<OperationsAlertFilter>("ALL");
  const [corridorFilter, setCorridorFilter] = useState("ALL");
  const isMountedRef = useRef(true);
  const aiInFlightRef = useRef(false);
  const aiLastRunAtRef = useRef(0);
  const aiRequestIdRef = useRef(0);
  const aiLastSignatureRef = useRef<string>("");
  const aiLastManualNonceRef = useRef(0);
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

    try {
      const [snapshotData, eventData, sessionData, transferData, feedData] = await Promise.all([
        loadRecentTreasurySnapshots(60),
        loadRecentRouteOperationalEvents(60),
        loadRecoverableExecutionSessions(),
        loadCompletedTransfers(),
        getLiveIntelligenceFeeds(),
      ]);

      if (!isMountedRef.current) return;

      console.log("OPS_DEBUG: telemetry loaded", {
        snapshots: snapshotData.length,
        events: eventData.length,
        sessions: sessionData.length,
        transfers: transferData.length,
        hasFeeds: Boolean(feedData),
      });

      setSnapshots(snapshotData);
      setEvents(eventData);
      setSessions((current) => sessionData.reduce(upsertSession, current));
      setTransfers(transferData);
      setFeeds(feedData ?? null);
      setFeedsRefreshedAt(feedData?.refreshedAt ?? null);
      setLastUpdatedAt(new Date().toISOString());
    } catch (error) {
      console.warn("OPS_DEBUG: telemetry loading failed", error);
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

  useEffect(() => {
    const unsubscribe = subscribeToRecentExecutionSessions({
      onSession: (session) => {
        console.log("OPS_DEBUG: subscription onSession start", {
          sessionId: session.id,
          state: session.state,
          transferId: session.transfer_id,
        });

        if (!isMountedRef.current) return;
        setRealtimeStatus("Live");
        setSessions((current) => upsertSession(current, session));

        console.log("OPS_DEBUG: subscription onSession complete", {
          sessionId: session.id,
          state: session.state,
        });
      },
      onError: () => {
        console.warn("OPS_DEBUG: subscription onError callback");
        if (!isMountedRef.current) return;
        setRealtimeStatus("Polling");
      },
    });

    console.log("OPS_DEBUG: realtime subscription active");

    return () => {
      console.log("OPS_DEBUG: realtime subscription cleanup");
      unsubscribe();
    };
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
  }, [events, feeds, missionSummary, missionSummaryLoading, operationsAIEnabled, realtimeStatus, sessions, snapshots, transfers]);

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

    async function generateMissionSummary() {
      if (!operationsAIEnabled) {
        console.log("OPS_DEBUG: mission summary skipped - AI disabled");
        aiRequestIdRef.current += 1;
        aiInFlightRef.current = false;
        aiLastSignatureRef.current = "";

        if (!isMountedRef.current) return;
        setMissionSummary(null);
        setMissionSummaryLoading(false);
        setMissionSummaryStatus("Nexus AI disabled for this screen");
        return;
      }

      if (!hasTelemetry) {
        console.log("OPS_DEBUG: mission summary skipped - waiting for telemetry");
        if (isMountedRef.current) {
          setMissionSummaryStatus("Waiting for telemetry");
        }
        return;
      }

      const manualRefreshRequested = aiRefreshNonce !== aiLastManualNonceRef.current;
      if (manualRefreshRequested) {
        aiLastManualNonceRef.current = aiRefreshNonce;
      }

      const now = Date.now();
      const throttled =
        !manualRefreshRequested &&
        now - aiLastRunAtRef.current < AI_MIN_REFRESH_INTERVAL_MS;

      if (throttled || aiInFlightRef.current) {
        console.log("OPS_DEBUG: mission summary skipped - throttled or in flight", {
          throttled,
          inFlight: aiInFlightRef.current,
        });
        if (isMountedRef.current) {
          setMissionSummaryStatus("AI refresh throttled");
        }
        return;
      }

      if (!manualRefreshRequested && aiTelemetrySignature === aiLastSignatureRef.current) {
        console.log("OPS_DEBUG: mission summary skipped - signature unchanged");
        return;
      }

      aiInFlightRef.current = true;
      aiLastRunAtRef.current = now;
      aiLastSignatureRef.current = aiTelemetrySignature;
      aiRequestIdRef.current += 1;
      const requestId = aiRequestIdRef.current;

      if (isMountedRef.current) {
        setMissionSummaryLoading(true);
        setMissionSummaryStatus("Waiting for telemetry");
      }

      try {
        console.log("OPS_DEBUG: mission summary calculation start", {
          requestId,
          sensitivity: settings?.sensitivity ?? "balanced",
        });

        const result = await generateIntelligenceReport(
          {
            reportType: "corridor_analysis",
            focus: "Operations command centre mission health",
            telemetry: aiTelemetryRef.current,
          },
          settings?.sensitivity ?? "balanced",
          { timeoutMs: 7000, maxRetries: 1 }
        );

        if (!isMountedRef.current || requestId !== aiRequestIdRef.current || !operationsAIEnabled) {
          return;
        }

        if (result.ok) {
          console.log("OPS_DEBUG: mission summary calculation complete", {
            requestId,
            ok: true,
          });
          setMissionSummary(result.data);
          setMissionSummaryStatus("Live Nexus AI interpretation");
        } else {
          console.warn("OPS_DEBUG: mission summary calculation unavailable", {
            requestId,
            ok: false,
          });
          setMissionSummary(null);
          setMissionSummaryStatus("Nexus AI temporarily unavailable");
        }
      } catch (error) {
        if (!isMountedRef.current || requestId !== aiRequestIdRef.current || !operationsAIEnabled) {
          return;
        }

        console.warn("OPS_DEBUG: mission summary calculation failed", {
          requestId,
          error,
        });
        console.warn("[Operations] Failed to generate mission summary", error);
        setMissionSummary(null);
        setMissionSummaryStatus("Nexus AI temporarily unavailable");
      } finally {
        console.log("OPS_DEBUG: mission summary calculation complete (finally)", {
          requestId,
        });
        if (requestId === aiRequestIdRef.current) {
          aiInFlightRef.current = false;
        }

        if (isMountedRef.current && requestId === aiRequestIdRef.current) {
          setMissionSummaryLoading(false);
        }
      }
    }

    void generateMissionSummary();
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
  };
}
