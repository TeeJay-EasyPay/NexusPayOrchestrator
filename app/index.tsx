import { Feather } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
    Pressable,
    ScrollView,
    useWindowDimensions,
    View,
} from "react-native";

import { NexusAIToggleCard } from "../src/components/intelligence/NexusAIToggleCard";
import { AppCard } from "../src/components/ui/AppCard";
import { AppText } from "../src/components/ui/AppText";
import { Screen } from "../src/components/ui/Screen";
import { useNexusAIScreenSetting } from "../src/hooks/useNexusAISettings";
import { buildCorridorHealth, CorridorHealth } from "../src/lib/corridorHealth";
import { fetchCorridorFxRates, fetchFxRate, FxRate } from "../src/lib/fxFeed";
import { supabase } from "../src/lib/supabase";
import { useTransfer } from "../src/state/TransferContext";
import { useWallet } from "../src/state/WalletContext";
import { colors, spacing } from "../src/theme";

const FX_BASELINES: Record<string, number> = {
  PHP: 72.93,
  MYR: 5.71,
  USD: 1.35,
};

const CITY_BY_COUNTRY: Record<string, string> = {
  Philippines: "Manila",
  Malaysia: "Kuala Lumpur",
  "United Arab Emirates": "Dubai",
};

type FxSnapshot = {
  pair: string;
  to: string;
  rate: number;
  delta: number;
  direction: "up" | "down" | "flat";
};

type RecommendedCorridor = {
  corridor: string;
  score: number;
  liquidity: string;
  settlement: string;
  badge: string;
};

