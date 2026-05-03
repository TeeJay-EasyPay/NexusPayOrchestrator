import * as Clipboard from "expo-clipboard";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { ScrollView, View } from "react-native";

import { AppButton } from "../src/components/ui/AppButton";
import { AppCard } from "../src/components/ui/AppCard";
import { AppText } from "../src/components/ui/AppText";
import { Screen } from "../src/components/ui/Screen";

import {
  buildCorridorHealth,
  CorridorHealth,
} from "../src/lib/corridorHealth";
import { fetchCorridorFxRates, FxRate } from "../src/lib/fxFeed";

import { useTransfer } from "../src/state/TransferContext";
import { useWallet } from "../src/state/WalletContext";
import { colors, spacing } from "../src/theme";

function shorten(value: string | null) {
  if (!value) return "Not available";
  return `${value.slice(0, 8)}...${value.slice(-8)}`;
}

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

function getStatusColor(status: CorridorHealth["status"]) {
  if (status === "Excellent") return "#16A34A";
  if (status === "Healthy") return "#0EA5E9";
  if (status === "Watch") return "#F59E0B";
  return "#DC2626";
}

function getRailMode(item: CorridorHealth) {
  if (item.source === "MOCK_FALLBACK") return "Fallback rail active";
  if (item.volatilityRisk <= 20 && item.partnerHealth >= 90) return "Primary rail active";
  if (item.volatilityRisk >= 24) return "Monitored rail active";
  return "Optimised rail active";
}

function getRailNote(item: CorridorHealth) {
  if (item.source === "MOCK_FALLBACK") {
    return "Live FX unavailable. Engine is using protected fallback pricing.";
  }

  if (item.status === "Excellent") {
    return "Strong liquidity, partner health, and volatility profile.";
  }

  if (item.status === "Healthy") {
    return "Good route quality with live monitoring enabled.";
  }

  if (item.status === "Watch") {
    return "Route available, but volatility or partner conditions need attention.";
  }

  return "Restricted route. Use fallback rail or wait for better conditions.";
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

function MiniMetric({
  label,
  value,
  accent = colors.textDarkPrimary,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <View
      style={{
        flex: 1,
        padding: 10,
        borderRadius: 14,
        backgroundColor: "#FFFFFF",
        borderWidth: 1,
        borderColor: "#E8EEF3",
        gap: 4,
      }}
    >
      <AppText variant="caption" color={colors.textDarkMuted}>
        {label}
      </AppText>

      <AppText variant="body" style={{ color: accent, fontWeight: "800" }}>
        {value}
      </AppText>
    </View>
  );
}

function ProgressBar({ value, color }: { value: number; color: string }) {
  const safeValue = Math.max(0, Math.min(100, value));

  return (
    <View
      style={{
        height: 8,
        backgroundColor: "#E5E7EB",
        borderRadius: 999,
        overflow: "hidden",
      }}
    >
      <View
        style={{
          width: `${safeValue}%`,
          height: "100%",
          backgroundColor: color,
        }}
      />
    </View>
  );
}

function TopologyNode({
  title,
  subtitle,
  badge,
  tone = "light",
}: {
  title: string;
  subtitle: string;
  badge: string;
  tone?: "light" | "dark";
}) {
  const isDark = tone === "dark";

  return (
    <View
      style={{
        padding: 13,
        borderRadius: 18,
        backgroundColor: isDark ? "#0B3F4A" : "#FFFFFF",
        borderWidth: 1,
        borderColor: isDark ? "rgba(255,255,255,0.16)" : "#E8EEF3",
        gap: 6,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 10,
        }}
      >
        <AppText
          variant="body"
          style={{
            color: isDark ? "#FFFFFF" : colors.textDarkPrimary,
            fontWeight: "900",
          }}
        >
          {title}
        </AppText>

        <View
          style={{
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: 999,
            backgroundColor: isDark ? "rgba(214,168,79,0.22)" : colors.goldSoft,
          }}
        >
          <AppText
            variant="caption"
            style={{ color: isDark ? colors.gold : "#8A6218", fontWeight: "900" }}
          >
            {badge}
          </AppText>
        </View>
      </View>

      <AppText
        variant="caption"
        color={isDark ? "#BFEAF1" : colors.textDarkSecondary}
      >
        {subtitle}
      </AppText>
    </View>
  );
}

function TopologyConnector({ label }: { label: string }) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 4,
      }}
    >
      <View style={{ flex: 1, height: 1, backgroundColor: "#D7DEE8" }} />
      <View
        style={{
          paddingHorizontal: 10,
          paddingVertical: 4,
          borderRadius: 999,
          backgroundColor: "#F8FAFC",
          borderWidth: 1,
          borderColor: "#E2E8F0",
        }}
      >
        <AppText variant="caption" color={colors.textDarkMuted}>
          {label}
        </AppText>
      </View>
      <View style={{ flex: 1, height: 1, backgroundColor: "#D7DEE8" }} />
    </View>
  );
}

