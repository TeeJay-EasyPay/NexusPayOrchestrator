import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { BusinessHome } from "../../src/components/business/BusinessHome";
import {
  ConsumerAction,
  ConsumerCard,
  ConsumerPill,
  ConsumerShell,
  consumerColors,
} from "../../src/components/consumer/ConsumerShell";
import { AppText } from "../../src/components/ui/AppText";
import { loadSavedRecipients } from "../../src/services/recipientService";
import { usePersona } from "../../src/state/PersonaContext";
import { useTransfer } from "../../src/state/TransferContext";
import { SavedRecipient } from "../../src/types/recipient";

function formatGbp(value: number) {
  return `GBP ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function ConsumerHomeScreen() {
  const router = useRouter();
  const { selectedPersona } = usePersona();
  const { transfer, completedTransfers, hydrateTransfers } = useTransfer();
  const [savedRecipients, setSavedRecipients] = useState<SavedRecipient[]>([]);

  function splitName(fullName?: string) {
    const parts = (fullName ?? "").trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return { firstName: "", surname: "" };
    if (parts.length === 1) return { firstName: parts[0], surname: "" };
    return { firstName: parts[0], surname: parts[parts.length - 1] };
  }

  function resendFromTransfer(item: (typeof completedTransfers)[number]) {
    const split = splitName(item.recipient?.name);

    router.push(
      {
        pathname: "/consumer/send",
        params: {
          amount: String(item.senderAmount),
          firstName: item.recipient?.firstName ?? split.firstName,
          surname: item.recipient?.surname ?? split.surname,
          country: item.recipient?.country,
          bankName: item.recipient?.bankName,
          bankCode: item.recipient?.bankCode,
          accountNumber: item.recipient?.accountNumber,
          fundingMethod: item.fundingMethod,
          fundingReference: item.fundingReference,
        },
      } as never
    );
  }

  function resendFromFavorite(recipient: SavedRecipient) {
    const latest = completedTransfers.find((item) => {
      const sameCountry = item.recipient?.country === recipient.country;
      const sameName = (item.recipient?.name ?? "") === recipient.name;
      const sameAccount =
        (item.recipient?.accountNumber ?? "") === (recipient.accountNumber ?? "");

      return sameCountry && (sameAccount || sameName);
    });

    const split = splitName(recipient.name);

    router.push(
      {
        pathname: "/consumer/send",
        params: {
          amount: String(latest?.senderAmount ?? 250),
          firstName: recipient.firstName ?? split.firstName,
          surname: recipient.surname ?? split.surname,
          country: recipient.country,
          bankName: recipient.bankName,
          bankCode: recipient.bankCode,
          accountNumber: recipient.accountNumber,
          fundingMethod: latest?.fundingMethod,
          fundingReference: latest?.fundingReference,
        },
      } as never
    );
  }

  useEffect(() => {
    void hydrateTransfers();
    void loadSavedRecipients().then((rows) => {
      setSavedRecipients(rows);
    });
  }, [hydrateTransfers]);

  const recent = useMemo(() => completedTransfers.slice(0, 3), [completedTransfers]);
  const favorites = useMemo(
    () => savedRecipients.filter((item) => item.isFavorite).slice(0, 10),
    [savedRecipients]
  );
  const totalSent = useMemo(
    () => completedTransfers.reduce((sum, item) => sum + item.senderAmount, 0),
    [completedTransfers]
  );

  if (selectedPersona.id === "corporate-demo" || selectedPersona.participantType === "BUSINESS") {
    return <BusinessHome />;
  }

  return (
    <ConsumerShell
      eyebrow="HOME"
      title="Good afternoon"
      subtitle="Send, track, and repeat transfers from one personal workspace."
    >
      <ConsumerCard accent>
        <View style={styles.heroRow}>
          <View style={styles.heroIcon}>
            <Feather name="send" size={22} color={consumerColors.white} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText color={consumerColors.muted} variant="caption" style={styles.kicker}>
              PERSONAL TRANSFERS
            </AppText>
            <AppText color={consumerColors.blueDark} style={styles.heroTitle}>
              Ready to send
            </AppText>
            <AppText color={consumerColors.muted} style={styles.compactCopy}>
              NexusPay moves money between your funding source and the recipient. No stored wallet.
            </AppText>
          </View>
        </View>
        <View style={styles.actionWrap}>
          <ConsumerAction label="Send money" icon="send" onPress={() => router.push("/consumer/send" as never)} />
          <ConsumerAction label="Funding sources" icon="credit-card" secondary onPress={() => router.push("/payment-methods" as never)} />
        </View>
      </ConsumerCard>

      <View style={styles.summaryGrid}>
        <MiniStat icon="shield" label="Security" value="Protected" />
        <MiniStat icon="repeat" label="Saved recipients" value={String(favorites.length)} />
        <MiniStat icon="trending-up" label="Sent" value={formatGbp(totalSent)} wide />
      </View>

      <ConsumerCard>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <AppText color={consumerColors.text} style={styles.sectionTitle}>
              Active transfer
            </AppText>
            <AppText color={consumerColors.muted} style={styles.compactCopy}>
              {transfer
                ? `${transfer.recipient?.name ?? "Recipient"} - ${transfer.status}`
                : "No active transfer"}
            </AppText>
          </View>
          <ConsumerPill label={transfer ? "LIVE" : "IDLE"} tone={transfer ? "green" : "blue"} />
        </View>
        <ConsumerAction label="View transfer" icon="arrow-right" secondary onPress={() => router.push("/consumer/track" as never)} />
      </ConsumerCard>

      <ConsumerCard>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <AppText color={consumerColors.text} style={styles.sectionTitle}>
              Personal controls
            </AppText>
            <AppText color={consumerColors.muted} style={styles.compactCopy}>
              Payment methods, alerts, profile, and Nexus AI.
            </AppText>
          </View>
          <ConsumerPill label="Secure" tone="blue" />
        </View>
        <ConsumerAction label="Open settings" icon="settings" secondary onPress={() => router.push("/consumer/settings" as never)} />
      </ConsumerCard>

      <ConsumerCard>
        <View style={styles.cardHeader}>
          <AppText color={consumerColors.text} style={styles.sectionTitle}>
            Favorites
          </AppText>
          <ConsumerPill label={`${favorites.length}/10`} tone="blue" />
        </View>
        {favorites.length === 0 ? (
          <AppText color={consumerColors.muted} style={styles.compactCopy}>
            Favorite recipients appear here for faster repeat payments.
          </AppText>
        ) : null}
        {favorites.map((item) => (
          <View key={item.id} style={styles.listRow}>
            <View style={{ flex: 1 }}>
              <AppText color={consumerColors.text} style={{ fontWeight: "900" }}>
                {item.name}
              </AppText>
              <AppText color={consumerColors.muted}>
                {item.country} - {item.currency}
              </AppText>
            </View>
            <Pressable onPress={() => resendFromFavorite(item)} style={styles.iconButton}>
              <Feather name="repeat" size={15} color={consumerColors.blue} />
            </Pressable>
          </View>
        ))}
      </ConsumerCard>

      <ConsumerCard>
        <View style={styles.cardHeader}>
          <AppText color={consumerColors.text} style={styles.sectionTitle}>
            Recent activity
          </AppText>
          <ConsumerPill label={recent.length > 0 ? "Updated" : "New"} tone="green" />
        </View>
        {recent.length === 0 ? (
          <AppText color={consumerColors.muted} style={styles.compactCopy}>No completed transfers yet.</AppText>
        ) : null}
        {recent.map((item) => (
          <View key={item.id} style={styles.listRow}>
            <View style={{ flex: 1 }}>
              <AppText color={consumerColors.text} style={{ fontWeight: "900" }}>
                {item.recipient?.name ?? "Recipient"}
              </AppText>
              <AppText color={consumerColors.muted}>
                {formatGbp(item.senderAmount)} - {item.recipient?.country ?? "Destination"} - {item.status}
              </AppText>
            </View>
            <Pressable onPress={() => resendFromTransfer(item)} style={styles.iconButton}>
              <Feather name="repeat" size={15} color={consumerColors.blue} />
            </Pressable>
          </View>
        ))}
        <ConsumerAction label="View transfers" icon="list" secondary onPress={() => router.push("/consumer/transfers" as never)} />
      </ConsumerCard>
    </ConsumerShell>
  );
}

function MiniStat({
  icon,
  label,
  value,
  wide = false,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: string;
  wide?: boolean;
}) {
  return (
    <View style={[styles.miniStat, wide && styles.miniStatWide]}>
      <View style={styles.miniIcon}>
        <Feather name={icon} size={16} color={consumerColors.blue} />
      </View>
      <AppText variant="caption" color={consumerColors.muted}>
        {label}
      </AppText>
      <AppText color={consumerColors.text} style={styles.miniValue} numberOfLines={1}>
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  heroRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  heroIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: consumerColors.blue,
    alignItems: "center",
    justifyContent: "center",
  },
  kicker: {
    fontWeight: "900",
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: "900",
  },
  compactCopy: {
    lineHeight: 20,
  },
  actionWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  miniStat: {
    flexGrow: 1,
    flexBasis: "47%",
    minHeight: 104,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: consumerColors.border,
    backgroundColor: consumerColors.white,
    padding: 13,
    gap: 6,
  },
  miniStatWide: {
    flexBasis: "100%",
  },
  miniIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: consumerColors.blueSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  miniValue: {
    fontSize: 18,
    fontWeight: "900",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
  },
  sectionTitle: {
    fontWeight: "900",
    fontSize: 18,
  },
  listRow: {
    borderTopWidth: 1,
    borderTopColor: consumerColors.border,
    paddingTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: consumerColors.border,
    backgroundColor: consumerColors.white,
  },
});
