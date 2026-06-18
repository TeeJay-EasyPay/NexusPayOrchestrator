import { supabase } from "../lib/supabase";
import { ParticipantRecord, BatchTransferStatus, NotificationRecord } from "../types/multiEntity";
import { Transfer } from "../types/transfer";
import { loadCompletedTransfers } from "./transferService";

export type BusinessBatchTransfer = {
  id: string;
  batchId: string;
  senderParticipantId: string;
  recipientParticipantId: string;
  senderName: string;
  recipientName: string;
  amount: number;
  status: BatchTransferStatus;
  createdAt: string;
};

export type BusinessRecipient = ParticipantRecord & {
  corridor: string;
  lastPayment?: string;
};

export type BusinessDashboardData = {
  participant: ParticipantRecord | null;
  notifications: NotificationRecord[];
  incomingBatchTransfers: BusinessBatchTransfer[];
  outgoingBatchTransfers: BusinessBatchTransfer[];
  appTransfers: Transfer[];
};

function nowIso() {
  return new Date().toISOString();
}

function toParticipant(row: any): ParticipantRecord {
  return {
    id: String(row.id),
    participantType: row.participant_type === "BUSINESS" || row.participant_type === "CORPORATE" ? row.participant_type : "INDIVIDUAL",
    name: String(row.name ?? ""),
    country: String(row.country ?? ""),
    bankName: String(row.bank_name ?? ""),
    accountLast4: String(row.account_last4 ?? ""),
    currency: String(row.currency ?? "GBP"),
    createdAt: row.created_at ? String(row.created_at) : undefined,
  };
}

function toNotification(row: any): NotificationRecord {
  return {
    id: String(row.id),
    participantId: String(row.participant_id),
    title: String(row.title ?? "Notification"),
    message: String(row.message ?? ""),
    read: Boolean(row.read),
    createdAt: String(row.created_at ?? nowIso()),
  };
}

function toBatchTransfer(row: any, participantsById: Map<string, ParticipantRecord>): BusinessBatchTransfer {
  const senderParticipantId = String(row.sender_participant_id);
  const recipientParticipantId = String(row.recipient_participant_id);

  return {
    id: String(row.id),
    batchId: String(row.batch_id),
    senderParticipantId,
    recipientParticipantId,
    senderName: participantsById.get(senderParticipantId)?.name ?? "Sender",
    recipientName: participantsById.get(recipientParticipantId)?.name ?? "Recipient",
    amount: Number(row.amount ?? 0),
    status: String(row.status ?? "CREATED") as BatchTransferStatus,
    createdAt: String(row.created_at ?? nowIso()),
  };
}

async function loadParticipantsByIds(ids: string[]): Promise<Map<string, ParticipantRecord>> {
  const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
  if (uniqueIds.length === 0) return new Map();

  const { data, error } = await supabase
    .from("participants")
    .select("*")
    .in("id", uniqueIds);

  if (error) {
    console.warn("business participants lookup failed", error.message);
    return new Map();
  }

  return new Map((data ?? []).map((row: any) => {
    const participant = toParticipant(row);
    return [participant.id, participant] as const;
  }));
}

async function enrichTransfers(rows: any[]): Promise<BusinessBatchTransfer[]> {
  const ids = rows.flatMap((row: any) => [
    String(row.sender_participant_id),
    String(row.recipient_participant_id),
  ]);
  const participantsById = await loadParticipantsByIds(ids);

  return rows.map((row: any) => toBatchTransfer(row, participantsById));
}

export async function loadBusinessDashboardData(participantId: string): Promise<BusinessDashboardData> {
  const [
    participantResult,
    notificationsResult,
    incomingResult,
    outgoingResult,
    appTransfers,
  ] = await Promise.all([
    supabase.from("participants").select("*").eq("id", participantId).maybeSingle(),
    supabase
      .from("notifications")
      .select("*")
      .eq("participant_id", participantId)
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("batch_transfers")
      .select("*")
      .eq("recipient_participant_id", participantId)
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("batch_transfers")
      .select("*")
      .eq("sender_participant_id", participantId)
      .order("created_at", { ascending: false })
      .limit(8),
    loadCompletedTransfers(),
  ]);

  if (participantResult.error) {
    console.warn("business participant fetch failed", participantResult.error.message);
  }

  if (notificationsResult.error) {
    console.warn("business notifications fetch failed", notificationsResult.error.message);
  }

  if (incomingResult.error) {
    console.warn("business incoming transfers fetch failed", incomingResult.error.message);
  }

  if (outgoingResult.error) {
    console.warn("business outgoing transfers fetch failed", outgoingResult.error.message);
  }

  return {
    participant: participantResult.data ? toParticipant(participantResult.data) : null,
    notifications: (notificationsResult.data ?? []).map(toNotification),
    incomingBatchTransfers: await enrichTransfers(incomingResult.data ?? []),
    outgoingBatchTransfers: await enrichTransfers(outgoingResult.data ?? []),
    appTransfers,
  };
}

export async function loadBusinessRecipients(participantId: string): Promise<BusinessRecipient[]> {
  const { data, error } = await supabase
    .from("participants")
    .select("*")
    .neq("id", participantId)
    .order("name", { ascending: true });

  if (error) {
    console.warn("business recipients fetch failed", error.message);
    return [];
  }

  const recipients = (data ?? []).map(toParticipant);
  const recipientIds = recipients.map((recipient) => recipient.id);

  const { data: transferRows, error: transferError } = recipientIds.length > 0
    ? await supabase
        .from("batch_transfers")
        .select("*")
        .eq("sender_participant_id", participantId)
        .in("recipient_participant_id", recipientIds)
        .order("created_at", { ascending: false })
    : { data: [], error: null };

  if (transferError) {
    console.warn("business recipient transfer lookup failed", transferError.message);
  }

  const lastPaymentByRecipient = new Map<string, string>();
  for (const row of transferRows ?? []) {
    const recipientId = String((row as any).recipient_participant_id);
    if (!lastPaymentByRecipient.has(recipientId)) {
      const amount = Number((row as any).amount ?? 0);
      lastPaymentByRecipient.set(recipientId, `${amount.toLocaleString()} ${recipients.find((r) => r.id === recipientId)?.currency ?? ""}`.trim());
    }
  }

  return recipients.map((recipient) => ({
    ...recipient,
    corridor: `${recipient.country} / ${recipient.currency}`,
    lastPayment: lastPaymentByRecipient.get(recipient.id),
  }));
}
