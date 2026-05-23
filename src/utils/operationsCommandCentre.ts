import { PersistedExecutionSession } from "../services/execution/executionPersistenceService";
import { LiveIntelligenceFeeds } from "../services/liveIntelligenceFeedService";
import { IntelligenceReportResult } from "../services/nexusAIService";
import { RouteOperationalEventRow } from "../services/routeOperationalEventService";
import { TreasuryLiquiditySnapshotRow } from "../services/treasuryIntelligenceService";
import { Transfer } from "../types/transfer";

export type OperationsAlertFilter = "ALL" | "CRITICAL" | "WARNING" | "INFO";
export type OperationsPressure = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type OperationsStatusTone = "healthy" | "warning" | "critical" | "neutral";

export type OperationsKpiItem = {
  key: string;
  label: string;
  value: string;
  delta: string;
  trend: "up" | "down" | "flat";
  tint: string;
  icon: "repeat" | "trending-up" | "clock" | "database" | "alert-triangle";
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

export type OperationsServiceHealth = {
  label: string;
  status: "HEALTHY" | "DEGRADED" | "OFFLINE";
};

export type OperationsInsights = {
  kpis: OperationsKpiItem[];
  corridorRows: OperationsCorridorRow[];
  activeTransfers: OperationsTransferRow[];
  treasurySummary: OperationsTreasurySummary;
  serviceHealth: OperationsServiceHealth[];
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
  if (status === "DEGRADED" || status === "WATCH") return "warning";
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
      forecast: "No treasury telemetry yet",
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
        ? "Watch liquidity buffers for near-term settlement windows"
        : pressure === "MEDIUM"
          ? "Liquidity coverage is stable with moderate monitoring required"
          : "Liquidity coverage supports current transfer load";

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

  const successCurrent = terminalCurrent.length
    ? (terminalCurrent.filter((item) => item.state === "COMPLETED").length / terminalCurrent.length) * 100
    : 0;
  const successPrevious = terminalPrevious.length
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
    transfersCurrent.length > 0 && successCurrent === 0 && completedTransferCount > 0
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
        label: "Settlement Time",
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
        tint: getAlertColor(highestSeverity),
        icon: "alert-triangle",
      },
    ],
    successRateAnomaly,
  };
}

export function buildServiceHealth(params: {
  alerts: RouteOperationalEventRow[];
  treasuryPressure: OperationsPressure;
  fxFeedCount: number;
  marketOpenCount: number;
  missionSummary: IntelligenceReportResult | null;
  missionSummaryLoading: boolean;
  aiEnabled: boolean;
  realtimeStatus: string;
}): OperationsServiceHealth[] {
  const criticalAlerts = params.alerts.filter((item) => mapEventToAlertFilter(item) === "CRITICAL").length;
  const warningAlerts = params.alerts.filter((item) => mapEventToAlertFilter(item) === "WARNING").length;

  const routingStatus = criticalAlerts > 1 ? "OFFLINE" : warningAlerts > 0 ? "DEGRADED" : "HEALTHY";
  const treasuryStatus =
    params.treasuryPressure === "CRITICAL"
      ? "OFFLINE"
      : params.treasuryPressure === "HIGH"
        ? "DEGRADED"
        : "HEALTHY";
  const fxStatus = params.fxFeedCount > 0 ? "HEALTHY" : "OFFLINE";
  const marketStatus = params.marketOpenCount > 0 ? "HEALTHY" : "DEGRADED";
  const aiStatus = params.aiEnabled
    ? params.missionSummary
      ? "HEALTHY"
      : params.missionSummaryLoading
        ? "DEGRADED"
        : "OFFLINE"
    : "DEGRADED";
  const executionStatus = params.realtimeStatus === "Live" ? "HEALTHY" : "DEGRADED";

  return [
    { label: "Platform Status", status: executionStatus },
    { label: "Network Status", status: routingStatus },
    { label: "Liquidity Status", status: treasuryStatus },
    { label: "Markets Status", status: marketStatus },
    { label: "AI Monitoring Status", status: aiStatus },
    { label: "FX Feed Service", status: fxStatus },
    { label: "Notification Service", status: criticalAlerts > 2 ? "DEGRADED" : "HEALTHY" },
  ];
}

export function buildMissionControlStatus(params: {
  kpis: OperationsKpiItem[];
  treasurySummary: OperationsTreasurySummary;
  serviceHealth: OperationsServiceHealth[];
  missionSummaryLoading: boolean;
  missionSummary: IntelligenceReportResult | null;
  aiEnabled: boolean;
  successRateAnomaly?: string;
}): OperationsMissionStatus {
  const platformStatus =
    params.serviceHealth.find((item) => item.label === "Platform Status")?.status ?? "DEGRADED";
  const networkStatus =
    params.serviceHealth.find((item) => item.label === "Network Status")?.status ?? "DEGRADED";
  const liquidityStatus =
    params.serviceHealth.find((item) => item.label === "Liquidity Status")?.status ?? "DEGRADED";
  const marketsStatus =
    params.serviceHealth.find((item) => item.label === "Markets Status")?.status ?? "DEGRADED";
  const aiMonitoringStatus =
    params.serviceHealth.find((item) => item.label === "AI Monitoring Status")?.status ?? "DEGRADED";

  const attentionSummary =
    params.successRateAnomaly ??
    (platformStatus === "HEALTHY" && liquidityStatus === "HEALTHY"
      ? "Operations remain stable. Treasury utilisation is under control and the platform is executing normally."
      : networkStatus === "OFFLINE"
        ? "Network conditions require immediate attention. Review corridor failures and routing health."
        : "Mission Control is monitoring operational conditions and highlighting the highest-priority items.");

  return {
    platformStatus,
    networkStatus,
    liquidityStatus,
    marketsStatus,
    aiMonitoringStatus,
    attentionSummary,
    chips: [
      { label: "Platform", value: platformStatus, tone: getMissionTone(platformStatus) },
      { label: "Network", value: networkStatus, tone: getMissionTone(networkStatus) },
      { label: "Liquidity", value: liquidityStatus, tone: getMissionTone(liquidityStatus) },
      { label: "Markets", value: marketsStatus, tone: getMissionTone(marketsStatus) },
      { label: "AI", value: aiMonitoringStatus, tone: getMissionTone(aiMonitoringStatus) },
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
  const serviceHealth = buildServiceHealth({
    alerts: params.events,
    treasuryPressure: treasurySummary.pressure,
    fxFeedCount: params.feeds?.fx.length ?? 0,
    marketOpenCount: params.feeds?.marketHours.filter((item) => item.status === "OPEN").length ?? 0,
    missionSummary: params.missionSummary,
    missionSummaryLoading: params.missionSummaryLoading,
    aiEnabled: params.missionSummaryEnabled,
    realtimeStatus: params.realtimeStatus,
  });
  const missionStatus = buildMissionControlStatus({
    kpis: kpiResult.items,
    treasurySummary,
    serviceHealth,
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
    missionStatus,
    alertOptions,
    transferSuccessAnomaly: kpiResult.successRateAnomaly,
  };
}
