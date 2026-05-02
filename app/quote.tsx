import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, TextInput, View } from "react-native";

import { AppButton } from "../src/components/ui/AppButton";
import { AppCard } from "../src/components/ui/AppCard";
import { AppText } from "../src/components/ui/AppText";
import { Screen } from "../src/components/ui/Screen";
import { corridors } from "../src/data/corridors";
import { RouteQuote } from "../src/types/transfer";

function buildQuoteRoutes(amount: number, currency: string): RouteQuote[] {
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
        steps: [],
      };
    })
    .sort((a, b) => b.score - a.score);
}

export default function QuoteScreen() {
  const [amount, setAmount] = useState("100");
  const [selectedCountry, setSelectedCountry] = useState("Philippines");

  const selectedCorridor = useMemo(() => {
    return corridors.find((corridor) => corridor.country === selectedCountry);
  }, [selectedCountry]);

  const numericAmount = Number(amount);

  const routes = useMemo(() => {
    if (!selectedCorridor || Number.isNaN(numericAmount) || numericAmount <= 0) {
      return [];
    }

    return buildQuoteRoutes(numericAmount, selectedCorridor.currency);
  }, [numericAmount, selectedCorridor]);

  const handleSendWithQuote = () => {
    router.push({
      pathname: "/send",
      params: {
        amount,
        country: selectedCountry,
      },
    });
  };

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={{ gap: 18, paddingBottom: 40 }}>
          <View>
            <AppText variant="title">Route Intelligence</AppText>

            <AppText variant="caption">
              Preview available routes, fees, speed, and estimated recipient
              value before starting a transfer.
            </AppText>
          </View>

          <AppCard>
            <View style={{ gap: 12 }}>
              <AppText variant="subheading">Check a route</AppText>

              <TextInput
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                placeholder="Enter GBP amount"
                style={{
                  borderWidth: 1,
                  borderColor: "#D6D6D6",
                  borderRadius: 14,
                  padding: 14,
                  fontSize: 18,
                }}
              />

              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {corridors.map((corridor) => {
                  const isSelected = selectedCountry === corridor.country;

                  return (
                    <Pressable
                      key={corridor.country}
                      onPress={() => setSelectedCountry(corridor.country)}
                      style={{
                        paddingVertical: 10,
                        paddingHorizontal: 14,
                        borderRadius: 999,
                        borderWidth: 1,
                        borderColor: isSelected ? "#111827" : "#D6D6D6",
                        backgroundColor: isSelected ? "#111827" : "#FFFFFF",
                      }}
                    >
                      <AppText
                        style={{
                          color: isSelected ? "#FFFFFF" : "#111827",
                          fontWeight: "700",
                        }}
                      >
                        {corridor.country}
                      </AppText>
                    </Pressable>
                  );
                })}
              </View>

              <AppText variant="caption">
                Quote: GBP → {selectedCorridor?.currency}
              </AppText>
            </View>
          </AppCard>

          <View style={{ gap: 12 }}>
            {routes.map((route, index) => {
              const isRecommended = index === 0;

              return (
                <AppCard key={route.id}>
                  <View style={{ gap: 10 }}>
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        gap: 12,
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <AppText variant="subheading">{route.provider}</AppText>

                        <AppText variant="caption">
                          {route.rail} rail • ETA {route.estimatedTime}
                        </AppText>
                      </View>

                      <View style={{ alignItems: "flex-end" }}>
                        <AppText variant="subheading">{route.score}/100</AppText>

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
                          Best estimated route
                        </AppText>
                      </View>
                    ) : null}

                    <View style={{ height: 1, backgroundColor: "#E5E7EB" }} />

                    <AppText variant="body">Fee: £{route.fee.toFixed(2)}</AppText>

                    <AppText variant="body">
                      FX rate: 1 GBP ≈ {route.fxRate.toFixed(2)}{" "}
                      {selectedCorridor?.currency}
                    </AppText>

                    <AppText variant="body">
                      Recipient receives approx:{" "}
                      {route.receiveAmount.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{" "}
                      {selectedCorridor?.currency}
                    </AppText>
                  </View>
                </AppCard>
              );
            })}
          </View>

          <AppButton title="Send using this quote" onPress={handleSendWithQuote} />

          <AppButton
            title="Back home"
            variant="secondary"
            onPress={() => router.push("/")}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}