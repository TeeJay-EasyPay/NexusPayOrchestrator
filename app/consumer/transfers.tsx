import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, TextInput, View } from "react-native";

import {
    ConsumerAction,
    ConsumerCard,
    ConsumerPill,
    ConsumerShell,
    consumerColors,
} from "../../src/components/consumer/ConsumerShell";
import { AppText } from "../../src/components/ui/AppText";
import {
  loadSavedRecipients,
  toggleRecipientFavorite,
} from "../../src/services/recipientService";
import { useTransfer } from "../../src/state/TransferContext";
import { SavedRecipient } from "../../src/types/recipient";
import { Transfer } from "../../src/types/transfer";

type StatusFilter = "ALL" | "COMPLETED" | "FAILED" | "IN_PROGRESS";

function formatAmount(value: number) {
  return `GBP ${value.toFixed(2)}`;
}

export default function ConsumerTransfersScreen() {
  const router = useRouter();
  const { completedTransfers, isLoadingTransfers, hydrateTransfers } = useTransfer();
  const [savedRecipients, setSavedRecipients] = useState<SavedRecipient[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [search, setSearch] = useState("");
  const [openTransferId, setOpenTransferId] = useState<string | null>(null);

  function recipientKeyFromTransfer(transfer: Transfer) {
    const recipient = transfer.recipient;

    return [
      recipient?.country,
      recipient?.payoutMethod,
      recipient?.accountNumber ?? recipient?.mobileNumber ?? recipient?.name,
    ]
      .filter(Boolean)
      .join("-");
  }

  function recipientKeyFromSavedRecipient(recipient: SavedRecipient) {
    return [
      recipient.country,
      recipient.payoutMethod,
      recipient.accountNumber ?? recipient.mobileNumber ?? recipient.name,
    ]
      .filter(Boolean)
      .join("-");
  }

  function splitName(fullName?: string) {
    const parts = (fullName ?? "").trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return { firstName: "", surname: "" };
    if (parts.length === 1) return { firstName: parts[0], surname: "" };
    return { firstName: parts[0], surname: parts[parts.length - 1] };
  }

  function resendTransfer(transfer: Transfer) {
    const recipient = transfer.recipient;
    const split = splitName(recipient?.name);

    router.push(
      {
        pathname: "/consumer/send",
        params: {
          amount: String(transfer.senderAmount),
          firstName: recipient?.firstName ?? split.firstName,
          surname: recipient?.surname ?? split.surname,
          country: recipient?.country,
          bankName: recipient?.bankName,
          bankCode: recipient?.bankCode,
          accountNumber: recipient?.accountNumber,
          fundingMethod: transfer.fundingMethod,
          fundingReference: transfer.fundingReference,
        },
      } as never
    );
  }

  async function refreshRecipients() {
    const rows = await loadSavedRecipients();
    setSavedRecipients(rows);
  }

  useEffect(() => {
    void hydrateTransfers();
    void refreshRecipients();
  }, [hydrateTransfers]);

  const savedRecipientByKey = useMemo(() => {
    const map = new Map<string, SavedRecipient>();
    savedRecipients.forEach((item) => {
      map.set(recipientKeyFromSavedRecipient(item), item);
    });
    return map;
  }, [savedRecipients]);

  const filteredTransfers = useMemo(() => {
    const query = search.trim().toLowerCase();

    return completedTransfers.filter((transfer) => {
      if (statusFilter !== "ALL" && transfer.status !== statusFilter) {
        return false;
      }

      if (!query) {
        return true;
      }

      const haystack = [
        transfer.id,
        transfer.recipient?.name,
        transfer.recipient?.country,
        transfer.selectedRoute?.provider,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [completedTransfers, search, statusFilter]);

  return (
    <ConsumerShell
      eyebrow="TRANSFERS"
      title="Real transfer history"
      subtitle="User-scoped history with filtering, search, transfer detail drill-down and repeat preparation."
    >
      <ConsumerCard>
        <AppText color={consumerColors.text} style={{ fontWeight: "900", fontSize: 18 }}>
          Search and filters
        </AppText>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search by reference, recipient or destination"
          placeholderTextColor={consumerColors.muted}
          style={{
            borderWidth: 1,
            borderColor: consumerColors.border,
            borderRadius: 8,
            paddingHorizontal: 12,
            paddingVertical: 10,
            color: consumerColors.text,
            backgroundColor: consumerColors.white,
          }}
        />
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {(["ALL", "COMPLETED", "FAILED", "IN_PROGRESS"] as const).map((filter) => (
            <Pressable key={filter} onPress={() => setStatusFilter(filter)}>
              <ConsumerPill label={filter === "ALL" ? "All status" : filter} tone={statusFilter === filter ? "green" : "blue"} />
            </Pressable>
          ))}
        </View>
      </ConsumerCard>

      {isLoadingTransfers ? (
        <ConsumerCard>
          <AppText color={consumerColors.muted}>Loading transfer history...</AppText>
        </ConsumerCard>
      ) : null}

      {filteredTransfers.map((transfer) => (
        <ConsumerCard key={transfer.id}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <AppText color={consumerColors.text} style={{ fontWeight: "900", fontSize: 18 }}>
                {transfer.recipient?.name ?? "Recipient"}
              </AppText>
              <AppText color={consumerColors.muted}>
                {formatAmount(transfer.senderAmount)} to {transfer.recipient?.country ?? "Destination"}
              </AppText>
              <AppText color={consumerColors.muted}>{transfer.id}</AppText>
            </View>
            <ConsumerPill label={transfer.status} tone={transfer.status === "COMPLETED" ? "green" : "gold"} />
          </View>
          <AppText color={consumerColors.text} style={{ fontWeight: "900" }}>
            Amount received: {transfer.selectedRoute?.receiveAmount?.toFixed(2) ?? "-"} {transfer.recipient?.currency ?? ""}
          </AppText>

          <View style={{ flexDirection: "row", gap: 8 }}>
            <Pressable
              onPress={() => resendTransfer(transfer)}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 1,
                borderColor: consumerColors.border,
                backgroundColor: consumerColors.white,
              }}
            >
              <Feather name="repeat" size={16} color={consumerColors.blue} />
            </Pressable>

            <Pressable
              onPress={() => {
                const recipient = savedRecipientByKey.get(recipientKeyFromTransfer(transfer));
                if (!recipient) return;

                void toggleRecipientFavorite(recipient).then(() => {
                  void refreshRecipients();
                });
              }}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 1,
                borderColor: consumerColors.border,
                backgroundColor: consumerColors.white,
              }}
            >
              <Feather
                name="star"
                size={16}
                color={savedRecipientByKey.get(recipientKeyFromTransfer(transfer))?.isFavorite ? "#D97706" : consumerColors.muted}
              />
            </Pressable>
          </View>

          <Pressable
            onPress={() => setOpenTransferId((current) => (current === transfer.id ? null : transfer.id))}
            style={{
              borderWidth: 1,
              borderColor: consumerColors.border,
              borderRadius: 8,
              paddingHorizontal: 10,
              paddingVertical: 8,
              backgroundColor: consumerColors.white,
              alignSelf: "flex-start",
            }}
          >
            <AppText variant="caption" style={{ color: consumerColors.blue, fontWeight: "900" }}>
              {openTransferId === transfer.id ? "Hide details" : "View details"}
            </AppText>
          </Pressable>

          {openTransferId === transfer.id ? (
            <View
              style={{
                borderWidth: 1,
                borderColor: consumerColors.border,
                borderRadius: 8,
                padding: 12,
                gap: 4,
                backgroundColor: consumerColors.white,
              }}
            >
              <AppText color={consumerColors.muted}>Provider: {transfer.selectedRoute?.provider ?? "Nexus Route Engine"}</AppText>
              <AppText color={consumerColors.muted}>Rail: {transfer.selectedRoute?.rail ?? "Pending"}</AppText>
              <AppText color={consumerColors.muted}>Fee: GBP {transfer.selectedRoute?.fee?.toFixed(2) ?? "0.00"}</AppText>
              <AppText color={consumerColors.muted}>ETA: {transfer.selectedRoute?.estimatedTime ?? "Unknown"}</AppText>
              <AppText color={consumerColors.muted}>Funding: {transfer.fundingMethod ?? "Not captured"}</AppText>
              <AppText color={consumerColors.muted}>Funding reference: {transfer.fundingReference ?? "Not captured"}</AppText>
              <AppText color={consumerColors.muted}>Bank: {transfer.recipient?.bankName ?? "Not captured"}</AppText>
              <AppText color={consumerColors.muted}>Sort code: {transfer.recipient?.bankCode ?? "Not captured"}</AppText>
              <AppText color={consumerColors.muted}>Account: {transfer.recipient?.accountNumber ?? "Not captured"}</AppText>
            </View>
          ) : null}

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            <ConsumerAction
              label="Repeat"
              icon="repeat"
              onPress={() => resendTransfer(transfer)}
            />
            <ConsumerAction label="Receipt" icon="file-text" secondary onPress={() => setOpenTransferId(transfer.id)} />
          </View>
        </ConsumerCard>
      ))}

      {!isLoadingTransfers && filteredTransfers.length === 0 ? (
        <ConsumerCard accent>
          <AppText color={consumerColors.muted}>
            No transfers match your filters yet. Create a transfer from Send to build history.
          </AppText>
        </ConsumerCard>
      ) : null}
    </ConsumerShell>
  );
}
