import { PersistedExecutionSession } from "../services/execution/executionPersistenceService";
import { LiveIntelligenceFeeds } from "../services/liveIntelligenceFeedService";
import { IntelligenceReportResult } from "../services/nexusAIService";
import {
  buildPlatformHealthSnapshot,
  type PlatformHealthItem,
  type PlatformHealthSnapshot,
} from "../services/platformHealthService";
import type { PartnerConnectionTestRecord } from "../services/platformAdministrationService";
import { RouteOperationalEventRow } from "../services/routeOperationalEventService";
import { TreasuryLiquiditySnapshotRow } from "../services/treasuryIntelligenceService";
import { Transfer } from "../types/transfer";

export type OperationsAlertFilter = "ALL" | "CRITICAL" | "WARNING" | "INFO";
export type OperationsPressure = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type OperationsStatusTone = "healthy" | "warning" | "critical" | "neutral";
export type DataProvenanceClassification =
  | "LIVE"
  | "DERIVED"
  | "SIMULATED"
  | "MOCK"
  | "FALLBACK"
  | "NO_DATA"
  | "DIAGNOSTIC"
  | "DISABLED";

export type OperationsKpiItem = {
  key: string;
  label: string;
  value: string;
  delta: string;
  trend: "up" | "down" | "flat";
  tint: string;
  icon: "repeat" | "trending-up" | "clock" | "database" | "alert-triangle";
  provenance: DataProvenanceClassification;
};

export type OperationsCorridorRow = {
  corridor: string;
  score: number;
  trend: number;
  capacity: number;
  status: "HEALTHY" | "DEGRADED" | "AT_RISK";
  pressure: OperationsPressure;
};

export type OperationsTransferRow = {
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

export type OperationsStatusChip = {
  label: string;
  value: string;
  tone: OperationsStatusTone;
  detail?: string;
};

export type OperationsMissionStatus = {
  platformStatus: string;
  networkStatus: string;
  liquidityStatus: string;
  marketsStatus: string;
  aiMonitoringStatus: string;
  attentionSummary: string;
  chips: OperationsStatusChip[];
};

export type OperationsTreasurySummary = {
  utilization: number;
  availableCapacity: number;
  pressure: OperationsPressure;
  forecast: string;
  currencyDistribution: { currency: string; amount: number; percentage: number }[];
};

export type OperationsServiceHealth = PlatformHealthItem;

export type OperationsInsights = {
  kpis: OperationsKpiItem[];
  corridorRows: OperationsCorridorRow[];
  activeTransfers: OperationsTransferRow[];
  treasurySummary: OperationsTreasurySummary;
  serviceHealth: OperationsServiceHealth[];
  platformHealth: PlatformHealthSnapshot;
  missionStatus: OperationsMissionStatus;
  alertOptions: OperationsAlertFilter[];
  transferSuccessAnomaly?: string;
};

export type OperationsLiveState = {
  snapshots: TreasuryLiquiditySnapshotRow[];
  events: RouteOperationalEventRow[];
  transfers: Transfer[];
  sessions: PersistedExecutionSession[];
  feeds: LiveIntelligenceFeeds | null;
  missionSummary: IntelligenceReportResult | null;
  missionSummaryLoading: boolean;
  missionSummaryEnabled: boolean;
  realtimeStatus: string;
  partnerConnectionTests?: PartnerConnectionTestRecord[];
};

function getPressureWeight(pressure: string) {
  if (pressure === "CRITICAL") return 4;
  if (pressure === "HIGH") return 3;
  if (pressure === "MEDIUM") return 2;
  return 1;
}

function getPressureFromWeight(weight: number): OperationsPressure {
  if (weight >= 4) return "CRITICAL";
  if (weight >= 3) return "HIGH";
  if (weight >= 2) return "MEDIUM";
  return "LOW";
}

export function getOverallOperationalPressure(
  item: TreasuryLiquiditySnapshotRow
): OperationsPressure {
  const componentPressure = Math.max(
    getPressureWeight(item.corridor_pressure),
    getPressureWeight(item.partner_pressure),
    getPressureWeight(item.rail_pressure)
  );

  const scorePressure = item.treasury_score < 55 ? 4 : item.treasury_score < 70 ? 3 : item.treasury_score < 82 ? 2 : 1;
  return getPressureFromWeight(Math.max(componentPressure, scorePressure));
}

export function formatDelta(delta: number, suffix = "") {
  const rounded = Math.abs(delta) < 10 ? delta.toFixed(1) : Math.round(delta).toString();
  return `${delta >= 0 ? "+" : ""}${rounded}${suffix}`;
}

export function trendFromDelta(delta: number): "up" | "down" | "flat" {
  if (delta > 0) return "up";
  if (delta < 0) return "down";
  return "flat";
}

export function mapEventToAlertFilter(event: RouteOperationalEventRow): OperationsAlertFilter {
  if (event.severity === "FAILOVER" || event.severity === "DEGRADED") return "CRITICAL";
  if (event.severity === "WATCH") return "WARNING";
  return "INFO";
}

export function getAlertColor(level: OperationsAlertFilter) {
  if (level === "CRITICAL") return "#DC2626";
  if (level === "WARNING") return "#D97706";
  return "#2563EB";
}

function getMissionTone(status: string): OperationsStatusTone {
  if (status === "CRITICAL" || status === "OFFLINE") return "critical";
  if (status === "DEGRADED" || status === "WATCH" || status === "DIAGNOSTIC") return "warning";
  if (status === "HEALTHY" || status === "LIVE") return "healthy";
  return "neutral";
}

function toTransferMap(transfers: Transfer[]) {
  const map = new Map<string, Transfer>();
  transfers.forEach((item) => map.set(item.id, item));
  return map;
}

export function buildCorridorRows(snapshots: TreasuryLiquiditySnapshotRow[]): OperationsCorridorRow[] {
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
      const status: OperationsCorridorRow["status"] =
        latest.treasury_score >= 82 && pressure !== "CRITICAL"
          ? "HEALTHY"
          : latest.treasury_score >= 65
            ? "DEGRADED"
            : "AT_RISK";

      return { corridor, score: latest.treasury_score, trend, capacity, status, pressure };
    })
    .sort((a, b) => b.score - a.score);
}

