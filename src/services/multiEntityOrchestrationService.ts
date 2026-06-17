import { supabase } from "../lib/supabase";
import {
  BatchTransferRecord,
  BatchTransferStatus,
  NotificationRecord,
  ParticipantRecord,
  PayoutBatchRecord,
} from "../types/multiEntity";

export type ExecuteBatchInput = {
  senderParticipantId: string;
  transfers: Array<{
    recipientParticipantId: string;
    amount: number;
  }>;
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

export async function executePayoutBatch(
  input: ExecuteBatchInput,
): Promise<{
  batch: PayoutBatchRecord | null;
  transfers: BatchTransferRecord[];
  notifications: NotificationRecord[];
}> {
  const validTransfers = input.transfers.filter((t) => Number(t.amount) > 0);

  if (validTransfers.length === 0) {
    return { batch: null, transfers: [], notifications: [] };
  }

  const totalValue = validTransfers.reduce((sum, t) => sum + Number(t.amount), 0);

  const { data: batchRow, error: batchError } = await supabase
    .from("payout_batches")
    .insert({
      sender_participant_id: input.senderParticipantId,
      total_value: totalValue,
      status: "CREATED",
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
    status: statusFromIndex(index),
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

  const notificationsPayload = transferList.map((transfer) => {
    const recipient = input.recipientMap[transfer.recipientParticipantId];
    const symbol = toCurrencySymbol(recipient?.currency ?? "GBP");

    return {
      participant_id: transfer.recipientParticipantId,
      title: "New incoming transfer",
      message: `${symbol}${transfer.amount.toLocaleString()} from Nexus Manufacturing Ltd has been delivered to ${recipient?.bankName ?? "your account"} ****${recipient?.accountLast4 ?? ""}.`,
      read: false,
    };
  });

  const { data: notificationRows, error: notificationError } = await supabase
    .from("notifications")
    .insert(notificationsPayload)
    .select("*");

  if (notificationError) {
    throw new Error(notificationError.message);
  }

  const { error: batchUpdateError } = await supabase
    .from("payout_batches")
    .update({ status: "COMPLETED" })
    .eq("id", String(batchRow.id));

  if (batchUpdateError) {
    console.warn("batch status update failed", batchUpdateError.message);
  }

  return {
    batch: {
      id: String(batchRow.id),
      senderParticipantId: String(batchRow.sender_participant_id),
      totalValue: Number(batchRow.total_value),
      status: "COMPLETED",
      createdAt: String(batchRow.created_at ?? nowIso()),
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
  };
}

export async function loadReceivedTransfers(participantId: string): Promise<Array<{
  id: string;
  createdAt: string;
  senderName: string;
  amount: number;
  status: BatchTransferStatus;
}>> {
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
