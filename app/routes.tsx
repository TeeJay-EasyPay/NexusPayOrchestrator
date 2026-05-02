import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";

import { AppButton } from "../src/components/ui/AppButton";
import { AppCard } from "../src/components/ui/AppCard";
import { AppText } from "../src/components/ui/AppText";
import { Screen } from "../src/components/ui/Screen";
import { useTransfer } from "../src/state/TransferContext";
import { RouteQuote } from "../src/types/transfer";

function buildRouteQuotes(amount: number, currency: string): RouteQuote[] {
  const baseFxRates: Record<string, number> = {
    PHP: 70.25,
    MYR: 5.85,
    AED: 4.65,
  };

  const fxRate = baseFxRates[currency] ?? 1;

  const routes = [
    {
      id: "fast-fiat",
      rail: "FIAT" as const,
      provider: "FastTrack Banking Rail",
      fee: Math.max(1.99, amount * 0.021),
      estimatedTime: "8-15 mins",
      reliability: 96,
      speedScore: 92,
      costScore: 82,
      steps: [
        "GBP funds reserved from sender wallet",
        "Compliance and payout checks completed",
        "Banking rail selected for recipient country",
        "Funds released to recipient bank or wallet",
        "Transfer completed",
      ],
    },
    {
      id: "partner-liquidity",
      rail: "FIAT" as const,
      provider: "Partner Liquidity Route",
      fee: Math.max(1.49, amount * 0.0175),
      estimatedTime: "15-30 mins",
      reliability: 94,
      speedScore: 78,
      costScore: 90,
      steps: [
        "GBP funds reserved from sender wallet",
        "NexusPay checks available liquidity partners",
        "Best payout partner selected",
        "Recipient payout instruction submitted",
        "Transfer completed",
      ],
    },
    {
      id: "xrpl-ready",
      rail: "HYBRID" as const,
      provider: "XRPL-Ready Hybrid Route",
      fee: Math.max(0.89, amount * 0.011),
      estimatedTime: "2-5 mins",
      reliability: 89,
      speedScore: 98,
      costScore: 96,
      steps: [
        "GBP funds reserved from sender wallet",
        "Liquidity route prepared for digital settlement",
        "XRPL testnet rail available for future execution",
        "Local payout partner receives settlement instruction",
        "Recipient fiat payout completed",
      ],
    },
  ];

  return routes
    .map((route) => {
      const fee = Number(route.fee.toFixed(2));
      const receiveAmount = Number(((amount - fee) * fxRate).toFixed(2));

      const score = Math.round(
        route.reliability * 0.45 +
          route.speedScore * 0.3 +
          route.costScore * 0.25
      );

      return {
        id: route.id,
        rail: route.rail,
        provider: route.provider,
        sendAmount: amount,
        receiveAmount,
        fxRate,
        fee,
        estimatedTime: route.estimatedTime,
        score,
        steps: route.steps,
      };
    })
    .sort((a, b) => b.score - a.score);
}

export default function RoutesScreen() {
  const { transfer, setRoutes, selectRoute } = useTransfer();
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);

  const generatedRoutes = useMemo(() => {
    if (!transfer?.senderAmount || !transfer?.recipient?.currency) {
      return [];
    }

    return buildRouteQuotes(
      transfer.senderAmount,
      transfer.recipient.currency
    );
  }, [transfer?.senderAmount, transfer?.recipient?.currency]);

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
                      borderWidth: 2,
                      borderColor: isSelected ? "#2563EB" : "transparent",
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