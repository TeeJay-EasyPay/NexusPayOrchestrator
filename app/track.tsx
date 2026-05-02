import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Linking, Pressable, ScrollView, View } from "react-native";

import { AnimatedCorridorMap } from "../src/components/transfer/AnimatedCorridorMap";
import { AppButton } from "../src/components/ui/AppButton";
import { AppCard } from "../src/components/ui/AppCard";
import { AppText } from "../src/components/ui/AppText";
import { Screen } from "../src/components/ui/Screen";
import {
  executeXrplTestnetSettlement,
  XrplSettlementResult,
} from "../src/lib/xrplSettlement";
import { useTransfer } from "../src/state/TransferContext";
import { useWallet } from "../src/state/WalletContext";
import { colors } from "../src/theme";

type TimelineStep = {
  title: string;
  description: string;
};

function buildTimelineSteps(routeSteps: string[]): TimelineStep[] {
  if (routeSteps.length > 0) {
    return routeSteps.map((step) => ({
      title: step,
      description: "Completed by the NexusPay orchestration layer.",
    }));
  }

  return [
    {
      title: "Transfer created",
      description: "The transfer has been created and prepared for routing.",
    },
    {
      title: "Compliance checks complete",
      description: "Basic payout and transfer checks have passed.",
    },
    {
      title: "Liquidity partner selected",
      description: "NexusPay selected the best available settlement route.",
    },
    {
      title: "Settlement initiated",
      description: "Funds are moving through the selected route.",
    },
    {
      title: "Recipient payout processing",
      description: "The local payout partner is preparing recipient delivery.",
    },
    {
      title: "Transfer completed",
      description: "The recipient payout has been marked as complete.",
    },
  ];
}

function formatCurrency(value: number | undefined, currency: string) {
  const safeValue = value ?? 0;

  return `${safeValue.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency}`;
}

function shorten(value: string | undefined) {
  if (!value) return "Not available";
  return `${value.slice(0, 8)}...${value.slice(-8)}`;
}

function getXrplTestnetTransactionUrl(txHash: string) {
  return `https://testnet.xrpl.org/transactions/${txHash}`;
}