export function buildActiveTransfers(
  sessions: PersistedExecutionSession[],
  transfers: Transfer[]
): OperationsTransferRow[] {
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

export function buildTreasurySummary(
  snapshots: TreasuryLiquiditySnapshotRow[],
  transfers: Transfer[]
): OperationsTreasurySummary {
  if (snapshots.length === 0) {
    const distribution = Array.from(
      transfers.reduce((map, transfer) => {
        map.set(transfer.senderCurrency, (map.get(transfer.senderCurrency) ?? 0) + transfer.senderAmount);
        return map;
      }, new Map<string, number>()).entries()
    ).map(([currency, amount]) => ({ currency, amount, percentage: 0 }));

    return {
      utilization: 0,
      availableCapacity: 0,
      pressure: "LOW",
      forecast: "No corridor liquidity telemetry yet",
      currencyDistribution: distribution,
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
        ? "Watch corridor liquidity for near-term settlement windows"
        : pressure === "MEDIUM"
          ? "Corridor liquidity is stable with moderate monitoring required"
          : "Corridor liquidity supports current transfer load";

  const grouped = new Map<string, number>();
  transfers.forEach((transfer) => {
    grouped.set(transfer.senderCurrency, (grouped.get(transfer.senderCurrency) ?? 0) + transfer.senderAmount);
  });
  const total = Array.from(grouped.values()).reduce((sum, value) => sum + value, 0);
  const currencyDistribution = Array.from(grouped.entries())
    .map(([currency, amount]) => ({
      currency,
      amount,
      percentage: total > 0 ? Math.round((amount / total) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  return { utilization, availableCapacity, pressure, forecast, currencyDistribution };
}

export function buildKpis(params: {
  transfers: Transfer[];
  sessions: PersistedExecutionSession[];
  snapshots: TreasuryLiquiditySnapshotRow[];
  events: RouteOperationalEventRow[];
}): {
  items: OperationsKpiItem[];
  successRateAnomaly?: string;
} {
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

  const hasCurrentTerminalData = terminalCurrent.length > 0;
  const hasPreviousTerminalData = terminalPrevious.length > 0;
  const successCurrent = hasCurrentTerminalData
    ? (terminalCurrent.filter((item) => item.state === "COMPLETED").length / terminalCurrent.length) * 100
    : 0;
  const successPrevious = hasPreviousTerminalData
    ? (terminalPrevious.filter((item) => item.state === "COMPLETED").length / terminalPrevious.length) * 100
    : 0;

  const completedCurrent = terminalCurrent.filter((item) => item.state === "COMPLETED");
  const completedPrevious = terminalPrevious.filter((item) => item.state === "COMPLETED");

  const settlementSeconds = (items: PersistedExecutionSession[]) => {
    if (!items.length) return 0;
    const avgMs =
      items.reduce((sum, item) => {
        const created = new Date(item.created_at ?? item.updated_at ?? 0).getTime();
        const updated = new Date(item.updated_at ?? item.created_at ?? 0).getTime();
        return sum + Math.max(0, updated - created);
      }, 0) / items.length;
    return Math.round(avgMs / 1000);
  };

  const settlementCurrent = settlementSeconds(completedCurrent);
  const settlementPrevious = settlementSeconds(completedPrevious);
  const hasSettlementData = completedCurrent.length > 0;

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
  }, "INFO" as OperationsAlertFilter);

  const transferDelta = transfersCurrent.length - transfersPrevious.length;
  const successDelta = successCurrent - successPrevious;
  const settlementDelta = settlementPrevious - settlementCurrent;
  const capacityDelta = avgCapacity - previousCapacity;

  const completedTransferCount = params.sessions.filter((item) => item.state === "COMPLETED").length;
  const successRateAnomaly =
    hasCurrentTerminalData && transfersCurrent.length > 0 && successCurrent === 0 && completedTransferCount > 0
      ? "Transfer state mapping should be reviewed: 24h transfers exist while execution sessions report 0% success."
      : undefined;

  return {
    items: [
      {
        key: "transfers",
        label: "Transfers (24h)",
        value: transfersCurrent.length.toLocaleString(),
        delta: `${formatDelta(transferDelta)} vs prev`,
        trend: trendFromDelta(transferDelta),
        tint: "#F59E0B",
        icon: "repeat",
        provenance: "DERIVED",
      },
      {
        key: "success",
        label: "Success Rate",
        value: hasCurrentTerminalData ? `${successCurrent.toFixed(2)}%` : "Insufficient data",
        delta: hasCurrentTerminalData
          ? hasPreviousTerminalData
            ? `${formatDelta(successDelta, "%")}`
            : "No previous terminal data"
          : "No terminal executions",
        trend: trendFromDelta(successDelta),
        tint: "#16A34A",
        icon: "trending-up",
        provenance: "DERIVED",
      },
      {
        key: "settlement",
        label: "Settlement Time",
        value: hasSettlementData ? `${settlementCurrent}s` : "Insufficient data",
        delta: hasSettlementData
          ? completedPrevious.length > 0
            ? `${formatDelta(settlementDelta, "s")}`
            : "No previous completed data"
          : "No completed executions",
        trend: trendFromDelta(settlementDelta),
        tint: "#2563EB",
        icon: "clock",
        provenance: "DERIVED",
      },
      {
        key: "route-capacity",
        label: "Corridor Liquidity Capacity",
        value: `${Math.round(avgCapacity)}%`,
        delta: `${formatDelta(capacityDelta, "%")}`,
        trend: trendFromDelta(capacityDelta),
        tint: "#7C3AED",
        icon: "database",
        provenance: "SIMULATED",
      },
      {
        key: "alerts",
        label: "Active Alerts",
        value: String(activeAlerts.length),
        delta: `Highest: ${highestSeverity}`,
        trend: highestSeverity === "CRITICAL" ? "down" : highestSeverity === "WARNING" ? "flat" : "up",
        tint: getAlertColor(highestSeverity),
        icon: "alert-triangle",
        provenance: "SIMULATED",
      },
    ],
    successRateAnomaly,
  };
}

export function buildServiceHealth(params: {
  events: RouteOperationalEventRow[];
  snapshots: TreasuryLiquiditySnapshotRow[];
  sessions: PersistedExecutionSession[];
  feeds: LiveIntelligenceFeeds | null;
  missionSummary: IntelligenceReportResult | null;
  missionSummaryLoading: boolean;
  aiEnabled: boolean;
  realtimeStatus: string;
  partnerConnectionTests?: PartnerConnectionTestRecord[];
}): PlatformHealthSnapshot {
  return buildPlatformHealthSnapshot({
    events: params.events,
    snapshots: params.snapshots,
    sessions: params.sessions,
    feeds: params.feeds,
    aiEnabled: params.aiEnabled,
    aiLoading: params.missionSummaryLoading,
    aiSummary: params.missionSummary,
    realtimeStatus: params.realtimeStatus,
    partnerConnectionTests: params.partnerConnectionTests,
  });
}

export function buildMissionControlStatus(params: {
  kpis: OperationsKpiItem[];
  treasurySummary: OperationsTreasurySummary;
  platformHealth: PlatformHealthSnapshot;
  missionSummaryLoading: boolean;
  missionSummary: IntelligenceReportResult | null;
  aiEnabled: boolean;
  successRateAnomaly?: string;
}): OperationsMissionStatus {
  const platformHealth = params.platformHealth.domains.platform;
  const networkHealth = params.platformHealth.domains.network;
  const liquidityHealth = params.platformHealth.domains.liquidity;
  const marketHealth = params.platformHealth.domains.market;
  const aiHealth = params.platformHealth.domains.ai;

  const attentionSummary =
    params.successRateAnomaly ??
    (platformHealth.status === "HEALTHY" && liquidityHealth.status === "HEALTHY"
      ? "Operations remain stable. Corridor liquidity is under control and the platform is executing normally."
      : networkHealth.status === "NO_DATA"
        ? "Mission Control has no route network telemetry available. Review source availability before interpreting health."
        : "Mission Control is monitoring operational conditions and highlighting the highest-priority items.");

  return {
    platformStatus: platformHealth.status,
    networkStatus: networkHealth.status,
    liquidityStatus: liquidityHealth.status,
    marketsStatus: marketHealth.status,
    aiMonitoringStatus: aiHealth.status,
    attentionSummary,
    chips: [
      { label: "Platform", value: platformHealth.status, tone: getMissionTone(platformHealth.status), detail: platformHealth.provenance },
      { label: "Network", value: networkHealth.status, tone: getMissionTone(networkHealth.status), detail: networkHealth.provenance },
      { label: "Liquidity", value: liquidityHealth.status, tone: getMissionTone(liquidityHealth.status), detail: liquidityHealth.provenance },
      { label: "Markets", value: marketHealth.status, tone: getMissionTone(marketHealth.status), detail: marketHealth.provenance },
      { label: "AI", value: aiHealth.status, tone: getMissionTone(aiHealth.status), detail: aiHealth.provenance },
    ],
  };
}

export function buildOperationsInsights(params: OperationsLiveState): OperationsInsights {
  const corridorRows = buildCorridorRows(params.snapshots);
  const activeTransfers = buildActiveTransfers(params.sessions, params.transfers);
  const treasurySummary = buildTreasurySummary(params.snapshots, params.transfers);
  const kpiResult = buildKpis({
    transfers: params.transfers,
    sessions: params.sessions,
    snapshots: params.snapshots,
    events: params.events,
  });
  const platformHealth = buildServiceHealth({
    events: params.events,
    snapshots: params.snapshots,
    sessions: params.sessions,
    feeds: params.feeds,
    missionSummary: params.missionSummary,
    missionSummaryLoading: params.missionSummaryLoading,
    aiEnabled: params.missionSummaryEnabled,
    realtimeStatus: params.realtimeStatus,
    partnerConnectionTests: params.partnerConnectionTests,
  });
  const serviceHealth = Object.values(platformHealth.domains);
  const missionStatus = buildMissionControlStatus({
    kpis: kpiResult.items,
    treasurySummary,
    platformHealth,
    missionSummaryLoading: params.missionSummaryLoading,
    missionSummary: params.missionSummary,
    aiEnabled: params.missionSummaryEnabled,
    successRateAnomaly: kpiResult.successRateAnomaly,
  });
  const alertOptions = ["ALL", ...Array.from(new Set(params.events.map((event) => mapEventToAlertFilter(event))))] as OperationsAlertFilter[];

  return {
    kpis: kpiResult.items,
    corridorRows,
    activeTransfers,
    treasurySummary,
    serviceHealth,
    platformHealth,
    missionStatus,
    alertOptions,
    transferSuccessAnomaly: kpiResult.successRateAnomaly,
  };
}
