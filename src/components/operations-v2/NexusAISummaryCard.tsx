import { Feather } from "@expo/vector-icons";
import React from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import type { IntelligenceReportResult } from "../../services/nexusAIService";
import { colors, spacing } from "../../theme";
import type {
    OperationsCorridorRow,
    OperationsKpiItem,
    OperationsServiceHealth,
    OperationsTreasurySummary,
} from "../../utils/operationsCommandCentre";
import { AppCard } from "../ui/AppCard";
import { AppText } from "../ui/AppText";
import { DataProvenanceBadge } from "./DataProvenanceBadge";

type Props = {
  missionSummary: IntelligenceReportResult | null | undefined;
  missionSummaryLoading: boolean;
  missionSummaryStatus: string;
  operationsAIEnabled: boolean;
  nexusAILoading: boolean;
  // Fallback dashboard data — used to generate local summary when AI service is unavailable
  corridorRows?: OperationsCorridorRow[] | null;
  treasurySummary?: OperationsTreasurySummary | null;
  serviceHealth?: OperationsServiceHealth[] | null;
  kpis?: OperationsKpiItem[] | null;
  alertCount?: number;
  criticalAlertCount?: number;
  showDataSources?: boolean;
};

/**
 * Generates a plain-language operational summary from available dashboard data
 * when the AI service has not returned a result (e.g. diagnostically bypassed,
 * throttled, or awaiting first telemetry).
 */
function buildFallbackSummary(props: {
  corridorRows: OperationsCorridorRow[];
  treasurySummary: OperationsTreasurySummary | null;
  serviceHealth: OperationsServiceHealth[];
  kpis: OperationsKpiItem[];
  alertCount: number;
  criticalAlertCount: number;
}): { summary: string; findings: string[] } {
  const { corridorRows, treasurySummary, serviceHealth, kpis, alertCount, criticalAlertCount } = props;

  const sentences: string[] = [];
  const findings: string[] = [];

  // Corridors
  const corridorCount = corridorRows.length;
  if (corridorCount > 0) {
    const healthy = corridorRows.filter((c) => c.status === "HEALTHY").length;
    const degraded = corridorRows.filter((c) => c.status === "DEGRADED").length;
    const atRisk = corridorRows.filter((c) => c.status === "AT_RISK").length;
    sentences.push(`${corridorCount} corridor${corridorCount !== 1 ? "s" : ""} monitored.`);
    if (atRisk > 0) {
      const names = corridorRows.filter((c) => c.status === "AT_RISK").map((c) => c.corridor).slice(0, 3).join(", ");
      findings.push(`${atRisk} corridor${atRisk !== 1 ? "s" : ""} at risk: ${names}.`);
    }
    if (degraded > 0) {
      findings.push(`${degraded} corridor${degraded !== 1 ? "s" : ""} operating in degraded state.`);
    }
    if (healthy === corridorCount) {
      findings.push("All corridors reporting healthy status.");
    }
  }

  // Corridor liquidity
  const pressure = treasurySummary?.pressure ?? null;
  const utilization = treasurySummary?.utilization ?? null;
  if (pressure && utilization !== null) {
    const pressureDesc =
      pressure === "CRITICAL" ? "critical — immediate attention required" :
      pressure === "HIGH" ? "elevated — monitoring recommended" :
      pressure === "MEDIUM" ? "moderate" :
      "within normal parameters";
    sentences.push(`Corridor liquidity pressure ${pressureDesc}.`);
    findings.push(`Route capacity utilisation at ${utilization}%.`);
  }

  // Alerts
  if (alertCount > 0) {
    sentences.push(`${alertCount} active alert${alertCount !== 1 ? "s" : ""} require${alertCount === 1 ? "s" : ""} review.`);
    if (criticalAlertCount > 0) {
      findings.push(`${criticalAlertCount} critical alert${criticalAlertCount !== 1 ? "s" : ""} currently open.`);
    }
  } else {
    findings.push("No active alerts detected.");
  }

  // Service health
  const offlineCount = serviceHealth.filter((s) => s.status === "OFFLINE").length;
  const degradedCount = serviceHealth.filter((s) => s.status === "DEGRADED").length;
  const noDataCount = serviceHealth.filter((s) => s.status === "NO_DATA").length;
  const diagnosticCount = serviceHealth.filter((s) => s.status === "DIAGNOSTIC" || s.status === "DISABLED").length;
  if (offlineCount > 0) {
    const names = serviceHealth.filter((s) => s.status === "OFFLINE").map((s) => s.label).slice(0, 3).join(", ");
    sentences.push(`Platform has confirmed service disruption: ${names}.`);
  } else if (degradedCount > 0) {
    sentences.push(`Platform operating in degraded state (${degradedCount} service${degradedCount !== 1 ? "s" : ""} affected).`);
  } else if (noDataCount > 0 || diagnosticCount > 0) {
    sentences.push(`Platform health telemetry is incomplete (${noDataCount} no-data, ${diagnosticCount} diagnostic or disabled).`);
  } else if (serviceHealth.length > 0) {
    sentences.push("All platform services operational.");
  }

  // KPI highlights
  const successKpi = kpis.find((k) => k.key === "success");
  if (successKpi) {
    findings.push(`Transfer success rate: ${successKpi.value}.`);
  }
  const transfersKpi = kpis.find((k) => k.key === "transfers");
  if (transfersKpi) {
    findings.push(`${transfersKpi.value} transfers processed in the last 24 hours.`);
  }

  const summary = sentences.length > 0
    ? sentences.join(" ")
    : "Operational telemetry loaded. AI summary service is currently initialising.";

  return { summary, findings };
}

