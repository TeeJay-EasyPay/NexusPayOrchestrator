import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { View } from "react-native";

import { AppButton } from "../src/components/ui/AppButton";
import { AppCard } from "../src/components/ui/AppCard";
import { AppText } from "../src/components/ui/AppText";
import { usePersonaNotifications } from "../src/hooks/usePersonaNotifications";
import { loadNotifications, markAllNotificationsRead } from "../src/services/notificationService";
import { seedDemoParticipantsIfMissing } from "../src/services/participantService";
import { usePersona } from "../src/state/PersonaContext";
import { NotificationRecord } from "../src/types/multiEntity";
import { ConsumerAction, ConsumerShell, consumerColors } from "../src/components/consumer/ConsumerShell";

type NotificationGroup = "Payments" | "Batch Payments" | "Approvals" | "System Events";

function formatDate(ts: string): string {
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

function getNotificationGroup(item: NotificationRecord): NotificationGroup {
  const text = `${item.title} ${item.message}`.toLowerCase();
  if (text.includes("batch")) return "Batch Payments";
  if (text.includes("approval") || text.includes("authoris")) return "Approvals";
  if (text.includes("transfer") || text.includes("payment")) return "Payments";
  return "System Events";
}

export default function ParticipantNotificationsScreen() {
  const router = useRouter();
  const { selectedPersona } = usePersona();
  const participantId = selectedPersona.participantId;

  const [items, setItems] = useState<NotificationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const { unreadCount, refresh: refreshUnread } = usePersonaNotifications(participantId);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      await seedDemoParticipantsIfMissing();
      const rows = participantId ? await loadNotifications(participantId) : [];
      if (mounted) {
        setItems(rows);
        setLoading(false);
      }
    }

    void load();

    return () => {
      mounted = false;
    };
  }, [participantId]);

  const fallbackUnreadCount = items.filter((n) => !n.read).length;
  const badgeCount = unreadCount || fallbackUnreadCount;
  const groups: NotificationGroup[] = ["Payments", "Batch Payments", "Approvals", "System Events"];
  const isBusinessPersona = selectedPersona.participantType === "BUSINESS";

  async function markRead() {
    if (!participantId || busy) return;
    setBusy(true);
    await markAllNotificationsRead(participantId);
    const rows = await loadNotifications(participantId);
    setItems(rows);
    await refreshUnread();
    setBusy(false);
  }

  return (
    <ConsumerShell
      eyebrow={isBusinessPersona ? "BUSINESS NOTIFICATIONS" : "NOTIFICATIONS"}
      title={isBusinessPersona ? "Business notifications" : "Notifications"}
      subtitle={isBusinessPersona ? "Payment updates, batch activity, approvals, and system messages." : "Persona-specific transfer updates and received-payment messages."}
    >
        <AppCard>
          <View style={{ gap: 4, marginBottom: 10 }}>
            <AppText variant="caption" color={consumerColors.muted}>Persona details</AppText>
            <AppText variant="caption" color={consumerColors.text}>
              {selectedPersona.bankName
                ? `${selectedPersona.bankName} ****${selectedPersona.accountLast4 ?? ""}`
                : "No participant bank account linked"}
            </AppText>
            <AppText variant="caption" color={consumerColors.muted}>
              {selectedPersona.country ?? "Personal account"}
            </AppText>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <AppText variant="subheading" color={consumerColors.text} style={{ fontWeight: "800" }}>
              {badgeCount}
            </AppText>
            <AppText variant="caption" color={consumerColors.muted}>
              Unread notifications
            </AppText>
          </View>
        </AppCard>

        {loading ? (
          <AppCard>
            <AppText variant="body" color={consumerColors.text}>Loading notifications...</AppText>
          </AppCard>
        ) : !participantId ? (
          <AppCard>
            <AppText variant="body" color={consumerColors.text}>
              No persona-specific notification inbox is linked to this account.
            </AppText>
          </AppCard>
        ) : items.length === 0 ? (
          <AppCard>
            <AppText variant="body" color={consumerColors.text}>No notifications yet.</AppText>
          </AppCard>
        ) : (
          groups.map((group) => {
            const groupItems = items.filter((item) => getNotificationGroup(item) === group);
            if (groupItems.length === 0) return null;

            return (
              <AppCard key={group}>
                <View style={{ gap: 12 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <AppText variant="subheading" color={consumerColors.text} style={{ fontWeight: "900" }}>
                        {group}
                      </AppText>
                      <AppText variant="caption" color={consumerColors.muted}>
                        {groupItems.filter((item) => !item.read).length} unread
                      </AppText>
                    </View>
                    <View style={{
                      minWidth: 34,
                      minHeight: 28,
                      borderRadius: 14,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: "#DDF4F2",
                      paddingHorizontal: 9,
                    }}>
                      <AppText variant="caption" color="#087C89" style={{ fontWeight: "900" }}>
                        {groupItems.length}
                      </AppText>
                    </View>
                  </View>

                  {groupItems.map((item) => (
                    <View
                      key={item.id}
                      style={{
                        borderTopWidth: 1,
                        borderTopColor: "#D7E7E5",
                        paddingTop: 10,
                        flexDirection: "row",
                        gap: 10,
                      }}
                    >
                      <View
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: 5,
                          marginTop: 5,
                          backgroundColor: item.read ? "#087C89" : "#B7791F",
                        }}
                      />
                      <View style={{ flex: 1, gap: 4 }}>
                        <AppText variant="body" color={consumerColors.text} style={{ fontWeight: "900" }}>
                          {item.title}
                        </AppText>
                        <AppText variant="body" color={consumerColors.muted}>{item.message}</AppText>
                        <AppText variant="caption" color={consumerColors.muted}>Date: {formatDate(item.createdAt)}</AppText>
                      </View>
                      <AppText variant="caption" color={item.read ? consumerColors.success : "#B45309"} style={{ fontWeight: "900" }}>
                        {item.read ? "Read" : "Unread"}
                      </AppText>
                    </View>
                  ))}
                </View>
              </AppCard>
            );
          })
        )}

        <AppButton
          title={busy ? "Updating..." : "Mark all as read"}
          onPress={markRead}
          disabled={busy || badgeCount === 0 || !participantId}
          variant="secondary"
        />

        <ConsumerAction
          label="Open received transfers"
          icon="download"
          onPress={() => router.push("/received-transfers" as never)}
        />
    </ConsumerShell>
  );
}

