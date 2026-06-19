import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, View } from "react-native";

import { colors, spacing } from "../../theme";
import type { OperationsServiceHealth } from "../../utils/operationsCommandCentre";
import { AppCard } from "../ui/AppCard";
import { AppText } from "../ui/AppText";
import { DataProvenanceBadge } from "./DataProvenanceBadge";

type Props = {
  serviceHealth: OperationsServiceHealth[] | null | undefined;
  showDataSources?: boolean;
};

type ServiceStatus = OperationsServiceHealth["status"];

function statusColor(status: ServiceStatus): string {
  if (status === "HEALTHY") return "#16A34A";
  if (status === "DEGRADED") return "#D97706";
  if (status === "NO_DATA") return "#64748B";
  if (status === "DIAGNOSTIC") return "#9333EA";
  if (status === "DISABLED") return "#6B7280";
  return "#DC2626";
}

function statusIcon(status: ServiceStatus): React.ComponentProps<typeof Feather>["name"] {
  if (status === "HEALTHY") return "check-circle";
  if (status === "DEGRADED") return "alert-circle";
  if (status === "NO_DATA") return "help-circle";
  if (status === "DIAGNOSTIC") return "tool";
  if (status === "DISABLED") return "pause-circle";
  return "x-circle";
}

function ServiceRow({ item }: { item: OperationsServiceHealth }) {
  const color = statusColor(item.status ?? "NO_DATA");
  const icon = statusIcon(item.status ?? "NO_DATA");

  return (
    <View style={styles.serviceRow}>
      <Feather name={icon} size={15} color={color} />
      <AppText variant="caption" color={colors.textDarkPrimary} style={styles.serviceLabel}>
        {item.label ?? "Unknown service"}
      </AppText>
      <DataProvenanceBadge classification={item.provenance === "NO_DATA" ? "NO_DATA" : item.provenance} />
      <View style={[styles.statusBadge, { backgroundColor: `${color}12`, borderColor: `${color}28` }]}>
        <AppText variant="caption" style={[styles.statusText, { color }]}>
          {item.status ?? "—"}
        </AppText>
      </View>
    </View>
  );
}

function overallHealth(services: OperationsServiceHealth[]): { color: string; label: string } {
  if (services.length === 0) return { color: colors.textDarkMuted, label: "No data" };
  const hasOffline = services.some((s) => s.status === "OFFLINE");
  const hasDegraded = services.some((s) => s.status === "DEGRADED");
  if (hasOffline) return { color: "#DC2626", label: "Confirmed Service Issue" };
  if (hasDegraded) return { color: "#D97706", label: "Degraded" };
  const hasDiagnostic = services.some((s) => s.status === "DIAGNOSTIC");
  const hasNoData = services.some((s) => s.status === "NO_DATA");
  const hasDisabled = services.some((s) => s.status === "DISABLED");
  if (hasDiagnostic) return { color: "#9333EA", label: "Diagnostic Mode" };
  if (hasNoData) return { color: "#64748B", label: "Telemetry Incomplete" };
  if (hasDisabled) return { color: "#6B7280", label: "Services Disabled" };
  return { color: "#16A34A", label: "Operational" };
}

export function OperationalHealthCard({ serviceHealth, showDataSources = true }: Props) {
  const services = Array.isArray(serviceHealth) ? serviceHealth : [];
  const { color, label } = overallHealth(services);

  const healthyCount = services.filter((s) => s.status === "HEALTHY").length;
  const degradedCount = services.filter((s) => s.status === "DEGRADED").length;
  const noDataCount = services.filter((s) => s.status === "NO_DATA").length;
  const diagnosticCount = services.filter((s) => s.status === "DIAGNOSTIC" || s.status === "DISABLED").length;

  return (
    <AppCard style={styles.card}>
      <View style={styles.header}>
        <Feather name="cpu" size={18} color={colors.gold} style={{ marginRight: 8 }} />
        <AppText variant="subheading" color={colors.textDarkPrimary} style={styles.title}>
          Operational Health
        </AppText>
        {showDataSources && <DataProvenanceBadge classification="DERIVED" />}
        <View style={[styles.overallBadge, { backgroundColor: `${color}12`, borderColor: `${color}28` }]}>
          <AppText variant="caption" style={[styles.overallText, { color }]}>
            {label}
          </AppText>
        </View>
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <AppText variant="caption" color="#16A34A" style={styles.summaryCount}>{healthyCount}</AppText>
          <AppText variant="caption" color={colors.textDarkMuted} style={styles.summaryLabel}>Healthy</AppText>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <AppText variant="caption" color="#D97706" style={styles.summaryCount}>{degradedCount}</AppText>
          <AppText variant="caption" color={colors.textDarkMuted} style={styles.summaryLabel}>Degraded</AppText>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <AppText variant="caption" color="#64748B" style={styles.summaryCount}>{noDataCount}</AppText>
          <AppText variant="caption" color={colors.textDarkMuted} style={styles.summaryLabel}>No Data</AppText>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <AppText variant="caption" color="#9333EA" style={styles.summaryCount}>{diagnosticCount}</AppText>
          <AppText variant="caption" color={colors.textDarkMuted} style={styles.summaryLabel}>Diagnostic</AppText>
        </View>
      </View>

      <View style={styles.serviceList}>
        {services.length > 0
          ? services.map((item, idx) => <ServiceRow key={item.label ?? idx} item={item} />)
          : (
            <View style={styles.empty}>
              <AppText variant="caption" color={colors.textDarkMuted}>No service health data</AppText>
            </View>
          )}
      </View>
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
  overallBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
  },
  overallText: {
    fontWeight: "700",
    fontSize: 10,
    letterSpacing: 0.4,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  summaryCount: {
    fontWeight: "800",
    fontSize: 22,
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: "600",
  },
  summaryDivider: {
    width: 1,
    height: 30,
    backgroundColor: colors.cardBorder,
  },
  serviceList: {
    gap: 12,
  },
  serviceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  serviceLabel: {
    flex: 1,
    fontWeight: "500",
    fontSize: 14,
  },
  statusBadge: {
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
  },
  statusText: {
    fontWeight: "700",
    fontSize: 10,
    letterSpacing: 0.4,
  },
  empty: {
    paddingVertical: 16,
    alignItems: "center",
  },
});
