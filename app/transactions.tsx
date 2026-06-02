import { Feather } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, TextInput, View } from "react-native";

import { AppCard } from "../src/components/ui/AppCard";
import { AppText } from "../src/components/ui/AppText";
import { Screen } from "../src/components/ui/Screen";
import { useTransfer } from "../src/state/TransferContext";
import { colors, spacing } from "../src/theme";
import { Transfer, TransferStatus } from "../src/types/transfer";

type StatusFilter = "ALL" | TransferStatus;
type DateFilter = "ALL" | "7D" | "30D" | "90D";

const STATUS_FILTERS: StatusFilter[] = ["ALL", "COMPLETED", "IN_PROGRESS", "FAILED", "CREATED"];
const DATE_FILTERS: { value: DateFilter; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "7D", label: "7 days" },
  { value: "30D", label: "30 days" },
  { value: "90D", label: "90 days" },
];

function formatAmount(value: number) {
  return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(timestamp: number) {
  return new Date(timestamp).toLocaleString([], {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function transferReference(transferId: string) {
  const year = new Date().getFullYear();
  const numeric = transferId.replace(/\D/g, "").slice(-8);
  return `NXP-${year}-${(numeric || transferId.slice(-8)).toUpperCase()}`;
}

function recipientName(transfer: Transfer) {
  const explicitName = transfer.recipient.name?.trim();
  if (explicitName) return explicitName;

  return (
    [transfer.recipient.firstName, transfer.recipient.middleName, transfer.recipient.surname]
      .filter(Boolean)
      .join(" ")
      .trim() || "Recipient"
  );
}

function payoutLabel(transfer: Transfer) {
  if (transfer.recipient.payoutMethod === "BANK") {
    return transfer.recipient.bankName || "Bank account";
  }

  return transfer.recipient.mobileWalletProvider || "Mobile wallet";
}

function routeSummary(transfer: Transfer) {
  const route = transfer.selectedRoute;
  if (!route) return "Route not selected";
  return `${route.provider} - ${route.rail} - ${route.estimatedTime}`;
}

function getStatusTone(status: TransferStatus) {
  if (status === "COMPLETED") return { bg: "#DCFCE7", fg: "#166534" };
  if (status === "FAILED") return { bg: "#FEE2E2", fg: "#991B1B" };
  if (status === "IN_PROGRESS" || status === "VERIFYING_STATUS") return { bg: "#DBEAFE", fg: "#1D4ED8" };
  return { bg: colors.goldSoft, fg: "#8A6218" };
}

function StatusBadge({ status }: { status: TransferStatus }) {
  const tone = getStatusTone(status);

  return (
    <View
      style={{
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: tone.bg,
        alignSelf: "flex-start",
      }}
    >
      <AppText variant="caption" style={{ color: tone.fg, fontWeight: "900" }}>
        {status.replace(/_/g, " ")}
      </AppText>
    </View>
  );
}

function FilterChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingHorizontal: 12,
        paddingVertical: 9,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: active ? "#0B3F4A" : "#DDE6EF",
        backgroundColor: active ? "#0B3F4A" : "#F8FAFC",
      }}
    >
      <AppText
        variant="caption"
        style={{
          color: active ? colors.gold : colors.textDarkSecondary,
          fontWeight: "900",
        }}
      >
        {label}
      </AppText>
    </Pressable>
  );
}

