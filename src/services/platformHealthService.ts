import type { PersistedExecutionSession } from "./execution/executionPersistenceService";
import {
  loadRecentExecutionSessions,
  loadRecoverableExecutionSessions,
} from "./execution/executionPersistenceService";
import { getLiveIntelligenceFeeds, type LiveIntelligenceFeeds } from "./liveIntelligenceFeedService";
import {
  loadRecentRouteOperationalEvents,
  type RouteOperationalEventRow,
} from "./routeOperationalEventService";
import type { TreasuryLiquiditySnapshotRow } from "./treasuryIntelligenceService";
import {
  loadPartnerConnectionTests,
  type PartnerConnectionTestRecord,
} from "./platformAdministrationService";

export type PlatformHealthStatus =
  | "HEALTHY"
  | "DEGRADED"
  | "OFFLINE"
  | "NO_DATA"
  | "DIAGNOSTIC"
  | "DISABLED";

export type PlatformHealthProvenance = "LIVE" | "DERIVED" | "SIMULATED" | "FALLBACK" | "NO_DATA";
export type PlatformHealthConfidence = "HIGH" | "MEDIUM" | "LOW";
export type PlatformHealthDomain =
  | "platform"
  | "network"
  | "liquidity"
  | "ai"
  | "market"
  | "settlement"
  | "partners";

export type PlatformHealthItem = {
  domain: PlatformHealthDomain;
  label: string;
  status: PlatformHealthStatus;
  provenance: PlatformHealthProvenance;
  confidence: PlatformHealthConfidence;
  lastUpdated: string;
  reason: string;
  source: string;
};

export type PlatformHealthSnapshot = {
  domains: Record<PlatformHealthDomain, PlatformHealthItem>;
  lastUpdated: string;
};

type Pressure = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

type BuildPlatformHealthInput = {
  events: RouteOperationalEventRow[];
  snapshots: TreasuryLiquiditySnapshotRow[];
  sessions: PersistedExecutionSession[];
  feeds: LiveIntelligenceFeeds | null;
  aiEnabled: boolean;
  aiLoading: boolean;
  aiSummary: unknown | null;
  realtimeStatus: string;
  partnerConnectionTests?: PartnerConnectionTestRecord[];
  now?: string;
};

type LoadPlatformHealthOptions = {
  aiEnabled: boolean;
  aiLoading?: boolean;
  aiSummary?: unknown | null;
  realtimeStatus?: string;
};

function pressureWeight(pressure: string) {
  if (pressure === "CRITICAL") return 4;
  if (pressure === "HIGH") return 3;
  if (pressure === "MEDIUM") return 2;
  return 1;
}

function pressureFromWeight(weight: number): Pressure {
  if (weight >= 4) return "CRITICAL";
  if (weight >= 3) return "HIGH";
  if (weight >= 2) return "MEDIUM";
  return "LOW";
}

function getSnapshotPressure(snapshot: TreasuryLiquiditySnapshotRow): Pressure {
  const componentPressure = Math.max(
    pressureWeight(snapshot.corridor_pressure),
    pressureWeight(snapshot.partner_pressure),
    pressureWeight(snapshot.rail_pressure)
  );
  const scorePressure =
    snapshot.treasury_score < 55 ? 4 : snapshot.treasury_score < 70 ? 3 : snapshot.treasury_score < 82 ? 2 : 1;

  return pressureFromWeight(Math.max(componentPressure, scorePressure));
}

function countCriticalEvents(events: RouteOperationalEventRow[]) {
  return events.filter((event) => event.severity === "FAILOVER" || event.severity === "DEGRADED").length;
}

function latestTimestamp(...values: (string | null | undefined)[]) {
  const timestamps = values
    .map((value) => (value ? new Date(value).getTime() : 0))
    .filter((value) => Number.isFinite(value) && value > 0);

  if (timestamps.length === 0) return null;
  return new Date(Math.max(...timestamps)).toISOString();
}

function item(input: Omit<PlatformHealthItem, "lastUpdated"> & { lastUpdated?: string }, fallbackTimestamp: string): PlatformHealthItem {
  return {
    ...input,
    lastUpdated: input.lastUpdated ?? fallbackTimestamp,
  };
}

