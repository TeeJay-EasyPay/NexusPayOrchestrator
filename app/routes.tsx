import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";

import { AppButton } from "../src/components/ui/AppButton";
import { AppCard } from "../src/components/ui/AppCard";
import { AppText } from "../src/components/ui/AppText";
import { Screen } from "../src/components/ui/Screen";
import { buildOrchestratedRouteQuotes } from "../src/lib/settlementOrchestrator";
import { useTransfer } from "../src/state/TransferContext";
import { useWallet } from "../src/state/WalletContext";
import { Currency, RouteQuote } from "../src/types/transfer";

function buildRouteQuotes(
  amount: number,
  currency: Currency,
  simulatedRlusdBalance: number
): RouteQuote[] {
  return buildOrchestratedRouteQuotes({
    amount,
    currency,
    simulatedRlusdBalance,
  });
}

export default function RoutesScreen() {
  const { transfer, setRoutes, selectRoute } = useTransfer();
  const { simulatedRlusdBalance } = useWallet();

  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);

  const generatedRoutes = useMemo(() => {
    if (!transfer?.senderAmount || !transfer?.recipient?.currency) {
      return [];
    }

    return buildRouteQuotes(
      transfer.senderAmount,
      transfer.recipient.currency,
      simulatedRlusdBalance
    );
  }, [
    transfer?.senderAmount,
    transfer?.recipient?.currency,
    simulatedRlusdBalance,
  ]);

  useEffect(() => {
    if (!transfer) return;

    if (generatedRoutes.length > 0 && transfer.routes.length === 0) {
      setRoutes(generatedRoutes);
    }
  }, [generatedRoutes, setRoutes, transfer]);

  const activeRoutes =
    transfer?.routes && transfer.routes.length > 0
      ? transfer.routes
      : generatedRoutes;

  const selectedRoute = activeRoutes.find(
    (route) => route.id === selectedRouteId
  );

  const handleSelectRoute = (route: RouteQuote) => {
    setSelectedRouteId(route.id);
    selectRoute(route);
  };

  const handleContinue = () => {
    if (!selectedRoute) return;
    router.push("/track");
  };

  if (!transfer) {
    return (
      <Screen>
        <View style={{ gap: 18 }}>
          <AppText variant="title">No transfer found</AppText>

          <AppCard>
            <AppText variant="body">
              Start a transfer first so NexusPay can calculate live route
              options.
            </AppText>
          </AppCard>

          <AppButton title="Start transfer" onPress={() => router.push("/send")} />
        </View>
      </Screen>
    );
  }

  const recipient = transfer.recipient;

  const payoutLabel =
    recipient.payoutMethod === "BANK"
      ? `${recipient.bankName} bank account`
      : `${recipient.mobileWalletProvider} mobile wallet`;

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={{ gap: 18, paddingBottom: 40 }}>
          <View>
            <AppText variant="title">Route Intelligence</AppText>

            <AppText variant="caption">
              NexusPay has scored available routes for this corridor.
            </AppText>
          </View>

          <AppCard>
            <View style={{ gap: 8 }}>
              <AppText variant="subheading">Transfer summary</AppText>

              <AppText variant="body">
                Sending £{transfer.senderAmount.toFixed(2)} GBP
              </AppText>

              <AppText variant="body">
                Recipient: {recipient.name || "Not provided"}
              </AppText>

              <AppText variant="body">
                Destination: {recipient.country} / {recipient.currency}
              </AppText>

              <AppText variant="body">Payout: {payoutLabel}</AppText>

              <AppText variant="caption">
                Simulated RLUSD liquidity:{" "}
                {simulatedRlusdBalance.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{" "}
                RLUSD
              </AppText>

              {recipient.accountNumber ? (
                <AppText variant="caption">
                  Account ending: {recipient.accountNumber.slice(-4)}
                </AppText>
              ) : null}

              {recipient.mobileNumber ? (
                <AppText variant="caption">
                  Mobile ending: {recipient.mobileNumber.slice(-4)}
                </AppText>
              ) : null}
            </View>
          </AppCard>

          <View style={{ gap: 12 }}>
            {activeRoutes.map((route, index) => {
              const isSelected = selectedRouteId === route.id;
              const isRecommended = index === 0;

              return (
                <Pressable key={route.id} onPress={() => handleSelectRoute(route)}>
                  <AppCard
                    style={{
                      borderWidth: 1,
                      borderColor: isSelected ? "#D6A84F" : "transparent",
                      backgroundColor: isSelected ? "#FFF8E1" : "#FFFFFF",
                    }}
                  >
                    <View style={{ gap: 10 }}>
                      <View
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                          gap: 12,
                        }}
                      >
                        <View style={{ flex: 1 }}>
                          <AppText variant="subheading">
                            {route.provider}
                          </AppText>

                          <AppText variant="caption">
                            {route.rail} rail • ETA {route.estimatedTime}
                          </AppText>
                        </View>

                        <View style={{ alignItems: "flex-end" }}>
                          <AppText variant="subheading">
                            {route.score}/100
                          </AppText>

                          <AppText variant="caption">Score</AppText>
                        </View>
                      </View>

                      {isRecommended ? (
                        <View
                          style={{
                            alignSelf: "flex-start",
                            paddingVertical: 6,
                            paddingHorizontal: 10,
                            borderRadius: 999,
                            backgroundColor: "#DCFCE7",
                          }}
                        >
                          <AppText
                            variant="caption"
                            style={{ fontWeight: "700", color: "#166534" }}
                          >
                            Recommended route
                          </AppText>
                        </View>
                      ) : null}

                      <View
                        style={{
                          height: 1,
                          backgroundColor: "#E5E7EB",
                        }}
                      />

                      <View style={{ gap: 6 }}>
                        <AppText variant="body">
                          Fee: £{route.fee.toFixed(2)}
                        </AppText>

                        <AppText variant="body">
                          FX rate: 1 GBP ≈ {route.fxRate.toFixed(2)}{" "}
                          {recipient.currency}
                        </AppText>

                        <AppText variant="body">
                          Recipient receives:{" "}
                          {route.receiveAmount.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}{" "}
                          {recipient.currency}
                        </AppText>

                        {route.bridgeAsset ? (
                          <>
                            <AppText variant="body">
                              Bridge asset: {route.bridgeAsset}
                            </AppText>

                            <AppText variant="body">
                              Liquidity required:{" "}
                              {(route.liquidityRequiredRlusd ?? 0).toFixed(2)}{" "}
                              RLUSD
                            </AppText>

                            <AppText variant="body">
                              Liquidity status: {route.liquidityStatus}
                            </AppText>
                          </>
                        ) : null}

                        {route.orchestrationReason ? (
                          <AppText variant="caption">
                            {route.orchestrationReason}
                          </AppText>
                        ) : null}
                      </View>

                      {isSelected ? (
                        <AppText variant="caption">
                          Selected for transfer tracking
                        </AppText>
                      ) : null}
                    </View>
                  </AppCard>
                </Pressable>
              );
            })}
          </View>

          <AppButton
            title={selectedRoute ? "Continue to tracking" : "Select a route"}
            onPress={handleContinue}
            disabled={!selectedRoute}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}