export default function TransactionsScreen() {
  const { completedTransfers, isLoadingTransfers, hydrateTransfers } = useTransfer();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [corridorFilter, setCorridorFilter] = useState("ALL");
  const [dateFilter, setDateFilter] = useState<DateFilter>("ALL");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const corridors = useMemo(() => {
    const unique = new Set(
      completedTransfers.map((transfer) => `${transfer.senderCurrency}->${transfer.recipient.currency}`)
    );
    return ["ALL", ...Array.from(unique).sort()];
  }, [completedTransfers]);

  const filteredTransfers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const now = Date.now();
    const dateWindowMs =
      dateFilter === "7D"
        ? 7 * 24 * 60 * 60 * 1000
        : dateFilter === "30D"
        ? 30 * 24 * 60 * 60 * 1000
        : dateFilter === "90D"
        ? 90 * 24 * 60 * 60 * 1000
        : null;

    return completedTransfers.filter((transfer) => {
      const corridor = `${transfer.senderCurrency}->${transfer.recipient.currency}`;
      const searchable = [
        transfer.id,
        transferReference(transfer.id),
        recipientName(transfer),
        transfer.recipient.country,
        transfer.recipient.currency,
        transfer.status,
        transfer.selectedRoute?.provider,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      if (normalizedQuery && !searchable.includes(normalizedQuery)) return false;
      if (statusFilter !== "ALL" && transfer.status !== statusFilter) return false;
      if (corridorFilter !== "ALL" && corridor !== corridorFilter) return false;
      if (dateWindowMs && now - transfer.createdAt > dateWindowMs) return false;

      return true;
    });
  }, [completedTransfers, corridorFilter, dateFilter, query, statusFilter]);

  async function refreshTransactions() {
    setRefreshing(true);
    setErrorMessage(null);

    try {
      await hydrateTransfers();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to refresh transaction history.");
    } finally {
      setRefreshing(false);
    }
  }

  async function copyReference(reference: string) {
    await Clipboard.setStringAsync(reference);
    Alert.alert("Reference copied", reference);
  }

  function repeatTransfer(transfer: Transfer) {
    const recipient = transfer.recipient;

    router.push({
      pathname: "/send",
      params: {
        amount: String(transfer.senderAmount),
        country: recipient.country,
        payoutMethod: recipient.payoutMethod,
        provider: recipient.payoutMethod === "BANK" ? recipient.bankName ?? "" : recipient.mobileWalletProvider ?? "",
        firstName: recipient.firstName ?? "",
        middleName: recipient.middleName ?? "",
        surname: recipient.surname ?? "",
        bankCode: recipient.bankCode ?? "",
        accountNumber: recipient.accountNumber ?? "",
        mobileNumber: recipient.mobileNumber ?? "",
      },
    });
  }

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={{ gap: spacing.md, paddingTop: 10, paddingBottom: 40 }}>
          <View style={{ gap: 6 }}>
            <AppText variant="caption" color={colors.gold}>
              TRANSFERS
            </AppText>
            <AppText variant="title" color={colors.textPrimary}>
              Transaction Centre
            </AppText>
            <AppText variant="body" color={colors.textSecondary}>
              Search, filter, repeat and reference your NexusPay transfer history.
            </AppText>
          </View>

          <AppCard>
            <View style={{ gap: 14 }}>
              <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
                <View
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 21,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "#0B3F4A",
                  }}
                >
                  <Feather name="search" size={18} color={colors.gold} />
                </View>

                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Search recipient, reference, corridor or provider"
                  placeholderTextColor={colors.textDarkMuted}
                  style={{
                    flex: 1,
                    minHeight: 48,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: "#DDE6EF",
                    backgroundColor: "#F8FAFC",
                    paddingHorizontal: 12,
                    color: colors.textDarkPrimary,
                    fontSize: 15,
                  }}
                />
              </View>

              <View style={{ gap: 8 }}>
                <AppText variant="caption" color={colors.textDarkMuted}>
                  Status
                </AppText>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {STATUS_FILTERS.map((status) => (
                    <FilterChip
                      key={status}
                      label={status === "ALL" ? "All" : status.replace(/_/g, " ")}
                      active={statusFilter === status}
                      onPress={() => setStatusFilter(status)}
                    />
                  ))}
                </View>
              </View>

              <View style={{ gap: 8 }}>
                <AppText variant="caption" color={colors.textDarkMuted}>
                  Corridor
                </AppText>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {corridors.map((corridor) => (
                    <FilterChip
                      key={corridor}
                      label={corridor === "ALL" ? "All corridors" : corridor}
                      active={corridorFilter === corridor}
                      onPress={() => setCorridorFilter(corridor)}
                    />
                  ))}
                </View>
              </View>

              <View style={{ gap: 8 }}>
                <AppText variant="caption" color={colors.textDarkMuted}>
                  Date
                </AppText>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {DATE_FILTERS.map((item) => (
                    <FilterChip
                      key={item.value}
                      label={item.label}
                      active={dateFilter === item.value}
                      onPress={() => setDateFilter(item.value)}
                    />
                  ))}
                </View>
              </View>
            </View>
          </AppCard>

          <View style={{ flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "space-between" }}>
            <AppText variant="caption" color={colors.textMuted}>
              {filteredTransfers.length} result{filteredTransfers.length === 1 ? "" : "s"}
            </AppText>

            <Pressable
              onPress={refreshTransactions}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 999,
                backgroundColor: "#0B3F4A",
              }}
            >
              <Feather name="refresh-cw" size={14} color={colors.gold} />
              <AppText variant="caption" color={colors.gold} style={{ fontWeight: "900" }}>
                {refreshing || isLoadingTransfers ? "Refreshing" : "Refresh"}
              </AppText>
            </Pressable>
          </View>

          {errorMessage ? (
            <AppCard>
              <AppText variant="subheading" color="#991B1B">
                History unavailable
              </AppText>
              <AppText variant="caption" color={colors.textDarkSecondary} style={{ marginTop: 6 }}>
                {errorMessage}
              </AppText>
            </AppCard>
          ) : null}

          {isLoadingTransfers && completedTransfers.length === 0 ? (
            <AppCard>
              <AppText variant="subheading" color={colors.textDarkPrimary}>
                Loading transactions
              </AppText>
              <AppText variant="caption" color={colors.textDarkSecondary} style={{ marginTop: 6 }}>
                Fetching transfer history from the current authenticated session.
              </AppText>
            </AppCard>
          ) : null}

          {!isLoadingTransfers && completedTransfers.length === 0 ? (
            <AppCard>
              <View style={{ gap: 10 }}>
                <Feather name="inbox" size={28} color="#0B3F4A" />
                <AppText variant="subheading" color={colors.textDarkPrimary}>
                  No transactions yet
                </AppText>
                <AppText variant="caption" color={colors.textDarkSecondary}>
                  Completed transfers will appear here once a transfer reaches history.
                </AppText>
                <Pressable
                  onPress={() => router.push("/send")}
                  style={{
                    alignSelf: "flex-start",
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    borderRadius: 14,
                    backgroundColor: colors.gold,
                  }}
                >
                  <AppText variant="caption" color="#07111F" style={{ fontWeight: "900" }}>
                    Send money
                  </AppText>
                </Pressable>
              </View>
            </AppCard>
          ) : null}

          {completedTransfers.length > 0 && filteredTransfers.length === 0 ? (
            <AppCard>
              <AppText variant="subheading" color={colors.textDarkPrimary}>
                No matching transactions
              </AppText>
              <AppText variant="caption" color={colors.textDarkSecondary} style={{ marginTop: 6 }}>
                Adjust search, status, corridor or date filters to widen the results.
              </AppText>
            </AppCard>
          ) : null}

          {filteredTransfers.map((transfer) => {
            const expanded = expandedId === transfer.id;
            const reference = transferReference(transfer.id);
            const corridor = `${transfer.senderCurrency}->${transfer.recipient.currency}`;

            return (
              <AppCard key={transfer.id}>
                <View style={{ gap: 12 }}>
                  <Pressable onPress={() => setExpandedId(expanded ? null : transfer.id)} style={{ gap: 10 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                      <View style={{ flex: 1, gap: 5 }}>
                        <AppText variant="subheading" color={colors.textDarkPrimary}>
                          {recipientName(transfer)}
                        </AppText>
                        <AppText variant="caption" color={colors.textDarkSecondary}>
                          {corridor} - {transfer.recipient.country} - {payoutLabel(transfer)}
                        </AppText>
                        <AppText variant="caption" color={colors.textDarkMuted}>
                          {formatDate(transfer.createdAt)}
                        </AppText>
                      </View>

                      <StatusBadge status={transfer.status} />
                    </View>

                    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                      <View>
                        <AppText variant="caption" color={colors.textDarkMuted}>
                          Sent
                        </AppText>
                        <AppText variant="body" color={colors.textDarkPrimary} style={{ fontWeight: "900" }}>
                          {transfer.senderCurrency} {formatAmount(transfer.senderAmount)}
                        </AppText>
                      </View>

                      <Feather name={expanded ? "chevron-up" : "chevron-down"} size={20} color={colors.textDarkMuted} />
                    </View>
                  </Pressable>

                  {expanded ? (
                    <View style={{ gap: 11, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#E2E8F0" }}>
                      <View style={{ gap: 4 }}>
                        <AppText variant="caption" color={colors.textDarkMuted}>
                          Receipt reference
                        </AppText>
                        <AppText variant="body" color={colors.textDarkPrimary} style={{ fontWeight: "900" }}>
                          {reference}
                        </AppText>
                      </View>

                      <View style={{ gap: 4 }}>
                        <AppText variant="caption" color={colors.textDarkMuted}>
                          Route summary
                        </AppText>
                        <AppText variant="body" color={colors.textDarkSecondary}>
                          {routeSummary(transfer)}
                        </AppText>
                      </View>

                      {transfer.selectedRoute ? (
                        <View style={{ gap: 4 }}>
                          <AppText variant="caption" color={colors.textDarkMuted}>
                            Recipient receives
                          </AppText>
                          <AppText variant="body" color={colors.textDarkPrimary} style={{ fontWeight: "900" }}>
                            {transfer.recipient.currency} {formatAmount(transfer.selectedRoute.receiveAmount)}
                          </AppText>
                        </View>
                      ) : null}

                      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                        <Pressable
                          onPress={() => repeatTransfer(transfer)}
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 6,
                            paddingHorizontal: 14,
                            paddingVertical: 10,
                            borderRadius: 14,
                            backgroundColor: colors.gold,
                          }}
                        >
                          <Feather name="repeat" size={15} color="#07111F" />
                          <AppText variant="caption" color="#07111F" style={{ fontWeight: "900" }}>
                            Repeat
                          </AppText>
                        </Pressable>

                        <Pressable
                          onPress={() => copyReference(reference)}
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 6,
                            paddingHorizontal: 14,
                            paddingVertical: 10,
                            borderRadius: 14,
                            backgroundColor: "#F8FAFC",
                            borderWidth: 1,
                            borderColor: "#DDE6EF",
                          }}
                        >
                          <Feather name="copy" size={15} color="#0B3F4A" />
                          <AppText variant="caption" color="#0B3F4A" style={{ fontWeight: "900" }}>
                            Copy reference
                          </AppText>
                        </Pressable>
                      </View>
                    </View>
                  ) : null}
                </View>
              </AppCard>
            );
          })}
        </View>
      </ScrollView>
    </Screen>
  );
}
