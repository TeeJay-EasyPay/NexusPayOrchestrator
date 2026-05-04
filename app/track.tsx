import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Linking, Pressable, ScrollView, View } from "react-native";

import { AppButton } from "../src/components/ui/AppButton";
import { AppCard } from "../src/components/ui/AppCard";
import { AppText } from "../src/components/ui/AppText";
import { Screen } from "../src/components/ui/Screen";
import {
  executeXrplTestnetSettlement,
  XrplSettlementResult,
} from "../src/lib/xrplSettlement";
import { writeAuditLog } from "../src/services/auditLog";
import { createPayout, getPayoutStatus } from "../src/services/payout/payoutAdapter";
import { PayoutResult, PayoutStatus } from "../src/services/payout/payoutTypes";
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
      title: "Payout submitted to partner",
      description: "The final-leg payout request has been accepted by the payout adapter.",
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

function statusColor(status: "NOT_REQUIRED" | "PENDING" | "COMPLETED" | "FAILED") {
  if (status === "COMPLETED") return "#16A34A";
  if (status === "PENDING") return colors.gold;
  if (status === "FAILED") return "#DC2626";
  return "#94A3B8";
}

function payoutStatusColor(status: PayoutStatus) {
  if (status === "PAID_OUT") return "#16A34A";
  if (status === "FAILED") return "#DC2626";
  if (status === "PROCESSING" || status === "INITIATED") return colors.gold;
  return "#94A3B8";
}

function payoutStatusLabel(status: PayoutStatus) {
  if (status === "INITIATED") return "Payout initiated";
  if (status === "PROCESSING") return "Processing payout";
  if (status === "PAID_OUT") return "Paid into destination account";
  if (status === "FAILED") return "Payout failed";
  return "Not started";
}

function ProgressBar({ value }: { value: number }) {
  const safeValue = Math.max(0, Math.min(100, value));

  return (
    <View
      style={{
        height: 8,
        borderRadius: 999,
        overflow: "hidden",
        backgroundColor: "rgba(255,255,255,0.18)",
      }}
    >
      <View
        style={{
          width: `${safeValue}%`,
          height: "100%",
          backgroundColor: colors.gold,
        }}
      />
    </View>
  );
}

function HeroMetric({ label, value }: { label: string; value: string }) {
  return (
    <View
      style={{
        flex: 1,
        padding: 11,
        borderRadius: 16,
        backgroundColor: "rgba(255,255,255,0.10)",
        gap: 4,
      }}
    >
      <AppText variant="caption" color="#BFEAF1">
        {label}
      </AppText>

      <AppText variant="body" color="#FFFFFF" style={{ fontWeight: "900" }}>
        {value}
      </AppText>
    </View>
  );
}

