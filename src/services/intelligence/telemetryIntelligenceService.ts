import { supabase } from "../../lib/supabase";

type TransferRow = {
  id: string;
  sender_currency?: string | null;
  sender_amount?: number | null;
  recipient_country?: string | null;
  recipient_currency?: string | null;
  selected_route?: Record<string, any> | null;
  status?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  completed_at?: string | null;
};

type ExecutionSessionRow = {
  id: string;
  transfer_id: string;
  state?: string | null;
  progress_percent?: number | null;
  active_provider?: string | null;
  failover_used?: boolean | null;
  payout_status?: string | null;
  xrpl_status?: string | null;
  human_status?: string | null;
  snapshot?: Record<string, any> | null;
  last_error?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  completed_at?: string | null;
};

type AuditLogRow = {
  id: string;
  transaction_id: string;
  event_type?: string | null;
  status?: string | null;
  message?: string | null;
  metadata?: Record<string, any> | null;
  created_at?: string | null;
};

export type TelemetryInsightSeverity = "INFO" | "WATCH" | "OPPORTUNITY" | "LIMITATION";

export type TelemetryInsight = {
  id: string;
  severity: TelemetryInsightSeverity;
  title: string;
  message: string;
};

export type TelemetryIntelligenceSummary = {
  transferCount: number;
  completedCount: number;
  failedCount: number;
  successRate: number;
  mostActiveCorridor: string;
  highestConfidenceCorridor: string;
  averageRouteScore: number;
  averageRouteConfidence: number;
  xrplUtilisationPercent: number;
  recoveryEventCount: number;
  failoverCount: number;
  pendingAuditCount: number;
  sampleQuality: "LOW" | "EMERGING" | "USEFUL" | "STRONG";
  generatedAt: string;
  insights: TelemetryInsight[];
};

function safeNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function percent(part: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((part / total) * 100);
}

function average(values: number[]) {
  const valid = values.filter((value) => Number.isFinite(value));
  if (valid.length === 0) return 0;
  return Math.round(valid.reduce((sum, value) => sum + value, 0) / valid.length);
}

function getCorridor(row: TransferRow) {
  const source = row.sender_currency ?? "GBP";
  const target = row.recipient_currency ?? row.selected_route?.recipientSnapshot?.currency ?? "UNKNOWN";
  return `${source} → ${target}`;
}

function mostFrequent(values: string[], fallback = "Insufficient data") {
  if (values.length === 0) return fallback;

  const counts = values.reduce<Record<string, number>>((acc, item) => {
    acc[item] = (acc[item] ?? 0) + 1;
    return acc;
  }, {});

  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? fallback;
}

function highestAverageCorridor(transfers: TransferRow[], field: "score" | "routeConfidence") {
  const grouped = transfers.reduce<Record<string, number[]>>((acc, transfer) => {
    const corridor = getCorridor(transfer);
    const value = safeNumber(transfer.selected_route?.[field], 0);
    if (value > 0) {
      acc[corridor] = [...(acc[corridor] ?? []), value];
    }
    return acc;
  }, {});

  const ranked = Object.entries(grouped)
    .map(([corridor, values]) => ({ corridor, score: average(values) }))
    .sort((a, b) => b.score - a.score);

  return ranked[0]?.corridor ?? "Insufficient data";
}

function sampleQuality(count: number): TelemetryIntelligenceSummary["sampleQuality"] {
  if (count >= 100) return "STRONG";
  if (count >= 40) return "USEFUL";
  if (count >= 10) return "EMERGING";
  return "LOW";
}

function buildInsights(input: {
  transferCount: number;
  completedCount: number;
  failedCount: number;
  successRate: number;
  mostActiveCorridor: string;
  highestConfidenceCorridor: string;
  averageRouteScore: number;
  averageRouteConfidence: number;
  xrplUtilisationPercent: number;
  recoveryEventCount: number;
  failoverCount: number;
  pendingAuditCount: number;
  sampleQuality: TelemetryIntelligenceSummary["sampleQuality"];
}) {
  const insights: TelemetryInsight[] = [];

  if (input.transferCount === 0) {
    insights.push({
      id: "no-telemetry",
      severity: "LIMITATION",
      title: "Telemetry history unavailable",
      message:
        "No persisted transfers are available yet. Start running transfers to build orchestration intelligence.",
    });
    return insights;
  }

  insights.push({
    id: "dominant-corridor",
    severity: "INFO",
    title: "Most active corridor detected",
    message: `${input.mostActiveCorridor} is currently the most active corridor in the available transfer history.`,
  });

  if (input.failedCount === 0) {
    insights.push({
      id: "reliability-positive",
      severity: "OPPORTUNITY",
      title: "Execution reliability currently strong",
      message: `No failed transfers were found in the current ${input.transferCount}-transfer telemetry sample.`,
    });
  } else {
    insights.push({
      id: "failure-watch",
      severity: "WATCH",
      title: "Execution failures detected",
      message: `${input.failedCount} failed transfer(s) were found. The orchestration engine should continue monitoring provider and corridor degradation.`,
    });
  }

  if (input.pendingAuditCount > 0) {
    insights.push({
      id: "pending-audit-watch",
      severity: "WATCH",
      title: "Unresolved audit lifecycle events remain",
      message: `${input.pendingAuditCount} pending audit event(s) are still present. This should reduce after the lifecycle resolution fix is exercised by new transfers.`,
    });
  }

  if (input.xrplUtilisationPercent <= 20) {
    insights.push({
      id: "xrpl-selective",
      severity: "INFO",
      title: "XRPL is being used selectively",
      message: `XRPL bridge utilisation is currently ${input.xrplUtilisationPercent}%. The route engine appears to be avoiding blockchain settlement where fiat routing is sufficient.`,
    });
  } else {
    insights.push({
      id: "xrpl-active",
      severity: "OPPORTUNITY",
      title: "XRPL settlement path is active",
      message: `XRPL bridge utilisation is currently ${input.xrplUtilisationPercent}%, giving the engine useful blockchain settlement telemetry.`,
    });
  }

  if (input.recoveryEventCount > 0) {
    insights.push({
      id: "recovery-detected",
      severity: "WATCH",
      title: "Recovery lifecycle activity detected",
      message: `${input.recoveryEventCount} recovery/reconciliation event(s) were found. This is useful telemetry for hardening resumable execution.`,
    });
  }

  if (input.failoverCount > 0) {
    insights.push({
      id: "failover-detected",
      severity: "WATCH",
      title: "Failover activity detected",
      message: `${input.failoverCount} execution session(s) used failover. Provider resilience scoring should be monitored closely.`,
    });
  }

  if (input.sampleQuality === "LOW" || input.sampleQuality === "EMERGING") {
    insights.push({
      id: "sample-size-limitation",
      severity: "LIMITATION",
      title: "Forecasting confidence is still limited",
      message:
        "The telemetry sample is useful for early observations, but not yet large enough for confident day-of-week or monthly corridor forecasting.",
    });
  } else {
    insights.push({
      id: "sample-size-useful",
      severity: "OPPORTUNITY",
      title: "Telemetry volume becoming useful",
      message:
        "The telemetry sample is now large enough to begin comparing corridor behaviour and preparing predictive recommendations.",
    });
  }

  return insights;
}

