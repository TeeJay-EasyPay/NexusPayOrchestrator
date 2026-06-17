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

function formatDate(ts: string): string {
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
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
      eyebrow="NOTIFICATIONS"
      title="Notifications"
      subtitle="Persona-specific transfer updates and received-payment messages."
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
              🔔 {badgeCount}
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
          items.map((item) => (
            <AppCard key={item.id}>
              <View style={{ gap: 6 }}>
                <AppText variant="subheading" color={consumerColors.text} style={{ fontWeight: "800" }}>
                  {item.title}
                </AppText>
                <AppText variant="body" color={consumerColors.muted}>{item.message}</AppText>
                <AppText variant="caption" color={consumerColors.muted}>Date: {formatDate(item.createdAt)}</AppText>
                <AppText variant="caption" color={item.read ? consumerColors.success : "#B45309"}>
                  {item.read ? "Read" : "Unread"}
                </AppText>
              </View>
            </AppCard>
          ))
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
