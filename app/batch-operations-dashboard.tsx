import React, { useEffect, useMemo, useState } from "react";
import { Pressable, View } from "react-native";

import { CorporateCard, CorporateShell } from "../src/components/corporate/CorporateShell";
import { AppText } from "../src/components/ui/AppText";
import { hasCorporatePermission } from "../src/services/corporateAccessService";
import { loadAuditEvents, loadBatchApprovals, loadBatchTransfersForBatches, loadPayoutBatches, releaseApprovedBatch } from "../src/services/corporateGovernanceService";
import { usePersona } from "../src/state/PersonaContext";
import { colors } from "../src/theme";
import { AuditEventRecord, BatchApprovalRecord, BatchTransferRecord, PayoutBatchRecord } from "../src/types/multiEntity";

function money(value: number): string {
  return `GBP ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function BatchOperationsDashboardScreen() {
  const { selectedPersona } = usePersona();
  const [batches, setBatches] = useState<PayoutBatchRecord[]>([]);
  const [approvals, setApprovals] = useState<BatchApprovalRecord[]>([]);
  const [transfers, setTransfers] = useState<BatchTransferRecord[]>([]);
  const [events, setEvents] = useState<AuditEventRecord[]>([]);
  const [busyBatchId, setBusyBatchId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function refresh() {
    const [batchRows, approvalRows, eventRows] = await Promise.all([
      loadPayoutBatches(50),
      loadBatchApprovals(),
      loadAuditEvents(10),
    ]);
    const transferRows = await loadBatchTransfersForBatches(batchRows.map((batch) => batch.id));
    setBatches(batchRows);
    setApprovals(approvalRows);
    setTransfers(transferRows);
    setEvents(eventRows);
  }

  useEffect(() => {
    void refresh();
  }, []);

  const counts = useMemo(() => ({
    pending: batches.filter((item) => item.approvalStatus === "PENDING").length,
    approved: batches.filter((item) => item.approvalStatus === "APPROVED").length,
    rejected: batches.filter((item) => item.approvalStatus === "REJECTED").length,
    processing: batches.filter((item) => item.status === "PROCESSING" || item.status === "IN_PROGRESS").length,
    completed: batches.filter((item) => item.status === "COMPLETED").length,
    failed: batches.filter((item) => item.status === "FAILED").length,
  }), [batches]);

  const typeBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    for (const batch of batches) {
      const key = batch.paymentTypeId ?? "unclassified";
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [batches]);

  const approvalsByBatchId = useMemo(() => {
    const map = new Map<string, BatchApprovalRecord[]>();
    for (const approval of approvals) {
      map.set(approval.batchId, [...(map.get(approval.batchId) ?? []), approval]);
    }
    return map;
  }, [approvals]);

  const transferCountByBatchId = useMemo(() => {
    const map = new Map<string, number>();
    for (const transfer of transfers) {
      map.set(transfer.batchId, (map.get(transfer.batchId) ?? 0) + 1);
    }
    return map;
  }, [transfers]);

  async function release(batch: PayoutBatchRecord) {
    setBusyBatchId(batch.id);
    setMessage(null);
    try {
      await releaseApprovedBatch(batch.id, selectedPersona);
      setMessage(`Batch ${batch.id.slice(0, 8)} released.`);
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Batch release failed.");
    } finally {
      setBusyBatchId(null);
    }
  }

  return (
    <CorporateShell
      routeKey="batch_operations"
      title="Batch Operations Dashboard"
      subtitle="Governance-aware batch status, approval queue, and recent operational activity."
    >
      {message ? (
        <CorporateCard>
          <AppText color={message.toLowerCase().includes("failed") || message.toLowerCase().includes("cannot") ? "#B91C1C" : colors.textDarkPrimary} style={{ fontWeight: "800" }}>
            {message}
          </AppText>
        </CorporateCard>
      ) : null}

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        <Metric label="Pending Approval" value={String(counts.pending)} />
        <Metric label="Approved" value={String(counts.approved)} />
        <Metric label="Rejected" value={String(counts.rejected)} />
        <Metric label="Processing" value={String(counts.processing)} />
        <Metric label="Completed" value={String(counts.completed)} />
        <Metric label="Failed" value={String(counts.failed)} />
      </View>

      <CorporateCard>
        <AppText variant="subheading" color={colors.textDarkPrimary} style={{ fontWeight: "900" }}>
          Payment Type Breakdown
        </AppText>
        {typeBreakdown.length === 0 ? <AppText color={colors.textDarkSecondary}>No batches recorded yet.</AppText> : null}
        {typeBreakdown.map(([type, count]) => (
          <View key={type} style={{ flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: "#E2E8F0", paddingTop: 9 }}>
            <AppText color={colors.textDarkPrimary} style={{ fontWeight: "800" }}>{type.replace(/_/g, " ")}</AppText>
            <AppText color={colors.textDarkSecondary}>{count}</AppText>
          </View>
        ))}
      </CorporateCard>

      <CorporateCard>
        <AppText variant="subheading" color={colors.textDarkPrimary} style={{ fontWeight: "900" }}>
          Approval Queue
        </AppText>
        {approvals.slice(0, 8).map((approval) => (
          <View key={approval.id} style={{ borderTopWidth: 1, borderTopColor: "#E2E8F0", paddingTop: 9, gap: 3 }}>
            <AppText color={colors.textDarkPrimary} style={{ fontWeight: "800" }}>Batch {approval.batchId.slice(0, 8)} - {approval.decision}</AppText>
            <AppText variant="caption" color={colors.textDarkSecondary}>{approval.approvalRoleId.replace(/_/g, " ")} assigned to {approval.assignedPersonaId}</AppText>
          </View>
        ))}
      </CorporateCard>

      <CorporateCard>
        <AppText variant="subheading" color={colors.textDarkPrimary} style={{ fontWeight: "900" }}>
          Recent Batch Activity
        </AppText>
        {batches.slice(0, 8).map((batch) => (
          <View key={batch.id} style={{ borderTopWidth: 1, borderTopColor: "#E2E8F0", paddingTop: 10, gap: 8 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
              <View style={{ flex: 1 }}>
                <AppText color={colors.textDarkPrimary} style={{ fontWeight: "900" }}>Batch {batch.id.slice(0, 8)}</AppText>
                <AppText variant="caption" color={colors.textDarkSecondary}>{batch.paymentCategoryId ?? "unclassified"} - {batch.paymentTypeId ?? "unclassified"}</AppText>
                <AppText variant="caption" color={colors.textDarkSecondary}>{transferCountByBatchId.get(batch.id) ?? 0} transfer(s) - Created by {batch.createdByPersonaId ?? "unknown"}</AppText>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <AppText color={colors.textDarkPrimary} style={{ fontWeight: "900" }}>{money(batch.totalValue)}</AppText>
                <StatusPill label={batch.releasedAt ? "RELEASED" : batch.approvalStatus ?? batch.status} />
              </View>
            </View>

            <View style={{ gap: 5 }}>
              <AppText variant="caption" color={colors.textDarkMuted}>Approval requirements</AppText>
              {(approvalsByBatchId.get(batch.id) ?? []).length === 0 ? (
                <AppText variant="caption" color={colors.textDarkSecondary}>No approval requests recorded.</AppText>
              ) : (
                (approvalsByBatchId.get(batch.id) ?? []).sort((a, b) => a.stageOrder - b.stageOrder).map((approval) => (
                  <View key={approval.id} style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
                    <AppText variant="caption" color={colors.textDarkPrimary} style={{ fontWeight: "800", flex: 1 }}>
                      Stage {approval.stageOrder}: {approval.approvalRoleId.replace(/_/g, " ")} ({approval.assignedPersonaId})
                    </AppText>
                    <StatusPill label={approval.decision} />
                  </View>
                ))
              )}
            </View>

            {batch.approvalStatus === "PENDING" ? (
              <AppText variant="caption" color="#8C5D06" style={{ fontWeight: "900" }}>
                Locked. Waiting for required approvals before release.
              </AppText>
            ) : null}

            {(batch.approvalStatus === "APPROVED" || batch.approvalStatus === "NOT_REQUIRED") && !batch.releasedAt && batch.status === "APPROVED" && hasCorporatePermission(selectedPersona, "release_batches") ? (
              <Pressable onPress={() => release(batch)} disabled={busyBatchId !== null} style={{ minHeight: 42, borderRadius: 10, backgroundColor: "#0B3F4A", alignItems: "center", justifyContent: "center", opacity: busyBatchId ? 0.65 : 1 }}>
                <AppText color="#FFFFFF" style={{ fontWeight: "900" }}>{busyBatchId === batch.id ? "Releasing..." : "Release approved batch"}</AppText>
              </Pressable>
            ) : null}

            {batch.releasedAt ? (
              <AppText variant="caption" color="#0F8A5F" style={{ fontWeight: "900" }}>
                Released by {batch.releasedByPersonaId ?? "unknown"} on {new Date(batch.releasedAt).toLocaleString()}.
              </AppText>
            ) : null}
          </View>
        ))}
      </CorporateCard>

      <CorporateCard>
        <AppText variant="subheading" color={colors.textDarkPrimary} style={{ fontWeight: "900" }}>
          Recent Approval Activity
        </AppText>
        {events.slice(0, 6).map((event) => (
          <View key={event.id} style={{ borderTopWidth: 1, borderTopColor: "#E2E8F0", paddingTop: 9 }}>
            <AppText color={colors.textDarkPrimary} style={{ fontWeight: "800" }}>{event.eventType}</AppText>
            <AppText variant="caption" color={colors.textDarkSecondary}>{event.eventMessage}</AppText>
          </View>
        ))}
      </CorporateCard>
    </CorporateShell>
  );
}

function StatusPill({ label }: { label: string }) {
  const normalized = label.toUpperCase();
  const tone = normalized === "APPROVED" || normalized === "RELEASED" || normalized === "COMPLETED"
    ? { bg: "#DFF7EC", fg: "#0F8A5F" }
    : normalized === "REJECTED" || normalized === "FAILED"
      ? { bg: "#FFF1F2", fg: "#B91C1C" }
      : { bg: "#FFF7D6", fg: "#8C5D06" };

  return (
    <View style={{ borderRadius: 999, backgroundColor: tone.bg, paddingHorizontal: 9, paddingVertical: 5, alignSelf: "flex-start" }}>
      <AppText variant="caption" style={{ color: tone.fg, fontWeight: "900" }}>{normalized}</AppText>
    </View>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexGrow: 1, flexBasis: "30%", minWidth: 110 }}>
      <CorporateCard>
        <AppText variant="caption" color={colors.textDarkMuted}>{label}</AppText>
        <AppText variant="subheading" color={colors.textDarkPrimary} style={{ fontWeight: "900" }}>{value}</AppText>
      </CorporateCard>
    </View>
  );
}
