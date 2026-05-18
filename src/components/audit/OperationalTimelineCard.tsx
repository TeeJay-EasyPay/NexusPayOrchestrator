import { useCallback, useEffect, useState } from "react";
import { Pressable, View } from "react-native";

import { supabase } from "../../lib/supabase";
import { loadTransactionAuditLogs } from "../../services/transactionAuditService";
import { colors } from "../../theme";
import { AppCard } from "../ui/AppCard";
import { AppText } from "../ui/AppText";

type TransactionAuditLogRow = {
  id: string;
  transaction_id: string;
  event_type: string;
  status: "PENDING" | "SUCCESS" | "FAILED" | "INFO";
  message: string;
  metadata?: Record<string, unknown> | null;
  created_at: string;
};

function auditStatusColor(status: TransactionAuditLogRow["status"]) {
  if (status === "SUCCESS") return "#16A34A";
  if (status === "FAILED") return "#DC2626";
  if (status === "PENDING") return colors.gold;
  return "#0B63CE";
}

function formatAuditTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--:--:--";

  return date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatEventType(value: string) {
  return value
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function metadataSummary(metadata?: Record<string, unknown> | null) {
  if (!metadata) return [];

  return Object.entries(metadata)
    .filter(([, value]) => value !== null && value !== undefined && value !== "")
    .slice(0, 4)
    .map(([key, value]) => {
      const label = key.replace(/_/g, " ");
      const safeValue = typeof value === "object" ? JSON.stringify(value) : String(value);
      return `${label}: ${safeValue}`;
    });
}

function mergeAuditLog(rows: TransactionAuditLogRow[], incoming: TransactionAuditLogRow) {
  const withoutDuplicate = rows.filter((row) => row.id !== incoming.id);
  return [...withoutDuplicate, incoming].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
}

export function OperationalTimelineCard({
  transactionId,
  refreshKey,
}: {
  transactionId: string;
  refreshKey?: string | number;
}) {
  const [logs, setLogs] = useState<TransactionAuditLogRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [realtimeStatus, setRealtimeStatus] = useState("Connecting");

  const refresh = useCallback(async () => {
    if (!transactionId) return;

    setLoading(true);
    const loadedLogs = await loadTransactionAuditLogs(transactionId);
    setLogs(loadedLogs as TransactionAuditLogRow[]);
    setLoading(false);
  }, [transactionId]);

  useEffect(() => {
    refresh();
  }, [refresh, refreshKey]);

  useEffect(() => {
    if (!transactionId) return;

    setRealtimeStatus("Connecting");

    const channel = supabase
      .channel(`audit_timeline_${transactionId}_${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "transaction_audit_logs",
          filter: `transaction_id=eq.${transactionId}`,
        },
        (payload) => {
          const incoming = payload.new as TransactionAuditLogRow;
          setLogs((current) => mergeAuditLog(current, incoming));
          setRealtimeStatus("Live");
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") setRealtimeStatus("Live");
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setRealtimeStatus("Manual refresh fallback");
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [transactionId]);

  return (
    <AppCard>
      <View style={{ gap: 14 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
          <View style={{ flex: 1, gap: 4 }}>
            <AppText variant="subheading" color={colors.textDarkPrimary}>
              Operational timeline
            </AppText>

            <AppText variant="caption" color={colors.textDarkSecondary}>
              Persistent Supabase audit trail with realtime streaming enabled.
            </AppText>

            <View
              style={{
                alignSelf: "flex-start",
                paddingHorizontal: 9,
                paddingVertical: 4,
                borderRadius: 999,
                backgroundColor: realtimeStatus === "Live" ? "#DCFCE7" : colors.goldSoft,
              }}
            >
              <AppText
                variant="caption"
                style={{
                  color: realtimeStatus === "Live" ? "#166534" : "#8A6218",
                  fontWeight: "900",
                }}
              >
                {realtimeStatus}
              </AppText>
            </View>
          </View>

          <Pressable
            onPress={refresh}
            style={{
              alignSelf: "flex-start",
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 999,
              backgroundColor: colors.goldSoft,
            }}
          >
            <AppText variant="caption" style={{ color: "#8A6218", fontWeight: "900" }}>
              {loading ? "Loading" : "Refresh"}
            </AppText>
          </Pressable>
        </View>

        {logs.length === 0 ? (
          <View
            style={{
              padding: 14,
              borderRadius: 18,
              backgroundColor: "#F8FAFC",
              borderWidth: 1,
              borderColor: "#E2E8F0",
            }}
          >
            <AppText variant="caption" color={colors.textDarkSecondary}>
              No audit events loaded yet. Events appear live as the transfer progresses.
            </AppText>
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            {logs.map((log, index) => {
              const color = auditStatusColor(log.status);
              const metadataLines = metadataSummary(log.metadata);

              return (
                <View key={log.id} style={{ flexDirection: "row", gap: 12 }}>
                  <View style={{ alignItems: "center" }}>
                    <View
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: `${color}22`,
                        borderWidth: 1,
                        borderColor: color,
                      }}
                    >
                      <AppText variant="caption" style={{ color, fontWeight: "900" }}>
                        {log.status === "SUCCESS" ? "✓" : log.status === "FAILED" ? "!" : index + 1}
                      </AppText>
                    </View>

                    {index < logs.length - 1 ? (
                      <View
                        style={{
                          width: 2,
                          height: metadataLines.length ? 72 : 52,
                          backgroundColor: "#E2E8F0",
                        }}
                      />
                    ) : null}
                  </View>

                  <View
                    style={{
                      flex: 1,
                      padding: 13,
                      borderRadius: 18,
                      backgroundColor: "#F8FAFC",
                      borderWidth: 1,
                      borderColor: "#E2E8F0",
                      gap: 6,
                    }}
                  >
                    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
                      <AppText
                        variant="body"
                        color={colors.textDarkPrimary}
                        style={{ fontWeight: "900", flex: 1 }}
                      >
                        {formatEventType(log.event_type)}
                      </AppText>

                      <AppText variant="caption" style={{ color, fontWeight: "900" }}>
                        {log.status}
                      </AppText>
                    </View>

                    <AppText variant="caption" color={colors.textDarkSecondary}>
                      {log.message}
                    </AppText>

                    <AppText variant="caption" color={colors.textDarkMuted}>
                      {formatAuditTime(log.created_at)}
                    </AppText>

                    {metadataLines.length > 0 ? (
                      <View style={{ gap: 3 }}>
                        {metadataLines.map((line) => (
                          <AppText key={line} variant="caption" color={colors.textDarkMuted}>
                            {line}
                          </AppText>
                        ))}
                      </View>
                    ) : null}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>
    </AppCard>
  );
}
