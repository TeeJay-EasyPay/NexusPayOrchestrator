import { Feather } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Modal,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    useWindowDimensions,
    View,
} from "react-native";

import {
    formatDelta,
    getAlertColor,
    mapEventToAlertFilter,
    useOperationsCommandCentre,
} from "../../hooks/useOperationsCommandCentre";
import { colors } from "../../theme";
import type {
    OperationsAlertFilter,
    OperationsCorridorRow,
    OperationsKpiItem,
    OperationsServiceHealth,
    OperationsStatusChip,
} from "../../utils/operationsCommandCentre";
import { NexusAIToggleCard } from "../intelligence/NexusAIToggleCard";
import { AppCard } from "../ui/AppCard";
import { AppText } from "../ui/AppText";
import { Screen } from "../ui/Screen";

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={{ flex: 1 }}>
        <AppText variant="subheading" color={colors.textDarkPrimary} style={styles.sectionTitle}>
          {title}
        </AppText>
        <AppText variant="caption" color={colors.textDarkMuted}>
          {subtitle}
        </AppText>
      </View>
    </View>
  );
}

function StatusChip({ chip }: { chip: OperationsStatusChip }) {
  const toneColor =
    chip.tone === "healthy"
      ? "#16A34A"
      : chip.tone === "warning"
        ? "#D97706"
        : chip.tone === "critical"
          ? "#DC2626"
          : "#2563EB";

  return (
    <View style={styles.statusChipWrap}>
      <AppText variant="caption" color={colors.textDarkMuted} style={styles.statusChipLabel}>
        {chip.label}
      </AppText>
      <View style={[styles.statusChipValue, { backgroundColor: `${toneColor}14`, borderColor: `${toneColor}30` }]}>
        <AppText variant="caption" style={{ color: toneColor, fontWeight: "900" }}>
          {chip.value}
        </AppText>
      </View>
      {chip.detail ? (
        <AppText variant="caption" color={colors.textDarkSecondary} style={{ marginTop: 4 }}>
          {chip.detail}
        </AppText>
      ) : null}
    </View>
  );
}

function KpiCard({ item }: { item: OperationsKpiItem }) {
  const trendColor = item.trend === "up" ? "#16A34A" : item.trend === "down" ? "#DC2626" : "#2563EB";

  return (
    <View style={styles.kpiCard}>
      <View style={styles.kpiTopRow}>
        <View style={[styles.kpiIconBubble, { backgroundColor: `${item.tint}14` }]}>
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

      <View style={[styles.kpiUnderline, { backgroundColor: item.tint }]} />
    </View>
  );
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metricTile}>
      <AppText variant="caption" color={colors.textDarkMuted}>
        {label}
      </AppText>
      <AppText variant="body" color={colors.textDarkPrimary} style={{ fontWeight: "900" }}>
        {value}
      </AppText>
    </View>
  );
}

function HealthPill({ label, status }: { label: string; status: OperationsServiceHealth["status"] }) {
  const toneColor = status === "HEALTHY" ? "#16A34A" : status === "DEGRADED" ? "#D97706" : "#DC2626";

  return (
    <View style={styles.healthRow}>
      <View style={styles.healthLeft}>
        <View style={[styles.healthDot, { backgroundColor: toneColor }]} />
        <AppText variant="body" color={colors.textDarkPrimary} style={{ fontWeight: "800" }}>
          {label}
        </AppText>
      </View>
      <AppText variant="caption" style={{ color: toneColor, fontWeight: "900" }}>
        {status}
      </AppText>
    </View>
  );
}

