import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { ScrollView, View } from "react-native";

import { RecentTransactionHistoryCard } from "../src/components/transactions/RecentTransactionHistoryCard";
import { AppButton } from "../src/components/ui/AppButton";
import { AppCard } from "../src/components/ui/AppCard";
import { AppText } from "../src/components/ui/AppText";
import { Screen } from "../src/components/ui/Screen";
import {
  buildCorridorHealth,
  CorridorHealth,
} from "../src/lib/corridorHealth";
import { fetchCorridorFxRates, FxRate } from "../src/lib/fxFeed";
import { colors, spacing } from "../src/theme";

function formatLastRefresh() {
  return new Date().toLocaleString([], {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatPercent(value: number) {
  return `${Math.round(value)}%`;
}

function formatFxDate(value: string) {
  if (!value) return "Just now";

  if (value.length > 16) {
    return value.slice(0, 16).replace("T", " ");
  }

  return value;
}

function getStatusColor(status: CorridorHealth["status"]) {
  if (status === "Excellent") return "#16A34A";
  if (status === "Healthy") return "#0EA5E9";
  if (status === "Watch") return "#F59E0B";
  return "#DC2626";
}

function getRailNote(item: CorridorHealth) {
  if (item.source === "MOCK_FALLBACK") {
    return "Live FX unavailable. Protected fallback pricing is active.";
  }

  if (item.status === "Excellent") {
    return "Strong liquidity, partner health and volatility profile.";
  }

  if (item.status === "Healthy") {
    return "Good route quality with live monitoring enabled.";
  }

  if (item.status === "Watch") {
    return "Route available, but volatility or partner conditions need attention.";
  }

  return "Restricted route. Use fallback rail or wait for better conditions.";
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <View
      style={{
        flex: 1,
        padding: 11,
        borderRadius: 16,
        backgroundColor: "#F8FAFC",
        borderWidth: 1,
        borderColor: "#E2E8F0",
        gap: 4,
      }}
    >
      <AppText variant="caption" color={colors.textDarkMuted}>
        {label}
      </AppText>

      <AppText variant="body" color={colors.textDarkPrimary} style={{ fontWeight: "900" }}>
        {value}
      </AppText>
    </View>
  );
}

function CorridorCard({
  item,
  matchedFxRate,
}: {
  item: CorridorHealth;
  matchedFxRate?: FxRate;
}) {
  const statusColor = getStatusColor(item.status);

  return (
    <View
      style={{
        padding: 16,
        borderRadius: 22,
        backgroundColor: "#F8FAFC",
        borderWidth: 1,
        borderColor: "#E2E8F0",
        gap: 12,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 12,
        }}
      >
        <View style={{ flex: 1, gap: 4 }}>
          <AppText variant="caption" color={colors.textDarkMuted}>
            Corridor intelligence
          </AppText>

          <AppText variant="subheading" color={colors.textDarkPrimary} style={{ fontWeight: "900" }}>
            {item.corridor}
          </AppText>

          <AppText variant="caption" color={colors.textDarkSecondary}>
            {matchedFxRate?.provider ?? "Route engine"} • {matchedFxRate?.source ?? item.source}
          </AppText>
        </View>

        <View
          style={{
            backgroundColor: statusColor,
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 999,
          }}
        >
          <AppText variant="caption" style={{ color: "#FFFFFF", fontWeight: "900" }}>
            {item.status}
          </AppText>
        </View>
      </View>

      <View
        style={{
          padding: 14,
          borderRadius: 18,
          backgroundColor: "#0B3F4A",
          gap: 8,
        }}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
          <View>
            <AppText variant="caption" color="#BFEAF1">
              Live FX
            </AppText>

            <AppText variant="title" color="#FFFFFF">
              {item.fxRate.toFixed(2)}
            </AppText>
          </View>

          <View style={{ alignItems: "flex-end" }}>
            <AppText variant="caption" color="#BFEAF1">
              Route confidence
            </AppText>

            <AppText variant="title" color={colors.gold}>
              {formatPercent(item.overallScore)}
            </AppText>
          </View>
        </View>
      </View>

      <View style={{ flexDirection: "row", gap: 8 }}>
        <MiniMetric label="Liquidity" value={formatPercent(item.liquidityScore)} />
        <MiniMetric label="Partner" value={formatPercent(item.partnerHealth)} />
        <MiniMetric label="Volatility" value={`${item.volatilityRisk}/100`} />
      </View>

      <AppText variant="caption" color={colors.textDarkSecondary}>
        {getRailNote(item)} • Updated {formatFxDate(matchedFxRate?.date ?? "")}
      </AppText>
    </View>
  );
}

export default function HomeScreen() {
  const router = useRouter();

  const [fxRates, setFxRates] = useState<FxRate[]>([]);
  const [corridorHealth, setCorridorHealth] = useState<CorridorHealth[]>([]);
  const [loadingFx, setLoadingFx] = useState(true);
  const [lastRefreshTime, setLastRefreshTime] = useState("");

  useEffect(() => {
    loadCorridorData();

    const interval = setInterval(() => {
      loadCorridorData();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const corridorSummary = useMemo(() => {
    if (corridorHealth.length === 0) {
      return {
        averageScore: 0,
        liveRails: 0,
        fallbackRails: 0,
        bestCorridor: "Pending",
      };
    }

    const averageScore = Math.round(
      corridorHealth.reduce((sum, item) => sum + item.overallScore, 0) /
        corridorHealth.length
    );

    const liveRails = corridorHealth.filter((item) => item.source === "LIVE").length;
    const fallbackRails = corridorHealth.length - liveRails;
    const bestCorridor = [...corridorHealth].sort(
      (a, b) => b.overallScore - a.overallScore
    )[0]?.corridor;

    return {
      averageScore,
      liveRails,
      fallbackRails,
      bestCorridor: bestCorridor ?? "Pending",
    };
  }, [corridorHealth]);

  async function loadCorridorData() {
    try {
      const rates = await fetchCorridorFxRates();
      setFxRates(rates);
      setCorridorHealth(buildCorridorHealth(rates));
      setLastRefreshTime(formatLastRefresh());
    } catch (error) {
      console.log("Failed to load corridor intelligence", error);
      setFxRates([]);
      setCorridorHealth([]);
    } finally {
      setLoadingFx(false);
    }
  }

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={{ gap: spacing.lg, paddingBottom: 40 }}>
          <View style={{ gap: 8 }}>
            <AppText variant="caption" color={colors.gold}>
              NexusPay Orchestrator
            </AppText>

            <AppText variant="title" color={colors.textPrimary}>
              Move value smarter
            </AppText>

            <AppText variant="body" color={colors.textSecondary}>
              Fund transfers from saved bank or card sources, then let NexusPay route payout through the best available rails.
            </AppText>
          </View>

          <View
            style={{
              padding: 18,
              borderRadius: 26,
              backgroundColor: "#0B3F4A",
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.14)",
              gap: 14,
            }}
          >
            <View style={{ gap: 4 }}>
              <AppText variant="caption" color="#BFEAF1">
                Non-custodial funding model
              </AppText>

              <AppText variant="title" color="#FFFFFF">
                No in-app balance held
              </AppText>

              <AppText variant="body" color="#DDEAF4">
                Saved cards and bank connections are used to authorise each transfer at payment time.
              </AppText>
            </View>

            <View style={{ flexDirection: "row", gap: 8 }}>
              <View
                style={{
                  flex: 1,
                  padding: 11,
                  borderRadius: 16,
                  backgroundColor: "rgba(255,255,255,0.10)",
                  gap: 4,
                }}
              >
                <AppText variant="caption" color="#BFEAF1">
                  Funding
                </AppText>

                <AppText variant="body" color="#FFFFFF" style={{ fontWeight: "900" }}>
                  Bank / Card
                </AppText>
              </View>

              <View
                style={{
                  flex: 1,
                  padding: 11,
                  borderRadius: 16,
                  backgroundColor: "rgba(255,255,255,0.10)",
                  gap: 4,
                }}
              >
                <AppText variant="caption" color="#BFEAF1">
                  Custody
                </AppText>

                <AppText variant="body" color="#FFFFFF" style={{ fontWeight: "900" }}>
                  External
                </AppText>
              </View>
            </View>

            <AppButton title="Start Transfer" onPress={() => router.push("/send")} />
          </View>

          <AppCard>
            <View style={{ gap: 12 }}>
              <AppText variant="subheading" color={colors.textDarkPrimary}>
                Exchange Rates
              </AppText>

              <AppText variant="caption" color={colors.textDarkSecondary}>
                Provider-aware live rates with automatic fallback protection.
              </AppText>

              {loadingFx ? (
                <AppText variant="body" color={colors.textDarkSecondary}>
                  Loading live FX data...
                </AppText>
              ) : fxRates.length === 0 ? (
                <AppText variant="body" color={colors.textDarkSecondary}>
                  No FX rates available yet.
                </AppText>
              ) : (
                <View style={{ gap: 10 }}>
                  {fxRates.map((item) => (
                    <View
                      key={`${item.from}-${item.to}`}
                      style={{
                        padding: 14,
                        borderRadius: 16,
                        backgroundColor: "#F9FAFB",
                        borderWidth: 1,
                        borderColor: "#E5E7EB",
                        gap: 6,
                      }}
                    >
                      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
                        <AppText variant="body" color={colors.textDarkPrimary} style={{ fontWeight: "700" }}>
                          {item.from} → {item.to}
                        </AppText>

                        <AppText variant="body" color={colors.gold} style={{ fontWeight: "700" }}>
                          {item.rate.toFixed(2)}
                        </AppText>
                      </View>

                      <AppText variant="caption" color={colors.textDarkSecondary}>
                        Feed: {item.provider ?? "Unknown"} • {item.source}
                      </AppText>

                      <AppText variant="caption" color={colors.textDarkMuted}>
                        Rate date: {item.date}
                      </AppText>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </AppCard>

          <RecentTransactionHistoryCard />

          <AppCard>
            <View style={{ gap: 12 }}>
              <View style={{ gap: 4 }}>
                <AppText variant="subheading" color={colors.textDarkPrimary}>
                  Corridor Command Centre (LIVE OTA)
                </AppText>

                <AppText variant="caption" color={colors.textDarkMuted}>
                  Live FX, provider failover, route confidence, and corridor risk.
                </AppText>
              </View>

              <View
                style={{
                  padding: 16,
                  borderRadius: 22,
                  backgroundColor: "#0B3F4A",
                  gap: 12,
                }}
              >
                <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <AppText variant="caption" color="#BFEAF1">
                      Engine confidence
                    </AppText>

                    <AppText variant="title" color={colors.gold}>
                      {loadingFx ? "..." : formatPercent(corridorSummary.averageScore)}
                    </AppText>
                  </View>

                  <View style={{ flex: 1, alignItems: "flex-end" }}>
                    <AppText variant="caption" color="#BFEAF1">
                      Best corridor
                    </AppText>

                    <AppText variant="body" color="#FFFFFF" style={{ fontWeight: "900", textAlign: "right" }}>
                      {loadingFx ? "Scanning" : corridorSummary.bestCorridor}
                    </AppText>
                  </View>
                </View>

                <View style={{ flexDirection: "row", gap: 8 }}>
                  <MiniMetric label="Live rails" value={loadingFx ? "-" : String(corridorSummary.liveRails)} />
                  <MiniMetric label="Fallback rails" value={loadingFx ? "-" : String(corridorSummary.fallbackRails)} />
                  <MiniMetric label="Refresh" value="30s" />
                </View>

                <AppText variant="caption" color="#BFEAF1">
                  Last refreshed: {lastRefreshTime || "Loading..."}
                </AppText>
              </View>

              {loadingFx ? (
                <AppText variant="body" color={colors.textDarkSecondary}>
                  Building corridor intelligence...
                </AppText>
              ) : corridorHealth.length === 0 ? (
                <AppText variant="body" color={colors.textDarkSecondary}>
                  No corridor intelligence available yet.
                </AppText>
              ) : (
                <View style={{ gap: 12 }}>
                  {corridorHealth.map((item) => {
                    const matchedFxRate = fxRates.find(
                      (rate) => rate.from === item.from && rate.to === item.to
                    );

                    return (
                      <CorridorCard
                        key={item.corridor}
                        item={item}
                        matchedFxRate={matchedFxRate}
                      />
                    );
                  })}
                </View>
              )}
            </View>
          </AppCard>

          <AppButton title="Start Transfer" onPress={() => router.push("/send")} />

          <AppButton
            title="View Route Intelligence"
            variant="secondary"
            onPress={() => router.push("/routes")}
          />

          <AppButton
            title="Operations Command Centre"
            variant="secondary"
            onPress={() => router.push("/operations")}
          />

          <AppButton
            title="Account & Payment Methods"
            variant="secondary"
            onPress={() => router.push("/account")}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}
