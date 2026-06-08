import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, View } from "react-native";

import {
    ConsumerAction,
    ConsumerCard,
    ConsumerPill,
    ConsumerShell,
    consumerColors,
} from "../../src/components/consumer/ConsumerShell";
import { AppText } from "../../src/components/ui/AppText";
import { loadSavedRecipients } from "../../src/services/recipientService";
import { SavedRecipient } from "../../src/types/recipient";
import { useTransfer } from "../../src/state/TransferContext";

function formatGbp(value: number) {
  return `GBP ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function ConsumerHomeScreen() {
  const router = useRouter();
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

  return (
    <ConsumerShell
      eyebrow="HOME"
      title="Good afternoon"
      subtitle="Your money movement is ready. Clear actions, trusted controls, and fast transfer visibility."
    >
      <ConsumerCard accent>
        <AppText color={consumerColors.muted} variant="caption">
          Orchestration mode
        </AppText>
        <AppText color={consumerColors.blueDark} style={{ fontSize: 40, fontWeight: "900" }}>
          No stored wallet
        </AppText>
        <AppText color={consumerColors.muted}>
          NexusPay orchestrates movement between selected funding sources and destination payout rails without holding customer balances.
        </AppText>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          <ConsumerAction label="Send money" icon="send" onPress={() => router.push("/consumer/send" as never)} />
          <ConsumerAction label="Manage funding sources" icon="credit-card" secondary onPress={() => router.push("/payment-methods" as never)} />
        </View>
      </ConsumerCard>

      <ConsumerCard accent>
        <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
          <Feather name="shield" size={22} color={consumerColors.blue} />
          <View style={{ flex: 1 }}>
            <AppText color={consumerColors.text} style={{ fontWeight: "900", fontSize: 18 }}>
              Trust indicators
            </AppText>
            <AppText color={consumerColors.muted} style={{ marginTop: 4, lineHeight: 21 }}>
              Biometric-protected access, transparent route scoring, and timeline events on every transfer.
            </AppText>
          </View>
        </View>
      </ConsumerCard>

      <ConsumerCard>
        <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <AppText color={consumerColors.text} style={{ fontWeight: "900", fontSize: 18 }}>
              Active transfer status
            </AppText>
            <AppText color={consumerColors.muted} style={{ marginTop: 4 }}>
              {transfer
                ? `${transfer.recipient?.name ?? "Recipient"} • ${transfer.status}`
                : "No active transfer"}
            </AppText>
          </View>
          <ConsumerPill label={transfer ? "LIVE" : "IDLE"} tone={transfer ? "green" : "blue"} />
        </View>
        <ConsumerAction label="View transfer" icon="arrow-right" secondary onPress={() => router.push("/consumer/track" as never)} />
      </ConsumerCard>

      <ConsumerCard accent>
        <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
          <Feather name="star" size={22} color={consumerColors.blue} />
          <View style={{ flex: 1 }}>
            <AppText color={consumerColors.text} style={{ fontWeight: "900", fontSize: 18 }}>
              Helpful insight
            </AppText>
            <AppText color={consumerColors.muted} style={{ marginTop: 4, lineHeight: 21 }}>
              {recent.length > 0
                ? `You've sent ${formatGbp(totalSent)} across ${completedTransfers.length} transfers. Your most-used destination is ${recent[0].recipient?.country ?? "saved in history"}.`
                : "Start your first transfer and NexusPay will build personalized route intelligence."}
            </AppText>
          </View>
        </View>
      </ConsumerCard>

      <ConsumerCard>
        <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <AppText color={consumerColors.text} style={{ fontWeight: "900", fontSize: 18 }}>
              Profile and controls
            </AppText>
            <AppText color={consumerColors.muted} style={{ marginTop: 4 }}>
              Manage payment methods, notification settings, and Nexus AI assistance.
            </AppText>
          </View>
          <ConsumerPill label="Secure" tone="blue" />
        </View>
        <ConsumerAction label="Open settings" icon="settings" secondary onPress={() => router.push("/consumer/settings" as never)} />
      </ConsumerCard>

      <ConsumerCard>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <AppText color={consumerColors.text} style={{ fontWeight: "900", fontSize: 18 }}>
            Favorites
          </AppText>
          <ConsumerPill label={`${favorites.length}/10`} tone="blue" />
        </View>
        {favorites.length === 0 ? (
          <AppText color={consumerColors.muted}>
            Mark recipients as favorites in Transfers to enable one-tap resend.
          </AppText>
        ) : null}
        {favorites.map((item) => (
          <View key={item.id} style={{ borderTopWidth: 1, borderTopColor: consumerColors.border, paddingTop: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
            <View style={{ flex: 1 }}>
              <AppText color={consumerColors.text} style={{ fontWeight: "900" }}>
                {item.name}
              </AppText>
              <AppText color={consumerColors.muted}>
                {item.country} • {item.currency}
              </AppText>
            </View>
            <Pressable
              onPress={() => resendFromFavorite(item)}
              style={{
                width: 34,
                height: 34,
                borderRadius: 17,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 1,
                borderColor: consumerColors.border,
                backgroundColor: consumerColors.white,
              }}
            >
              <Feather name="repeat" size={15} color={consumerColors.blue} />
            </Pressable>
          </View>
        ))}
      </ConsumerCard>

      <ConsumerCard>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <AppText color={consumerColors.text} style={{ fontWeight: "900", fontSize: 18 }}>
            Recent activity
          </AppText>
          <ConsumerPill label={recent.length > 0 ? "Updated" : "New"} tone="green" />
        </View>
        {recent.length === 0 ? (
          <AppText color={consumerColors.muted}>No completed transfers yet.</AppText>
        ) : null}
        {recent.map((item) => (
          <View key={item.id} style={{ borderTopWidth: 1, borderTopColor: consumerColors.border, paddingTop: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
            <View style={{ flex: 1 }}>
              <AppText color={consumerColors.text} style={{ fontWeight: "900" }}>
                {item.recipient?.name ?? "Recipient"}
              </AppText>
              <AppText color={consumerColors.muted}>
                {formatGbp(item.senderAmount)} sent to {item.recipient?.country ?? "Destination"} - {item.status}
              </AppText>
            </View>
            <Pressable
              onPress={() => resendFromTransfer(item)}
              style={{
                width: 34,
                height: 34,
                borderRadius: 17,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 1,
                borderColor: consumerColors.border,
                backgroundColor: consumerColors.white,
              }}
            >
              <Feather name="repeat" size={15} color={consumerColors.blue} />
            </Pressable>
          </View>
        ))}
        <ConsumerAction label="View transfers" icon="list" secondary onPress={() => router.push("/consumer/transfers" as never)} />
      </ConsumerCard>
    </ConsumerShell>
  );
}