function CorridorRow({ item }: { item: OperationsCorridorRow }) {
  const toneColor = item.status === "HEALTHY" ? "#16A34A" : item.status === "DEGRADED" ? "#D97706" : "#DC2626";
  const trendColor = item.trend >= 0 ? "#16A34A" : "#DC2626";

  return (
    <View style={styles.corridorRow}>
      <View style={styles.corridorTopRow}>
        <AppText variant="body" color={colors.textDarkPrimary} style={{ fontWeight: "900" }}>
          {item.corridor}
        </AppText>
        <View style={[styles.badge, { backgroundColor: `${toneColor}14`, borderColor: `${toneColor}30` }]}>
          <AppText variant="caption" style={{ color: toneColor, fontWeight: "900" }}>
            {item.status}
          </AppText>
        </View>
      </View>

      <View style={styles.corridorMetricsRow}>
        <MetricTile label="Health score" value={`${item.score.toFixed(1)}`} />
        <MetricTile label="Capacity" value={`${item.capacity}%`} />
        <MetricTile label="Pressure" value={item.pressure} />
      </View>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${Math.max(6, Math.min(100, item.score))}%`, backgroundColor: toneColor }]} />
      </View>

      <View style={styles.kpiDeltaRow}>
        <Feather name={item.trend >= 0 ? "trending-up" : "trending-down"} size={14} color={trendColor} />
        <AppText variant="caption" style={{ color: trendColor, fontWeight: "800" }}>
          {formatDelta(item.trend)} vs previous snapshot
        </AppText>
      </View>
    </View>
  );
}

function AlertRow({
  item,
  alertFilter,
  timeFormatter,
}: {
  item: {
    id: string;
    event_type: string;
    provider: string;
    rail: string;
    corridor?: string | null;
    message: string;
    created_at: string;
    severity: "INFO" | "WATCH" | "DEGRADED" | "FAILOVER";
  };
  alertFilter: OperationsAlertFilter;
  timeFormatter: (value: string) => string;
}) {
  const alertColor = getAlertColor(alertFilter);

  return (
    <View style={styles.alertRow}>
      <View style={[styles.alertIcon, { backgroundColor: `${alertColor}14` }]}>
        <Feather name="alert-triangle" size={16} color={alertColor} />
      </View>

      <View style={{ flex: 1, gap: 3 }}>
        <View style={styles.alertHeaderRow}>
          <AppText variant="body" color={colors.textDarkPrimary} style={{ fontWeight: "900", flex: 1 }}>
            {item.event_type.replace(/_/g, " ")}
          </AppText>
          <AppText variant="caption" style={{ color: alertColor, fontWeight: "900" }}>
            {alertFilter}
          </AppText>
        </View>

        <AppText variant="caption" color={colors.textDarkSecondary}>
          {item.provider} • {item.rail} • {item.corridor ?? "Unknown corridor"}
        </AppText>

        <AppText variant="caption" color={colors.textDarkSecondary}>
          {item.message}
        </AppText>

        <AppText variant="caption" color={colors.textDarkMuted}>
          {timeFormatter(item.created_at)}
        </AppText>
      </View>
    </View>
  );
}

function ServiceHealthSection({ items }: { items: OperationsServiceHealth[] }) {
  return (
    <View style={styles.stack}>
      {items.map((item) => (
        <HealthPill key={item.label} label={item.label} status={item.status} />
      ))}
    </View>
  );
}

export function OperationsCommandCentre() {
  console.log("OPS_DEBUG: render start");

  const { width } = useWindowDimensions();
  const [filtersVisible, setFiltersVisible] = useState(false);

  const {
    kpis,
    corridorRows,
    activeTransfers,
    treasurySummary,
    serviceHealth,
    missionStatus,
    alertOptions,
    transferSuccessAnomaly,
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
    refresh,
    setRefreshing,
    events,
    severityFilter,
    setSeverityFilter,
    corridorFilter,
    setCorridorFilter,
    corridorFilterOptions,
    feedData,
    debugStage,
  } = useOperationsCommandCentre();

  // TEMPORARY: on-screen diagnostic stage tracker — remove once crash is identified
  const [uiStage, setUiStage] = useState("OPS_DEBUG: render start");

  useEffect(() => {
    console.log("OPS_DEBUG: render complete");
    setUiStage("OPS_DEBUG: UI render complete");

    return () => {
      console.log("OPS_DEBUG: component unmount");
    };
  });

  const kpiColumns = width >= 1100 ? 4 : width >= 760 ? 3 : 2;
  const twoColumnLayout = width >= 820;
  const corridorRowsToShow = useMemo(() => {
    console.log("OPS_DEBUG: corridor calculations start");

    try {
      const rows = corridorRows.filter((item) => corridorFilter === "ALL" ? true : item.corridor === corridorFilter);
      console.log("OPS_DEBUG: corridor rows built", { total: rows.length, corridorFilter });
      return rows;
    } catch (error) {
      console.warn("OPS_DEBUG: corridor calculations failed", error);
      throw error;
    }
  }, [corridorFilter, corridorRows]);

  const filteredAlerts = useMemo(
    () => {
      console.log("OPS_DEBUG: alert calculations start");

      try {
        const alerts = events.filter((item) => {
          const severityMatch = severityFilter === "ALL" ? true : mapEventToAlertFilter(item) === severityFilter;
          const corridorMatch = corridorFilter === "ALL" ? true : (item.corridor ?? "Unknown corridor") === corridorFilter;
          return severityMatch && corridorMatch;
        });

        console.log("OPS_DEBUG: alerts processed", {
          total: events.length,
          filtered: alerts.length,
          severityFilter,
          corridorFilter,
        });

        return alerts;
      } catch (error) {
        console.warn("OPS_DEBUG: alert calculations failed", error);
        throw error;
      }
    },
    [corridorFilter, events, severityFilter]
  );

  const timeFormatter = (value: string) =>
    new Date(value).toLocaleString([], {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "short",
    });

  const missionSummaryView = useMemo(() => {
    console.log("OPS_DEBUG: mission summary calculations start");

    try {
      const missionAlertMessage = transferSuccessAnomaly ?? missionStatus.attentionSummary;
      const missionExecutiveSummary =
        typeof missionSummary?.executiveSummary === "string" && missionSummary.executiveSummary.trim().length > 0
          ? missionSummary.executiveSummary
          : "Live mission summary is temporarily unavailable.";
      const missionKeyFindings = Array.isArray((missionSummary as { keyFindings?: unknown } | null)?.keyFindings)
        ? ((missionSummary as { keyFindings: unknown[] }).keyFindings
          .filter((line): line is string => typeof line === "string" && line.trim().length > 0)
          .slice(0, 3))
        : [];

      console.log("OPS_DEBUG: mission summary calculations complete", {
        hasMissionSummary: Boolean(missionSummary),
        findings: missionKeyFindings.length,
      });

      return {
        missionAlertMessage,
        missionExecutiveSummary,
        missionKeyFindings,
      };
    } catch (error) {
      console.warn("OPS_DEBUG: mission summary calculations failed", error);
      throw error;
    }
  }, [missionStatus.attentionSummary, missionSummary, transferSuccessAnomaly]);

  console.log("OPS_DEBUG: render complete");

  return (
    <Screen>
      <View style={styles.background} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void refresh(); }} tintColor="#FFFFFF" />}
        contentContainerStyle={styles.content}
      >
        {/* TEMPORARY: OPS_DEBUG diagnostic banner — remove once crash is identified */}
        <View style={styles.debugBanner}>
          <AppText variant="caption" style={styles.debugBannerText} numberOfLines={1}>
            {uiStage}
          </AppText>
          <AppText variant="caption" style={styles.debugBannerText} numberOfLines={1}>
            {debugStage}
          </AppText>
        </View>

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
              <Pressable style={styles.headerButton} onPress={() => setFiltersVisible(true)}>
                <Feather name="filter" size={15} color="#DDEAF4" />
                <AppText variant="caption" color="#DDEAF4" style={{ fontWeight: "800" }}>
                  Filters
                </AppText>
              </Pressable>

              <Pressable style={styles.headerButton} onPress={() => { setRefreshing(true); void refresh(); }}>
                <Feather name="refresh-cw" size={15} color="#DDEAF4" />
                <AppText variant="caption" color="#DDEAF4" style={{ fontWeight: "800" }}>
                  Refresh
                </AppText>
              </Pressable>
            </View>
          </View>

          <AppText variant="caption" color={colors.textMuted}>
            Last sync: {timeFormatter(lastUpdatedAt)}{feedsRefreshedAt ? ` • Feeds ${timeFormatter(feedsRefreshedAt)}` : ""}
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

        <AppCard>
          <View style={styles.cardHeaderRow}>
            <View>
              <AppText variant="subheading" color={colors.textDarkPrimary} style={styles.sectionTitle}>
                Mission Control Status
              </AppText>
              <AppText variant="caption" color={colors.textDarkMuted}>
                The operating picture at a glance
              </AppText>
            </View>
          </View>

          <AppText variant="body" color={colors.textDarkPrimary} style={styles.attentionSummary}>
            {missionSummaryView.missionAlertMessage}
          </AppText>

          <View style={styles.statusGrid}>
            {missionStatus.chips.map((chip) => (
              <StatusChip key={chip.label} chip={chip} />
            ))}
          </View>
        </AppCard>

        <FlatList
          data={kpis}
          key={kpiColumns}
          numColumns={kpiColumns}
          scrollEnabled={false}
          columnWrapperStyle={kpiColumns > 1 ? styles.kpiRow : undefined}
          contentContainerStyle={styles.kpiGrid}
          renderItem={({ item }) => (
            <View style={[styles.kpiCell, { flexBasis: `${100 / kpiColumns}%` }]}>
              <KpiCard item={item} />
            </View>
          )}
        />

        <AppCard>
          <SectionHeader title="Corridor Health" subtitle="Live corridor intelligence from treasury and route telemetry" />
          <View style={styles.stack}>
            {corridorRowsToShow.slice(0, 8).map((item) => (
              <CorridorRow key={item.corridor} item={item} />
            ))}
          </View>
        </AppCard>

        <AppCard>
          <SectionHeader title="Active Alerts" subtitle="Critical, warning and informational events from the operational stream" />
          <View style={styles.stack}>
            {filteredAlerts.length === 0 ? (
              <AppText variant="body" color={colors.textDarkSecondary}>
                Alert cards remain driven by the live event stream.
              </AppText>
            ) : (
              filteredAlerts.slice(0, 8).map((item) => (
                <AlertRow
                  key={item.id}
                  item={item}
                  alertFilter={mapEventToAlertFilter(item)}
                  timeFormatter={timeFormatter}
                />
              ))
            )}
          </View>
        </AppCard>

        <View style={twoColumnLayout ? styles.dualGrid : styles.singleStack}>
          <AppCard style={styles.flexCard}>
            <SectionHeader title="Treasury & Liquidity" subtitle="Utilisation, available liquidity and capacity forecast" />
            <View style={styles.metricTriple}>
              <MetricTile label="Utilisation" value={`${treasurySummary.utilization}%`} />
              <MetricTile label="Available" value={`${treasurySummary.availableCapacity}%`} />
              <MetricTile label="FX feeds live" value={`${feedData?.fx.length ?? 0}`} />
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

            <View style={styles.stack}>
              {treasurySummary.currencyDistribution.length > 0 ? treasurySummary.currencyDistribution.map((item) => (
                <View key={item.currency} style={styles.currencyRow}>
                  <AppText variant="body" color={colors.textDarkPrimary} style={{ fontWeight: "800" }}>
                    {item.currency}
                  </AppText>
                  <AppText variant="caption" color={colors.textDarkSecondary}>
                    {item.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })} ({item.percentage.toFixed(1)}%)
                  </AppText>
                </View>
              )) : (
                <AppText variant="caption" color={colors.textDarkSecondary}>
                  Wallet distribution will populate from live transfer history.
                </AppText>
              )}
            </View>
          </AppCard>

          <AppCard style={styles.flexCard}>
            <SectionHeader title="Live Transfers" subtitle="Active transfers from transaction history and execution state services" />
            <View style={styles.stack}>
              {activeTransfers.length === 0 ? (
                <AppText variant="body" color={colors.textDarkSecondary}>
                  No active transfers in-flight right now.
                </AppText>
              ) : (
                activeTransfers.slice(0, 12).map((item) => (
                  <View key={item.id} style={styles.transferRow}>
                    <View style={{ flex: 1, gap: 3 }}>
                      <AppText variant="body" color={colors.textDarkPrimary} style={{ fontWeight: "900" }}>
                        {item.corridor}
                      </AppText>
                      <AppText variant="caption" color={colors.textDarkSecondary}>
                        {item.currency} {item.amount.toLocaleString()} • Route {item.routeId}
                      </AppText>
                      <AppText variant="caption" color={colors.textDarkSecondary}>
                        Settlement {item.settlementEstimate} • {timeFormatter(item.updatedAt)}
                      </AppText>
                    </View>
                    <View style={{ minWidth: 92, alignItems: "flex-end", gap: 6 }}>
                      <View style={[styles.badge, { backgroundColor: "#EFF6FF", borderColor: "#BFDBFE" }]}>
                        <AppText variant="caption" style={{ color: "#1D4ED8", fontWeight: "900" }}>
                          {item.status}
                        </AppText>
                      </View>
                      <AppText variant="caption" color={colors.textDarkMuted}>
                        {item.progress}%
                      </AppText>
                    </View>
                  </View>
                ))
              )}
            </View>
          </AppCard>
        </View>

        <View style={twoColumnLayout ? styles.dualGrid : styles.singleStack}>
          <AppCard style={styles.flexCard}>
            <SectionHeader title="Operational Health" subtitle="Real-time service telemetry and platform subsystem status" />
            <ServiceHealthSection items={serviceHealth} />
          </AppCard>

          <AppCard style={styles.flexCard}>
            <SectionHeader title="Global Flow Map" subtitle="Active route volume and utilisation across live corridors" />
            <View style={styles.stack}>
              {corridorRows.slice(0, 6).map((item, index) => (
                <View key={item.corridor} style={styles.mapRow}>
                  <View style={[styles.mapNode, { backgroundColor: ["#F59E0B", "#7C3AED", "#2563EB", "#10B981"][index % 4] }]} />
                  <View style={{ flex: 1, gap: 4 }}>
                    <View style={styles.corridorTopRow}>
                      <AppText variant="body" color={colors.textDarkPrimary} style={{ fontWeight: "800" }}>
                        {item.corridor}
                      </AppText>
                      <AppText variant="caption" color={colors.textDarkMuted}>
                        Volume {activeTransfers.filter((transfer) => transfer.corridor === item.corridor).length}
                      </AppText>
                    </View>
                    <View style={styles.progressTrack}>
                      <View style={[styles.progressFill, { width: `${Math.max(6, Math.min(100, item.capacity))}%` }]} />
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </AppCard>
        </View>

        <AppCard style={styles.aiCard}>
          <SectionHeader title="Nexus AI Mission Summary" subtitle="Mission Control interpretation based on live operational telemetry" />
          {missionSummaryLoading ? (
            <View style={styles.aiLoadingRow}>
              <ActivityIndicator color="#7C3AED" />
              <AppText variant="body" color={colors.textDarkSecondary}>
                Generating live mission interpretation...
              </AppText>
            </View>
          ) : missionSummary ? (
            <View style={styles.stack}>
              <AppText variant="body" color={colors.textDarkPrimary} style={{ lineHeight: 22, fontWeight: "700" }}>
                {missionSummaryView.missionExecutiveSummary}
              </AppText>
              {missionSummaryView.missionKeyFindings.length > 0 ? missionSummaryView.missionKeyFindings.map((line, index) => (
                <View key={`finding-${index}`} style={styles.aiBulletRow}>
                  <View style={styles.aiBullet} />
                  <AppText variant="caption" color={colors.textDarkSecondary} style={{ flex: 1 }}>
                    {line}
                  </AppText>
                </View>
              )) : (
                <AppText variant="caption" color={colors.textDarkSecondary}>
                  No key findings were returned for this mission snapshot.
                </AppText>
              )}
            </View>
          ) : (
            <AppText variant="body" color={colors.textDarkSecondary}>
              {missionSummaryStatus}
            </AppText>
          )}
        </AppCard>
      </ScrollView>

      <Modal visible={filtersVisible} transparent animationType="fade" onRequestClose={() => setFiltersVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <AppText variant="subheading" color={colors.textDarkPrimary} style={styles.sectionTitle}>
                Operations Filters
              </AppText>
              <Pressable onPress={() => setFiltersVisible(false)}>
                <Feather name="x" size={20} color={colors.textDarkPrimary} />
              </Pressable>
            </View>

            <View style={styles.stack}>
              <AppText variant="caption" color={colors.textDarkMuted}>
                Alert severity
              </AppText>
              <View style={styles.filterWrap}>
                {alertOptions.map((option) => (
                  <Pressable key={option} onPress={() => setSeverityFilter(option)} style={[styles.filterChip, severityFilter === option && styles.filterChipSelected]}>
                    <AppText variant="caption" style={{ color: severityFilter === option ? "#0B3F4A" : colors.textDarkSecondary, fontWeight: "800" }}>
                      {option}
                    </AppText>
                  </Pressable>
                ))}
              </View>

              <AppText variant="caption" color={colors.textDarkMuted}>
                Corridor
              </AppText>
              <View style={styles.filterWrap}>
                {corridorFilterOptions.map((option) => (
                  <Pressable key={option} onPress={() => setCorridorFilter(option)} style={[styles.filterChip, corridorFilter === option && styles.filterChipSelected]}>
                    <AppText variant="caption" style={{ color: corridorFilter === option ? "#0B3F4A" : colors.textDarkSecondary, fontWeight: "800" }}>
                      {option}
                    </AppText>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.modalFooter}>
              <Pressable style={styles.modalGhostButton} onPress={() => { setSeverityFilter("ALL"); setCorridorFilter("ALL"); }}>
                <AppText variant="caption" color={colors.textDarkPrimary} style={{ fontWeight: "900" }}>
                  Reset
                </AppText>
              </Pressable>
              <Pressable style={styles.modalPrimaryButton} onPress={() => setFiltersVisible(false)}>
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
  background: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.background,
  },
  // TEMPORARY: OPS_DEBUG diagnostic banner styles — remove once crash is identified
  debugBanner: {
    backgroundColor: "#0A0F1E",
    borderWidth: 1,
    borderColor: "#FFD700",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 2,
    marginHorizontal: 4,
  },
  debugBannerText: {
    color: "#FFD700",
    fontFamily: "monospace",
    fontSize: 10,
    letterSpacing: 0.2,
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
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerButton: {
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
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 12,
  },
  sectionHeader: {
    gap: 4,
    marginBottom: 12,
  },
  sectionTitle: {
    fontWeight: "900",
  },
  attentionSummary: {
    lineHeight: 21,
    marginBottom: 14,
    fontWeight: "700",
  },
  statusGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  statusChipWrap: {
    flexBasis: "48%",
    minWidth: 130,
  },
  statusChipLabel: {
    fontWeight: "700",
    marginBottom: 6,
  },
  statusChipValue: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  kpiGrid: {
    gap: 10,
  },
  kpiRow: {
    gap: 10,
  },
  kpiCell: {
    flexGrow: 1,
    flexShrink: 1,
    padding: 2,
  },
  kpiCard: {
    minHeight: 128,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 14,
    gap: 8,
    shadowColor: "#020713",
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  kpiTopRow: {
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
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  kpiValue: {
    fontWeight: "900",
  },
  kpiDeltaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  kpiUnderline: {
    marginTop: "auto",
    height: 3,
    borderRadius: 999,
    opacity: 0.85,
  },
  stack: {
    gap: 10,
  },
  corridorRow: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    padding: 12,
    gap: 10,
    backgroundColor: "#FAFCFF",
  },
  corridorTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
  },
  corridorMetricsRow: {
    flexDirection: "row",
    gap: 8,
  },
  metricTile: {
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
  alertHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  healthRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  healthLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  healthDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  dualGrid: {
    flexDirection: "row",
    gap: 12,
  },
  singleStack: {
    gap: 12,
  },
  flexCard: {
    flex: 1,
  },
  metricTriple: {
    flexDirection: "row",
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
  aiCard: {
    borderColor: "#EADDFD",
    backgroundColor: "#FEFBFF",
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
  filterWrap: {
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