function DetailMetric({ label, value }: { label: string; value: string }) {
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

export default function TrackScreen() {
  const { transfer, startTransfer, completeTransfer } = useTransfer();
  const { debitGbp, refreshXrpBalance } = useWallet();

  const [activeStep, setActiveStep] = useState(0);
  const [completedAt, setCompletedAt] = useState<string | null>(null);
  const [xrplStatus, setXrplStatus] = useState<"NOT_REQUIRED" | "PENDING" | "COMPLETED" | "FAILED">("NOT_REQUIRED");
  const [xrplProof, setXrplProof] = useState<XrplSettlementResult | null>(null);
  const [payout, setPayout] = useState<PayoutResult | null>(null);
  const [payoutStatus, setPayoutStatus] = useState<PayoutStatus>("NOT_STARTED");

  const hasStartedRef = useRef(false);
  const hasDebitedWalletRef = useRef(false);
  const hasCompletedRef = useRef(false);
  const hasStartedXrplRef = useRef(false);
  const hasStartedPayoutRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const selectedRoute = transfer?.selectedRoute;
  const recipient = transfer?.recipient;

  const timelineSteps = useMemo(() => {
    return buildTimelineSteps(selectedRoute?.settlementStages ?? selectedRoute?.steps ?? []);
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
          if (timerRef.current) clearInterval(timerRef.current);
          return currentStep;
        }

        return currentStep + 1;
      });
    }, 1400);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
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
    if (!transfer || !selectedRoute || !recipient) return;
    if (hasStartedPayoutRef.current) return;

    const shouldStartPayout = activeStep >= Math.max(timelineSteps.length - 2, 0);
    if (!shouldStartPayout) return;

    const payoutTransfer = transfer;
    const payoutRoute = selectedRoute;
    const payoutRecipient = recipient;

    hasStartedPayoutRef.current = true;

    async function runPayout() {
      try {
        setPayoutStatus("INITIATED");

        await writeAuditLog({
          eventType: "PAYOUT_INITIATED",
          entityType: "transfer",
          entityId: payoutTransfer.id,
          metadata: {
            provider_mode: "mock_sandbox",
            amount: payoutRoute.receiveAmount,
            currency: payoutRecipient.currency,
            country: payoutRecipient.country,
            payout_method: payoutRecipient.payoutMethod,
          },
        });

        const result = await createPayout({
          transferId: payoutTransfer.id,
          amount: payoutRoute.receiveAmount,
          currency: payoutRecipient.currency,
          country: payoutRecipient.country,
          recipient: payoutRecipient,
          payoutMethod: payoutRecipient.payoutMethod,
        });

        setPayout(result);
        setPayoutStatus("PROCESSING");

        await writeAuditLog({
          eventType: "PAYOUT_PROCESSING",
          entityType: "transfer",
          entityId: payoutTransfer.id,
          metadata: {
            payout_reference: result.payoutReference,
            provider: result.providerName,
            destination: result.destinationLabel,
          },
        });

        const finalStatus = await getPayoutStatus(result.payoutReference);

        setTimeout(async () => {
          setPayoutStatus(finalStatus);

          await writeAuditLog({
            eventType: finalStatus === "PAID_OUT" ? "PAYOUT_COMPLETED" : "PAYOUT_FAILED",
            entityType: "transfer",
            entityId: payoutTransfer.id,
            metadata: {
              payout_reference: result.payoutReference,
              provider: result.providerName,
              final_status: finalStatus,
            },
          });
        }, 1200);
      } catch (error) {
        console.error("Payout execution failed", error);
        setPayoutStatus("FAILED");

        await writeAuditLog({
          eventType: "PAYOUT_FAILED",
          entityType: "transfer",
          entityId: payoutTransfer.id,
          metadata: {
            provider_mode: "mock_sandbox",
            error: String(error),
          },
        });
      }
    }

    runPayout();
  }, [activeStep, timelineSteps.length, transfer?.id, selectedRoute?.id, recipient?.name]);

  useEffect(() => {
    if (!transfer || !selectedRoute) return;
    if (hasCompletedRef.current) return;

    const isFinalStep = activeStep >= timelineSteps.length - 1;

    if (isFinalStep) {
      hasCompletedRef.current = true;
      completeTransfer();
      setCompletedAt(new Date().toLocaleTimeString());
    }
  }, [activeStep, timelineSteps.length, transfer?.id, selectedRoute?.id, completeTransfer]);

  if (!transfer || !selectedRoute) {
    return (
      <Screen>
        <View style={{ gap: 18 }}>
          <View style={{ gap: 6 }}>
            <AppText variant="caption" color={colors.gold}>
              Transfer execution
            </AppText>
            <AppText variant="title" color={colors.textPrimary}>
              No active transfer
            </AppText>
          </View>

          <AppCard>
            <AppText variant="body" color={colors.textDarkSecondary}>
              Select a route first so NexusPay can begin tracking the transfer.
            </AppText>
          </AppCard>

          <AppButton title="Go to routes" onPress={() => router.push("/routes")} />
          <AppButton title="Back home" variant="secondary" onPress={() => router.push("/")} />
        </View>
      </Screen>
    );
  }

  const safeRecipient = transfer.recipient;
  const recipientCurrency = safeRecipient?.currency ?? "PHP";

  const payoutLabel = safeRecipient?.payoutMethod === "BANK"
    ? `${safeRecipient?.bankName ?? "Selected bank"} bank account`
    : `${safeRecipient?.mobileWalletProvider ?? "Selected wallet"} mobile wallet`;

  const isCompleted = activeStep >= timelineSteps.length - 1;
  const isHybridRoute = selectedRoute.rail === "HYBRID";
  const progressPercent = timelineSteps.length > 1
    ? Math.round((activeStep / (timelineSteps.length - 1)) * 100)
    : 100;

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={{ gap: 18, paddingBottom: 40 }}>
          <View style={{ gap: 6 }}>
            <AppText variant="caption" color={colors.gold}>NexusPay execution layer</AppText>
            <AppText variant="title" color={colors.textPrimary}>Track Transfer</AppText>
            <AppText variant="body" color={colors.textSecondary}>
              NexusPay is coordinating settlement, bridge proof and payout delivery.
            </AppText>
          </View>

          <View
            style={{
              padding: 18,
              borderRadius: 26,
              backgroundColor: "#0B3F4A",
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.14)",
              gap: 14,
            }}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
              <View style={{ flex: 1 }}>
                <AppText variant="caption" color="#BFEAF1">Execution status</AppText>
                <AppText variant="title" color="#FFFFFF">
                  {isCompleted ? "Delivered" : "In motion"}
                </AppText>
              </View>

              <View
                style={{
                  paddingHorizontal: 11,
                  paddingVertical: 6,
                  borderRadius: 999,
                  backgroundColor: isCompleted
                    ? "rgba(22,163,74,0.22)"
                    : "rgba(214,168,79,0.22)",
                }}
              >
                <AppText
                  variant="caption"
                  style={{
                    color: isCompleted ? "#86EFAC" : colors.gold,
                    fontWeight: "900",
                  }}
                >
                  {isCompleted ? "COMPLETED" : `${progressPercent}% COMPLETE`}
                </AppText>
              </View>
            </View>

            <ProgressBar value={progressPercent} />

            <View style={{ flexDirection: "row", gap: 8 }}>
              <HeroMetric label="Sending" value={`£${(transfer.senderAmount ?? 0).toFixed(2)}`} />
              <HeroMetric label="Receiving" value={formatCurrency(selectedRoute.receiveAmount, recipientCurrency)} />
            </View>

            <View
              style={{
                padding: 13,
                borderRadius: 18,
                backgroundColor: "rgba(255,255,255,0.10)",
                gap: 4,
              }}
            >
              <AppText variant="caption" color="#BFEAF1">Active execution stage</AppText>
              <AppText variant="body" color="#FFFFFF" style={{ fontWeight: "900" }}>
                {timelineSteps[activeStep]?.title ?? "Preparing transfer route"}
              </AppText>
              <AppText variant="caption" color="#BFEAF1">
                Ref NPX-{transfer.id.slice(-6)} • {selectedRoute.provider ?? "Selected route"}
              </AppText>
            </View>
          </View>

          <AppCard>
            <View style={{ gap: 14 }}>
              <View style={{ gap: 4 }}>
                <AppText variant="subheading" color={colors.textDarkPrimary}>
                  Transfer execution summary
                </AppText>

                <AppText variant="caption" color={colors.textDarkSecondary}>
                  Delivery route and recipient payout details.
                </AppText>
              </View>

              <View style={{ flexDirection: "row", gap: 8 }}>
                <DetailMetric label="Route score" value={`${selectedRoute.score ?? 0}/100`} />
                <DetailMetric label="Rail" value={selectedRoute.rail} />
                <DetailMetric label="ETA" value={selectedRoute.estimatedTime ?? "Live"} />
              </View>

              <View
                style={{
                  padding: 14,
                  borderRadius: 18,
                  backgroundColor: "#F8FAFC",
                  borderWidth: 1,
                  borderColor: "#E2E8F0",
                  gap: 6,
                }}
              >
                <AppText variant="caption" color={colors.textDarkMuted}>
                  Recipient payout
                </AppText>

                <AppText variant="body" color={colors.textDarkPrimary} style={{ fontWeight: "900" }}>
                  {safeRecipient?.name ?? "Recipient"} • {safeRecipient?.country ?? "Destination"}
                </AppText>

                <AppText variant="caption" color={colors.textDarkSecondary}>
                  {payoutLabel}
                </AppText>

                {completedAt ? (
                  <AppText variant="caption" color="#16A34A">
                    Completed at {completedAt}
                  </AppText>
                ) : null}
              </View>
            </View>
          </AppCard>

          <AppCard>
            <View style={{ gap: 14 }}>
              <AppText variant="subheading" color={colors.textDarkPrimary}>
                Transfer timeline
              </AppText>

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
                    <View style={{ alignItems: "center" }}>
                      <View
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 16,
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: isDone
                            ? "#16A34A"
                            : isActive
                            ? colors.gold
                            : "#E5E7EB",
                        }}
                      >
                        <AppText
                          variant="caption"
                          style={{
                            color: isFuture ? colors.textDarkPrimary : "#FFFFFF",
                            fontWeight: "900",
                          }}
                        >
                          {isDone ? "✓" : index + 1}
                        </AppText>
                      </View>

                      {index < timelineSteps.length - 1 ? (
                        <View
                          style={{
                            width: 2,
                            height: 38,
                            backgroundColor: isDone ? "#16A34A" : "#E5E7EB",
                          }}
                        />
                      ) : null}
                    </View>

                    <View style={{ flex: 1, gap: 4, paddingBottom: 12 }}>
                      <AppText
                        variant="body"
                        color={colors.textDarkPrimary}
                        style={{ fontWeight: isActive ? "900" : "700" }}
                      >
                        {step.title}
                      </AppText>

                      <AppText variant="caption" color={colors.textDarkSecondary}>
                        {step.description}
                      </AppText>

                      {isActive && !isCompleted ? (
                        <View
                          style={{
                            alignSelf: "flex-start",
                            paddingHorizontal: 9,
                            paddingVertical: 4,
                            borderRadius: 999,
                            backgroundColor: colors.goldSoft,
                          }}
                        >
                          <AppText
                            variant="caption"
                            style={{ color: "#8A6218", fontWeight: "900" }}
                          >
                            Processing now
                          </AppText>
                        </View>
                      ) : null}
                    </View>
                  </View>
                );
              })}
            </View>
          </AppCard>

          <AppCard>
            <View style={{ gap: 12 }}>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  gap: 12,
                  alignItems: "center",
                }}
              >
                <View style={{ flex: 1 }}>
                  <AppText variant="subheading" color={colors.textDarkPrimary}>
                    Settlement proof
                  </AppText>

                  <AppText variant="caption" color={colors.textDarkSecondary}>
                    Transfer reference and XRPL testnet proof where applicable.
                  </AppText>
                </View>

                <View
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderRadius: 999,
                    backgroundColor: `${statusColor(xrplStatus)}22`,
                  }}
                >
                  <AppText
                    variant="caption"
                    style={{ color: statusColor(xrplStatus), fontWeight: "900" }}
                  >
                    {isHybridRoute ? xrplStatus : "FIAT"}
                  </AppText>
                </View>
              </View>

              <View
                style={{
                  padding: 14,
                  borderRadius: 18,
                  backgroundColor: "#F8FAFC",
                  borderWidth: 1,
                  borderColor: "#E2E8F0",
                  gap: 7,
                }}
              >
                <AppText variant="body" color={colors.textDarkPrimary} style={{ fontWeight: "900" }}>
                  Fiat payout reference: NPX-{transfer.id.slice(-6)}
                </AppText>

                <AppText variant="caption" color={colors.textDarkSecondary}>
                  Fee £{(selectedRoute.fee ?? 0).toFixed(2)} • Recipient receives {formatCurrency(selectedRoute.receiveAmount, recipientCurrency)}
                </AppText>

                {selectedRoute.bridgeAsset ? (
                  <AppText variant="caption" color={colors.textDarkSecondary}>
                    Bridge asset: {selectedRoute.bridgeAsset} • Liquidity required {(selectedRoute.liquidityRequiredRlusd ?? 0).toFixed(2)} RLUSD
                  </AppText>
                ) : null}
              </View>

              {isHybridRoute ? (
                <View style={{ gap: 8 }}>
                  <AppText variant="caption" color={colors.textDarkSecondary}>
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
                    <View style={{ gap: 8 }}>
                      <View style={{ flexDirection: "row", gap: 8 }}>
                        <DetailMetric label="XRP settled" value={`${xrplProof?.xrpAmount ?? "0"} XRP`} />
                        <DetailMetric
                          label="Rate"
                          value={(xrplProof?.settlementRate ?? 0).toFixed(4)}
                        />
                      </View>

                      <AppText variant="caption" color={colors.textDarkSecondary}>
                        TX hash: {shorten(xrplProof?.txHash)}
                      </AppText>

                      {xrplProof.txHash ? (
                        <Pressable
                          onPress={() =>
                            Linking.openURL(getXrplTestnetTransactionUrl(xrplProof.txHash))
                          }
                          style={{
                            padding: 12,
                            borderRadius: 16,
                            backgroundColor: "#EAF3FF",
                            borderWidth: 1,
                            borderColor: "#B8D9FF",
                            gap: 4,
                          }}
                        >
                          <AppText
                            variant="caption"
                            style={{ fontWeight: "900", color: "#0B63CE" }}
                          >
                            View on XRPL Testnet Explorer
                          </AppText>

                          <AppText variant="caption" style={{ color: "#24527A" }}>
                            {shorten(xrplProof.txHash)}
                          </AppText>
                        </Pressable>
                      ) : null}

                      <AppText variant="caption" color={colors.textDarkSecondary}>
                        From: {shorten(xrplProof?.sourceAddress)}
                      </AppText>

                      <AppText variant="caption" color={colors.textDarkSecondary}>
                        To: {shorten(xrplProof?.destinationAddress)}
                      </AppText>
                    </View>
                  ) : null}
                </View>
              ) : (
                <AppText variant="caption" color={colors.textDarkSecondary}>
                  This route uses simulated fiat settlement. XRPL proof is only generated for HYBRID routes.
                </AppText>
              )}
            </View>
          </AppCard>

          <AppCard>
            <View style={{ gap: 12 }}>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <View style={{ flex: 1 }}>
                  <AppText variant="subheading" color={colors.textDarkPrimary}>
                    Payout execution
                  </AppText>
                  <AppText variant="caption" color={colors.textDarkSecondary}>
                    Final-leg payout handled through the provider-agnostic adapter.
                  </AppText>
                </View>

                <View
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderRadius: 999,
                    backgroundColor: `${payoutStatusColor(payoutStatus)}22`,
                  }}
                >
                  <AppText
                    variant="caption"
                    style={{ color: payoutStatusColor(payoutStatus), fontWeight: "900" }}
                  >
                    {payoutStatus}
                  </AppText>
                </View>
              </View>

              {!payout ? (
                <View
                  style={{
                    padding: 14,
                    borderRadius: 18,
                    backgroundColor: "#F8FAFC",
                    borderWidth: 1,
                    borderColor: "#E2E8F0",
                  }}
                >
                  <AppText variant="caption" color={colors.textDarkSecondary}>
                    Waiting for final-leg payout trigger...
                  </AppText>
                </View>
              ) : (
                <View style={{ gap: 10 }}>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <DetailMetric label="Provider" value={payout.providerName} />
                    <DetailMetric label="ETA" value={payout.estimatedArrival} />
                  </View>

                  <View
                    style={{
                      padding: 14,
                      borderRadius: 18,
                      backgroundColor: payoutStatus === "PAID_OUT" ? "#DCFCE7" : "#FEF3C7",
                      borderWidth: 1,
                      borderColor: payoutStatus === "PAID_OUT" ? "#86EFAC" : "#F1D99B",
                      gap: 6,
                    }}
                  >
                    <AppText variant="body" color={colors.textDarkPrimary} style={{ fontWeight: "900" }}>
                      {payoutStatusLabel(payoutStatus)}
                    </AppText>
                    <AppText variant="caption" color={colors.textDarkSecondary}>
                      Reference {payout.payoutReference} • {payout.destinationLabel}
                    </AppText>
                    <AppText variant="caption" color={colors.textDarkSecondary}>
                      {payout.providerMessage}
                    </AppText>
                  </View>
                </View>
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