function LiveRouteTopologyMap({
  bestCorridor,
  confidence,
  liveRails,
  fallbackRails,
}: {
  bestCorridor: string;
  confidence: number;
  liveRails: number;
  fallbackRails: number;
}) {
  const corridorLabel = bestCorridor === "Pending" ? "GBP → PHP / MYR" : bestCorridor;

  return (
    <AppCard>
      <View style={{ gap: 14 }}>
        <View style={{ gap: 4 }}>
          <AppText variant="subheading" color={colors.textDarkPrimary}>
            Live Route Topology
          </AppText>

          <AppText variant="caption" color={colors.textDarkSecondary}>
            Network view of how NexusPay currently expects value to move.
          </AppText>
        </View>

        <View
          style={{
            padding: 16,
            borderRadius: 24,
            backgroundColor: "#F8FAFC",
            borderWidth: 1,
            borderColor: "#E2E8F0",
            gap: 10,
          }}
        >
          <TopologyNode
            title="Sender GBP"
            subtitle="Customer balance and open banking source rail"
            badge="Source"
          />

          <TopologyConnector label="quote + validate" />

          <TopologyNode
            title="FX Provider Mesh"
            subtitle="Live provider selection with automatic fallback protection"
            badge={`${liveRails} live`}
          />

          <TopologyConnector label="price + route" />

          <TopologyNode
            title="NexusPay Orchestrator"
            subtitle="Scores liquidity, partner health, volatility and delivery confidence"
            badge={formatPercent(confidence)}
            tone="dark"
          />

          <TopologyConnector label="bridge + settle" />

          <TopologyNode
            title="XRPL / RLUSD Bridge"
            subtitle="Simulated bridge liquidity and settlement proof layer"
            badge="Bridge"
          />

          <TopologyConnector label="payout instruction" />

          <TopologyNode
            title="Recipient Payout Rail"
            subtitle={`${corridorLabel} via active payout partner with fallback monitoring`}
            badge={fallbackRails > 0 ? `${fallbackRails} fallback` : "Ready"}
          />
        </View>

        <View
          style={{
            padding: 13,
            borderRadius: 18,
            backgroundColor: "#0B3F4A",
            gap: 8,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <View style={{ flex: 1 }}>
              <AppText variant="caption" color="#BFEAF1">
                Preferred topology
              </AppText>

              <AppText variant="body" color="#FFFFFF" style={{ fontWeight: "900" }}>
                {corridorLabel}
              </AppText>
            </View>

            <View style={{ alignItems: "flex-end" }}>
              <AppText variant="caption" color="#BFEAF1">
                Network confidence
              </AppText>

              <AppText variant="body" color={colors.gold} style={{ fontWeight: "900" }}>
                {formatPercent(confidence)}
              </AppText>
            </View>
          </View>

          <ProgressBar value={confidence} color={colors.gold} />
        </View>
      </View>
    </AppCard>
  );
}

function CorridorCommandCard({
  item,
  matchedFxRate,
}: {
  item: CorridorHealth;
  matchedFxRate?: FxRate;
}) {
  const statusColor = getStatusColor(item.status);
  const provider = matchedFxRate?.provider ?? "Route engine";
  const providerStatus = matchedFxRate?.providerStatus ?? "Provider health monitored";

  return (
    <View
      style={{
        padding: 16,
        borderRadius: 22,
        backgroundColor: "#F8FAFC",
        borderWidth: 1,
        borderColor: "#E2E8F0",
        gap: 14,
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

          <AppText
            variant="subheading"
            color={colors.textDarkPrimary}
            style={{ fontWeight: "900" }}
          >
            {item.corridor}
          </AppText>

          <AppText variant="caption" color={colors.textDarkSecondary}>
            {getRailMode(item)} • {provider}
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
          <AppText
            variant="caption"
            style={{ color: "#FFFFFF", fontWeight: "900" }}
          >
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
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
          }}
        >
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

        <ProgressBar value={item.overallScore} color={colors.gold} />
      </View>

      <View style={{ flexDirection: "row", gap: 8 }}>
        <MiniMetric
          label="Liquidity"
          value={formatPercent(item.liquidityScore)}
          accent="#0F766E"
        />

        <MiniMetric
          label="Partner"
          value={formatPercent(item.partnerHealth)}
          accent="#0369A1"
        />

        <MiniMetric
          label="Volatility"
          value={`${item.volatilityRisk}/100`}
          accent={item.volatilityRisk <= 20 ? "#16A34A" : "#F59E0B"}
        />
      </View>

      <View
        style={{
          padding: 12,
          borderRadius: 16,
          backgroundColor: "#FFFFFF",
          borderWidth: 1,
          borderColor: "#E8EEF3",
          gap: 6,
        }}
      >
        <AppText
          variant="caption"
          color={colors.textDarkPrimary}
          style={{ fontWeight: "800" }}
        >
          Active rail intelligence
        </AppText>

        <AppText variant="caption" color={colors.textDarkSecondary}>
          {getRailNote(item)}
        </AppText>

        <AppText variant="caption" color={colors.textDarkMuted}>
          {providerStatus} • Updated {formatFxDate(matchedFxRate?.date ?? "")}
        </AppText>
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const router = useRouter();

  const [fxRates, setFxRates] = useState<FxRate[]>([]);
  const [corridorHealth, setCorridorHealth] = useState<CorridorHealth[]>([]);
  const [loadingFx, setLoadingFx] = useState(true);
  const [lastRefreshTime, setLastRefreshTime] = useState("");

  const {
    gbpBalance,
    xrplAddress,
    xrpBalance,
    rlusdBalance,
    rlusdIssuer,
    simulatedRlusdBalance,
    fundSimulatedRlusd,
    resetRlusdSimulation,
    isRefreshingXrpBalance,
    isSettingRlusdTrustline,
    refreshAllXrplBalances,
    setupRlusdTrustline,
  } = useWallet();

  const { completedTransfers } = useTransfer();

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

      const health = buildCorridorHealth(rates);
      setCorridorHealth(health);

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
          <View>
            <AppText variant="caption" color={colors.gold}>
              NexusPay Orchestrator
            </AppText>

            <AppText variant="title" color={colors.textPrimary}>
              Move value smarter
            </AppText>

            <AppText variant="body" color={colors.textSecondary}>
              Route money across the best available rails with clarity and
              confidence.
            </AppText>
          </View>

          <AppCard>
            <AppText variant="caption" color={colors.textDarkMuted}>
              Available GBP balance
            </AppText>

            <AppText variant="title" color={colors.textDarkPrimary}>
              £
              {(gbpBalance ?? 0).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </AppText>

            <AppText variant="body" color={colors.textDarkSecondary}>
              GBP • XRP • RLUSD • PHP
            </AppText>
          </AppCard>

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
                      <View
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                          gap: 12,
                        }}
                      >
                        <AppText
                          variant="body"
                          color={colors.textDarkPrimary}
                          style={{ fontWeight: "700" }}
                        >
                          {item.from} → {item.to}
                        </AppText>

                        <AppText
                          variant="body"
                          color={colors.gold}
                          style={{ fontWeight: "700" }}
                        >
                          {item.rate.toFixed(2)}
                        </AppText>
                      </View>

                      <AppText variant="caption" color={colors.textDarkSecondary}>
                        Feed: {item.provider ?? "Unknown"} • {item.source}
                      </AppText>

                      <AppText variant="caption" color={colors.textDarkSecondary}>
                        Status:{" "}
                        {item.providerStatus ?? "Provider status unavailable"}
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

          <AppCard>
            <View style={{ gap: 12 }}>
              <AppText variant="subheading" color={colors.textDarkPrimary}>
                Recent transaction history
              </AppText>

              {completedTransfers.length === 0 ? (
                <AppText variant="body" color={colors.textDarkSecondary}>
                  No completed transfers yet.
                </AppText>
              ) : (
                <View style={{ gap: 10 }}>
                  {completedTransfers.map((item) => {
                    const route = item.selectedRoute;
                    const recipient = item.recipient;

                    return (
                      <View
                        key={item.id}
                        style={{
                          padding: 12,
                          borderRadius: 16,
                          backgroundColor: "#F9FAFB",
                          borderWidth: 1,
                          borderColor: "#E5E7EB",
                          gap: 4,
                        }}
                      >
                        <View
                          style={{
                            flexDirection: "row",
                            justifyContent: "space-between",
                            gap: 12,
                          }}
                        >
                          <AppText
                            variant="body"
                            color={colors.textDarkPrimary}
                            style={{ fontWeight: "700" }}
                          >
                            {recipient.name || "Recipient"}
                          </AppText>

                          <AppText
                            variant="caption"
                            color={colors.textDarkPrimary}
                            style={{ fontWeight: "700" }}
                          >
                            COMPLETED
                          </AppText>
                        </View>

                        <AppText variant="caption" color={colors.textDarkSecondary}>
                          £{item.senderAmount.toFixed(2)} GBP →{" "}
                          {route
                            ? `${route.receiveAmount.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })} ${recipient.currency}`
                            : recipient.currency}
                        </AppText>

                        <AppText variant="caption" color={colors.textDarkSecondary}>
                          {recipient.country} • {route?.provider ?? "Route"}
                        </AppText>

                        <AppText variant="caption" color={colors.textDarkSecondary}>
                          Ref: NPX-{item.id.slice(-6)}
                        </AppText>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          </AppCard>

          <AppCard>
            <View style={{ gap: 12 }}>
              <AppText variant="subheading" color={colors.textDarkPrimary}>
                Corridor Command Centre
              </AppText>

              <AppText variant="caption" color={colors.textDarkMuted}>
                Live FX, provider failover, route confidence, and corridor risk.
              </AppText>

              <View
                style={{
                  padding: 16,
                  borderRadius: 22,
                  backgroundColor: "#0B3F4A",
                  gap: 12,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    gap: 12,
                  }}
                >
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

                    <AppText
                      variant="body"
                      color="#FFFFFF"
                      style={{ fontWeight: "900", textAlign: "right" }}
                    >
                      {loadingFx ? "Scanning" : corridorSummary.bestCorridor}
                    </AppText>
                  </View>
                </View>

                <View style={{ flexDirection: "row", gap: 8 }}>
                  <View
                    style={{
                      flex: 1,
                      padding: 10,
                      borderRadius: 14,
                      backgroundColor: "rgba(255,255,255,0.10)",
                    }}
                  >
                    <AppText variant="caption" color="#BFEAF1">
                      Live rails
                    </AppText>

                    <AppText variant="subheading" color="#FFFFFF">
                      {loadingFx ? "-" : corridorSummary.liveRails}
                    </AppText>
                  </View>

                  <View
                    style={{
                      flex: 1,
                      padding: 10,
                      borderRadius: 14,
                      backgroundColor: "rgba(255,255,255,0.10)",
                    }}
                  >
                    <AppText variant="caption" color="#BFEAF1">
                      Fallback rails
                    </AppText>

                    <AppText variant="subheading" color="#FFFFFF">
                      {loadingFx ? "-" : corridorSummary.fallbackRails}
                    </AppText>
                  </View>

                  <View
                    style={{
                      flex: 1,
                      padding: 10,
                      borderRadius: 14,
                      backgroundColor: "rgba(255,255,255,0.10)",
                    }}
                  >
                    <AppText variant="caption" color="#BFEAF1">
                      Refresh
                    </AppText>

                    <AppText variant="subheading" color="#FFFFFF">
                      30s
                    </AppText>
                  </View>
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
                      <CorridorCommandCard
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

          <LiveRouteTopologyMap
            bestCorridor={corridorSummary.bestCorridor}
            confidence={corridorSummary.averageScore}
            liveRails={corridorSummary.liveRails}
            fallbackRails={corridorSummary.fallbackRails}
          />

          <AppCard>
            <View style={{ gap: 12 }}>
              <AppText variant="subheading" color={colors.textDarkPrimary}>
                Simulated Route Liquidity
              </AppText>

              <AppText variant="caption" color={colors.textDarkMuted}>
                Partner / market-maker liquidity simulation
              </AppText>

              <AppText variant="title" color={colors.textDarkPrimary}>
                {simulatedRlusdBalance.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{" "}
                RLUSD
              </AppText>

              <AppText variant="body" color={colors.textDarkSecondary}>
                Used by the orchestration engine to simulate bridge route
                liquidity availability.
              </AppText>

              <View style={{ gap: 10 }}>
                <AppButton
                  title="Add 5,000 RLUSD Liquidity"
                  onPress={() => fundSimulatedRlusd(5000)}
                />

                <AppButton
                  title="Reset Simulated Liquidity"
                  variant="secondary"
                  onPress={resetRlusdSimulation}
                />
              </View>
            </View>
          </AppCard>

          <AppCard>
            <View style={{ gap: 10 }}>
              <AppText variant="subheading" color={colors.textDarkPrimary}>
                XRPL Testnet Wallet
              </AppText>

              <AppText variant="caption" color={colors.textDarkMuted}>
                Live blockchain balances
              </AppText>

              <View style={{ gap: 6 }}>
                <AppText variant="title" color={colors.textDarkPrimary}>
                  {xrpBalance === null
                    ? "Loading..."
                    : `${xrpBalance.toLocaleString(undefined, {
                        minimumFractionDigits: 6,
                        maximumFractionDigits: 6,
                      })} XRP`}
                </AppText>

                <AppText variant="title" color={colors.textDarkPrimary}>
                  {rlusdBalance === null
                    ? "Loading..."
                    : `${rlusdBalance.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })} RLUSD`}
                </AppText>
              </View>

              <AppText
                variant="caption"
                color={colors.textDarkSecondary}
                onPress={async () => {
                  if (xrplAddress) {
                    await Clipboard.setStringAsync(xrplAddress);
                    alert("XRPL wallet address copied");
                  }
                }}
              >
                Address: {xrplAddress}
              </AppText>

              <AppText variant="caption" color={colors.textDarkSecondary}>
                RLUSD issuer: {shorten(rlusdIssuer)}
              </AppText>

              <AppButton
                title={
                  isRefreshingXrpBalance
                    ? "Refreshing..."
                    : "Refresh XRPL Balances"
                }
                variant="secondary"
                onPress={refreshAllXrplBalances}
                disabled={isRefreshingXrpBalance}
              />

              <AppButton
                title={
                  isSettingRlusdTrustline
                    ? "Setting trustline..."
                    : "Enable RLUSD Trustline"
                }
                variant="secondary"
                onPress={setupRlusdTrustline}
                disabled={isSettingRlusdTrustline}
              />
            </View>
          </AppCard>

          <AppButton
            title="Start Transfer"
            onPress={() => router.push("/send")}
          />

          <AppButton
            title="View Route Intelligence"
            variant="secondary"
            onPress={() => router.push("/routes")}
          />

          <AppButton
            title="XRPL Test"
            variant="secondary"
            onPress={() => router.push("/xrpl-test")}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}