export async function loadTelemetryIntelligence(): Promise<TelemetryIntelligenceSummary> {
  const generatedAt = new Date().toISOString();

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("No authenticated user available for telemetry intelligence.");
    }

    const [transfersResult, sessionsResult, auditResult] = await Promise.all([
      supabase
        .from("transfers")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("execution_sessions")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(100),
      supabase
        .from("transaction_audit_logs")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(300),
    ]);

    if (transfersResult.error) throw transfersResult.error;
    if (sessionsResult.error) throw sessionsResult.error;
    if (auditResult.error) throw auditResult.error;

    const transfers = (transfersResult.data ?? []) as TransferRow[];
    const sessions = (sessionsResult.data ?? []) as ExecutionSessionRow[];
    const auditLogs = (auditResult.data ?? []) as AuditLogRow[];

    const transferCount = transfers.length;
    const completedCount = transfers.filter((item) => item.status === "COMPLETED").length;
    const failedCount = transfers.filter((item) => item.status === "FAILED").length;
    const successRate = percent(completedCount, Math.max(completedCount + failedCount, transferCount));
    const corridors = transfers.map(getCorridor).filter(Boolean);
    const mostActiveCorridor = mostFrequent(corridors);
    const highestConfidenceCorridor = highestAverageCorridor(transfers, "routeConfidence");
    const averageRouteScore = average(
      transfers.map((item) => safeNumber(item.selected_route?.score, 0)).filter((value) => value > 0)
    );
    const averageRouteConfidence = average(
      transfers
        .map((item) => safeNumber(item.selected_route?.routeConfidence, 0))
        .filter((value) => value > 0)
    );
    const xrplUsed = sessions.filter((item) => item.xrpl_status === "COMPLETED").length;
    const xrplRequired = sessions.filter((item) => item.xrpl_status && item.xrpl_status !== "NOT_REQUIRED").length;
    const xrplUtilisationPercent = percent(xrplUsed, Math.max(sessions.length, xrplRequired));
    const recoveryEventCount = auditLogs.filter((item) => {
      const haystack = `${item.event_type ?? ""} ${item.message ?? ""}`.toLowerCase();
      return haystack.includes("recover") || haystack.includes("reconcil") || haystack.includes("resum");
    }).length;
    const failoverCount = sessions.filter((item) => Boolean(item.failover_used)).length;
    const pendingAuditCount = auditLogs.filter((item) => item.status === "PENDING").length;
    const quality = sampleQuality(transferCount);

    const summaryBase = {
      transferCount,
      completedCount,
      failedCount,
      successRate,
      mostActiveCorridor,
      highestConfidenceCorridor,
      averageRouteScore,
      averageRouteConfidence,
      xrplUtilisationPercent,
      recoveryEventCount,
      failoverCount,
      pendingAuditCount,
      sampleQuality: quality,
      generatedAt,
    };

    return {
      ...summaryBase,
      insights: buildInsights(summaryBase),
    };
  } catch (error) {
    console.warn("Telemetry intelligence load failed", error);

    const fallback = {
      transferCount: 0,
      completedCount: 0,
      failedCount: 0,
      successRate: 0,
      mostActiveCorridor: "Unavailable",
      highestConfidenceCorridor: "Unavailable",
      averageRouteScore: 0,
      averageRouteConfidence: 0,
      xrplUtilisationPercent: 0,
      recoveryEventCount: 0,
      failoverCount: 0,
      pendingAuditCount: 0,
      sampleQuality: "LOW" as const,
      generatedAt,
    };

    return {
      ...fallback,
      insights: [
        {
          id: "telemetry-load-failed",
          severity: "WATCH",
          title: "Telemetry intelligence unavailable",
          message:
            "The intelligence engine could not load persisted telemetry yet. Check Supabase connectivity and table permissions.",
        },
      ],
    };
  }
}
