import * as Clipboard from "expo-clipboard";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
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

export default function HomeScreen() {
  const router = useRouter();

  const [fxRates, setFxRates] = useState<FxRate[]>([]);
  const [corridorHealth, setCorridorHealth] = useState<CorridorHealth[]>([]);
  const [loadingFx, setLoadingFx] = useState(true);

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

  async function loadCorridorData() {
    try {
      const rates = await fetchCorridorFxRates();
      setFxRates(rates);

      const health = buildCorridorHealth(rates);
      setCorridorHealth(health);
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

          <AppCard>
            <View style={{ gap: 12 }}>
              <AppText variant="subheading" color={colors.textDarkPrimary}>
                Live Corridor FX
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
                        Last updated: {item.date}
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
                Corridor Health Intelligence
              </AppText>

              {loadingFx ? (
                <AppText variant="body" color={colors.textDarkSecondary}>
                  Building route intelligence...
                </AppText>
              ) : corridorHealth.length === 0 ? (
                <AppText variant="body" color={colors.textDarkSecondary}>
                  No corridor health data available yet.
                </AppText>
              ) : (
                <View style={{ gap: 12 }}>
                  {corridorHealth.map((item) => (
                    <View
                      key={item.corridor}
                      style={{
                        padding: 14,
                        borderRadius: 16,
                        backgroundColor: "#F9FAFB",
                        borderWidth: 1,
                        borderColor: "#E5E7EB",
                        gap: 10,
                      }}
                    >
                      <View
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <AppText
                          variant="body"
                          color={colors.textDarkPrimary}
                          style={{ fontWeight: "700" }}
                        >
                          {item.corridor}
                        </AppText>

                        <View
                          style={{
                            backgroundColor:
                              item.status === "Excellent"
                                ? "#16A34A"
                                : item.status === "Healthy"
                                ? "#0EA5E9"
                                : item.status === "Watch"
                                ? "#F59E0B"
                                : "#DC2626",
                            paddingHorizontal: 10,
                            paddingVertical: 4,
                            borderRadius: 999,
                          }}
                        >
                          <AppText
                            variant="caption"
                            style={{
                              color: "#FFFFFF",
                              fontWeight: "700",
                            }}
                          >
                            {item.status}
                          </AppText>
                        </View>
                      </View>

                      <View
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                        }}
                      >
                        <View>
                          <AppText variant="caption" color={colors.textDarkMuted}>
                            FX
                          </AppText>

                          <AppText
                            variant="body"
                            color={colors.textDarkPrimary}
                            style={{ fontWeight: "700" }}
                          >
                            {item.fxRate.toFixed(2)}
                          </AppText>
                        </View>

                        <View>
                          <AppText variant="caption" color={colors.textDarkMuted}>
                            Liquidity
                          </AppText>

                          <AppText
                            variant="body"
                            style={{
                              fontWeight: "700",
                              color: "#0F766E",
                            }}
                          >
                            {item.liquidityScore}%
                          </AppText>
                        </View>

                        <View>
                          <AppText variant="caption" color={colors.textDarkMuted}>
                            Route Score
                          </AppText>

                          <AppText
                            variant="body"
                            style={{
                              fontWeight: "700",
                              color: colors.gold,
                            }}
                          >
                            {item.overallScore}
                          </AppText>
                        </View>
                      </View>

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
                            width: `${item.overallScore}%`,
                            height: "100%",
                            backgroundColor: colors.gold,
                          }}
                        />
                      </View>
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