export function buildPlatformHealthSnapshot(input: BuildPlatformHealthInput): PlatformHealthSnapshot {
  const now = input.now ?? new Date().toISOString();
  const criticalEvents = countCriticalEvents(input.events);
  const warningEvents = input.events.filter((event) => event.severity === "WATCH").length;
  const simulatedEvents = input.events.filter((event) => event.status === "SIMULATED").length;
  const latestEventAt = latestTimestamp(...input.events.map((event) => event.created_at));
  const latestSnapshot = [...input.snapshots].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )[0];
  const latestSessionAt = latestTimestamp(...input.sessions.map((session) => session.updated_at ?? session.created_at));
  const marketOpenCount = input.feeds?.marketHours.filter((market) => market.status === "OPEN").length ?? 0;
  const fxFeedCount = input.feeds?.fx.length ?? 0;
  const latestPartnerTest = [...(input.partnerConnectionTests ?? [])].sort(
    (a, b) => new Date(b.testedAt).getTime() - new Date(a.testedAt).getTime()
  )[0];

  const platform = input.realtimeStatus === "Live"
    ? item({
        domain: "platform",
        label: "Platform Health",
        status: "HEALTHY",
        provenance: "LIVE",
        confidence: "MEDIUM",
        reason: "Realtime execution monitoring is connected.",
        source: "execution realtime subscription",
        lastUpdated: latestSessionAt ?? now,
      }, now)
    : item({
        domain: "platform",
        label: "Platform Health",
        status: "DIAGNOSTIC",
        provenance: "NO_DATA",
        confidence: "HIGH",
        reason: "Realtime monitoring is intentionally disabled in diagnostic mode.",
        source: "useOperationsCommandCentre realtime diagnostic state",
        lastUpdated: latestSessionAt ?? now,
      }, now);

  const networkStatus: PlatformHealthStatus =
    input.events.length === 0 ? "NO_DATA" : criticalEvents > 0 || warningEvents > 0 ? "DEGRADED" : "HEALTHY";
  const network = item({
    domain: "network",
    label: "Network Health",
    status: networkStatus,
    provenance: input.events.length === 0 ? "NO_DATA" : simulatedEvents > 0 ? "SIMULATED" : "DERIVED",
    confidence: input.events.length === 0 ? "LOW" : simulatedEvents > 0 ? "LOW" : "MEDIUM",
    reason:
      input.events.length === 0
        ? "No route operational event telemetry is available."
        : simulatedEvents > 0
          ? `${criticalEvents} critical and ${warningEvents} warning route events loaded; at least one event is simulated.`
          : `${criticalEvents} critical and ${warningEvents} warning route events loaded.`,
    source: "route_operational_events",
    lastUpdated: latestEventAt ?? now,
  }, now);

  const pressure = latestSnapshot ? getSnapshotPressure(latestSnapshot) : null;
  const liquidityStatus: PlatformHealthStatus =
    !latestSnapshot ? "NO_DATA" : pressure === "HIGH" || pressure === "CRITICAL" ? "DEGRADED" : "HEALTHY";
  const liquidity = item({
    domain: "liquidity",
    label: "Liquidity Health",
    status: liquidityStatus,
    provenance: latestSnapshot ? "SIMULATED" : "NO_DATA",
    confidence: latestSnapshot ? "LOW" : "LOW",
    reason: latestSnapshot
      ? `Latest corridor liquidity pressure is ${pressure}; source snapshots are profile-derived until live liquidity integrations exist.`
      : "No corridor liquidity snapshot telemetry is available.",
    source: "treasury_liquidity_snapshots profile-derived corridor liquidity records",
    lastUpdated: latestSnapshot?.created_at ?? now,
  }, now);

  const ai = item({
    domain: "ai",
    label: "AI Health",
    status: !input.aiEnabled ? "DISABLED" : input.aiLoading ? "DEGRADED" : input.aiSummary ? "HEALTHY" : "NO_DATA",
    provenance: !input.aiEnabled ? "NO_DATA" : input.aiSummary ? "DERIVED" : "FALLBACK",
    confidence: input.aiSummary ? "MEDIUM" : "HIGH",
    reason: !input.aiEnabled
      ? "AI intelligence is disabled for this screen."
      : input.aiLoading
        ? "AI summary request is in progress."
        : input.aiSummary
          ? "AI summary has returned for the current telemetry set."
          : "No AI summary is available; local fallback or no-data messaging should be used.",
    source: "nexus-ai screen setting and summary state",
  }, now);

  const market = item({
    domain: "market",
    label: "Market Health",
    status: input.feeds ? (marketOpenCount > 0 ? "HEALTHY" : "NO_DATA") : "NO_DATA",
    provenance: input.feeds ? "DERIVED" : "NO_DATA",
    confidence: "LOW",
    reason: input.feeds
      ? `${marketOpenCount} fixed market window(s) currently open; this is not a banking-calendar feed.`
      : "No market window feed data is available.",
    source: "fixed local-hour market window calculation",
    lastUpdated: input.feeds?.refreshedAt ?? now,
  }, now);

  const completedSessions = input.sessions.filter((session) => session.state === "COMPLETED");
  const failedSessions = input.sessions.filter((session) => session.state === "FAILED");
  const settlement = item({
    domain: "settlement",
    label: "Settlement Health",
    status:
      completedSessions.length + failedSessions.length === 0
        ? "NO_DATA"
        : failedSessions.length > completedSessions.length
          ? "DEGRADED"
          : "HEALTHY",
    provenance: completedSessions.length + failedSessions.length === 0 ? "NO_DATA" : "DERIVED",
    confidence: completedSessions.length + failedSessions.length === 0 ? "LOW" : "MEDIUM",
    reason:
      completedSessions.length + failedSessions.length === 0
        ? "No terminal execution sessions are available for settlement health."
        : `${completedSessions.length} completed and ${failedSessions.length} failed terminal execution sessions loaded.`,
    source: "execution_sessions",
    lastUpdated: latestSessionAt ?? now,
  }, now);

  const partners = item({
    domain: "partners",
    label: "Partner APIs",
    status: !latestPartnerTest
      ? "NO_DATA"
      : latestPartnerTest.status === "SUCCESS"
        ? "HEALTHY"
        : latestPartnerTest.status === "SKIPPED"
          ? "NO_DATA"
          : "DEGRADED",
    provenance: !latestPartnerTest ? "NO_DATA" : latestPartnerTest.status === "SUCCESS" ? "LIVE" : "DERIVED",
    confidence: !latestPartnerTest ? "LOW" : latestPartnerTest.status === "SUCCESS" ? "HIGH" : "MEDIUM",
    reason: !latestPartnerTest
      ? "No partner connection tests have been recorded."
      : latestPartnerTest.status === "SUCCESS"
        ? `${latestPartnerTest.providerId} connection test succeeded in ${latestPartnerTest.responseTimeMs ?? 0}ms.`
        : latestPartnerTest.responseSummary ?? latestPartnerTest.errorMessage ?? "Latest partner connection test did not confirm live connectivity.",
    source: "partner_connection_tests",
    lastUpdated: latestPartnerTest?.testedAt ?? now,
  }, now);

  if (fxFeedCount === 0 && market.status === "HEALTHY") {
    market.reason = `${market.reason} FX feed rows are unavailable, so confidence remains low.`;
    market.confidence = "LOW";
  }

  return {
    domains: {
      platform,
      network,
      liquidity,
      ai,
      market,
      settlement,
      partners,
    },
    lastUpdated: now,
  };
}