export default function TrackScreen() {
  const { transfer, startTransfer, completeTransfer } = useTransfer();
  const { debitGbp, refreshXrpBalance } = useWallet();

  const [activeStep, setActiveStep] = useState(0);
  const [completedAt, setCompletedAt] = useState<string | null>(null);

  const [xrplStatus, setXrplStatus] = useState<
    "NOT_REQUIRED" | "PENDING" | "COMPLETED" | "FAILED"
  >("NOT_REQUIRED");

  const [xrplProof, setXrplProof] = useState<XrplSettlementResult | null>(null);

  const hasStartedRef = useRef(false);
  const hasDebitedWalletRef = useRef(false);
  const hasCompletedRef = useRef(false);
  const hasStartedXrplRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const selectedRoute = transfer?.selectedRoute;

  const timelineSteps = useMemo(() => {
    return buildTimelineSteps(
      selectedRoute?.settlementStages ?? selectedRoute?.steps ?? []
    );
  }, [selectedRoute?.id]);

  useEffect(() => {
    if (!transfer || !selectedRoute) return;
    if (hasStartedRef.current) return;

    hasStartedRef.current = true;

    startTransfer();

    if (!hasDebitedWalletRef.current) {
      debitGbp(transfer.senderAmount ?? 0);
      hasDebitedWalletRef.current = true;
    }

    timerRef.current = setInterval(() => {
      setActiveStep((currentStep) => {
        if (currentStep >= timelineSteps.length - 1) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
          }

          return currentStep;
        }

        return currentStep + 1;
      });
    }, 1400);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [transfer?.id, selectedRoute?.id]);

  useEffect(() => {
    if (!transfer || !selectedRoute) return;
    if (selectedRoute.rail !== "HYBRID") return;
    if (hasStartedXrplRef.current) return;

    hasStartedXrplRef.current = true;
    setXrplStatus("PENDING");

    async function runXrplSettlement() {
      try {
        const proof = await executeXrplTestnetSettlement({
          gbpAmount: transfer?.senderAmount ?? 0,
        });

        setXrplProof(proof);
        setXrplStatus("COMPLETED");

        await refreshXrpBalance();
      } catch (error) {
        console.error("XRPL settlement failed", error);
        setXrplStatus("FAILED");
      }
    }

    runXrplSettlement();
  }, [transfer?.id, selectedRoute?.id, refreshXrpBalance]);

  useEffect(() => {
    if (!transfer || !selectedRoute) return;
    if (hasCompletedRef.current) return;

    const isFinalStep = activeStep >= timelineSteps.length - 1;

    if (isFinalStep) {
      hasCompletedRef.current = true;
      completeTransfer();
      setCompletedAt(new Date().toLocaleTimeString());
    }
  }, [
    activeStep,
    timelineSteps.length,
    transfer?.id,
    selectedRoute?.id,
    completeTransfer,
  ]);

  if (!transfer || !selectedRoute) {
    return (
      <Screen>
        <View style={{ gap: 18 }}>
          <AppText variant="title">No active transfer</AppText>

          <AppCard>
            <AppText variant="body">
              Select a route first so NexusPay can begin tracking the transfer.
            </AppText>
          </AppCard>

          <AppButton title="Go to routes" onPress={() => router.push("/routes")} />

          <AppButton
            title="Back home"
            variant="secondary"
            onPress={() => router.push("/")}
          />
        </View>
      </Screen>
    );
  }

  const recipient = transfer.recipient;
  const recipientCurrency = recipient?.currency ?? "PHP";

  const payoutLabel =
    recipient?.payoutMethod === "BANK"
      ? `${recipient?.bankName ?? "Selected bank"} bank account`
      : `${recipient?.mobileWalletProvider ?? "Selected wallet"} mobile wallet`;

  const isCompleted = activeStep >= timelineSteps.length - 1;
  const isHybridRoute = selectedRoute.rail === "HYBRID";

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={{ gap: 18, paddingBottom: 40 }}>
          <View>
            <AppText variant="title" color={colors.textPrimary}>Track Transfer</AppText>

            <AppText variant="caption" color={colors.textSecondary}>
              NexusPay is coordinating the selected route and payout journey.
            </AppText>
          </View>

          <AnimatedCorridorMap
            fromLabel="London"
            toLabel={recipient?.country ?? "Destination"}
            bridgeLabel={
              selectedRoute.bridgeAsset
                ? `XRPL / ${selectedRoute.bridgeAsset}`
                : "Fiat Rail"
            }
            routeLabel={selectedRoute.routeRankLabel ?? "Live settlement corridor"}
            activeStageLabel={
              timelineSteps[activeStep]?.title ?? "Preparing transfer route"
            }
            isCompleted={isCompleted}
          />

          <AppCard>
            <View style={{ gap: 10 }}>
              <AppText variant="subheading">
                {isCompleted ? "Transfer completed" : "Transfer in progress"}
              </AppText>

              <AppText variant="body">
                Sending £{(transfer.senderAmount ?? 0).toFixed(2)} GBP to{" "}
                {recipient?.name ?? "recipient"}
              </AppText>

              <AppText variant="body">
                Recipient receives:{" "}
                {formatCurrency(selectedRoute.receiveAmount, recipientCurrency)}
              </AppText>

              <AppText variant="caption">
                Destination: {recipient?.country ?? "Destination"} • {payoutLabel}
              </AppText>

              {completedAt ? (
                <AppText variant="caption">Completed at {completedAt}</AppText>
              ) : null}
            </View>
          </AppCard>

          <AppCard>
            <View style={{ gap: 10 }}>
              <AppText variant="subheading">Selected route</AppText>

              <AppText variant="body">
                {selectedRoute.provider ?? "Selected route"}
              </AppText>

              <AppText variant="caption">
                {selectedRoute.rail} rail • ETA{" "}
                {selectedRoute.estimatedTime ?? "Calculating"}
              </AppText>

              <AppText variant="caption">
                Fee £{(selectedRoute.fee ?? 0).toFixed(2)} • Score{" "}
                {selectedRoute.score ?? 0}/100
              </AppText>

              {selectedRoute.bridgeAsset ? (
                <>
                  <AppText variant="caption">
                    Bridge asset: {selectedRoute.bridgeAsset}
                  </AppText>

                  <AppText variant="caption">
                    Liquidity required:{" "}
                    {(selectedRoute.liquidityRequiredRlusd ?? 0).toFixed(2)} RLUSD
                  </AppText>

                  <AppText variant="caption">
                    Liquidity status: {selectedRoute.liquidityStatus}
                  </AppText>
                </>
              ) : null}

              {selectedRoute.orchestrationReason ? (
                <AppText variant="caption">
                  {selectedRoute.orchestrationReason}
                </AppText>
              ) : null}
            </View>
          </AppCard>

          <AppCard>
            <View style={{ gap: 14 }}>
              <AppText variant="subheading">Transfer timeline</AppText>

              {timelineSteps.map((step, index) => {
                const isActive = index === activeStep;
                const isDone = index < activeStep;
                const isFuture = index > activeStep;

                return (
                  <View
                    key={`${step.title}-${index}`}
                    style={{
                      flexDirection: "row",
                      gap: 12,
                      opacity: isFuture ? 0.45 : 1,
                    }}
                  >
                    <View
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 14,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: isDone
                          ? "#16A34A"
                          : isActive
                          ? "#2563EB"
                          : "#E5E7EB",
                      }}
                    >
                      <AppText
                        variant="caption"
                        style={{
                          color: isFuture ? "#111827" : "#FFFFFF",
                          fontWeight: "700",
                        }}
                      >
                        {isDone ? "✓" : index + 1}
                      </AppText>
                    </View>

                    <View style={{ flex: 1, gap: 4 }}>
                      <AppText
                        variant="body"
                        style={{
                          fontWeight: isActive ? "700" : "500",
                        }}
                      >
                        {step.title}
                      </AppText>

                      <AppText variant="caption">{step.description}</AppText>

                      {isActive && !isCompleted ? (
                        <AppText variant="caption">Processing now...</AppText>
                      ) : null}
                    </View>
                  </View>
                );
              })}
            </View>
          </AppCard>

          <AppCard>
            <View style={{ gap: 8 }}>
              <AppText variant="subheading">Settlement proof</AppText>

              <AppText variant="body">
                Fiat payout reference: NPX-{transfer.id.slice(-6)}
              </AppText>

              {isHybridRoute ? (
                <>
                  <AppText variant="caption">
                    XRPL status:{" "}
                    {xrplStatus === "PENDING"
                      ? "Submitting calculated testnet settlement..."
                      : xrplStatus === "COMPLETED"
                      ? "Validated on XRPL Testnet"
                      : xrplStatus === "FAILED"
                      ? "XRPL settlement failed"
                      : "Not started"}
                  </AppText>

                  {xrplProof ? (
                    <>
                      <AppText variant="caption">
                        XRP settled: {xrplProof?.xrpAmount ?? "0"} XRP
                      </AppText>

                      <AppText variant="caption">
                        Demo settlement rate: 1 GBP ≈{" "}
                        {(xrplProof?.settlementRate ?? 0).toFixed(4)} XRP
                      </AppText>

                      <AppText variant="caption">
                        TX hash: {shorten(xrplProof?.txHash)}
                      </AppText>

                      {xrplProof.txHash ? (
                        <Pressable
                          onPress={() =>
                            Linking.openURL(
                              getXrplTestnetTransactionUrl(xrplProof.txHash)
                            )
                          }
                          style={{
                            marginTop: 6,
                            padding: 12,
                            borderRadius: 14,
                            backgroundColor: "#EAF3FF",
                            borderWidth: 1,
                            borderColor: "#B8D9FF",
                          }}
                        >
                          <AppText
                            variant="caption"
                            style={{
                              fontWeight: "700",
                              color: "#0B63CE",
                            }}
                          >
                            View on XRPL Testnet Explorer
                          </AppText>

                          <AppText
                            variant="caption"
                            style={{
                              marginTop: 4,
                              color: "#24527A",
                            }}
                          >
                            {shorten(xrplProof.txHash)}
                          </AppText>
                        </Pressable>
                      ) : null}

                      <AppText variant="caption">
                        From: {shorten(xrplProof?.sourceAddress)}
                      </AppText>

                      <AppText variant="caption">
                        To: {shorten(xrplProof?.destinationAddress)}
                      </AppText>
                    </>
                  ) : null}
                </>
              ) : (
                <AppText variant="caption">
                  This route uses simulated fiat settlement. XRPL proof is only
                  generated for HYBRID routes.
                </AppText>
              )}
            </View>
          </AppCard>

          {isCompleted ? (
            <AppButton title="Back home" onPress={() => router.push("/")} />
          ) : null}
        </View>
      </ScrollView>
    </Screen>
  );
}