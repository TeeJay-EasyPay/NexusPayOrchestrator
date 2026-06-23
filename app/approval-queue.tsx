import React, { useCallback, useEffect, useState } from "react";
import { Pressable, TextInput, View } from "react-native";

import { CorporateCard, CorporateShell } from "../src/components/corporate/CorporateShell";
import { AppText } from "../src/components/ui/AppText";
import { decideApproval, loadApprovalQueue, loadBatchApprovals, loadBatchTransfersForBatches, loadPayoutBatchesByIds } from "../src/services/corporateGovernanceService";
import { usePersona } from "../src/state/PersonaContext";
import { colors } from "../src/theme";
import { BatchApprovalRecord, BatchTransferRecord, PayoutBatchRecord } from "../src/types/multiEntity";

function money(value: number): string {
  return `GBP ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function ApprovalQueueScreen() {
  const { selectedPersona } = usePersona();
  const [approvals, setApprovals] = useState<BatchApprovalRecord[]>([]);
  const [comments, setComments] = useState<Record<string, string>>({});
  const [batchesById, setBatchesById] = useState<Record<string, PayoutBatchRecord>>({});
  const [approvalsByBatchId, setApprovalsByBatchId] = useState<Record<string, BatchApprovalRecord[]>>({});
  const [transfersByBatchId, setTransfersByBatchId] = useState<Record<string, BatchTransferRecord[]>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const rows = await loadApprovalQueue(selectedPersona);
    setApprovals(rows);
    const batchIds = Array.from(new Set(rows.map((row) => row.batchId)));
    const [batchRows, transferRows, approvalGroups] = await Promise.all([
      loadPayoutBatchesByIds(batchIds),
      loadBatchTransfersForBatches(batchIds),
      Promise.all(batchIds.map((batchId) => loadBatchApprovals(batchId))),
    ]);

    setBatchesById(Object.fromEntries(batchRows.map((batch) => [batch.id, batch])));

    const nextApprovalsByBatchId: Record<string, BatchApprovalRecord[]> = {};
    approvalGroups.forEach((group, index) => {
      nextApprovalsByBatchId[batchIds[index]] = group.sort((a, b) => a.stageOrder - b.stageOrder);
    });
    setApprovalsByBatchId(nextApprovalsByBatchId);

    const nextTransfersByBatchId: Record<string, BatchTransferRecord[]> = {};
    for (const transfer of transferRows) {
      nextTransfersByBatchId[transfer.batchId] = [...(nextTransfersByBatchId[transfer.batchId] ?? []), transfer];
    }
    setTransfersByBatchId(nextTransfersByBatchId);
  }, [selectedPersona]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function decide(approval: BatchApprovalRecord, decision: "APPROVED" | "REJECTED") {
    setBusyId(approval.id);
    setMessage(null);
    try {
      await decideApproval({
        approvalId: approval.id,
        decision,
        comment: comments[approval.id] ?? "",
        actor: selectedPersona,
      });
      setMessage(`Approval ${decision.toLowerCase()}.`);
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Approval decision failed.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <CorporateShell
      routeKey="approval_queue"
      title="Approval Queue"
      subtitle="Assigned approval requests with decision capture and audit recording."
    >
      {message ? (
        <CorporateCard>
          <AppText color={message.toLowerCase().includes("failed") || message.toLowerCase().includes("cannot") ? "#B91C1C" : colors.textDarkPrimary} style={{ fontWeight: "800" }}>
            {message}
          </AppText>
        </CorporateCard>
      ) : null}

      {approvals.length === 0 ? (
        <CorporateCard>
          <AppText color={colors.textDarkPrimary} style={{ fontWeight: "900" }}>No assigned approvals</AppText>
          <AppText color={colors.textDarkSecondary}>There are no pending approval requests for this persona.</AppText>
        </CorporateCard>
      ) : null}

      {approvals.map((approval) => {
        const pending = approval.decision === "PENDING";
        const batch = batchesById[approval.batchId];
        const batchApprovals = approvalsByBatchId[approval.batchId] ?? [approval];
        const batchTransfers = transfersByBatchId[approval.batchId] ?? [];
        return (
          <CorporateCard key={approval.id}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
              <View style={{ flex: 1 }}>
                <AppText variant="subheading" color={colors.textDarkPrimary} style={{ fontWeight: "900" }}>
                  Batch {approval.batchId.slice(0, 8)}
                </AppText>
                <AppText variant="caption" color={colors.textDarkSecondary}>
                  Role {approval.approvalRoleId.replace(/_/g, " ")} - Stage {approval.stageOrder}
                </AppText>
              </View>
              <StatusPill label={approval.decision} />
            </View>

            <View style={{ borderTopWidth: 1, borderTopColor: "#E2E8F0", paddingTop: 10, gap: 5 }}>
              <AppText color={colors.textDarkPrimary} style={{ fontWeight: "900" }}>
                {batch ? money(batch.totalValue) : "Batch amount loading..."}
              </AppText>
              <AppText variant="caption" color={colors.textDarkSecondary}>
                {batch?.paymentCategoryId ?? "unclassified"} - {batch?.paymentTypeId ?? "unclassified"} - {batchTransfers.length} recipient transfer(s)
              </AppText>
              <AppText variant="caption" color={colors.textDarkSecondary}>
                Created by {batch?.createdByPersonaId ?? "unknown"} - Status {batch?.approvalStatus ?? "PENDING"}
              </AppText>
            </View>

            <View style={{ gap: 5 }}>
              <AppText variant="caption" color={colors.textDarkMuted}>Approval chain</AppText>
              {batchApprovals.map((item) => (
                <View key={item.id} style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
                  <AppText variant="caption" color={colors.textDarkPrimary} style={{ fontWeight: "800", flex: 1 }}>
                    Stage {item.stageOrder}: {item.approvalRoleId.replace(/_/g, " ")}
                  </AppText>
                  <StatusPill label={item.decision} />
                </View>
              ))}
            </View>

            {pending ? (
              <>
                <TextInput
                  value={comments[approval.id] ?? ""}
                  onChangeText={(text) => setComments((current) => ({ ...current, [approval.id]: text }))}
                  placeholder="Decision comment"
                  placeholderTextColor="#94A3B8"
                  style={{ borderWidth: 1, borderColor: "#D1D5DB", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: "#0F172A", backgroundColor: "#F8FAFC" }}
                />
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                  <DecisionButton label={busyId === approval.id ? "Saving..." : "Approve"} tone="approve" disabled={busyId !== null} onPress={() => decide(approval, "APPROVED")} />
                  <DecisionButton label="Reject" tone="reject" disabled={busyId !== null} onPress={() => decide(approval, "REJECTED")} />
                </View>
              </>
            ) : (
              <AppText color={colors.textDarkSecondary}>
                Decided {approval.decisionAt ? new Date(approval.decisionAt).toLocaleString() : "recently"}.
              </AppText>
            )}
          </CorporateCard>
        );
      })}
    </CorporateShell>
  );
}

function StatusPill({ label }: { label: string }) {
  const tone = label === "APPROVED" ? { bg: "#DFF7EC", fg: "#0F8A5F" } : label === "REJECTED" ? { bg: "#FFF1F2", fg: "#B91C1C" } : { bg: "#FFF7D6", fg: "#8C5D06" };
  return (
    <View style={{ borderRadius: 999, backgroundColor: tone.bg, paddingHorizontal: 10, paddingVertical: 6, alignSelf: "flex-start" }}>
      <AppText variant="caption" style={{ color: tone.fg, fontWeight: "900" }}>{label}</AppText>
    </View>
  );
}

function DecisionButton({ label, tone, disabled, onPress }: { label: string; tone: "approve" | "reject"; disabled: boolean; onPress: () => void }) {
  return (
    <Pressable disabled={disabled} onPress={onPress} style={{ flexGrow: 1, flexBasis: "47%", minHeight: 44, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: tone === "approve" ? "#0F8A5F" : "#B91C1C", opacity: disabled ? 0.65 : 1 }}>
      <AppText color="#FFFFFF" style={{ fontWeight: "900" }}>{label}</AppText>
    </Pressable>
  );
}
