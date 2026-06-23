import { supabase } from "../lib/supabase";
import { createApprovalRequestsForBatch, writeAuditEvent } from "./corporateGovernanceService";
import {
  BatchApprovalRecord,
  BatchTransferRecord,
  BatchTransferStatus,
  NotificationRecord,
  ParticipantRecord,
  PayoutBatchRecord,
  PersonaOption,
} from "../types/multiEntity";

export type ExecuteBatchInput = {
  senderParticipantId: string;
  actorPersona?: PersonaOption;
  paymentCategoryId?: string;
  paymentTypeId?: string;
  requiresApproval?: boolean;
  transfers: {
    recipientParticipantId: string;
    amount: number;
  }[];
  recipientMap: Record<string, ParticipantRecord>;
};

function nowIso() {
  return new Date().toISOString();
}

function toCurrencySymbol(currency: string): string {
  if (currency === "GBP") return "£";
  if (currency === "PHP") return "₱";
  if (currency === "MYR") return "RM ";
  if (currency === "AED") return "AED ";
  return `${currency} `;
}

function statusFromIndex(index: number): BatchTransferStatus {
  if (index === 0) return "CREATED";
  if (index === 1) return "ROUTING";
  if (index === 2) return "IN_PROGRESS";
  return "DELIVERED";
}

function initialTransferStatus(index: number, requiresApproval?: boolean): BatchTransferStatus {
  return requiresApproval ? "CREATED" : statusFromIndex(index);
}

