import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { View } from "react-native";

import {
    ConsumerAction,
    ConsumerCard,
    consumerColors,
    ConsumerPill,
    ConsumerShell,
} from "../../src/components/consumer/ConsumerShell";
import { AppText } from "../../src/components/ui/AppText";
import { useNexusAIScreenSetting } from "../../src/hooks/useNexusAISettings";
import {
    analyseTransfer,
    TransferAnalysisResult,
} from "../../src/services/nexusAIService";
import { loadTransactionAuditLogs } from "../../src/services/transactionAuditService";
import { useTransfer } from "../../src/state/TransferContext";

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
  const { transfer, completedTransfers, startTransfer, completeTransfer, hydrateTransfers } = useTransfer();
  const { enabled: trackingAIEnabled, settings: aiSettings } = useNexusAIScreenSetting("tracking_enabled");
  const [auditLines, setAuditLines] = useState<string[]>([]);
  const [aiUpdate, setAiUpdate] = useState<TransferAnalysisResult | null>(null);
  const autoCompleteForTransferRef = useRef<string | null>(null);
  const startedTransferRef = useRef<string | null>(null);
  const successNavigationRef = useRef<string | null>(null);

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

  const latestCompleted = completedTransfers[0] ?? null;
  const activeTransfer = transfer ?? latestCompleted;

  const timeline = useMemo(
    () => timelineForStatus(activeTransfer?.status ?? "CREATED"),
    [activeTransfer?.status]
  );

  async function markDelivered() {
    if (!transfer) {
      return;
    }

    if (transfer.status !== "IN_PROGRESS") {
      startTransfer();
    }

    completeTransfer();
    await hydrateTransfers();
  }

  useEffect(() => {
    if (!transfer?.id || transfer.status === "COMPLETED") {
      return;
    }

    startedTransferRef.current = transfer.id;

    if (autoCompleteForTransferRef.current === transfer.id) {
      return;
    }

    autoCompleteForTransferRef.current = transfer.id;

    const timer = setTimeout(() => {
      if (transfer.status !== "IN_PROGRESS") {
        startTransfer();
      }

      completeTransfer();
      void hydrateTransfers();
    }, 1200);

    return () => clearTimeout(timer);
  }, [completeTransfer, hydrateTransfers, startTransfer, transfer?.id, transfer?.status]);

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
        transferState: activeTransfer.status,
        progressPercent:
          activeTransfer.status === "COMPLETED"
            ? 100
            : activeTransfer.status === "IN_PROGRESS"
              ? 72
              : 45,
        settlementCommentary: "Transfer execution timeline in progress.",
        milestones: timelineMilestones,
        operationalEvents,
      },
      aiSettings?.sensitivity ?? "balanced",
      {
        timeoutMs: 6500,
        maxRetries: 1,
        _transfer: activeTransfer,
      }
    ).then((result) => {
      if (!active) return;
      setAiUpdate(result.data);
    });

    return () => {
      active = false;
    };
  }, [activeTransfer, aiSettings?.sensitivity, auditLines, timeline, trackingAIEnabled]);

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
  const statusLabel = activeTransfer.status === "COMPLETED" ? "Delivered" : "On track";
  const progress = activeTransfer.status === "COMPLETED" ? 100 : activeTransfer.status === "IN_PROGRESS" ? 72 : 45;
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
          <ConsumerPill label={statusLabel} tone={activeTransfer.status === "COMPLETED" ? "green" : "blue"} />
        </View>
        <View style={{ height: 10, borderRadius: 999, backgroundColor: consumerColors.blueSoft, overflow: "hidden" }}>
          <View style={{ width: `${progress}%`, height: "100%", backgroundColor: consumerColors.blue }} />
        </View>
        <AppText color={consumerColors.muted}>
          {activeTransfer.selectedRoute?.provider ?? "Routing engine"} • ETA {activeTransfer.selectedRoute?.estimatedTime ?? "Pending"}
        </AppText>
      </ConsumerCard>

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
            Nexus AI live update
          </AppText>
          <AppText color={consumerColors.muted}>
            {aiUpdate?.progressAnalysis ?? "Nexus AI is preparing transfer commentary."}
          </AppText>
        </ConsumerCard>
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

      {transfer && transfer.status !== "COMPLETED" ? (
        <ConsumerAction label="Mark delivered" icon="check-circle" onPress={markDelivered} />
      ) : null}
    </ConsumerShell>
  );
}
