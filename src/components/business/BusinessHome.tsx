import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import {
  BusinessBatchTransfer,
  BusinessDashboardData,
  loadBusinessDashboardData,
} from "../../services/businessPersonaService";
import { usePersona } from "../../state/PersonaContext";
import { Transfer } from "../../types/transfer";
import { AppText } from "../ui/AppText";
import {
  ConsumerAction,
  ConsumerCard,
  ConsumerPill,
  ConsumerShell,
} from "../consumer/ConsumerShell";

const businessColors = {
  background: "#F3FAF9",
  teal: "#087C89",
  tealDark: "#064E57",
  tealSoft: "#DDF4F2",
  green: "#108A5F",
  gold: "#B7791F",
  text: "#0F2239",
  muted: "#5F728A",
  border: "#D7E7E5",
  white: "#FFFFFF",
};

function formatDate(value: string): string {
  const date = new Date(value);
  return date.toLocaleDateString(undefined, { day: "2-digit", month: "short" });
}

function formatMoney(value: number, currency = "GBP"): string {
  return `${currency} ${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function getCurrentMonthLabel(): string {
  return new Date().toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function isCurrentMonth(value: string): boolean {
  const date = new Date(value);
  const now = new Date();

  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
}

function statusLabel(status: string): string {
  if (status === "DELIVERED" || status === "COMPLETED") return "Settled";
  if (status === "IN_PROGRESS") return "In progress";
  if (status === "ROUTING") return "Routing";
  return "Pending";
}

type ActivityItem = {
  id: string;
  title: string;
  detail: string;
  amount?: string;
  date: string;
  tone: "green" | "gold" | "blue";
};

function batchActivity(item: BusinessBatchTransfer, activeParticipantId: string, currency: string): ActivityItem {
  const incoming = item.recipientParticipantId === activeParticipantId;

  return {
    id: `batch-${item.id}`,
    title: incoming ? `Payment from ${item.senderName}` : `Payment to ${item.recipientName}`,
    detail: statusLabel(item.status),
    amount: `${incoming ? "+" : "-"} ${formatMoney(item.amount, currency)}`,
    date: formatDate(item.createdAt),
    tone: item.status === "DELIVERED" ? "green" : "gold",
  };
}

function appTransferActivity(item: Transfer): ActivityItem {
  return {
    id: `transfer-${item.id}`,
    title: item.recipient?.name ?? "Transfer",
    detail: item.recipient?.country ? `Sent to ${item.recipient.country}` : "Money movement",
    amount: `- ${formatMoney(item.senderAmount, "GBP")}`,
    date: item.createdAt ? formatDate(new Date(item.createdAt).toISOString()) : "Recent",
    tone: item.status === "COMPLETED" ? "green" : "gold",
  };
}

export function BusinessHome() {
  const router = useRouter();
  const { selectedPersona } = usePersona();
  const participantId = selectedPersona.participantId;
  const [data, setData] = useState<BusinessDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function load() {
      if (!participantId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      const nextData = await loadBusinessDashboardData(participantId);
      if (mounted) {
        setData(nextData);
        setLoading(false);
      }
    }

    void load();

    return () => {
      mounted = false;
    };
  }, [participantId]);

  const participant = data?.participant;
  const isCorporatePersona = selectedPersona.id === "corporate-demo";
  const currency = participant?.currency ?? selectedPersona.currency ?? "GBP";
  const businessName = participant?.name ?? selectedPersona.label;
  const currentMonthLabel = getCurrentMonthLabel();
  const currentMonthIncoming = useMemo(
    () => (data?.incomingBatchTransfers ?? [])
      .filter((item) => isCurrentMonth(item.createdAt))
      .reduce((sum, item) => sum + item.amount, 0),
    [data?.incomingBatchTransfers],
  );
  const currentMonthOutgoing = useMemo(
    () => (data?.outgoingBatchTransfers ?? [])
      .filter((item) => isCurrentMonth(item.createdAt))
      .reduce((sum, item) => sum + item.amount, 0),
    [data?.outgoingBatchTransfers],
  );
  const currentMonthNetFlow = currentMonthIncoming - currentMonthOutgoing;
  const pendingTransfers = useMemo(
    () => [...(data?.incomingBatchTransfers ?? []), ...(data?.outgoingBatchTransfers ?? [])]
      .filter((item) => item.status !== "DELIVERED").length,
    [data?.incomingBatchTransfers, data?.outgoingBatchTransfers],
  );
  const unreadNotifications = useMemo(
    () => (data?.notifications ?? []).filter((item) => !item.read).length,
    [data?.notifications],
  );

  const activity = useMemo<ActivityItem[]>(() => {
    const batchItems = [
      ...(data?.incomingBatchTransfers ?? []),
      ...(data?.outgoingBatchTransfers ?? []),
    ].map((item) => batchActivity(item, participantId ?? "", currency));

    const transferItems = isCorporatePersona ? [] : (data?.appTransfers ?? []).slice(0, 4).map(appTransferActivity);

    const notificationItems = (data?.notifications ?? []).slice(0, 4).map((item) => ({
      id: `notification-${item.id}`,
      title: item.title,
      detail: item.message,
      date: formatDate(item.createdAt),
      tone: item.read ? "blue" as const : "gold" as const,
    }));

    return [...batchItems, ...transferItems, ...notificationItems]
      .sort((a, b) => b.id.localeCompare(a.id))
      .slice(0, 6);
  }, [currency, data?.appTransfers, data?.incomingBatchTransfers, data?.notifications, data?.outgoingBatchTransfers, isCorporatePersona, participantId]);

  return (
    <ConsumerShell
      eyebrow={isCorporatePersona ? "CORPORATE WORKSPACE" : "BUSINESS BANKING"}
      title={businessName}
      subtitle={isCorporatePersona ? "Batch payments, recipients, alerts, and received transfers." : "Payments, recipients, and monthly movement at a glance."}
    >
      <ConsumerCard>
        <View style={styles.identityTop}>
          <View style={styles.businessMark}>
            <Feather name="briefcase" size={22} color={businessColors.white} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText color={businessColors.tealDark} style={styles.businessName}>
              {businessName}
            </AppText>
            <AppText color={businessColors.muted} style={styles.compactCopy}>
              {isCorporatePersona ? "Corporate Workspace" : "Business Account"}
            </AppText>
          </View>
          <ConsumerPill label={loading ? "Syncing" : "Live"} tone={loading ? "blue" : "green"} />
        </View>

        <View style={styles.accountLine}>
          <AppText color={businessColors.text} style={styles.accountLineText}>
            {selectedPersona.country ?? participant?.country ?? "Region"} - {selectedPersona.bankName ?? participant?.bankName ?? "Settlement account"} - ****{selectedPersona.accountLast4 ?? participant?.accountLast4 ?? ""}
          </AppText>
        </View>

        <View style={styles.orchestrationRow}>
          <Feather name="shield" size={16} color={businessColors.teal} />
          <AppText color={businessColors.tealDark} style={styles.orchestrationText}>
            Payment orchestration only
          </AppText>
        </View>
        <AppText variant="caption" color={businessColors.muted}>
          NexusPay does not hold funds.
        </AppText>
      </ConsumerCard>

      <View style={styles.grid}>
        <MetricCard label={`${currentMonthLabel} net`} value={formatMoney(currentMonthNetFlow, currency)} icon="activity" tone="teal" />
        <MetricCard label="Pending" value={String(pendingTransfers)} icon="clock" tone="gold" />
        <MetricCard label="Notifications" value={String(unreadNotifications)} icon="bell" tone="teal" />
        <MetricCard label="Activity" value={String(activity.length)} icon="activity" tone="green" />
      </View>

      <ConsumerCard>
        <SectionHeader title={`${currentMonthLabel} movement`} detail="Incoming, outgoing, and net activity." />
        <View style={styles.flowRow}>
          <FlowItem label="Incoming" value={formatMoney(currentMonthIncoming, currency)} positive />
          <FlowItem label="Outgoing" value={formatMoney(currentMonthOutgoing, currency)} />
          <FlowItem label="Net Flow" value={formatMoney(currentMonthNetFlow, currency)} positive={currentMonthNetFlow >= 0} />
        </View>
      </ConsumerCard>

      <ConsumerCard>
        <SectionHeader title="Quick actions" detail="Common payment tasks." />
        <View style={styles.actionsGrid}>
          <ActionTile label="Send Payment" icon="send" onPress={() => router.push("/consumer/send" as never)} />
          <ActionTile label="Batch Payment" icon="layers" onPress={() => router.push("/corporate-payouts" as never)} />
          <ActionTile label="Recipients" icon="users" onPress={() => router.push("/business-recipients" as never)} />
          <ActionTile label="Notifications" icon="bell" onPress={() => router.push("/participant-notifications" as never)} />
          <ActionTile label="Received Transfers" icon="download" onPress={() => router.push("/received-transfers" as never)} wide />
        </View>
      </ConsumerCard>

      <ConsumerCard>
        <SectionHeader title={isCorporatePersona ? "Corporate activity" : "Business activity"} detail="Latest payment events." />
        {activity.length === 0 ? (
          <AppText color={businessColors.muted}>
            No business activity yet. Send or receive a payment to build your activity feed.
          </AppText>
        ) : null}
        {activity.map((item) => (
          <View key={item.id} style={styles.activityItem}>
            <View style={[styles.activityDot, item.tone === "green" ? styles.dotGreen : item.tone === "gold" ? styles.dotGold : styles.dotTeal]} />
            <View style={{ flex: 1 }}>
              <AppText color={businessColors.text} style={styles.activityTitle}>
                {item.title}
              </AppText>
              <AppText color={businessColors.muted} numberOfLines={2}>
                {item.detail}
              </AppText>
            </View>
            <View style={styles.activityRight}>
              {item.amount ? (
                <AppText color={item.amount.trim().startsWith("+") ? businessColors.green : businessColors.text} style={styles.activityAmount}>
                  {item.amount}
                </AppText>
              ) : null}
              <AppText variant="caption" color={businessColors.muted}>
                {item.date}
              </AppText>
            </View>
          </View>
        ))}
        <ConsumerAction label="View received transfers" icon="download" secondary onPress={() => router.push("/received-transfers" as never)} />
      </ConsumerCard>
    </ConsumerShell>
  );
}

function SectionHeader({ title, detail }: { title: string; detail: string }) {
  return (
    <View style={{ gap: 4 }}>
      <AppText color={businessColors.text} style={styles.sectionTitle}>
        {title}
      </AppText>
      <AppText color={businessColors.muted} style={styles.sectionDetail}>
        {detail}
      </AppText>
    </View>
  );
}

function MetricCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string;
  icon: keyof typeof Feather.glyphMap;
  tone: "teal" | "green" | "gold";
}) {
  const color = tone === "green" ? businessColors.green : tone === "gold" ? businessColors.gold : businessColors.teal;

  return (
    <View style={styles.metricCard}>
      <View style={[styles.metricIcon, { backgroundColor: tone === "gold" ? "#FFF4D6" : businessColors.tealSoft }]}>
        <Feather name={icon} size={17} color={color} />
      </View>
      <AppText variant="caption" color={businessColors.muted}>
        {label}
      </AppText>
      <AppText color={businessColors.text} style={styles.metricValue}>
        {value}
      </AppText>
    </View>
  );
}

function FlowItem({ label, value, positive = false }: { label: string; value: string; positive?: boolean }) {
  return (
    <View style={styles.flowItem}>
      <AppText variant="caption" color={businessColors.muted}>
        {label}
      </AppText>
      <AppText color={positive ? businessColors.green : businessColors.text} style={styles.flowValue}>
        {value}
      </AppText>
    </View>
  );
}

function ActionTile({
  label,
  icon,
  onPress,
  wide = false,
}: {
  label: string;
  icon: keyof typeof Feather.glyphMap;
  onPress: () => void;
  wide?: boolean;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.actionTile, wide && styles.actionTileWide]}>
      <Feather name={icon} size={18} color={businessColors.teal} />
      <AppText color={businessColors.text} style={styles.actionTileText}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  identityTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  businessMark: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: businessColors.teal,
    alignItems: "center",
    justifyContent: "center",
  },
  businessName: {
    fontSize: 21,
    fontWeight: "900",
  },
  compactCopy: {
    lineHeight: 20,
  },
  accountLine: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: businessColors.border,
    backgroundColor: businessColors.white,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  accountLineText: {
    fontWeight: "800",
  },
  orchestrationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 10,
    backgroundColor: "#F7FBFA",
    borderWidth: 1,
    borderColor: businessColors.border,
    paddingHorizontal: 11,
    paddingVertical: 10,
  },
  orchestrationText: {
    fontSize: 18,
    fontWeight: "900",
    flexShrink: 1,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  metricCard: {
    flexGrow: 1,
    flexBasis: "47%",
    minWidth: 146,
    minHeight: 108,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: businessColors.border,
    backgroundColor: businessColors.white,
    padding: 13,
    gap: 7,
  },
  metricIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  metricValue: {
    fontSize: 21,
    fontWeight: "900",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "900",
  },
  sectionDetail: {
    lineHeight: 20,
  },
  flowRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  flowItem: {
    flexGrow: 1,
    flexBasis: "30%",
    minWidth: 94,
    borderRadius: 10,
    backgroundColor: "#F7FBFA",
    borderWidth: 1,
    borderColor: businessColors.border,
    padding: 11,
    gap: 5,
  },
  flowValue: {
    fontWeight: "900",
  },
  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  actionTile: {
    flexGrow: 1,
    flexBasis: "47%",
    minHeight: 54,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: businessColors.border,
    backgroundColor: businessColors.white,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  actionTileWide: {
    flexBasis: "100%",
  },
  actionTileText: {
    fontWeight: "900",
    flexShrink: 1,
  },
  activityItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: businessColors.border,
    paddingTop: 11,
  },
  activityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 5,
  },
  dotGreen: {
    backgroundColor: businessColors.green,
  },
  dotGold: {
    backgroundColor: businessColors.gold,
  },
  dotTeal: {
    backgroundColor: businessColors.teal,
  },
  activityTitle: {
    fontWeight: "900",
  },
  activityRight: {
    alignItems: "flex-end",
    maxWidth: 118,
    gap: 2,
  },
  activityAmount: {
    fontWeight: "900",
    textAlign: "right",
  },
});
