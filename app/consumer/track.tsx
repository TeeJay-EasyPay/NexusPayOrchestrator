import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View } from "react-native";

import {
    ConsumerAction,
    ConsumerCard,
    consumerColors,
    ConsumerPill,
    ConsumerShell,
} from "../../src/components/consumer/ConsumerShell";
import { OpenBankingFlowCard } from "../../src/components/openBanking/OpenBankingFlowCard";
import { RoutePlanComparison } from "../../src/components/routes/RoutePlanComparison";
import { RoutePlanHistory } from "../../src/components/routes/RoutePlanHistory";
import { AppText } from "../../src/components/ui/AppText";
import { useNexusAIScreenSetting } from "../../src/hooks/useNexusAISettings";
import {
    ExecutionSnapshot,
    runTransferExecution,
} from "../../src/services/execution/executionEngine";
import { loadExecutionSession } from "../../src/services/execution/executionPersistenceService";
import { subscribeToExecutionSession } from "../../src/services/execution/executionRealtimeService";
import {
    analyseTransfer,
    TransferAnalysisResult,
} from "../../src/services/nexusAIService";
import { loadOpenBankingPaymentFlow } from "../../src/services/openBankingPaymentFlowService";
import { loadRoutePlanEvents, RoutePlanEvent } from "../../src/services/routePlanService";
import { loadTransactionAuditLogs } from "../../src/services/transactionAuditService";
import { useTransfer } from "../../src/state/TransferContext";
import { useWallet } from "../../src/state/WalletContext";
import { OpenBankingPaymentFlow } from "../../src/types/transfer";

type TimelineStep = {
  title: string;
  state: "Done" | "Current" | "Next";
  detail: string;
};

function timelineForStatus(status: string): TimelineStep[] {
  const isCompleted = status === "COMPLETED";
  const inProgress = status === "IN_PROGRESS";

  return [
    {
      title: "Transfer created",
      state: "Done",
      detail: "Transfer reference generated and secured.",
    },
    {
      title: "Route selected",
      state: status === "CREATED" ? "Next" : "Done",
      detail: "Best delivery rail selected for recipient payout.",
    },
    {
      title: "Funding authorised",
      state: status === "FUNDING_AUTHORISED" || inProgress || isCompleted ? "Done" : "Next",
      detail: "Funding source authorisation completed.",
    },
    {
      title: "In flight",
      state: inProgress ? "Current" : isCompleted ? "Done" : "Next",
      detail: "Transfer execution engine is coordinating payout.",
    },
    {
      title: "Delivered",
      state: isCompleted ? "Done" : "Next",
      detail: "Recipient payout and receipt confirmation.",
    },
  ];
}

