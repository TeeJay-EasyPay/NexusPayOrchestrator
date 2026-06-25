import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Linking, Pressable, ScrollView, View } from "react-native";

import { OperationalTimelineCard } from "../src/components/audit/OperationalTimelineCard";
import { NexusAIToggleCard } from "../src/components/intelligence/NexusAIToggleCard";
import { OpenBankingFlowCard } from "../src/components/openBanking/OpenBankingFlowCard";
import { AppButton } from "../src/components/ui/AppButton";
import { AppCard } from "../src/components/ui/AppCard";
import { AppText } from "../src/components/ui/AppText";
import { Screen } from "../src/components/ui/Screen";
import { useNexusAIScreenSetting } from "../src/hooks/useNexusAISettings";
import {
    ExecutionSnapshot,
    ExecutionStep,
    runTransferExecution,
} from "../src/services/execution/executionEngine";
import { loadExecutionSession } from "../src/services/execution/executionPersistenceService";
import { subscribeToExecutionSession } from "../src/services/execution/executionRealtimeService";
import {
    analyseTransfer,
    TransferAnalysisResult,
} from "../src/services/nexusAIService";
import { loadOpenBankingPaymentFlow } from "../src/services/openBankingPaymentFlowService";
import { PayoutStatus } from "../src/services/payout/payoutTypes";
import { useTransfer } from "../src/state/TransferContext";
import { useWallet } from "../src/state/WalletContext";
import { colors } from "../src/theme";
import { OpenBankingPaymentFlow } from "../src/types/transfer";

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

function executionStepColor(status: ExecutionStep["status"]) {
  if (status === "DONE") return "#16A34A";
  if (status === "RUNNING") return colors.gold;
  if (status === "FAILED") return "#DC2626";
  if (status === "SKIPPED") return "#94A3B8";
  return "#E5E7EB";
}

function executionStepSymbol(step: ExecutionStep, index: number) {
  if (step.status === "DONE") return "✓";
  if (step.status === "FAILED") return "!";
  if (step.status === "SKIPPED") return "–";
  return String(index + 1);
}