function formatMoney(value: number) {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function getGreeting() {
  const hour = new Date().getHours();

  if (hour < 12) return "Good Morning";
  if (hour < 18) return "Good Afternoon";
  return "Good Evening";
}

function getDisplayNameFromEmail(email?: string) {
  if (!email) return "User";

  return (email.includes("@") ? email.split("@")[0] : email)
    .replace(/[._-]+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatTimeAgo(timestamp: number) {
  const diffMinutes = Math.max(1, Math.round((Date.now() - timestamp) / 60000));

  if (diffMinutes < 60) return `${diffMinutes} min ago`;

  const hours = Math.round(diffMinutes / 60);

  if (hours < 24) return `${hours} hr ago`;

  const days = Math.round(hours / 24);
  return `${days} day ago`;
}

function transferReference(transferId?: string) {
  const year = new Date().getFullYear();
  const numeric = (transferId ?? "").replace(/\D/g, "").slice(-8);
  const suffix = (numeric || "1234").padStart(8, "0");

  return `NXP-${year}-${suffix}`;
}

function getProgressPercent(status?: string) {
  if (status === "CREATED") return 12;
  if (status === "ROUTES_FETCHED") return 30;
  if (status === "ROUTE_SELECTED") return 45;
  if (status === "FUNDING_SELECTED") return 62;
  if (status === "FUNDING_AUTHORISED") return 78;
  if (status === "IN_PROGRESS") return 88;
  if (status === "COMPLETED") return 100;

  return 14;
}

function toFxSnapshot(rate: FxRate): FxSnapshot {
  const baseline = FX_BASELINES[rate.to] ?? rate.rate;
  const delta = Number((rate.rate - baseline).toFixed(2));

  return {
    pair: `${rate.from}/${rate.to}`,
    to: rate.to,
    rate: rate.rate,
    delta,
    direction: delta > 0 ? "up" : delta < 0 ? "down" : "flat",
  };
}

function buildRecommendedCorridors(
  corridors: CorridorHealth[],
  usdRate: FxRate | null
): RecommendedCorridor[] {
  const dynamic = corridors.map((item) => ({
    corridor: item.corridor,
    score: item.overallScore,
    liquidity: item.status === "Excellent" ? "Strong" : "Healthy",
    settlement: item.to === "PHP" ? "< 2 minutes" : "< 4 minutes",
    badge: item.status === "Excellent" ? "Preferred" : "Normal Ops",
  }));

  const usdSynthetic: RecommendedCorridor = {
    corridor: "GBP → USD",
    score: usdRate ? 90 : 86,
    liquidity: "Strong",
    settlement: "< 3 minutes",
    badge: "Deep Liquidity",
  };

  return [...dynamic, usdSynthetic].sort((a, b) => b.score - a.score).slice(0, 3);
}

function BalanceAction({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flex: 1,
        minWidth: 138,
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingVertical: 14,
        paddingHorizontal: 12,
        borderRadius: 14,
        backgroundColor: "#F8FAFC",
        borderWidth: 1,
        borderColor: "#E2E8F0",
      }}
    >
      <View
        style={{
          width: 38,
          height: 38,
          borderRadius: 19,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#083C47",
        }}
      >
        <Feather name={icon} size={18} color="#FFFFFF" />
      </View>

      <AppText
        variant="body"
        color={colors.textDarkPrimary}
        style={{ fontWeight: "800", flexShrink: 1 }}
      >
        {label}
      </AppText>
    </Pressable>
  );
}

function StatusBadge({ label }: { label: string }) {
  return (
    <View
      style={{
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: "#DCFCE7",
      }}
    >
      <AppText variant="caption" style={{ color: "#166534", fontWeight: "900" }}>
        {label}
      </AppText>
    </View>
  );
}

function QuickTile({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        width: "48.5%",
        minHeight: 64,
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingHorizontal: 12,
        borderRadius: 14,
        backgroundColor: "#FFFFFF",
        borderWidth: 1,
        borderColor: "#E2E8F0",
      }}
    >
      <Feather name={icon} size={19} color="#0B3F4A" />
      <AppText
        variant="body"
        color={colors.textDarkPrimary}
        style={{ fontWeight: "800", flexShrink: 1 }}
      >
        {label}
      </AppText>
    </Pressable>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const wideLayout = width >= 760;

  const { gbpBalance } = useWallet();
  const { transfer, completedTransfers } = useTransfer();

  const {
    loading: nexusAILoading,
    enabled: homeAIEnabled,
    disabled: homeAIDisabled,
    settings,
    toggle: toggleHomeAI,
  } = useNexusAIScreenSetting("home_enabled");

  const [displayName, setDisplayName] = useState("User");
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState("");
  const [corridorHealth, setCorridorHealth] = useState<CorridorHealth[]>([]);
  const [fxSnapshots, setFxSnapshots] = useState<FxSnapshot[]>([]);

  useEffect(() => {
    let mounted = true;

    async function loadSignedInUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!mounted) return;
      setDisplayName(getDisplayNameFromEmail(user?.email));
    }

    loadSignedInUser();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    loadDashboardData();

    const interval = setInterval(() => {
      loadDashboardData();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  async function loadDashboardData() {
    try {
      const [corridorRates, usdRate] = await Promise.all([
        fetchCorridorFxRates(),
        fetchFxRate("GBP", "USD").catch(() => null),
      ]);

      const safeUsdRate: FxRate =
        usdRate ??
        ({
          from: "GBP",
          to: "USD",
          rate: 1.34,
          date: new Date().toISOString().slice(0, 10),
          source: "MOCK_FALLBACK",
          provider: "Mock Fallback",
          providerStatus: "Protected fallback pricing",
        } as FxRate);

      setCorridorHealth(buildCorridorHealth(corridorRates));
      setFxSnapshots([...corridorRates, safeUsdRate].map(toFxSnapshot));
      setLastRefresh(
        new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    } catch (error) {
      console.log("Failed to load home dashboard", error);
      setCorridorHealth([]);
      setFxSnapshots([]);
    } finally {
      setLoading(false);
    }
  }

  const activeTransfer = transfer && transfer.status !== "COMPLETED" ? transfer : null;
  const activeProgress = getProgressPercent(activeTransfer?.status);

  const recentTransactions = useMemo(
    () => completedTransfers.slice(0, 3),
    [completedTransfers]
  );

  const latestReference = useMemo(
    () => transferReference((recentTransactions[0] ?? activeTransfer)?.id),
    [recentTransactions, activeTransfer]
  );

  const recommendedCorridors = useMemo(() => {
    const usdRate = fxSnapshots.find((item) => item.to === "USD");

    return buildRecommendedCorridors(
      corridorHealth,
      usdRate
        ? {
            from: "GBP",
            to: "USD",
            rate: usdRate.rate,
            date: new Date().toISOString().slice(0, 10),
            source: "LIVE",
            provider: "Frankfurter",
            providerStatus: "Live",
          }
        : null
    );
  }, [corridorHealth, fxSnapshots]);

  function handleResend(transferItem: (typeof recentTransactions)[number]) {
    const recipient = transferItem.recipient;

    router.push({
      pathname: "/send",
      params: {
        amount: String(transferItem.senderAmount),
        country: recipient.country,
        payoutMethod: recipient.payoutMethod,
        provider:
          recipient.payoutMethod === "BANK"
            ? recipient.bankName ?? ""
            : recipient.mobileWalletProvider ?? "",
        firstName: recipient.firstName ?? "",
        middleName: recipient.middleName ?? "",
        surname: recipient.surname ?? "",
        bankCode: recipient.bankCode ?? "",
        accountNumber: recipient.accountNumber ?? "",
        mobileNumber: recipient.mobileNumber ?? "",
      },
    });
  }

  async function copyReference() {
    await Clipboard.setStringAsync(latestReference);
  }

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={{ gap: spacing.md, paddingBottom: 40 }}>
          <NexusAIToggleCard
            title="Nexus AI"
            description="Controls home dashboard intelligence, operational summaries and route guidance on this screen."
            enabled={homeAIEnabled}
            disabled={homeAIDisabled}
            loading={nexusAILoading}
            onToggle={toggleHomeAI}
          />

          <AppCard>
            <View style={{ gap: 14 }}>
              <View style={{ gap: 5 }}>
                <AppText variant="heading" color={colors.textDarkPrimary} style={{ fontWeight: "900" }}>
                  {getGreeting()}, {displayName}
                </AppText>

                <AppText variant="caption" color={colors.textDarkSecondary}>
                  Available Balance
                </AppText>

                <AppText variant="title" color="#062A37" style={{ fontSize: 54, fontWeight: "900" }}>
                  £{formatMoney(gbpBalance)}
                </AppText>
              </View>

              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                <BalanceAction icon="arrow-up-right" label="Send Money" onPress={() => router.push("/send")} />
                <BalanceAction icon="plus" label="Add Funds" onPress={() => router.push("/funding")} />
                <BalanceAction icon="clock" label="Transaction History" onPress={() => router.push("/account")} />
              </View>
            </View>
          </AppCard>

          {homeAIEnabled ? (
            <AppCard>
              <View style={{ gap: 12 }}>
                <AppText variant="heading" color={colors.textDarkPrimary} style={{ fontWeight: "900" }}>
                  Global Value Transfer Intelligence
                </AppText>

                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  <StatusBadge label="Markets Open" />
                  <StatusBadge label="Liquidity Strong" />
                  <StatusBadge label="Network Healthy" />
                </View>

                <View
                  style={{
                    flexDirection: wideLayout ? "row" : "column",
                    gap: 14,
                    paddingVertical: 4,
                  }}
                >
                  <View style={{ flex: 1, gap: 6 }}>
                    <AppText variant="subheading" color={colors.textDarkPrimary} style={{ fontWeight: "900" }}>
                      Nexus AI Summary
                    </AppText>

                    <AppText variant="body" color={colors.textDarkSecondary}>
                      {recommendedCorridors[0]?.corridor ?? "GBP → PHP"} remains the strongest consumer corridor today.
                    </AppText>

                    <AppText variant="body" color={colors.textDarkSecondary}>
                      Settlement conditions are stable across major routes and treasury pressure remains controlled.
                    </AppText>

                    <AppText variant="body" color={colors.textDarkSecondary}>
                      Current sensitivity profile: {settings?.sensitivity ?? "balanced"}.
                    </AppText>
                  </View>

                  <View
                    style={{
                      minWidth: 160,
                      borderLeftWidth: wideLayout ? 1 : 0,
                      borderTopWidth: wideLayout ? 0 : 1,
                      borderColor: "#E2E8F0",
                      alignItems: "center",
                      justifyContent: "center",
                      paddingTop: wideLayout ? 0 : 14,
                    }}
                  >
                    <Feather name="cpu" size={52} color="#0B3F4A" />
                    <AppText variant="subheading" color="#0B3F4A" style={{ fontWeight: "900" }}>
                      NEXUS AI
                    </AppText>
                  </View>
                </View>

                <View
                  style={{
                    borderTopWidth: 1,
                    borderTopColor: "#E2E8F0",
                    paddingTop: 10,
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <AppText variant="caption" color={colors.textDarkMuted}>
                    Generated by Nexus AI
                  </AppText>

                  <AppText variant="caption" color={colors.textDarkMuted}>
                    {settings?.sensitivity ?? "balanced"} sensitivity
                  </AppText>
                </View>
              </View>
            </AppCard>
          ) : (
            <AppCard>
              <AppText variant="subheading" color={colors.textDarkPrimary} style={{ fontWeight: "900" }}>
                Nexus AI disabled for this screen
              </AppText>
              <AppText variant="caption" color={colors.textDarkSecondary} style={{ marginTop: 6 }}>
                Enable home intelligence from Nexus AI settings to restore executive summaries and route insights.
              </AppText>
            </AppCard>
          )}

          <View style={{ flexDirection: wideLayout ? "row" : "column", gap: 12 }}>
            <AppCard style={{ flex: 1 }}>
              <View style={{ gap: 10 }}>
                <AppText variant="subheading" color={colors.textDarkPrimary} style={{ fontWeight: "900" }}>
                  Top Recommended Corridors
                </AppText>

                {loading ? (
                  <AppText variant="caption" color={colors.textDarkSecondary}>
                    Building corridor recommendations...
                  </AppText>
                ) : (
                  recommendedCorridors.map((item, index) => (
                    <View
                      key={`${item.corridor}-${index}`}
                      style={{
                        gap: 4,
                        paddingBottom: 10,
                        borderBottomWidth: index === recommendedCorridors.length - 1 ? 0 : 1,
                        borderBottomColor: "#E2E8F0",
                      }}
                    >
                      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                        <AppText variant="body" color={colors.textDarkPrimary} style={{ fontWeight: "900" }}>
                          {index + 1}. {item.corridor}
                        </AppText>
                        <StatusBadge label={item.badge} />
                      </View>

                      <AppText variant="caption" color={colors.textDarkSecondary}>
                        Score: {item.score.toFixed(1)} • Liquidity: {item.liquidity}
                      </AppText>

                      <AppText variant="caption" color={colors.textDarkSecondary}>
                        Expected settlement: {item.settlement}
                      </AppText>
                    </View>
                  ))
                )}
              </View>
            </AppCard>

            <AppCard style={{ flex: 1 }}>
              <View style={{ gap: 10 }}>
                <AppText variant="subheading" color={colors.textDarkPrimary} style={{ fontWeight: "900" }}>
                  Live FX Snapshot
                </AppText>

                {loading ? (
                  <AppText variant="caption" color={colors.textDarkSecondary}>
                    Loading FX snapshots...
                  </AppText>
                ) : (
                  fxSnapshots.map((item) => {
                    const positive = item.direction === "up";
                    const neutral = item.direction === "flat";

                    return (
                      <View
                        key={item.pair}
                        style={{
                          paddingBottom: 10,
                          borderBottomWidth: 1,
                          borderBottomColor: "#E2E8F0",
                          gap: 5,
                        }}
                      >
                        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                          <AppText variant="body" color={colors.textDarkPrimary} style={{ fontWeight: "900" }}>
                            {item.pair}
                          </AppText>

                          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                            <AppText variant="body" color={colors.textDarkPrimary} style={{ fontWeight: "900" }}>
                              {item.rate.toFixed(2)}
                            </AppText>
                            <Feather
                              name={
                                neutral ? "minus" : positive ? "trending-up" : "trending-down"
                              }
                              size={16}
                              color={neutral ? colors.textDarkMuted : positive ? "#16A34A" : "#DC2626"}
                            />
                          </View>
                        </View>

                        <AppText
                          variant="caption"
                          style={{
                            color: neutral ? colors.textDarkMuted : positive ? "#16A34A" : "#DC2626",
                            fontWeight: "800",
                          }}
                        >
                          {item.delta > 0 ? "+" : ""}
                          {item.delta.toFixed(2)}
                        </AppText>
                      </View>
                    );
                  })
                )}
              </View>
            </AppCard>
          </View>

          <View style={{ flexDirection: wideLayout ? "row" : "column", gap: 12 }}>
            <AppCard style={{ flex: 1 }}>
              <View style={{ gap: 12 }}>
                <AppText variant="subheading" color={colors.textDarkPrimary} style={{ fontWeight: "900" }}>
                  Treasury & Liquidity Status
                </AppText>

                {[
                  { label: "Treasury Capacity", value: 91, tone: "Healthy" },
                  { label: "Liquidity Coverage", value: 98, tone: "Excellent" },
                  { label: "XRPL Network Health", value: 99.98, tone: "Optimal" },
                ].map((metric) => (
                  <View key={metric.label} style={{ gap: 6 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                      <AppText variant="caption" color={colors.textDarkSecondary}>
                        {metric.label}
                      </AppText>

                      <AppText variant="body" color={colors.textDarkPrimary} style={{ fontWeight: "900" }}>
                        {metric.value}%
                      </AppText>
                    </View>

                    <View
                      style={{
                        height: 8,
                        borderRadius: 999,
                        backgroundColor: "#E2E8F0",
                        overflow: "hidden",
                      }}
                    >
                      <View
                        style={{
                          width: `${Math.min(100, metric.value)}%`,
                          height: "100%",
                          backgroundColor: "#16A34A",
                        }}
                      />
                    </View>

                    <StatusBadge label={metric.tone} />
                  </View>
                ))}
              </View>
            </AppCard>

            <AppCard style={{ flex: 1 }}>
              <View style={{ gap: 10 }}>
                <AppText variant="subheading" color={colors.textDarkPrimary} style={{ fontWeight: "900" }}>
                  Active Transfers
                </AppText>

                {activeTransfer ? (
                  <>
                    <AppText variant="body" color={colors.textDarkPrimary} style={{ fontWeight: "900" }}>
                      {activeTransfer.id.slice(0, 8).toUpperCase()}
                    </AppText>

                    <AppText variant="body" color={colors.textDarkSecondary}>
                      {activeTransfer.senderCurrency} → {activeTransfer.recipient.currency}
                    </AppText>

                    <View
                      style={{
                        height: 9,
                        borderRadius: 999,
                        backgroundColor: "#E2E8F0",
                        overflow: "hidden",
                      }}
                    >
                      <View
                        style={{
                          width: `${activeProgress}%`,
                          height: "100%",
                          backgroundColor: "#0E8A92",
                        }}
                      />
                    </View>

                    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                      <AppText variant="caption" color={colors.textDarkSecondary}>
                        Est. Settlement: &lt; 2 minutes
                      </AppText>
                      <AppText variant="caption" color={colors.textDarkSecondary}>
                        {activeProgress}%
                      </AppText>
                    </View>
                  </>
                ) : (
                  <AppText variant="caption" color={colors.textDarkSecondary}>
                    No active transfer right now. Start a new transfer to monitor live settlement progress.
                  </AppText>
                )}
              </View>
            </AppCard>
          </View>

          <AppCard>
            <View style={{ gap: 10 }}>
              <AppText variant="subheading" color={colors.textDarkPrimary} style={{ fontWeight: "900" }}>
                Transaction History (Recent)
              </AppText>

              {recentTransactions.length === 0 ? (
                <AppText variant="caption" color={colors.textDarkSecondary}>
                  No completed transfers yet.
                </AppText>
              ) : (
                recentTransactions.map((item) => (
                  <View
                    key={item.id}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 10,
                      paddingBottom: 10,
                      borderBottomWidth: 1,
                      borderBottomColor: "#E2E8F0",
                    }}
                  >
                    <View style={{ flex: 1, gap: 2 }}>
                      <AppText variant="body" color={colors.textDarkPrimary} style={{ fontWeight: "800" }}>
                        {item.senderCurrency} → {item.recipient.currency}  £{item.senderAmount.toFixed(2)}
                      </AppText>

                      <AppText variant="caption" color={colors.textDarkSecondary}>
                        {CITY_BY_COUNTRY[item.recipient.country] ?? item.recipient.country} • {formatTimeAgo(item.createdAt)}
                      </AppText>
                    </View>

                    <Pressable
                      onPress={() => handleResend(item)}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 7,
                        borderRadius: 999,
                        borderWidth: 1,
                        borderColor: "#D4DEE8",
                        backgroundColor: "#F8FAFC",
                      }}
                    >
                      <AppText variant="caption" color="#0B3F4A" style={{ fontWeight: "900" }}>
                        Resend
                      </AppText>
                    </Pressable>
                  </View>
                ))
              )}
            </View>
          </AppCard>

          <View
            style={{
              borderRadius: 14,
              borderWidth: 1,
              borderColor: "#1C4568",
              backgroundColor: "#07233C",
              paddingHorizontal: 12,
              paddingVertical: 10,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
              <Feather name="file-text" size={16} color={colors.gold} />

              <View style={{ flex: 1 }}>
                <AppText variant="caption" color={colors.textMuted}>
                  Transfer Reference
                </AppText>
                <AppText variant="body" color={colors.white} style={{ fontWeight: "900" }}>
                  {latestReference}
                </AppText>
              </View>
            </View>

            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Pressable onPress={copyReference}>
                <AppText variant="caption" color={colors.gold} style={{ fontWeight: "900" }}>
                  Copy Reference
                </AppText>
              </Pressable>

              <Pressable onPress={() => router.push("/track")}>
                <AppText variant="caption" color={colors.gold} style={{ fontWeight: "900" }}>
                  Track
                </AppText>
              </Pressable>
            </View>
          </View>

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "space-between" }}>
            <QuickTile icon="map-pin" label="Route Intelligence" onPress={() => router.push("/routes")} />
            <QuickTile icon="radio" label="Live Intelligence" onPress={() => router.push("/live-intelligence-feeds")} />
            <QuickTile icon="briefcase" label="Operations Centre" onPress={() => router.push("/operations")} />
            <QuickTile icon="cpu" label="Nexus AI" onPress={() => router.push("/nexus-ai" as never)} />
          </View>

          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 10,
            }}
          >
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              <AppText variant="caption" color={colors.gold}>Bank-Grade Security</AppText>
              <AppText variant="caption" color={colors.gold}>Encrypted</AppText>
              <AppText variant="caption" color={colors.gold}>Regulated</AppText>
            </View>

            <AppText variant="caption" color={colors.textMuted}>
              NexusPay v{Constants.expoConfig?.version ?? "1.0.0"}
            </AppText>
          </View>

          <AppText variant="caption" color={colors.textMuted} style={{ textAlign: "right" }}>
            Refreshed {lastRefresh || "--:--"}
          </AppText>
        </View>
      </ScrollView>
    </Screen>
  );
}
