import * as Clipboard from "expo-clipboard";
import { useRouter } from "expo-router";
import React from "react";
import { ScrollView, View } from "react-native";

import { AppButton } from "../src/components/ui/AppButton";
import { AppCard } from "../src/components/ui/AppCard";
import { AppText } from "../src/components/ui/AppText";
import { Screen } from "../src/components/ui/Screen";
import { useTransfer } from "../src/state/TransferContext";
import { useWallet } from "../src/state/WalletContext";
import { colors, spacing } from "../src/theme";

const fxRates = [
  {
    corridor: "GBP → Philippines",
    currency: "PHP",
    rate: 70.25,
    fee: "from £0.89",
    speed: "2–15 mins",
  },
  {
    corridor: "GBP → Malaysia",
    currency: "MYR",
    rate: 5.85,
    fee: "from £0.89",
    speed: "2–30 mins",
  },
];

function shorten(value: string | null) {
  if (!value) return "Not available";

  return `${value.slice(0, 8)}...${value.slice(-8)}`;
}

export default function HomeScreen() {
  const router = useRouter();

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

              <AppText variant="caption" color={colors.textDarkSecondary}>
                After enabling the trustline, fund this address with test RLUSD
                using the RLUSD testnet faucet, then refresh balances.
              </AppText>
            </View>
          </AppCard>

          <AppCard>
            <View style={{ gap: 12 }}>
              <AppText variant="subheading" color={colors.textDarkPrimary}>
                Corridor FX snapshot
              </AppText>

              <View
                style={{
                  borderRadius: 16,
                  overflow: "hidden",
                  borderWidth: 1,
                  borderColor: "#E5E7EB",
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    backgroundColor: "#111827",
                    paddingVertical: 10,
                    paddingHorizontal: 10,
                  }}
                >
                  <AppText
                    variant="caption"
                    style={{ flex: 1.5, color: "#FFFFFF", fontWeight: "700" }}
                  >
                    Corridor
                  </AppText>

                  <AppText
                    variant="caption"
                    style={{ flex: 1, color: "#FFFFFF", fontWeight: "700" }}
                  >
                    FX
                  </AppText>

                  <AppText
                    variant="caption"
                    style={{ flex: 1, color: "#FFFFFF", fontWeight: "700" }}
                  >
                    Fee
                  </AppText>

                  <AppText
                    variant="caption"
                    style={{ flex: 1, color: "#FFFFFF", fontWeight: "700" }}
                  >
                    Speed
                  </AppText>
                </View>

                {fxRates.map((item, index) => (
                  <View
                    key={item.corridor}
                    style={{
                      flexDirection: "row",
                      paddingVertical: 12,
                      paddingHorizontal: 10,
                      backgroundColor: index % 2 === 0 ? "#FFFFFF" : "#F9FAFB",
                    }}
                  >
                    <AppText
                      variant="caption"
                      style={{ flex: 1.5, fontWeight: "700" }}
                    >
                      {item.corridor}
                    </AppText>

                    <AppText variant="caption" style={{ flex: 1 }}>
                      {item.rate.toFixed(2)} {item.currency}
                    </AppText>

                    <AppText variant="caption" style={{ flex: 1 }}>
                      {item.fee}
                    </AppText>

                    <AppText variant="caption" style={{ flex: 1 }}>
                      {item.speed}
                    </AppText>
                  </View>
                ))}
              </View>

              <AppText variant="caption" color={colors.textDarkSecondary}>
                Indicative demo rates used by the routing engine.
              </AppText>
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
                          <AppText variant="body" style={{ fontWeight: "700" }}>
                            {recipient.name || "Recipient"}
                          </AppText>

                          <AppText
                            variant="caption"
                            style={{ fontWeight: "700" }}
                          >
                            COMPLETED
                          </AppText>
                        </View>

                        <AppText variant="caption">
                          £{item.senderAmount.toFixed(2)} GBP →{" "}
                          {route
                            ? `${route.receiveAmount.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })} ${recipient.currency}`
                            : recipient.currency}
                        </AppText>

                        <AppText variant="caption">
                          {recipient.country} • {route?.provider ?? "Route"}
                        </AppText>

                        <AppText variant="caption">
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