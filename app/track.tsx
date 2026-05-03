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

function statusColor(status: "NOT_REQUIRED" | "PENDING" | "COMPLETED" | "FAILED") {
  if (status === "COMPLETED") return "#16A34A";
  if (status === "PENDING") return colors.gold;
  if (status === "FAILED") return "#DC2626";
  return "#94A3B8";
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

  const hasStartedRef = useRef(false);
  const hasDebitedWalletRef = useRef(false);
  const hasCompletedRef = useRef(false);
  const hasStartedXrplRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const selectedRoute = transfer?.selectedRoute;

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
          <AppText variant="title">No active transfer</AppText>
          <AppButton title="Go to routes" onPress={() => router.push("/routes")} />
        </View>
      </Screen>
    );
  }

  const recipient = transfer.recipient;
  const recipientCurrency = recipient?.currency ?? "PHP";

  const payoutLabel = recipient?.payoutMethod === "BANK"
    ? `${recipient?.bankName ?? "Selected bank"} bank account`
    : `${recipient?.mobileWalletProvider ?? "Selected wallet"} mobile wallet`;

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
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
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
        </View>
      </ScrollView>
    </Screen>
  );
}