export default function ConsumerTrackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { transfer, completedTransfers, startTransfer, completeTransfer, hydrateTransfers } = useTransfer();
  const { debitGbp, refreshXrpBalance } = useWallet();
  const { enabled: trackingAIEnabled, settings: aiSettings } = useNexusAIScreenSetting("tracking_enabled");
  const [auditLines, setAuditLines] = useState<string[]>([]);
  const [aiUpdate, setAiUpdate] = useState<TransferAnalysisResult | null>(null);
  const [aiUpdateSource, setAiUpdateSource] = useState<"DERIVED" | "FALLBACK">("FALLBACK");
  const [openBankingFlow, setOpenBankingFlowState] = useState<OpenBankingPaymentFlow | null>(null);
  const [executionSnapshot, setExecutionSnapshot] = useState<ExecutionSnapshot | null>(null);
  const [sessionHydrated, setSessionHydrated] = useState(false);
  const [routePlanEvents, setRoutePlanEvents] = useState<RoutePlanEvent[]>([]);
  const startedTransferRef = useRef<string | null>(null);
  const successNavigationRef = useRef<string | null>(null);
  const executionStartedRef = useRef<string | null>(null);
  const completedTransferRef = useRef<string | null>(null);
  const debitedTransferRef = useRef<string | null>(null);

  useEffect(() => {
    if (!transfer?.id) {
      setAuditLines([]);
      return;
    }

    let mounted = true;

    loadTransactionAuditLogs(transfer.id).then((rows) => {
      if (!mounted) return;

      setAuditLines(
        rows.slice(-5).map((row: any) => `${row.event_type}: ${row.message}`)
      );
    });

    return () => {
      mounted = false;
    };
  }, [transfer?.id, transfer?.status]);

  const requestedTransferId = Array.isArray(params.transferId) ? params.transferId[0] : params.transferId;
  const isTransferDetailView = Boolean(requestedTransferId);
  const requestedCompletedTransfer =
    requestedTransferId
      ? completedTransfers.find((item) => item.id === requestedTransferId) ?? null
      : null;
  const latestCompleted = completedTransfers[0] ?? null;
  const activeTransfer =
    transfer?.id === requestedTransferId || (!requestedTransferId && transfer)
      ? transfer
      : requestedCompletedTransfer ?? transfer ?? latestCompleted;

  useEffect(() => {
    if (!activeTransfer?.id || activeTransfer.fundingMethod !== "OPEN_BANKING") {
      setOpenBankingFlowState(null);
      return;
    }

    if (activeTransfer.openBankingFlow) {
      setOpenBankingFlowState(activeTransfer.openBankingFlow);
      return;
    }

    let mounted = true;
    loadOpenBankingPaymentFlow(activeTransfer.id).then((flow) => {
      if (!mounted) return;
      setOpenBankingFlowState(flow);
    });

    return () => {
      mounted = false;
    };
  }, [activeTransfer?.id, activeTransfer?.fundingMethod, activeTransfer?.openBankingFlow]);

  const timeline = useMemo(() => {
    if (!executionSnapshot?.steps.length) {
      return timelineForStatus(activeTransfer?.status ?? "CREATED");
    }

    return executionSnapshot.steps.map((step) => ({
      title: step.title,
      state:
        step.status === "DONE" || step.status === "SKIPPED"
          ? "Done" as const
          : step.status === "RUNNING"
            ? "Current" as const
            : "Next" as const,
      detail: step.description,
    }));
  }, [activeTransfer?.status, executionSnapshot?.steps]);

  const applyExecutionSnapshot = useCallback((snapshot: ExecutionSnapshot) => {
    setExecutionSnapshot(snapshot);

    if (snapshot.state === "COMPLETED" && completedTransferRef.current !== snapshot.transferId) {
      completedTransferRef.current = snapshot.transferId;
      completeTransfer();
      void hydrateTransfers();
    }
  }, [completeTransfer, hydrateTransfers]);

  useEffect(() => {
    if (!activeTransfer?.id) {
      setExecutionSnapshot(null);
      setSessionHydrated(true);
      return;
    }

    const transferId = activeTransfer.id;
    let mounted = true;
    setSessionHydrated(false);

    Promise.all([
      loadExecutionSession(transferId),
      loadRoutePlanEvents(transferId),
    ]).then(([persisted, planEvents]) => {
      if (!mounted) return;
      if (persisted?.snapshot) applyExecutionSnapshot(persisted.snapshot);
      setRoutePlanEvents(planEvents);
      setSessionHydrated(true);
    });

    const unsubscribe = subscribeToExecutionSession({
      transferId,
      onSession: () => undefined,
      onSnapshot: applyExecutionSnapshot,
      onError: () => undefined,
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [activeTransfer?.id, applyExecutionSnapshot]);

  useEffect(() => {
    if (!activeTransfer?.id) return;
    loadRoutePlanEvents(activeTransfer.id).then(setRoutePlanEvents);
  }, [activeTransfer?.id, executionSnapshot?.state]);

  useEffect(() => {
    if (
      requestedTransferId
      || !sessionHydrated
      || !transfer?.id
      || !transfer.selectedRoute
      || transfer.status === "COMPLETED"
      || executionStartedRef.current === transfer.id
    ) {
      return;
    }

    const currentTransfer = transfer;
    const currentRoute = transfer.selectedRoute;
    executionStartedRef.current = transfer.id;
    startedTransferRef.current = transfer.id;
    startTransfer();

    if (debitedTransferRef.current !== transfer.id) {
      debitGbp(transfer.senderAmount ?? 0);
      debitedTransferRef.current = transfer.id;
    }

    void runTransferExecution({
      transfer: currentTransfer,
      selectedRoute: currentRoute,
      refreshXrpBalance,
      onSnapshot: applyExecutionSnapshot,
      resumeFromSnapshot: executionSnapshot,
    });
  }, [
    debitGbp,
    applyExecutionSnapshot,
    executionSnapshot,
    refreshXrpBalance,
    requestedTransferId,
    sessionHydrated,
    startTransfer,
    transfer?.id,
    transfer?.selectedRoute?.id,
    transfer?.status,
    transfer,
  ]);

  useEffect(() => {
    if (!transfer?.id || transfer.status !== "COMPLETED") {
      return;
    }

    if (startedTransferRef.current !== transfer.id) {
      return;
    }

    if (successNavigationRef.current === transfer.id) {
      return;
    }

    successNavigationRef.current = transfer.id;
    router.push({ pathname: "/consumer/success", params: { transferId: transfer.id } } as never);
  }, [router, transfer?.id, transfer?.status]);

  useEffect(() => {
    if (!trackingAIEnabled || !activeTransfer) {
      setAiUpdate(null);
      return;
    }

    let active = true;

    const timelineMilestones = timeline.map((step) => ({
      title: step.title,
      status:
        step.state === "Done"
          ? "DONE"
          : step.state === "Current"
            ? "RUNNING"
            : "PENDING",
    })) as { title: string; status: "PENDING" | "RUNNING" | "DONE" | "FAILED" | "SKIPPED" }[];

    const operationalEvents = auditLines.slice(0, 3).map((line) => ({
      label: "event",
      value: line,
    }));

    void analyseTransfer(
      {
        transferId: activeTransfer.id,
        transferState: executionSnapshot?.state ?? activeTransfer.status,
        progressPercent: executionSnapshot?.progressPercent ?? 0,
        settlementCommentary:
          executionSnapshot?.humanStatus ?? "Transfer execution timeline is preparing.",
        milestones: timelineMilestones,
        operationalEvents,
      },
      aiSettings?.sensitivity ?? "balanced",
      {
        timeoutMs: 6500,
        maxRetries: 1,
        _transfer: activeTransfer,
        _executionSnapshot: executionSnapshot ?? undefined,
      }
    ).then((result) => {
      if (!active) return;
      setAiUpdate(result.data);
      setAiUpdateSource(result.meta.source === "edge_function" ? "DERIVED" : "FALLBACK");
    });

    return () => {
      active = false;
    };
  }, [activeTransfer, aiSettings?.sensitivity, auditLines, executionSnapshot, timeline, trackingAIEnabled]);

  if (!activeTransfer) {
    return (
      <ConsumerShell
        eyebrow="TRACK"
        title="No transfer to track"
        subtitle="Create a transfer in Send to view live status and timeline updates."
      >
        <ConsumerCard>
          <AppText color={consumerColors.muted}>
            Once you create a transfer, timeline milestones and receipt details appear here.
          </AppText>
        </ConsumerCard>
      </ConsumerShell>
    );
  }

  const recipientName = activeTransfer.recipient?.name ?? "Recipient";
  const effectiveStatus = executionSnapshot?.state ?? activeTransfer.status;
  const statusLabel = effectiveStatus === "COMPLETED"
    ? "Delivered"
    : effectiveStatus === "FAILED"
      ? "Failed"
      : "On track";
  const progress = executionSnapshot?.progressPercent
    ?? (activeTransfer.status === "COMPLETED" ? 100 : activeTransfer.status === "IN_PROGRESS" ? 72 : 45);
  const displayedRoute = executionSnapshot?.activeRoute ?? activeTransfer.selectedRoute;
  const rerouteDetected = auditLines.some((line) => /reroute|failover/i.test(line));

  return (
    <ConsumerShell
      eyebrow="TRACK"
      title="Live transfer tracking"
      subtitle="User-scoped timeline, status events and transfer details from your active session."
    >
      <ConsumerCard>
        <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <AppText color={consumerColors.text} style={{ fontSize: 20, fontWeight: "900" }}>
              {recipientName}
            </AppText>
            <AppText color={consumerColors.muted}>Reference {activeTransfer.id}</AppText>
          </View>
          <ConsumerPill
            label={statusLabel}
            tone={effectiveStatus === "COMPLETED" ? "green" : effectiveStatus === "FAILED" ? "red" : "blue"}
          />
        </View>
        <View style={{ height: 10, borderRadius: 999, backgroundColor: consumerColors.blueSoft, overflow: "hidden" }}>
          <View style={{ width: `${progress}%`, height: "100%", backgroundColor: consumerColors.blue }} />
        </View>
        <AppText color={consumerColors.muted}>
          {displayedRoute?.provider ?? "Routing engine"} • ETA {displayedRoute?.estimatedTime ?? "Pending"}
        </AppText>
      </ConsumerCard>

      {displayedRoute?.routePlan ? (
        <ConsumerCard>
          <AppText color={consumerColors.text} style={{ fontSize: 18, fontWeight: "900" }}>
            Approved route evidence
          </AppText>
          <RoutePlanComparison plan={displayedRoute.routePlan} />
          <AppText color={consumerColors.text} style={{ fontSize: 18, fontWeight: "900" }}>
            Route decision history
          </AppText>
          <RoutePlanHistory events={routePlanEvents} />
        </ConsumerCard>
      ) : null}

      {rerouteDetected ? (
        <ConsumerCard accent>
          <AppText color={consumerColors.text} style={{ fontSize: 18, fontWeight: "900" }}>
            Route updated automatically
          </AppText>
          <AppText color={consumerColors.muted}>
            A route change was applied to keep your transfer moving. No action is required.
          </AppText>
        </ConsumerCard>
      ) : null}

      {trackingAIEnabled ? (
        <ConsumerCard>
          <AppText color={consumerColors.text} style={{ fontSize: 18, fontWeight: "900" }}>
            Nexus AI update • {aiUpdateSource}
          </AppText>
          <AppText color={consumerColors.muted}>
            {aiUpdate?.progressAnalysis ?? "Nexus AI is preparing transfer commentary."}
          </AppText>
        </ConsumerCard>
      ) : null}

      {activeTransfer.fundingMethod === "OPEN_BANKING" ? (
        <OpenBankingFlowCard flow={activeTransfer.openBankingFlow ?? openBankingFlow} />
      ) : null}

      <ConsumerCard>
        <AppText color={consumerColors.text} style={{ fontSize: 18, fontWeight: "900" }}>
          Transfer timeline
        </AppText>
        {timeline.map((step) => (
          <View key={step.title} style={{ flexDirection: "row", gap: 10 }}>
            <View
              style={{
                width: 12,
                height: 12,
                borderRadius: 6,
                marginTop: 4,
                backgroundColor:
                  step.state === "Done"
                    ? consumerColors.success
                    : step.state === "Current"
                      ? consumerColors.blue
                      : consumerColors.border,
              }}
            />
            <View style={{ flex: 1 }}>
              <AppText color={consumerColors.text} style={{ fontWeight: "900" }}>
                {step.title}
              </AppText>
              <AppText color={consumerColors.muted}>{step.detail}</AppText>
            </View>
          </View>
        ))}
      </ConsumerCard>

      <ConsumerCard accent>
        <AppText color={consumerColors.text} style={{ fontSize: 18, fontWeight: "900" }}>
          Operational events
        </AppText>
        {auditLines.length === 0 ? (
          <AppText color={consumerColors.muted}>
            Event feed will populate as transfer milestones are written to audit logs.
          </AppText>
        ) : (
          auditLines.map((line) => (
            <AppText key={line} color={consumerColors.muted}>
              • {line}
            </AppText>
          ))
        )}
      </ConsumerCard>

      {isTransferDetailView ? (
        <ConsumerAction
          label="Back to summary"
          icon="arrow-left"
          secondary
          onPress={() => router.push("/consumer/transfers" as never)}
        />
      ) : null}

    </ConsumerShell>
  );
}
