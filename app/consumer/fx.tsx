import { useEffect, useMemo, useState } from "react";
import { Pressable, View } from "react-native";

import {
    ConsumerCard,
    ConsumerPill,
    ConsumerShell,
    consumerColors,
} from "../../src/components/consumer/ConsumerShell";
import { AppText } from "../../src/components/ui/AppText";
import { corridors } from "../../src/data/corridors";
import { FxRate, fetchCorridorFxRates } from "../../src/lib/fxFeed";

function keyFor(to: string) {
  return `GBP-${to}`;
}

export default function ConsumerFxScreen() {
  const [rates, setRates] = useState<FxRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadRates() {
    setLoading(true);
    setError(null);

    try {
      const next = await fetchCorridorFxRates();
      setRates(next);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Failed to load FX rates");
      setRates([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadRates();
  }, []);

  const ratesByKey = useMemo(() => {
    const map = new Map<string, FxRate>();
    rates.forEach((item) => {
      map.set(keyFor(item.to), item);
    });
    return map;
  }, [rates]);

  return (
    <ConsumerShell
      eyebrow="FX"
      title="Live FX rates"
      subtitle="GBP rates across all available ASEAN and GCC destination corridors."
    >
      <ConsumerCard accent>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <View style={{ flex: 1 }}>
            <AppText color={consumerColors.text} style={{ fontWeight: "900", fontSize: 18 }}>
              Corridor coverage
            </AppText>
            <AppText color={consumerColors.muted}>
              {corridors.length} countries • Base currency GBP
            </AppText>
          </View>
          <ConsumerPill label={loading ? "Updating" : "Active"} tone={loading ? "gold" : "green"} />
        </View>
        <Pressable
          onPress={() => {
            void loadRates();
          }}
          style={{
            borderWidth: 1,
            borderColor: consumerColors.blue,
            borderRadius: 10,
            paddingVertical: 10,
            paddingHorizontal: 12,
            alignSelf: "flex-start",
            backgroundColor: consumerColors.white,
          }}
        >
          <AppText color={consumerColors.blue} style={{ fontWeight: "900" }}>
            Refresh rates
          </AppText>
        </Pressable>
      </ConsumerCard>

      {error ? (
        <ConsumerCard>
          <AppText variant="caption" style={{ color: "#B91C1C", fontWeight: "900" }}>
            {error}
          </AppText>
        </ConsumerCard>
      ) : null}

      {corridors.map((corridor) => {
        const rate = ratesByKey.get(keyFor(corridor.currency));
        const rateValue = rate?.rate ?? 0;
        const decimals = rateValue >= 1000 ? 2 : 4;

        return (
          <ConsumerCard key={corridor.country}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
              <View style={{ flex: 1 }}>
                <AppText color={consumerColors.text} style={{ fontWeight: "900", fontSize: 18 }}>
                  {corridor.country}
                </AppText>
                <AppText color={consumerColors.muted}>
                  GBP to {corridor.currency}
                </AppText>
              </View>
              <ConsumerPill label={rate?.source === "LIVE" ? "Live" : "Fallback"} tone={rate?.source === "LIVE" ? "green" : "gold"} />
            </View>

            <AppText color={consumerColors.blueDark} style={{ fontSize: 28, fontWeight: "900" }}>
              {rateValue.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: decimals,
              })}
            </AppText>

            <AppText color={consumerColors.muted}>
              1 GBP buys approximately {rateValue.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: decimals,
              })} {corridor.currency}
            </AppText>

            <AppText variant="caption" color={consumerColors.muted}>
              Source: {rate?.provider ?? "Loading"} • Date: {rate?.date ?? "--"}
            </AppText>
          </ConsumerCard>
        );
      })}
    </ConsumerShell>
  );
}
