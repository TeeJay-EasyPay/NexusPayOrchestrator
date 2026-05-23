import { Feather } from "@expo/vector-icons";
import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";

import { colors } from "../../theme";
import { AppText } from "../ui/AppText";

type Props = {
  realtimeStatus: string;
  lastUpdatedAt: string;
  refreshing: boolean;
  onRefresh: () => void;
};

function formatUpdatedAt(iso: string): string {
  try {
    const date = new Date(iso);
    return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  } catch {
    return "--:--";
  }
}

function connectivityTone(status: string): { color: string; label: string } {
  const s = (status ?? "").toLowerCase();
  if (s === "live" || s === "connected") return { color: "#16A34A", label: "Live" };
  if (s === "connecting") return { color: "#D97706", label: "Connecting" };
  if (s === "disconnected" || s === "offline") return { color: "#DC2626", label: "Offline" };
  return { color: "#2563EB", label: status ?? "Unknown" };
}

export function OperationsHeader({ realtimeStatus, lastUpdatedAt, refreshing, onRefresh }: Props) {
  const { color, label } = connectivityTone(realtimeStatus ?? "");

  return (
    <View style={styles.container}>
      <View style={styles.titleBlock}>
        <View style={styles.badgeRow}>
          <View style={[styles.statusDot, { backgroundColor: color }]} />
          <AppText variant="caption" style={[styles.statusLabel, { color }]}>
            {label}
          </AppText>
        </View>

        <AppText variant="title" style={styles.title}>
          Operations Command Centre
        </AppText>

        <AppText variant="caption" style={styles.subtitle}>
          Mission Control · Real-time Intelligence
        </AppText>
      </View>

      <View style={styles.actions}>
        <Pressable
          onPress={onRefresh}
          disabled={refreshing}
          style={styles.refreshButton}
          accessibilityLabel="Refresh operations data"
          accessibilityRole="button"
        >
          {refreshing ? (
            <ActivityIndicator size={18} color={colors.gold} />
          ) : (
            <Feather name="refresh-cw" size={18} color={colors.gold} />
          )}
        </Pressable>

        <AppText variant="caption" style={styles.updatedAt}>
          {formatUpdatedAt(lastUpdatedAt ?? "")}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  titleBlock: {
    flex: 1,
    gap: 4,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusLabel: {
    fontWeight: "700",
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  title: {
    color: colors.textPrimary,
    fontWeight: "800",
    fontSize: 22,
    lineHeight: 28,
  },
  subtitle: {
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  actions: {
    alignItems: "flex-end",
    gap: 6,
    paddingTop: 6,
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(214,168,79,0.12)",
    borderWidth: 1,
    borderColor: "rgba(214,168,79,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  updatedAt: {
    color: colors.textMuted,
    fontSize: 11,
  },
});
