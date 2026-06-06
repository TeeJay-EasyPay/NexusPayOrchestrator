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
import { useTransfer } from "../../src/state/TransferContext";

type StatusFilter = "ALL" | "COMPLETED" | "FAILED" | "IN_PROGRESS";

function formatAmount(value: number) {
  return `GBP ${value.toFixed(2)}`;
}

export default function ConsumerTransfersScreen() {
  const router = useRouter();
  const { completedTransfers, isLoadingTransfers, hydrateTransfers } = useTransfer();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [search, setSearch] = useState("");
  const [openTransferId, setOpenTransferId] = useState<string | null>(null);

  useEffect(() => {
    void hydrateTransfers();
  }, [hydrateTransfers]);

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
            </View>
          ) : null}

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            <ConsumerAction
              label="Repeat"
              icon="repeat"
              onPress={() =>
                router.push(
                  {
                    pathname: "/consumer/send",
                    params: {
                      amount: String(transfer.senderAmount),
                      recipientId: transfer.recipient?.name ? "" : undefined,
                      name: transfer.recipient?.name,
                      country: transfer.recipient?.country,
                      currency: transfer.recipient?.currency,
                    },
                  } as never
                )
              }
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
