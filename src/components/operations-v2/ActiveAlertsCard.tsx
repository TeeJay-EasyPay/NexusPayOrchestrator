import { Feather } from "@expo/vector-icons";
import React from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import type { RouteOperationalEventRow } from "../../services/routeOperationalEventService";
import { colors, spacing } from "../../theme";
import type { OperationsAlertFilter } from "../../utils/operationsCommandCentre";
import { getAlertColor, mapEventToAlertFilter } from "../../utils/operationsCommandCentre";
import { AppCard } from "../ui/AppCard";
import { AppText } from "../ui/AppText";

type Props = {
  events: RouteOperationalEventRow[] | null | undefined;
  severityFilter: OperationsAlertFilter;
  setSeverityFilter: (filter: OperationsAlertFilter) => void;
};

const FILTERS: OperationsAlertFilter[] = ["ALL", "CRITICAL", "WARNING", "INFO"];

function severityIcon(level: OperationsAlertFilter): React.ComponentProps<typeof Feather>["name"] {
  if (level === "CRITICAL") return "x-circle";
  if (level === "WARNING") return "alert-triangle";
  return "info";
}

function formatTime(iso: string): string {
  try {
    return new Date(iso ?? "").toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "--:--";
  }
}

function AlertRow({ event }: { event: RouteOperationalEventRow }) {
  const alertLevel = mapEventToAlertFilter(event);
  const color = getAlertColor(alertLevel);
  const icon = severityIcon(alertLevel);

  return (
    <View style={styles.alertRow}>
      <View style={[styles.alertIconWrap, { backgroundColor: `${color}12` }]}>
        <Feather name={icon} size={15} color={color} />
      </View>
      <View style={styles.alertContent}>
        <View style={styles.alertTopRow}>
          <AppText variant="caption" style={[styles.alertSeverity, { color }]}>
            {event.severity ?? "INFO"}
          </AppText>
          <AppText variant="caption" color={colors.textDarkMuted} style={styles.alertTime}>
            {formatTime(event.created_at ?? "")}
          </AppText>
        </View>
        <AppText variant="caption" color={colors.textDarkPrimary} style={styles.alertMessage}>
          {event.message ?? "No message available"}
        </AppText>
        {event.corridor ? (
          <AppText variant="caption" color={colors.textDarkMuted} style={styles.alertCorridor}>
            {event.corridor} · {event.provider ?? ""}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

export function ActiveAlertsCard({ events, severityFilter, setSeverityFilter }: Props) {
  const safeEvents = Array.isArray(events) ? events : [];

  const filtered = safeEvents.filter((event) => {
    if (severityFilter === "ALL") return true;
    return mapEventToAlertFilter(event) === severityFilter;
  });

  const criticalCount = safeEvents.filter((e) => mapEventToAlertFilter(e) === "CRITICAL").length;

  return (
    <AppCard style={styles.card}>
      <View style={styles.header}>
        <Feather name="alert-triangle" size={18} color={colors.gold} style={{ marginRight: 8 }} />
        <AppText variant="subheading" color={colors.textDarkPrimary} style={styles.title}>
          Active Alerts
        </AppText>
        {criticalCount > 0 && (
          <View style={styles.critBadge}>
            <AppText variant="caption" style={styles.critText}>{criticalCount} critical</AppText>
          </View>
        )}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
        <View style={styles.filterRow}>
          {FILTERS.map((filter) => {
            const active = severityFilter === filter;
            const color = getAlertColor(filter);
            return (
              <Pressable
                key={filter}
                onPress={() => setSeverityFilter(filter)}
                style={[
                  styles.filterChip,
                  active
                    ? { backgroundColor: `${color}18`, borderColor: `${color}40` }
                    : styles.filterChipInactive,
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Filter alerts: ${filter}`}
              >
                <AppText
                  variant="caption"
                  style={[styles.filterText, { color: active ? color : colors.textDarkMuted }]}
                >
                  {filter}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.alertList}>
        {filtered.length > 0
          ? filtered.slice(0, 10).map((event) => (
              <AlertRow key={event.id ?? event.created_at} event={event} />
            ))
          : (
            <View style={styles.empty}>
              <Feather name="check-circle" size={20} color="#16A34A" />
              <AppText variant="caption" color={colors.textDarkMuted} style={styles.emptyText}>
                No alerts for selected filter
              </AppText>
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
    marginBottom: spacing.sm,
  },
  title: {
    fontWeight: "700",
    flex: 1,
  },
  critBadge: {
    backgroundColor: "#DC262618",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: "#DC262630",
  },
  critText: {
    color: "#DC2626",
    fontWeight: "700",
    fontSize: 10,
  },
  filterScroll: {
    marginBottom: 14,
  },
  filterRow: {
    flexDirection: "row",
    gap: 8,
    paddingBottom: 2,
  },
  filterChip: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
  },
  filterChipInactive: {
    backgroundColor: colors.cardSoft,
    borderColor: colors.cardBorder,
  },
  filterText: {
    fontWeight: "700",
    fontSize: 11,
    letterSpacing: 0.4,
  },
  alertList: {
    gap: 10,
  },
  alertRow: {
    flexDirection: "row",
    gap: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  alertIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
    flexShrink: 0,
  },
  alertContent: {
    flex: 1,
    gap: 3,
  },
  alertTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  alertSeverity: {
    fontWeight: "800",
    fontSize: 11,
    letterSpacing: 0.5,
  },
  alertTime: {
    fontSize: 11,
  },
  alertMessage: {
    fontWeight: "500",
    fontSize: 13,
    lineHeight: 18,
  },
  alertCorridor: {
    fontSize: 11,
  },
  empty: {
    alignItems: "center",
    paddingVertical: 20,
    gap: 8,
  },
  emptyText: {
    marginTop: 4,
  },
});