function FindingItem({ text, index }: { text: string; index: number }) {
  return (
    <View style={styles.findingRow}>
      <View style={styles.findingIndex}>
        <AppText variant="caption" style={styles.findingIndexText}>{index + 1}</AppText>
      </View>
      <AppText variant="caption" color={colors.textDarkSecondary} style={styles.findingText}>
        {text ?? ""}
      </AppText>
    </View>
  );
}

export function NexusAISummaryCard({
  missionSummary,
  missionSummaryLoading,
  missionSummaryStatus,
  operationsAIEnabled,
  nexusAILoading,
  corridorRows,
  treasurySummary,
  serviceHealth,
  kpis,
  alertCount,
  criticalAlertCount,
  showDataSources = true,
}: Props) {
  if (nexusAILoading) {
    return (
      <AppCard style={styles.card}>
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="small" color={colors.gold} />
          <AppText variant="caption" color={colors.textDarkMuted} style={styles.loadingText}>
            Loading AI configuration…
          </AppText>
        </View>
      </AppCard>
    );
  }

  if (!operationsAIEnabled) {
    return (
      <AppCard style={styles.card}>
        <View style={styles.header}>
          <Feather name="zap" size={18} color={colors.textDarkMuted} style={{ marginRight: 8 }} />
          <AppText variant="subheading" color={colors.textDarkPrimary} style={styles.title}>
            Nexus AI Mission Summary
          </AppText>
          {showDataSources && <DataProvenanceBadge classification="DISABLED" />}
        </View>
        <View style={styles.disabledBlock}>
          <Feather name="toggle-left" size={22} color={colors.textDarkMuted} />
          <AppText variant="caption" color={colors.textDarkMuted} style={styles.disabledText}>
            AI mission summary is disabled. Enable Nexus AI in settings to activate corridor intelligence.
          </AppText>
        </View>
      </AppCard>
    );
  }

  if (missionSummaryLoading && !missionSummary) {
    return (
      <AppCard style={styles.card}>
        <View style={styles.header}>
          <Feather name="zap" size={18} color={colors.gold} style={{ marginRight: 8 }} />
          <AppText variant="subheading" color={colors.textDarkPrimary} style={styles.title}>
            Nexus AI Mission Summary
          </AppText>
          {showDataSources && <DataProvenanceBadge classification="FALLBACK" />}
        </View>
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="small" color={colors.gold} />
          <AppText variant="caption" color={colors.textDarkMuted} style={styles.loadingText}>
            {missionSummaryStatus ?? "Generating intelligence…"}
          </AppText>
        </View>
      </AppCard>
    );
  }

  // Determine whether we have a real AI summary or need a fallback
  const hasMissionSummary = Boolean(missionSummary?.executiveSummary);

  // Check whether sufficient dashboard data exists to generate a fallback
  const safeCorridors = Array.isArray(corridorRows) ? corridorRows : [];
  const safeHealth = Array.isArray(serviceHealth) ? serviceHealth : [];
  const safeKpis = Array.isArray(kpis) ? kpis : [];
  const hasDashboardData =
    safeCorridors.length > 0 ||
    safeHealth.length > 0 ||
    safeKpis.length > 0 ||
    (alertCount ?? 0) > 0;

  // Build fallback when AI summary is absent but telemetry is available
  const fallback =
    !hasMissionSummary && hasDashboardData
      ? buildFallbackSummary({
          corridorRows: safeCorridors,
          treasurySummary: treasurySummary ?? null,
          serviceHealth: safeHealth,
          kpis: safeKpis,
          alertCount: alertCount ?? 0,
          criticalAlertCount: criticalAlertCount ?? 0,
        })
      : null;

  const summary = missionSummary?.executiveSummary ?? fallback?.summary ?? null;
  const findings = Array.isArray(missionSummary?.keyFindings)
    ? missionSummary.keyFindings
    : (fallback?.findings ?? []);
  const evidence = Array.isArray(missionSummary?.supportingEvidence) ? missionSummary.supportingEvidence : [];
  const confidence = Array.isArray(missionSummary?.confidenceIndicators) ? missionSummary.confidenceIndicators : [];
  const isFallback = !hasMissionSummary && hasDashboardData;

  return (
    <AppCard style={styles.card}>
      <View style={styles.header}>
        <Feather name="zap" size={18} color={colors.gold} style={{ marginRight: 8 }} />
        <AppText variant="subheading" color={colors.textDarkPrimary} style={styles.title}>
          Nexus AI Mission Summary
        </AppText>
        {showDataSources && <DataProvenanceBadge classification={isFallback ? "FALLBACK" : "LIVE"} />}
        {missionSummaryLoading && (
          <ActivityIndicator size="small" color={colors.gold} style={{ marginLeft: 8 }} />
        )}
        {isFallback && (
          <View style={styles.fallbackBadge}>
            <AppText variant="caption" style={styles.fallbackBadgeText}>Telemetry</AppText>
          </View>
        )}
      </View>

      {summary ? (
        <View style={[styles.summaryBlock, isFallback && styles.summaryBlockFallback]}>
          <AppText variant="body" color={colors.textDarkPrimary} style={styles.summaryText}>
            {summary}
          </AppText>
        </View>
      ) : (
        <View style={styles.noSummary}>
          <AppText variant="caption" color={colors.textDarkMuted}>
            {missionSummaryStatus ?? "No summary available"}
          </AppText>
        </View>
      )}

      {findings.length > 0 && (
        <View style={styles.section}>
          <AppText variant="caption" style={styles.sectionLabel}>
            {isFallback ? "Operational Observations" : "Key Findings"}
          </AppText>
          <View style={styles.findingList}>
            {findings.slice(0, 5).map((item, idx) => (
              <FindingItem key={idx} text={item} index={idx} />
            ))}
          </View>
        </View>
      )}

      {evidence.length > 0 && (
        <View style={styles.section}>
          <AppText variant="caption" style={styles.sectionLabel}>Supporting Evidence</AppText>
          <View style={styles.evidenceList}>
            {evidence.slice(0, 4).map((item, idx) => (
              <View key={idx} style={styles.evidenceRow}>
                <Feather name="corner-right-down" size={11} color={colors.textDarkMuted} />
                <AppText variant="caption" color={colors.textDarkSecondary} style={styles.evidenceText}>
                  {item ?? ""}
                </AppText>
              </View>
            ))}
          </View>
        </View>
      )}

      {confidence.length > 0 && (
        <View style={styles.confidenceRow}>
          {confidence.slice(0, 3).map((item, idx) => (
            <View key={idx} style={styles.confidenceBadge}>
              <AppText variant="caption" style={styles.confidenceText}>{item ?? ""}</AppText>
            </View>
          ))}
        </View>
      )}
    </AppCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  title: {
    fontWeight: "700",
    flex: 1,
  },
  loadingCenter: {
    alignItems: "center",
    paddingVertical: 24,
    gap: 10,
  },
  loadingText: {
    textAlign: "center",
    lineHeight: 18,
  },
  disabledBlock: {
    alignItems: "center",
    paddingVertical: 20,
    gap: 10,
  },
  disabledText: {
    textAlign: "center",
    maxWidth: 280,
    lineHeight: 18,
  },
  summaryBlock: {
    backgroundColor: `${colors.gold}0C`,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: `${colors.gold}20`,
    marginBottom: 16,
  },
  summaryBlockFallback: {
    backgroundColor: "#2563EB08",
    borderColor: "#2563EB20",
  },
  fallbackBadge: {
    backgroundColor: "#2563EB12",
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: "#2563EB28",
    marginLeft: 6,
  },
  fallbackBadgeText: {
    color: "#2563EB",
    fontWeight: "700",
    fontSize: 10,
    letterSpacing: 0.4,
  },
  summaryText: {
    lineHeight: 22,
    fontSize: 14,
  },
  noSummary: {
    paddingVertical: 16,
    alignItems: "center",
  },
  section: {
    marginBottom: 14,
  },
  sectionLabel: {
    fontWeight: "700",
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: colors.textDarkMuted,
    marginBottom: 8,
  },
  findingList: {
    gap: 8,
  },
  findingRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  findingIndex: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: `${colors.gold}18`,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
    flexShrink: 0,
  },
  findingIndexText: {
    color: colors.gold,
    fontWeight: "800",
    fontSize: 10,
  },
  findingText: {
    flex: 1,
    lineHeight: 18,
    fontSize: 13,
  },
  evidenceList: {
    gap: 7,
  },
  evidenceRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 7,
  },
  evidenceText: {
    flex: 1,
    lineHeight: 17,
    fontSize: 12,
  },
  confidenceRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    marginTop: 4,
  },
  confidenceBadge: {
    backgroundColor: colors.cardSoft,
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  confidenceText: {
    color: colors.textDarkSecondary,
    fontWeight: "600",
    fontSize: 11,
  },
});
