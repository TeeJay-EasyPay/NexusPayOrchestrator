import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";

import { NexusAIToggleCard } from "../src/components/intelligence/NexusAIToggleCard";
import { DataProvenanceBadge } from "../src/components/operations-v2/DataProvenanceBadge";
import { RoutePlanComparison } from "../src/components/routes/RoutePlanComparison";
import { AppButton } from "../src/components/ui/AppButton";
import { AppCard } from "../src/components/ui/AppCard";
import { AppText } from "../src/components/ui/AppText";
import { Screen } from "../src/components/ui/Screen";
import { useNexusAIScreenSetting } from "../src/hooks/useNexusAISettings";
import { useCanonicalRouteQuotes } from "../src/hooks/useCanonicalRouteQuotes";
import {
    explainRoute,
    RouteExplanationResult,
} from "../src/services/nexusAIService";
import { useTransfer } from "../src/state/TransferContext";
import { useWallet } from "../src/state/WalletContext";
import { colors } from "../src/theme";
import { Currency, RouteQuote } from "../src/types/transfer";

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
  routeExplanation,
}: {
  route: RouteQuote;
  index: number;
  recipientCurrency: Currency;
  isSelected: boolean;
  onPress: () => void;
  showIntelligence: boolean;
  routeExplanation?: { data: RouteExplanationResult; source: "edge_function" | "fallback" };
}) {
  const isRecommended = route.routePlan?.eligible === true && route.routePlan.rank === 1;
  const isEligible = route.routePlan?.eligible !== false;
  const evidenceScore = route.routePlan ? route.routePlan.score.value : route.score;
  const recipientAmount = route.routePlan?.economics.estimatedRecipientAmount.value;
  const fxRate = route.routePlan?.economics.fxRate.value;
  const borderColor = isSelected ? colors.gold : isRecommended ? "#BFE7D0" : "#E2E8F0";
  const backgroundColor = isSelected ? "#FFF8E1" : "#FFFFFF";

  return (
    <Pressable onPress={onPress} disabled={route.routePlan?.eligible === false} style={{ opacity: route.routePlan?.eligible === false ? 0.72 : 1 }}>
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
                <RouteBadge label={isEligible ? `Rank #${index + 1}` : "Unavailable candidate"} />
              </View>

              <AppText variant="subheading" color={colors.textDarkPrimary}>
                {route.provider}
              </AppText>

              <AppText variant="caption" color={colors.textDarkSecondary}>
                {route.rail} rail • ETA {route.estimatedTime}
              </AppText>
            </View>

            <View style={{ alignItems: "flex-end", gap: 3 }}>
              <AppText variant={evidenceScore == null ? "caption" : "title"} style={{ color: evidenceScore == null ? colors.textDarkMuted : scoreColor(evidenceScore) }}>
                {evidenceScore == null ? "Unavailable" : evidenceScore}
              </AppText>

              <AppText variant="caption" color={colors.textDarkMuted}>{evidenceScore == null ? "evidence score" : "/100 evidence score"}</AppText>
            </View>
          </View>

          {evidenceScore == null ? null : <ScoreBar value={evidenceScore} />}

          {route.routePlan ? (
            <View style={{ gap: 10 }}>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                {route.routePlan.sourceProvenance.map((source) => (
                  <DataProvenanceBadge key={`${route.id}-${source}`} classification={source} />
                ))}
              </View>
              <RoutePlanComparison plan={route.routePlan} />
            </View>
          ) : null}

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
              {recipientAmount == null ? "Unavailable" : `${formatMoney(recipientAmount)} ${recipientCurrency}`}
            </AppText>

            <AppText variant="caption" color="#BFEAF1">
              {fxRate == null ? "FX unavailable" : `FX: 1 GBP ≈ ${fxRate.toFixed(4)} ${recipientCurrency}`} • Fee {route.routePlan?.economics.providerFees.value == null ? "Unavailable" : `£${route.fee.toFixed(2)}`}
            </AppText>
          </View>

          <View style={{ flexDirection: "row", gap: 8 }}>
            <MiniStat label="Speed" value={route.estimatedTime} />
            <MiniStat label="Fee" value={route.routePlan?.economics.providerFees.value == null ? "Unavailable" : `£${route.fee.toFixed(2)}`} />
            <MiniStat label="Confidence" value={`${route.routePlan?.intelligence.confidence.value ?? 0}/100`} />
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
                  Route decision evidence
                </AppText>

                <AppText variant="body" color={colors.textDarkPrimary} style={{ fontWeight: "900" }}>
                  {isEligible ? routeExplanation?.data.title ?? route.aiRecommendation : "Why this route is unavailable"}
                </AppText>

                {(isEligible
                  ? routeExplanation?.data.bullets ?? route.routePlan?.intelligence.decisionFactors ?? [route.corridorInsight]
                  : route.routePlan?.eligibilityReasons ?? [route.aiRecommendation]
                ).filter(Boolean).map((line, lineIndex) => (
                  <AppText
                    key={`${route.id}-explain-${lineIndex}`}
                    variant="caption"
                    color={colors.textDarkSecondary}
                  >
                    {line}
                  </AppText>
                ))}

                <View style={{ flexDirection: "row", gap: 8 }}>
                  <MiniStat
                    label="Evidence risk"
                    value={`${route.routePlan?.intelligence.risk.value.toFixed(0) ?? "0"}%`}
                  />

                  <MiniStat
                    label="Coverage"
                    value={`${route.routePlan?.intelligence.evidenceCoverage ?? 0}%`}
                  />

                  <MiniStat
                    label="AI source"
                    value={!isEligible ? "NOT USED" : routeExplanation?.source === "edge_function" ? "DERIVED" : "FALLBACK"}
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
                  Provider evidence gaps
                </AppText>

                <AppText variant="body" color={colors.textDarkPrimary} style={{ fontWeight: "900" }}>
                  {route.routePlan?.eligible ? "Eligible for sandbox execution" : "Route unavailable"}
                </AppText>

                <View style={{ flexDirection: "row", gap: 8 }}>
                  <MiniStat
                    label="Liquidity"
                    value={route.routePlan?.intelligence.liquidity.value == null ? "Unavailable" : String(route.routePlan.intelligence.liquidity.value)}
                  />

                  <MiniStat
                    label="Capacity"
                    value={route.routePlan?.intelligence.capacity.value == null ? "Unavailable" : String(route.routePlan.intelligence.capacity.value)}
                  />

                  <MiniStat
                    label="Total cost"
                    value={route.routePlan?.economics.totalCost.value == null ? "Unavailable" : `£${route.routePlan.economics.totalCost.value.toFixed(2)}`}
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
                    Decision factors
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
  const { rlusdBalance } = useWallet();
  const {
    loading: nexusAILoading,
    enabled: routeAIEnabled,
    disabled: routeAIDisabled,
    settings,
    toggle: toggleRouteAI,
  } = useNexusAIScreenSetting("route_enabled");

  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [approvalError, setApprovalError] = useState<string | null>(null);
  const [routeExplanations, setRouteExplanations] = useState<
    Record<string, { data: RouteExplanationResult; source: "edge_function" | "fallback" }>
  >({});

  const canonicalRouteResult = useCanonicalRouteQuotes({
    amount: transfer?.senderAmount ?? 0,
    destinationCurrency: transfer?.recipient?.currency,
    destinationCountry: transfer?.recipient?.country,
    payoutMethod: transfer?.recipient?.payoutMethod ?? "BANK",
    fundingMethod: transfer?.fundingMethod ?? "OPEN_BANKING",
    actualRlusdBalance: rlusdBalance,
    enabled: Boolean(transfer && (!transfer.routes || transfer.routes.length === 0)),
  });
  const generatedRoutes = canonicalRouteResult.routes;

  const shouldStoreGeneratedRoutes =
    Boolean(transfer) &&
    generatedRoutes.length > 0 &&
    (!transfer?.routes || transfer.routes.length === 0);

  useEffect(() => {
    if (!shouldStoreGeneratedRoutes) return;
    setRoutes(generatedRoutes);
  }, [shouldStoreGeneratedRoutes, generatedRoutes, setRoutes]);

  const activeRoutes =
    transfer?.routes && transfer.routes.length > 0 ? transfer.routes : generatedRoutes;

  useEffect(() => {
    let active = true;

    if (!routeAIEnabled || activeRoutes.length === 0) {
      setRouteExplanations({});
      return () => {
        active = false;
      };
    }

    async function hydrateRouteExplanations() {
      const nextEntries = await Promise.all(
        activeRoutes.filter((route) => route.routePlan?.eligible !== false).map(async (route) => {
          const corridor = route.treasuryCorridor ?? `${transfer?.senderCurrency ?? "GBP"} → ${transfer?.recipient.currency ?? "PHP"}`;

          const result = await explainRoute(
            {
              corridor,
              routeScore: route.score,
              liquidityScore: route.liquidityScore ?? 0,
              treasuryScore: route.treasuryScore ?? 0,
              settlementEstimate: route.estimatedTime,
            },
            settings?.sensitivity ?? "balanced",
            {
              timeoutMs: 6000,
              maxRetries: 1,
              _routeQuote: route,
            }
          );

            return [route.id, { data: result.data, source: result.meta.source }] as const;
        })
      );

      if (!active) return;

      setRouteExplanations(Object.fromEntries(nextEntries));
    }

    void hydrateRouteExplanations();

    return () => {
      active = false;
    };
  }, [activeRoutes, routeAIEnabled, settings?.sensitivity, transfer?.recipient.currency, transfer?.senderCurrency]);

  const selectedRoute = activeRoutes.find((route) => route.id === selectedRouteId);

  const handleSelectRoute = (route: RouteQuote) => {
    if (route.routePlan && !route.routePlan.eligible) return;
    setApprovalError(null);
    setSelectedRouteId(route.id);
  };

  const handleContinue = async () => {
    if (!selectedRoute) return;
    const approved = await selectRoute(selectedRoute);
    if (!approved) {
      setApprovalError("The selected Route Plan could not be persisted and approved. Recalculate before continuing.");
      return;
    }
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

          <NexusAIToggleCard
            title="Nexus AI"
            description="Controls route intelligence scoring, corridor liquidity reasoning and route explanations on this screen."
            enabled={routeAIEnabled}
            disabled={routeAIDisabled}
            loading={nexusAILoading}
            onToggle={toggleRouteAI}
          />

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
              NexusPay has ranked executable routes and separately disclosed unavailable candidates with their blocking evidence.
            </AppText>
          </View>

          <NexusAIToggleCard
            title="Nexus AI"
            description="Controls route intelligence scoring, corridor liquidity reasoning and route explanations on this screen."
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
                routeExplanation={routeExplanations[route.id]}
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
                  : "Select an eligible ranked route to continue."}
              </AppText>
            </View>

            {approvalError ? (
              <AppText variant="caption" color="#B91C1C">{approvalError}</AppText>
            ) : null}

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
