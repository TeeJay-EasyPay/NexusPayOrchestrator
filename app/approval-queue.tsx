import React, { useCallback, useEffect, useState } from "react";
import { Pressable, TextInput, View } from "react-native";

import { CorporateCard, CorporateShell } from "../src/components/corporate/CorporateShell";
import { AppText } from "../src/components/ui/AppText";
import { decideApproval, loadApprovalQueue } from "../src/services/corporateGovernanceService";
import { usePersona } from "../src/state/PersonaContext";
import { colors } from "../src/theme";
import { BatchApprovalRecord } from "../src/types/multiEntity";

export default function ApprovalQueueScreen() {
  const { selectedPersona } = usePersona();
  const [approvals, setApprovals] = useState<BatchApprovalRecord[]>([]);
  const [comments, setComments] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const rows = await loadApprovalQueue(selectedPersona);
    setApprovals(rows);
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
