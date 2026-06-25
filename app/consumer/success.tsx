import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
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
import { analyseTransfer, TransferAnalysisResult } from "../../src/services/nexusAIService";
import { loadOpenBankingPaymentFlow } from "../../src/services/openBankingPaymentFlowService";
import { useTransfer } from "../../src/state/TransferContext";
import { OpenBankingPaymentFlow } from "../../src/types/transfer";

function asString(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function splitName(fullName?: string) {
  const parts = (fullName ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "", surname: "" };
  if (parts.length === 1) return { firstName: parts[0], surname: "" };
  return { firstName: parts[0], surname: parts[parts.length - 1] };
}

export default function ConsumerSuccessScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { completedTransfers } = useTransfer();
  const { enabled: trackingAIEnabled, settings: aiSettings } = useNexusAIScreenSetting("tracking_enabled");
  const [recap, setRecap] = useState<TransferAnalysisResult | null>(null);
  const [openBankingFlow, setOpenBankingFlow] = useState<OpenBankingPaymentFlow | null>(null);

  const transferId = asString(params.transferId);

  const transfer = useMemo(() => {
    return completedTransfers.find((item) => item.id === transferId) ?? completedTransfers[0] ?? null;
  }, [completedTransfers, transferId]);

  useEffect(() => {
    if (!trackingAIEnabled || !transfer) {
      setRecap(null);
      return;
    }

    let active = true;

    void analyseTransfer(
      {
        transferId: transfer.id,
        transferState: transfer.status,
        progressPercent: transfer.status === "COMPLETED" ? 100 : 65,
        settlementCommentary: "Transfer completed successfully.",
        milestones: [
          { title: "Funding authorised", status: "DONE" },
          { title: "Route executed", status: "DONE" },
          { title: "Recipient delivered", status: "DONE" },
        ],
        operationalEvents: [
          { label: "provider", value: transfer.selectedRoute?.provider ?? "Nexus route engine" },
          { label: "rail", value: transfer.selectedRoute?.rail ?? "FIAT" },
          { label: "status", value: transfer.status },
        ],
      },
      aiSettings?.sensitivity ?? "balanced",
      {
        timeoutMs: 6500,
        maxRetries: 1,
        _transfer: transfer,
      }
    ).then((result) => {
      if (!active) return;
      setRecap(result.data);
    });

    return () => {
      active = false;
    };
  }, [aiSettings?.sensitivity, trackingAIEnabled, transfer]);

  useEffect(() => {
    if (!transfer?.id || transfer.fundingMethod !== "OPEN_BANKING") {
      setOpenBankingFlow(null);
      return;
    }

    if (transfer.openBankingFlow) {
      setOpenBankingFlow(transfer.openBankingFlow);
      return;
    }

    let mounted = true;
    loadOpenBankingPaymentFlow(transfer.id).then((flow) => {
      if (!mounted) return;
      setOpenBankingFlow(flow);
    });

    return () => {
      mounted = false;
    };
  }, [transfer?.id, transfer?.fundingMethod, transfer?.openBankingFlow]);

  if (!transfer) {
    return (
      <ConsumerShell
        eyebrow="SUCCESS"
        title="Transfer completed"
        subtitle="Transfer receipt is being prepared."
      >
        <ConsumerCard>
          <AppText color={consumerColors.muted}>No completed transfer found yet.</AppText>
          <ConsumerAction label="Go home" icon="home" onPress={() => router.push("/consumer" as never)} />
        </ConsumerCard>
      </ConsumerShell>
    );
  }

  const split = splitName(transfer.recipient?.name);

  return (
    <ConsumerShell
      eyebrow="SUCCESS"
      title="Transfer delivered"
      subtitle="Your transfer completed successfully with full receipt visibility."
    >
      <ConsumerCard accent>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <View style={{ flex: 1 }}>
            <AppText color={consumerColors.text} style={{ fontSize: 22, fontWeight: "900" }}>
              {transfer.recipient?.name ?? "Recipient"}
            </AppText>
            <AppText color={consumerColors.muted}>Reference {transfer.id}</AppText>
          </View>
          <ConsumerPill label="Delivered" tone="green" />
        </View>
        <AppText color={consumerColors.blueDark} style={{ fontSize: 30, fontWeight: "900" }}>
          GBP {transfer.senderAmount.toFixed(2)}
        </AppText>
        <AppText color={consumerColors.muted}>
          Recipient receives {transfer.selectedRoute?.receiveAmount?.toFixed(2) ?? "--"} {transfer.recipient?.currency ?? ""}
        </AppText>
      </ConsumerCard>

      <ConsumerCard>
        <AppText color={consumerColors.text} style={{ fontSize: 18, fontWeight: "900" }}>
          Receipt details
        </AppText>
        <AppText color={consumerColors.muted}>Provider: {transfer.selectedRoute?.provider ?? "Nexus route engine"}</AppText>
        <AppText color={consumerColors.muted}>Rail: {transfer.selectedRoute?.rail ?? "FIAT"}</AppText>
        <AppText color={consumerColors.muted}>Fee: GBP {transfer.selectedRoute?.fee?.toFixed(2) ?? "0.00"}</AppText>
        <AppText color={consumerColors.muted}>Funding: {transfer.fundingMethod ?? "Not captured"}</AppText>
        <AppText color={consumerColors.muted}>Funding reference: {transfer.fundingReference ?? "Not captured"}</AppText>
      </ConsumerCard>

      {transfer.fundingMethod === "OPEN_BANKING" ? (
        <ConsumerCard>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
            <View style={{ flex: 1 }}>
              <AppText color={consumerColors.text} style={{ fontSize: 18, fontWeight: "900" }}>
                Open Banking evidence
              </AppText>
              <AppText color={consumerColors.muted}>
                {openBankingFlow
                  ? `${openBankingFlow.providerId.toUpperCase()} ${openBankingFlow.environment} flow captured`
                  : "Loading Yapily flow evidence..."}
              </AppText>
            </View>
            <ConsumerPill label={openBankingFlow?.provenance ?? "SANDBOX"} tone="gold" />
          </View>
          <AppText color={consumerColors.muted}>
            {openBankingFlow
              ? `${openBankingFlow.steps.length} funding steps recorded. Status: ${openBankingFlow.status}.`
              : "The detailed steps remain available on Track."}
          </AppText>
          <ConsumerAction
            label="View flow"
            icon="list"
            secondary
            onPress={() =>
              router.push(
                {
                  pathname: "/consumer/track",
                  params: { transferId: transfer.id },
                } as never
              )
            }
          />
        </ConsumerCard>
      ) : null}

      {trackingAIEnabled ? (
        <ConsumerCard>
          <AppText color={consumerColors.text} style={{ fontSize: 18, fontWeight: "900" }}>
            Nexus AI recap
          </AppText>
          <AppText color={consumerColors.muted}>
            {recap?.settlementCommentary ?? "Preparing a friendly recap of your completed transfer."}
          </AppText>
          <AppText color={consumerColors.muted}>
            {recap?.progressAnalysis ?? "Execution completed with all required milestones."}
          </AppText>
        </ConsumerCard>
      ) : null}

      <ConsumerCard>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          <ConsumerAction
            label="Send again"
            icon="repeat"
            onPress={() =>
              router.push(
                {
                  pathname: "/consumer/send",
                  params: {
                    amount: String(transfer.senderAmount),
                    firstName: transfer.recipient?.firstName ?? split.firstName,
                    surname: transfer.recipient?.surname ?? split.surname,
                    country: transfer.recipient?.country,
                    bankName: transfer.recipient?.bankName,
                    bankCode: transfer.recipient?.bankCode,
                    accountNumber: transfer.recipient?.accountNumber,
                    fundingMethod: transfer.fundingMethod,
                    fundingReference: transfer.fundingReference,
                  },
                } as never
              )
            }
          />
          <ConsumerAction label="View transfers" icon="list" secondary onPress={() => router.push("/consumer/transfers" as never)} />
        </View>
      </ConsumerCard>
    </ConsumerShell>
  );
}