function metadataLines(metadata?: Record<string, unknown>) {
  if (!metadata) return [];

  return Object.entries(metadata)
    .filter(([, value]) => value !== null && value !== undefined && value !== "")
    .slice(0, 4)
    .map(([key, value]) => {
      const safeValue = typeof value === "object" ? JSON.stringify(value) : String(value);
      return `${key.replace(/_/g, " ")}: ${safeValue}`;
    });
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
  const {
    loading: nexusAILoading,
    enabled: trackingAIEnabled,
    disabled: trackingAIDisabled,
    settings,
    toggle: toggleTrackingAI,
  } = useNexusAIScreenSetting("tracking_enabled");

  const [executionSnapshot, setExecutionSnapshot] = useState<ExecutionSnapshot | null>(null);
  const [completedAt, setCompletedAt] = useState<string | null>(null);
  const [realtimeStatus, setRealtimeStatus] = useState("Connecting");
  const [transferAnalysis, setTransferAnalysis] =
    useState<TransferAnalysisResult | null>(null);
  const [openBankingFlow, setOpenBankingFlowState] = useState<OpenBankingPaymentFlow | null>(null);

  const hasStartedRef = useRef(false);
  const hasDebitedWalletRef = useRef(false);
  const hasCompletedRef = useRef(false);

  const selectedRoute = transfer?.selectedRoute;

  function applyExecutionSnapshot(snapshot: ExecutionSnapshot) {
    setExecutionSnapshot(snapshot);

    if (snapshot.state === "COMPLETED" && !hasCompletedRef.current) {
      hasCompletedRef.current = true;
      completeTransfer();
      setCompletedAt(new Date().toLocaleTimeString());
    }
  }

  useEffect(() => {
  if (!transfer?.id) return;

  const transferId = transfer.id;

  let mounted = true;

  async function hydrateExistingSession() {
    const persisted = await loadExecutionSession(transferId);

    if (mounted && persisted?.snapshot) {
      applyExecutionSnapshot(persisted.snapshot);
    }
  }

    hydrateExistingSession();

    const unsubscribe = subscribeToExecutionSession({
      transferId: transfer.id,
      onSession: () => setRealtimeStatus("Live"),
      onSnapshot: (snapshot) => {
        setRealtimeStatus("Live");
        applyExecutionSnapshot(snapshot);
      },
      onError: () => setRealtimeStatus("Manual refresh fallback"),
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [transfer?.id]);

  useEffect(() => {
    if (!transfer?.id || transfer.fundingMethod !== "OPEN_BANKING") {
      setOpenBankingFlowState(null);
      return;
    }

    if (transfer.openBankingFlow) {
      setOpenBankingFlowState(transfer.openBankingFlow);
      return;
    }

    let mounted = true;
    loadOpenBankingPaymentFlow(transfer.id).then((flow) => {
      if (!mounted) return;
      setOpenBankingFlowState(flow);
    });

    return () => {
      mounted = false;
    };
  }, [transfer?.id, transfer?.fundingMethod, transfer?.openBankingFlow]);

  useEffect(() => {
  if (!transfer || !selectedRoute) return;

  const currentTransfer = transfer;
  const currentRoute = selectedRoute;

  if (hasStartedRef.current) return;

  hasStartedRef.current = true;
  startTransfer();

  if (!hasDebitedWalletRef.current) {
    debitGbp(currentTransfer.senderAmount ?? 0);
    hasDebitedWalletRef.current = true;
  }

  async function executeTransfer() {
    const result = await runTransferExecution({
      transfer: currentTransfer,
      selectedRoute: currentRoute,
      refreshXrpBalance,
      onSnapshot: applyExecutionSnapshot,
    });

    if (result.completed && !hasCompletedRef.current) {
      hasCompletedRef.current = true;
      completeTransfer();
      setCompletedAt(new Date().toLocaleTimeString());
    }
  }

  executeTransfer();
}, [
  transfer?.id,
  selectedRoute?.id,
  startTransfer,
  debitGbp,
  refreshXrpBalance,
  completeTransfer,
]);

  useEffect(() => {
    let active = true;

    if (!trackingAIEnabled || !transfer?.id) {
      setTransferAnalysis(null);
      return () => {
        active = false;
      };
    }

    const milestones = (executionSnapshot?.steps ?? []).map((step) => ({
      title: step.title,
      status: step.status,
    }));

    const operationalEvents = metadataLines(executionSnapshot?.telemetry ?? {}).map((line) => {
      const separator = line.indexOf(":");
      const label = separator > 0 ? line.slice(0, separator).trim() : "telemetry";
      const value = separator > 0 ? line.slice(separator + 1).trim() : line;
      return { label, value };
    });

    void analyseTransfer(
      {
        transferId: transfer.id,
        transferState: executionSnapshot?.state ?? transfer.status,
        progressPercent: executionSnapshot?.progressPercent ?? 0,
        settlementCommentary:
          executionSnapshot?.humanStatus ?? "Preparing execution engine...",
        milestones,
        operationalEvents,
      },
      settings?.sensitivity ?? "balanced",
      {
        timeoutMs: 6500,
        maxRetries: 1,
        _transfer: transfer,
        _executionSnapshot: executionSnapshot ?? undefined,
      }
    ).then((result) => {
      if (!active) return;
      setTransferAnalysis(result.data);
    });

    return () => {
      active = false;
    };
  }, [
    trackingAIEnabled,
    transfer?.id,
    transfer?.status,
    executionSnapshot?.state,
    executionSnapshot?.progressPercent,
    executionSnapshot?.humanStatus,
    executionSnapshot?.steps,
    executionSnapshot?.telemetry,
    settings?.sensitivity,
  ]);

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

          <NexusAIToggleCard
            title="Nexus AI"
            description="Controls AI transfer monitoring, status analysis and operational insights on this screen."
            enabled={trackingAIEnabled}
            disabled={trackingAIDisabled}
            loading={nexusAILoading}
            onToggle={toggleTrackingAI}
          />

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
  const activeRoute = executionSnapshot?.activeRoute ?? selectedRoute;
  const executionSteps = executionSnapshot?.steps ?? [];
  const activeStep = executionSnapshot?.activeStepIndex ?? 0;
  const progressPercent = executionSnapshot?.progressPercent ?? 0;
  const isCompleted = executionSnapshot?.state === "COMPLETED";
  const isFailed = executionSnapshot?.state === "FAILED";
  const isHybridRoute = activeRoute.rail === "HYBRID";
  const payout = executionSnapshot?.payout ?? null;
  const payoutStatus = executionSnapshot?.payoutStatus ?? "NOT_STARTED";
  const xrplStatus = executionSnapshot?.xrplStatus ?? (isHybridRoute ? "PENDING" : "NOT_REQUIRED");
  const xrplProof = executionSnapshot?.xrplProof;
  const humanStatus = executionSnapshot?.humanStatus ?? "Preparing execution engine...";
  const executionTelemetry = executionSnapshot?.telemetry ?? {};
  const telemetrySummary = metadataLines(executionTelemetry);
  const visibleOpenBankingFlow =
    executionSnapshot?.openBankingFlow ?? transfer.openBankingFlow ?? openBankingFlow;

  const payoutLabel = safeRecipient?.payoutMethod === "BANK"
    ? `${safeRecipient?.bankName ?? "Selected bank"} bank account`
    : `${safeRecipient?.mobileWalletProvider ?? "Selected wallet"} mobile wallet`;

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={{ gap: 18, paddingBottom: 40 }}>
          <View style={{ gap: 6 }}>
            <AppText variant="caption" color={colors.gold}>NexusPay execution layer</AppText>
            <AppText variant="title" color={colors.textPrimary}>Track Transfer</AppText>
            <AppText variant="body" color={colors.textSecondary}>
              NexusPay is coordinating settlement, bridge proof and payout delivery through the execution engine.
            </AppText>
          </View>

          <NexusAIToggleCard
            title="Nexus AI"
            description="Controls AI transfer monitoring, status analysis and operational insights on this screen."
            enabled={trackingAIEnabled}
            disabled={trackingAIDisabled}
            loading={nexusAILoading}
            onToggle={toggleTrackingAI}
          />

          {!trackingAIEnabled ? (
            <AppCard>
              <AppText variant="subheading" color={colors.textDarkPrimary} style={{ fontWeight: "900" }}>
                Nexus AI disabled for this screen
              </AppText>

              <AppText variant="caption" color={colors.textDarkSecondary} style={{ marginTop: 6 }}>
                Execution still runs normally, but AI-assisted tracking context is hidden until tracking intelligence is enabled.
              </AppText>
            </AppCard>
          ) : null}

          {trackingAIEnabled ? (
            <AppCard>
              <View style={{ gap: 8 }}>
                <AppText variant="subheading" color={colors.textDarkPrimary}>
                  {transferAnalysis?.title ?? "Transfer intelligence"}
                </AppText>

                <AppText variant="body" color={colors.textDarkSecondary}>
                  {transferAnalysis?.progressAnalysis ?? "Analysing transfer progress and execution telemetry..."}
                </AppText>

                <AppText variant="caption" color={colors.textDarkSecondary}>
                  {transferAnalysis?.settlementCommentary ?? humanStatus}
                </AppText>

                {(transferAnalysis?.milestoneAnalysis ?? []).slice(0, 2).map((line, index) => (
                  <AppText key={`track-ai-line-${index}`} variant="caption" color={colors.textDarkMuted}>
                    • {line}
                  </AppText>
                ))}
              </View>
            </AppCard>
          ) : null}

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
                  {isCompleted ? "Delivered" : isFailed ? "Attention needed" : "In motion"}
                </AppText>
              </View>

              <View
                style={{
                  paddingHorizontal: 11,
                  paddingVertical: 6,
                  borderRadius: 999,
                  backgroundColor: isCompleted
                    ? "rgba(22,163,74,0.22)"
                    : isFailed
                    ? "rgba(220,38,38,0.22)"
                    : "rgba(214,168,79,0.22)",
                }}
              >
                <AppText
                  variant="caption"
                  style={{
                    color: isCompleted ? "#86EFAC" : isFailed ? "#FCA5A5" : colors.gold,
                    fontWeight: "900",
                  }}
                >
                  {isCompleted ? "COMPLETED" : isFailed ? "FAILED" : `${progressPercent}% COMPLETE`}
                </AppText>
              </View>
            </View>

            <ProgressBar value={progressPercent} />

            <View style={{ flexDirection: "row", gap: 8 }}>
              <HeroMetric label="Sending" value={`£${(transfer.senderAmount ?? 0).toFixed(2)}`} />
              <HeroMetric label="Receiving" value={formatCurrency(activeRoute.receiveAmount, recipientCurrency)} />
            </View>

            <View
              style={{
                padding: 13,
                borderRadius: 18,
                backgroundColor: "rgba(255,255,255,0.10)",
                gap: 4,
              }}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
                <AppText variant="caption" color="#BFEAF1">Active execution stage</AppText>
                <AppText variant="caption" color={realtimeStatus === "Live" ? "#86EFAC" : colors.gold} style={{ fontWeight: "900" }}>
                  {realtimeStatus}
                </AppText>
              </View>
              <AppText variant="body" color="#FFFFFF" style={{ fontWeight: "900" }}>
                {executionSteps[activeStep]?.title ?? "Preparing execution engine"}
              </AppText>
              <AppText variant="caption" color="#BFEAF1">
                {humanStatus}
              </AppText>
              <AppText variant="caption" color="#BFEAF1">
                Ref NPX-{transfer.id.slice(-6)} • {activeRoute.provider ?? "Selected route"}
              </AppText>
            </View>
          </View>

          {executionSnapshot?.failoverUsed ? (
            <AppCard>
              <View style={{ gap: 8 }}>
                <AppText variant="subheading" color={colors.textDarkPrimary}>
                  Safe failover activated
                </AppText>
                <AppText variant="caption" color={colors.textDarkSecondary}>
                  NexusPay rerouted this transfer from {selectedRoute.provider} to {activeRoute.provider} after the primary execution path became unavailable.
                </AppText>
              </View>
            </AppCard>
          ) : null}

          {transfer.fundingMethod === "OPEN_BANKING" ? (
            <OpenBankingFlowCard flow={visibleOpenBankingFlow} />
          ) : null}

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
                <DetailMetric label="Route score" value={`${activeRoute.score ?? 0}/100`} />
                <DetailMetric label="Rail" value={activeRoute.rail} />
                <DetailMetric label="ETA" value={activeRoute.estimatedTime ?? "Live"} />
              </View>

              <View style={{ flexDirection: "row", gap: 8 }}>
                <DetailMetric label="Provider" value={activeRoute.provider ?? "Route engine"} />
                <DetailMetric label="Retries" value={String(executionTelemetry.provider_max_retries ?? activeRoute.providerMaxRetries ?? 0)} />
                <DetailMetric label="Timeout" value={`${executionTelemetry.provider_timeout_ms ?? activeRoute.providerTimeoutMs ?? 0}ms`} />
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
                Execution state machine
              </AppText>

              {executionSteps.length === 0 ? (
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
                    Waiting for execution engine snapshot...
                  </AppText>
                </View>
              ) : (
                executionSteps.map((step, index) => {
                  const color = executionStepColor(step.status);
                  const isActive = step.status === "RUNNING";
                  const isFuture = step.status === "PENDING";

                  return (
                    <View
                      key={`${step.id}-${index}`}
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
                            backgroundColor: step.status === "PENDING" ? "#E5E7EB" : color,
                          }}
                        >
                          <AppText
                            variant="caption"
                            style={{
                              color: step.status === "PENDING" ? colors.textDarkPrimary : "#FFFFFF",
                              fontWeight: "900",
                            }}
                          >
                            {executionStepSymbol(step, index)}
                          </AppText>
                        </View>

                        {index < executionSteps.length - 1 ? (
                          <View
                            style={{
                              width: 2,
                              height: step.telemetry ? 54 : 38,
                              backgroundColor: step.status === "DONE" ? "#16A34A" : "#E5E7EB",
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

                        {step.attempt > 0 ? (
                          <AppText variant="caption" color={colors.textDarkMuted}>
                            Attempt {step.attempt}{step.provider ? ` • ${step.provider}` : ""}
                          </AppText>
                        ) : null}

                        {isActive ? (
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
                })
              )}
            </View>
          </AppCard>

          <AppCard>
            <View style={{ gap: 12 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                <View style={{ flex: 1 }}>
                  <AppText variant="subheading" color={colors.textDarkPrimary}>
                    Settlement proof
                  </AppText>
                  <AppText variant="caption" color={colors.textDarkSecondary}>
                    Transfer reference and XRPL testnet proof where applicable.
                  </AppText>
                </View>
                <View style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: `${statusColor(xrplStatus)}22` }}>
                  <AppText variant="caption" style={{ color: statusColor(xrplStatus), fontWeight: "900" }}>
                    {isHybridRoute ? xrplStatus : "FIAT"}
                  </AppText>
                </View>
              </View>

              <View style={{ padding: 14, borderRadius: 18, backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#E2E8F0", gap: 7 }}>
                <AppText variant="body" color={colors.textDarkPrimary} style={{ fontWeight: "900" }}>
                  Fiat payout reference: NPX-{transfer.id.slice(-6)}
                </AppText>
                <AppText variant="caption" color={colors.textDarkSecondary}>
                  Fee £{(activeRoute.fee ?? 0).toFixed(2)} • Recipient receives {formatCurrency(activeRoute.receiveAmount, recipientCurrency)}
                </AppText>
              </View>

              {isHybridRoute ? (
                <View style={{ gap: 8 }}>
                  <AppText variant="caption" color={colors.textDarkSecondary}>
                    XRPL status: {xrplStatus === "PENDING" ? "Submitting calculated testnet settlement..." : xrplStatus === "COMPLETED" ? "Validated on XRPL Testnet" : xrplStatus === "FAILED" ? "XRPL settlement failed" : "Not started"}
                  </AppText>

                  {xrplProof ? (
                    <View style={{ gap: 8 }}>
                      <View style={{ flexDirection: "row", gap: 8 }}>
                        <DetailMetric label="XRP settled" value={`${xrplProof?.xrpAmount ?? "0"} XRP`} />
                        <DetailMetric label="Rate" value={(xrplProof?.settlementRate ?? 0).toFixed(4)} />
                      </View>

                      {xrplProof.txHash ? (
                        <Pressable
                          onPress={() => Linking.openURL(getXrplTestnetTransactionUrl(xrplProof.txHash))}
                          style={{ padding: 12, borderRadius: 16, backgroundColor: "#EAF3FF", borderWidth: 1, borderColor: "#B8D9FF", gap: 4 }}
                        >
                          <AppText variant="caption" style={{ fontWeight: "900", color: "#0B63CE" }}>
                            View on XRPL Testnet Explorer
                          </AppText>
                          <AppText variant="caption" style={{ color: "#24527A" }}>
                            {shorten(xrplProof.txHash)}
                          </AppText>
                        </Pressable>
                      ) : null}
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
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <AppText variant="subheading" color={colors.textDarkPrimary}>
                    Payout execution
                  </AppText>
                  <AppText variant="caption" color={colors.textDarkSecondary}>
                    Final-leg payout handled through the provider-agnostic execution engine.
                  </AppText>
                </View>
                <View style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: `${payoutStatusColor(payoutStatus)}22` }}>
                  <AppText variant="caption" style={{ color: payoutStatusColor(payoutStatus), fontWeight: "900" }}>
                    {payoutStatus}
                  </AppText>
                </View>
              </View>

              {!payout ? (
                <View style={{ padding: 14, borderRadius: 18, backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#E2E8F0" }}>
                  <AppText variant="caption" color={colors.textDarkSecondary}>
                    Waiting for final-leg payout trigger from the execution engine...
                  </AppText>
                </View>
              ) : (
                <View style={{ gap: 10 }}>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <DetailMetric label="Provider" value={payout.providerName} />
                    <DetailMetric label="ETA" value={payout.estimatedArrival} />
                  </View>
                  <View style={{ padding: 14, borderRadius: 18, backgroundColor: payoutStatus === "PAID_OUT" ? "#DCFCE7" : "#FEF3C7", borderWidth: 1, borderColor: payoutStatus === "PAID_OUT" ? "#86EFAC" : "#F1D99B", gap: 6 }}>
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

          <AppCard>
            <View style={{ gap: 12 }}>
              <View style={{ gap: 4 }}>
                <AppText variant="subheading" color={colors.textDarkPrimary}>
                  Provider execution telemetry
                </AppText>
                <AppText variant="caption" color={colors.textDarkSecondary}>
                  Runtime metadata emitted by the execution engine for operational observability.
                </AppText>
              </View>

              {telemetrySummary.length === 0 ? (
                <AppText variant="caption" color={colors.textDarkSecondary}>
                  Telemetry will appear once the execution engine emits its first snapshot.
                </AppText>
              ) : (
                <View style={{ gap: 6 }}>
                  {telemetrySummary.map((line) => (
                    <View key={line} style={{ padding: 10, borderRadius: 14, backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#E2E8F0" }}>
                      <AppText variant="caption" color={colors.textDarkSecondary}>
                        {line}
                      </AppText>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </AppCard>

          {isCompleted ? (
            <AppButton title="Back home" onPress={() => router.push("/")} />
          ) : null}
        </View>

        {transfer?.id ? (
          <OperationalTimelineCard
            transactionId={transfer.id}
            refreshKey={`${executionSnapshot?.state ?? "pending"}-${executionSnapshot?.progressPercent ?? 0}`}
          />
        ) : null}
      </ScrollView>
    </Screen>
  );
}