export async function loadPlatformHealthSnapshot(options: LoadPlatformHealthOptions): Promise<PlatformHealthSnapshot> {
  const [events, recoverableSessions, recentSessions, feeds, partnerConnectionTests] = await Promise.all([
    loadRecentRouteOperationalEvents(60),
    loadRecoverableExecutionSessions(),
    loadRecentExecutionSessions(60),
    getLiveIntelligenceFeeds(),
    loadPartnerConnectionTests(10),
  ]);

  const sessionMap = new Map<string, PersistedExecutionSession>();
  [...recoverableSessions, ...recentSessions].forEach((session) => {
    sessionMap.set(session.id, session);
  });

  return buildPlatformHealthSnapshot({
    events: events.filter((event) => event.status !== "SIMULATED"),
    snapshots: [],
    sessions: Array.from(sessionMap.values()),
    feeds,
    aiEnabled: options.aiEnabled,
    aiLoading: options.aiLoading ?? false,
    aiSummary: options.aiSummary ?? null,
    realtimeStatus: options.realtimeStatus ?? "Diagnostic Mode",
    partnerConnectionTests,
  });
}

export function getPlatformHealthDomain(
  snapshot: PlatformHealthSnapshot | null | undefined,
  domain: PlatformHealthDomain
): PlatformHealthItem | null {
  return snapshot?.domains[domain] ?? null;
}
