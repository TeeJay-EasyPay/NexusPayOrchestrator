import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";

import { NexusAIToggleCard } from "../src/components/intelligence/NexusAIToggleCard";
import { AppButton } from "../src/components/ui/AppButton";
import { AppCard } from "../src/components/ui/AppCard";
import { AppText } from "../src/components/ui/AppText";
import { Screen } from "../src/components/ui/Screen";
import { useNexusAIScreenSetting } from "../src/hooks/useNexusAISettings";
import {
    buildRouteOperationalEvent,
} from "../src/lib/routeOperationalState";
import { buildOrchestratedRouteQuotes } from "../src/lib/settlementOrchestrator";
import {
    writeRouteOperationalEvent,
} from "../src/services/routeOperationalEventService";
import { writeTreasuryLiquiditySnapshot } from "../src/services/treasuryIntelligenceService";
import { useTransfer } from "../src/state/TransferContext";
import { useWallet } from "../src/state/WalletContext";
import { colors } from "../src/theme";
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

function formatMoney(value: number) {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function scoreColor(score: number) {
  if (score >= 90) return "#16A34A";
  if (score >= 80) return colors.gold;
  if (score >= 70) return "#F59E0B";
  return "#DC2626";
}

function ScoreBar({ value }: { value: number }) {
  const safeValue = Math.max(0, Math.min(100, value));

  return (
    <View
      style={{
        height: 8,
        borderRadius: 999,
        backgroundColor: "#E5E7EB",
        overflow: "hidden",
      }}
    >
      <View
        style={{
          width: `${safeValue}%`,
          height: "100%",
          backgroundColor: scoreColor(value),
        }}
      />
    </View>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
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

function RouteBadge({ label, tone = "neutral" }: { label: string; tone?: "gold" | "green" | "neutral" }) {
  const backgroundColor =
    tone === "green" ? "#DCFCE7" : tone === "gold" ? colors.goldSoft : "#F1F5F9";

  const textColor =
    tone === "green" ? "#166534" : tone === "gold" ? "#8A6218" : colors.textDarkSecondary;

  return (
    <View
      style={{
        alignSelf: "flex-start",
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 999,
        backgroundColor,
      }}
    >
      <AppText variant="caption" style={{ color: textColor, fontWeight: "900" }}>
        {label}
      </AppText>
    </View>
  );
}

function RouteOptionCard({
  route,
  index,
  recipientCurrency,
  isSelected,
  onPress,
  showIntelligence,
}: {
  route: RouteQuote;
  index: number;
  recipientCurrency: Currency;
  isSelected: boolean;
  onPress: () => void;
  showIntelligence: boolean;
}) {
  const isRecommended = index === 0;
  const borderColor = isSelected ? colors.gold : isRecommended ? "#BFE7D0" : "#E2E8F0";
  const backgroundColor = isSelected ? "#FFF8E1" : "#FFFFFF";

  return (
    <Pressable onPress={onPress}>
      <AppCard
        style={{
          borderWidth: 1,
          borderColor,
          backgroundColor,
        }}
      >
        <View style={{ gap: 14 }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              gap: 12,
              alignItems: "flex-start",
            }}
          >
            <View style={{ flex: 1, gap: 6 }}>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                {isRecommended ? <RouteBadge label="Recommended" tone="green" /> : null}
                {isSelected ? <RouteBadge label="Selected" tone="gold" /> : null}
                <RouteBadge label={`Rank #${index + 1}`} />
              </View>

              <AppText variant="subheading" color={colors.textDarkPrimary}>
                {route.provider}
              </AppText>

              <AppText variant="caption" color={colors.textDarkSecondary}>
                {route.rail} rail • ETA {route.estimatedTime}
              </AppText>
            </View>

            <View style={{ alignItems: "flex-end", gap: 3 }}>
              <AppText variant="title" style={{ color: scoreColor(route.score) }}>
                {route.score}
              </AppText>

              <AppText variant="caption" color={colors.textDarkMuted}>
                /100 AI score
              </AppText>
            </View>
          </View>

          <ScoreBar value={route.score} />

          <View
            style={{
              padding: 15,
              borderRadius: 20,
              backgroundColor: "#0B3F4A",
              gap: 8,
            }}
          >
            <AppText variant="caption" color="#BFEAF1">
              Recipient receives
            </AppText>

            <AppText variant="title" color="#FFFFFF">
              {formatMoney(route.receiveAmount)} {recipientCurrency}
            </AppText>

            <AppText variant="caption" color="#BFEAF1">
              FX: 1 GBP ≈ {route.fxRate.toFixed(2)} {recipientCurrency} • Fee £{route.fee.toFixed(2)}
            </AppText>
          </View>

          <View style={{ flexDirection: "row", gap: 8 }}>
            <MiniStat label="Speed" value={route.estimatedTime} />
            <MiniStat label="Fee" value={`£${route.fee.toFixed(2)}`} />
            <MiniStat label="AI Confidence" value={`${route.aiConfidence ?? 0}/100`} />
          </View>

          {showIntelligence ? (
            <>
              <View
                style={{
                  padding: 14,
                  borderRadius: 18,
                  backgroundColor: "#F8FAFC",
                  borderWidth: 1,
                  borderColor: "#E2E8F0",
                  gap: 8,
                }}
              >
                <AppText variant="caption" color={colors.textDarkMuted}>
                  AI route intelligence
                </AppText>

                <AppText variant="body" color={colors.textDarkPrimary} style={{ fontWeight: "900" }}>
                  {route.aiRecommendation}
                </AppText>

                <AppText variant="caption" color={colors.textDarkSecondary}>
                  {route.corridorInsight}
                </AppText>

                <View style={{ flexDirection: "row", gap: 8 }}>
                  <MiniStat
                    label="Risk"
                    value={`${route.predictedFailureRisk?.toFixed(1) ?? "0.0"}%`}
                  />

                  <MiniStat
                    label="Corridor"
                    value={`${route.corridorHealthScore ?? 0}/100`}
                  />

                  <MiniStat
                    label="Trend"
                    value={route.providerRecentTrend ?? "STABLE"}
                  />
                </View>
              </View>

              <View
                style={{
                  padding: 14,
                  borderRadius: 18,
                  backgroundColor: "#FFF8E1",
                  borderWidth: 1,
                  borderColor: "#F3D58A",
                  gap: 8,
                }}
              >
                <AppText variant="caption" color="#8A6218">
                  Treasury liquidity intelligence
                </AppText>

                <AppText variant="body" color={colors.textDarkPrimary} style={{ fontWeight: "900" }}>
                  {route.treasuryRecommendation ?? "Treasury intelligence pending"}
                </AppText>

                <View style={{ flexDirection: "row", gap: 8 }}>
                  <MiniStat
                    label="Treasury"
                    value={`${route.treasuryScore ?? 0}/100`}
                  />

                  <MiniStat
                    label="Pressure"
                    value={route.treasuryCorridorPressure ?? "LOW"}
                  />

                  <MiniStat
                    label="Rail cap."
                    value={`${route.treasuryRailCapacityScore ?? 0}/100`}
                  />
                </View>
              </View>

              {route.aiDecisionFactors && route.aiDecisionFactors.length > 0 ? (
                <View
                  style={{
                    padding: 13,
                    borderRadius: 18,
                    backgroundColor: isSelected ? "#FFFFFF" : "#F8FAFC",
                    borderWidth: 1,
                    borderColor: "#E2E8F0",
                    gap: 6,
                  }}
                >
                  <AppText variant="caption" color={colors.textDarkMuted}>
                    AI decision factors
                  </AppText>

                  {route.aiDecisionFactors.map((factor, factorIndex) => (
                    <AppText
                      key={`${route.id}-${factorIndex}`}
                      variant="caption"
                      color={colors.textDarkSecondary}
                    >
                      • {factor}
                    </AppText>
                  ))}
                </View>
              ) : null}
            </>
          ) : (
            <AppCard
              style={{
                padding: 14,
                borderWidth: 1,
                borderColor: "#E2E8F0",
                backgroundColor: "#F8FAFC",
                gap: 6,
              }}
            >
              <AppText variant="caption" color={colors.textDarkMuted}>
                Nexus AI disabled for this screen
              </AppText>

              <AppText variant="body" color={colors.textDarkPrimary} style={{ fontWeight: "900" }}>
                Route suggestions remain available, but AI-driven explanations are hidden until Nexus AI is enabled for Route Intelligence.
              </AppText>
            </AppCard>
          )}
        </View>
      </AppCard>
    </Pressable>
  );
}

export default function RoutesScreen() {
  const { transfer, setRoutes, selectRoute } = useTransfer();
  const { simulatedRlusdBalance } = useWallet();
  const {
    loading: nexusAILoading,
    enabled: routeAIEnabled,
    disabled: routeAIDisabled,
    toggle: toggleRouteAI,
  } = useNexusAIScreenSetting("route_enabled");

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
  }, [transfer?.id, transfer?.senderAmount, transfer?.recipient?.currency, simulatedRlusdBalance]);

  const shouldStoreGeneratedRoutes =
    Boolean(transfer) &&
    generatedRoutes.length > 0 &&
    (!transfer?.routes || transfer.routes.length === 0);

  useEffect(() => {
    if (!shouldStoreGeneratedRoutes) return;
    setRoutes(generatedRoutes);
  }, [shouldStoreGeneratedRoutes, generatedRoutes, setRoutes]);

  useEffect(() => {
    if (!transfer?.id || generatedRoutes.length === 0) return;

    generatedRoutes.forEach((route) => {
      const treasurySignal = route.treasurySnapshotPayload;

      if (treasurySignal) {
        void writeTreasuryLiquiditySnapshot({
          transactionId: transfer.id,
          routeId: route.id,
          provider: route.provider,
          rail: route.rail,
          currency: transfer.recipient.currency,
          bridgeAsset: route.bridgeAsset,
          treasurySignal: treasurySignal as never,
        });
      }

      const operationalEvent = buildRouteOperationalEvent(route);

      void writeRouteOperationalEvent({
        transactionId: transfer.id,
        route,
        event: operationalEvent,
      });
    });
  }, [transfer?.id, transfer?.recipient.currency, generatedRoutes]);

  const activeRoutes =
    transfer?.routes && transfer.routes.length > 0 ? transfer.routes : generatedRoutes;

  const selectedRoute = activeRoutes.find((route) => route.id === selectedRouteId);

  const handleSelectRoute = (route: RouteQuote) => {
    setSelectedRouteId(route.id);
    selectRoute(route);
  };

  const handleContinue = () => {
    if (!selectedRoute) return;
    router.push("/funding");
  };

  if (!transfer) {
    return (
      <Screen>
        <View style={{ gap: 18 }}>
          <View style={{ gap: 6 }}>
            <AppText variant="caption" color={colors.gold}>
              Route intelligence
            </AppText>

            <AppText variant="title" color={colors.textPrimary}>
              No transfer found
            </AppText>
          </View>

          <AppCard>
            <AppText variant="body" color={colors.textDarkSecondary}>
              Start a transfer first so NexusPay can calculate live route options.
            </AppText>
          </AppCard>

          <AppButton title="Start transfer" onPress={() => router.push("/send")} />
        </View>
      </Screen>
    );
  }

  const recipient = transfer.recipient;

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={{ gap: 18, paddingBottom: 40 }}>
          <View style={{ gap: 6 }}>
            <AppText variant="caption" color={colors.gold}>
              NexusPay route intelligence
            </AppText>

            <AppText variant="title" color={colors.textPrimary}>
              Route Intelligence
            </AppText>

            <AppText variant="body" color={colors.textSecondary}>
              NexusPay AI has ranked available rails by liquidity, reliability, payout risk and corridor health.
            </AppText>
          </View>

          <NexusAIToggleCard
            title="Nexus AI"
            description="Controls route intelligence scoring, treasury reasoning and route explanations on this screen."
            enabled={routeAIEnabled}
            disabled={routeAIDisabled}
            loading={nexusAILoading}
            onToggle={toggleRouteAI}
          />

          {!routeAIEnabled ? (
            <AppCard>
              <AppText variant="subheading" color={colors.textDarkPrimary} style={{ fontWeight: "900" }}>
                Nexus AI disabled for this screen
              </AppText>

              <AppText variant="caption" color={colors.textDarkSecondary} style={{ marginTop: 6 }}>
                Route selection still works, but the AI explanation panels are hidden until Route Intelligence is re-enabled.
              </AppText>
            </AppCard>
          ) : null}

          <View style={{ gap: 12 }}>
            {activeRoutes.map((route, index) => (
              <RouteOptionCard
                key={route.id}
                route={route}
                index={index}
                recipientCurrency={recipient.currency}
                isSelected={selectedRouteId === route.id}
                showIntelligence={routeAIEnabled}
                onPress={() => handleSelectRoute(route)}
              />
            ))}
          </View>

          <View
            style={{
              padding: 16,
              borderRadius: 24,
              backgroundColor: "#F8FAFC",
              borderWidth: 1,
              borderColor: "#E2E8F0",
              gap: 12,
            }}
          >
            <View style={{ gap: 4 }}>
              <AppText variant="subheading" color={colors.textDarkPrimary}>
                {selectedRoute ? "Route selected" : "Choose a route"}
              </AppText>

              <AppText variant="caption" color={colors.textDarkSecondary}>
                {selectedRoute
                  ? `${selectedRoute.provider} is ready for funding authorisation.`
                  : "Select one of the ranked route options to continue."}
              </AppText>
            </View>

            <AppButton
              title={selectedRoute ? "Choose funding source" : "Select a route"}
              onPress={handleContinue}
              disabled={!selectedRoute}
            />

            <AppButton title="Back Home" variant="secondary" onPress={() => router.push("/")} />
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}