export async function executePayoutBatch(
  input: ExecuteBatchInput,
): Promise<{
  batch: PayoutBatchRecord | null;
  transfers: BatchTransferRecord[];
  notifications: NotificationRecord[];
  approvals?: BatchApprovalRecord[];
}> {
  const validTransfers = input.transfers.filter((t) => Number(t.amount) > 0);

  if (validTransfers.length === 0) {
    return { batch: null, transfers: [], notifications: [], approvals: [] };
  }

  const totalValue = validTransfers.reduce((sum, t) => sum + Number(t.amount), 0);

  const { data: batchRow, error: batchError } = await supabase
    .from("payout_batches")
    .insert({
      sender_participant_id: input.senderParticipantId,
      total_value: totalValue,
      status: input.requiresApproval ? "PENDING_APPROVAL" : "CREATED",
      payment_category_id: input.paymentCategoryId ?? null,
      payment_type_id: input.paymentTypeId ?? null,
      created_by_persona_id: input.actorPersona?.id ?? null,
      created_by_role: input.actorPersona?.corporateRole ?? null,
      approval_status: input.requiresApproval ? "PENDING" : "NOT_REQUIRED",
      governance_metadata: {
        requiresApproval: Boolean(input.requiresApproval),
        createdBy: input.actorPersona?.id ?? null,
      },
    })
    .select("*")
    .single();

  if (batchError || !batchRow) {
    throw new Error(batchError?.message ?? "Failed to create payout batch");
  }

  const transferPayload = validTransfers.map((t, index) => ({
    batch_id: String(batchRow.id),
    sender_participant_id: input.senderParticipantId,
    recipient_participant_id: t.recipientParticipantId,
    amount: Number(t.amount),
    status: initialTransferStatus(index, input.requiresApproval),
  }));

  const { data: transferRows, error: transferError } = await supabase
    .from("batch_transfers")
    .insert(transferPayload)
    .select("*");

  if (transferError) {
    throw new Error(transferError.message);
  }

  const transferList = (transferRows ?? []).map((row: any) => ({
    id: String(row.id),
    batchId: String(row.batch_id),
    senderParticipantId: String(row.sender_participant_id),
    recipientParticipantId: String(row.recipient_participant_id),
    amount: Number(row.amount),
    status: String(row.status) as BatchTransferStatus,
    createdAt: String(row.created_at ?? nowIso()),
  }));

  const notificationsPayload = input.requiresApproval ? [] : transferList.map((transfer) => {
    const recipient = input.recipientMap[transfer.recipientParticipantId];
    const symbol = toCurrencySymbol(recipient?.currency ?? "GBP");

    return {
      participant_id: transfer.recipientParticipantId,
      title: "New incoming transfer",
      message: `${symbol}${transfer.amount.toLocaleString()} from Nexus Manufacturing Ltd has been delivered to ${recipient?.bankName ?? "your account"} ****${recipient?.accountLast4 ?? ""}.`,
      read: false,
      notification_type: "INCOMING_TRANSFER",
      metadata: { batchId: String(batchRow.id), transferId: transfer.id },
    };
  });

  const { data: notificationRows, error: notificationError } = notificationsPayload.length
    ? await supabase
      .from("notifications")
      .insert(notificationsPayload)
      .select("*")
    : { data: [], error: null };

  if (notificationError) {
    throw new Error(notificationError.message);
  }

  let approvals: BatchApprovalRecord[] = [];
  let finalBatchStatus: PayoutBatchRecord["status"] = input.requiresApproval ? "PENDING_APPROVAL" : "COMPLETED";
  let finalApprovalStatus: PayoutBatchRecord["approvalStatus"] = input.requiresApproval ? "PENDING" : "NOT_REQUIRED";

  if (input.requiresApproval && input.paymentTypeId && input.actorPersona) {
    const approvalOutput = await createApprovalRequestsForBatch({
      batchId: String(batchRow.id),
      paymentTypeId: input.paymentTypeId,
      amount: totalValue,
      actor: input.actorPersona,
    });
    approvals = approvalOutput.approvals;
    if (!approvalOutput.rule) {
      finalBatchStatus = "APPROVED";
      finalApprovalStatus = "NOT_REQUIRED";
    }
  } else {
    const { error: batchUpdateError } = await supabase
      .from("payout_batches")
      .update({ status: "COMPLETED" })
      .eq("id", String(batchRow.id));

    if (batchUpdateError) {
      console.warn("batch status update failed", batchUpdateError.message);
    }
  }

  if (input.actorPersona) {
    await writeAuditEvent({
      entityType: "payout_batch",
      entityId: String(batchRow.id),
      actor: input.actorPersona,
      eventType: input.requiresApproval ? "BATCH_CREATED_PENDING_APPROVAL" : "BATCH_CREATED",
      eventMessage: input.requiresApproval
        ? "Corporate batch created and routed for approval."
        : "Batch created and executed.",
      metadata: {
        totalValue,
        paymentCategoryId: input.paymentCategoryId ?? null,
        paymentTypeId: input.paymentTypeId ?? null,
        transferCount: transferList.length,
      },
    });
  }

  return {
    batch: {
      id: String(batchRow.id),
      senderParticipantId: String(batchRow.sender_participant_id),
      totalValue: Number(batchRow.total_value),
      status: finalBatchStatus,
      createdAt: String(batchRow.created_at ?? nowIso()),
      paymentCategoryId: input.paymentCategoryId ?? null,
      paymentTypeId: input.paymentTypeId ?? null,
      createdByPersonaId: input.actorPersona?.id ?? null,
      createdByRole: input.actorPersona?.corporateRole ?? null,
      approvalStatus: finalApprovalStatus,
    },
    transfers: transferList,
    notifications: (notificationRows ?? []).map((row: any) => ({
      id: String(row.id),
      participantId: String(row.participant_id),
      title: String(row.title),
      message: String(row.message),
      read: Boolean(row.read),
      createdAt: String(row.created_at ?? nowIso()),
    })),
    approvals,
  };
}

export async function loadReceivedTransfers(participantId: string): Promise<{
  id: string;
  createdAt: string;
  senderName: string;
  amount: number;
  status: BatchTransferStatus;
}[]> {
  const { data, error } = await supabase
    .from("batch_transfers")
    .select("id, amount, status, created_at, sender_participant_id")
    .eq("recipient_participant_id", participantId)
    .order("created_at", { ascending: false });

  if (error) {
    console.warn("received transfers fetch failed", error.message);
    return [];
  }

  const rows = data ?? [];

  const senderIds = Array.from(new Set(rows.map((r: any) => String(r.sender_participant_id))));
  let sendersById: Record<string, string> = {};

  if (senderIds.length > 0) {
    const { data: senderRows } = await supabase
      .from("participants")
      .select("id, name")
      .in("id", senderIds);

    for (const row of senderRows ?? []) {
      sendersById[String((row as any).id)] = String((row as any).name);
    }
  }

  return rows.map((row: any) => ({
    id: String(row.id),
    createdAt: String(row.created_at ?? nowIso()),
    senderName: sendersById[String(row.sender_participant_id)] ?? "Nexus Manufacturing Ltd",
    amount: Number(row.amount),
    status: String(row.status) as BatchTransferStatus,
  }));
}
