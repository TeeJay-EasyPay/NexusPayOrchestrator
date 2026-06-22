import { supabase } from "../lib/supabase";
import {
  CORPORATE_PARTICIPANT_ID,
  CORPORATE_RECIPIENT_IDS,
  DEMO_PERSONAS,
  ParticipantRecord,
  ParticipantType,
} from "../types/multiEntity";

function toParticipantType(value: unknown): ParticipantType {
  if (value === "CORPORATE" || value === "INDIVIDUAL" || value === "BUSINESS") {
    return value;
  }
  return "INDIVIDUAL";
}

function mapRowToParticipant(row: any): ParticipantRecord {
  return {
    id: String(row.id),
    participantType: toParticipantType(row.participant_type),
    name: String(row.name ?? ""),
    country: String(row.country ?? ""),
    bankName: String(row.bank_name ?? ""),
    accountLast4: String(row.account_last4 ?? ""),
    currency: String(row.currency ?? "GBP"),
    createdAt: row.created_at ? String(row.created_at) : undefined,
  };
}

function getDefaultParticipants(): ParticipantRecord[] {
  const participants = DEMO_PERSONAS
    .filter((p) => p.kind === "PARTICIPANT" && p.participantId)
    .map((p) => ({
      id: p.participantId as string,
      participantType: (p.participantType as ParticipantType) ?? "INDIVIDUAL",
      name: p.label,
      country: p.country ?? "",
      bankName: p.bankName ?? "",
      accountLast4: p.accountLast4 ?? "",
      currency: p.currency ?? "GBP",
    }));

  return Array.from(new Map(participants.map((item) => [item.id, item])).values());
}

export async function seedDemoParticipantsIfMissing(): Promise<void> {
  const defaults = getDefaultParticipants();

  const payload = defaults.map((item) => ({
    id: item.id,
    participant_type: item.participantType,
    name: item.name,
    country: item.country,
    bank_name: item.bankName,
    account_last4: item.accountLast4,
    currency: item.currency,
  }));

  const { error } = await supabase.from("participants").upsert(payload, {
    onConflict: "id",
  });

  if (error) {
    console.warn("participants upsert failed", error.message);
  }
}

export async function loadParticipants(): Promise<ParticipantRecord[]> {
  const { data, error } = await supabase
    .from("participants")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    console.warn("participants fetch failed", error.message);
    return getDefaultParticipants();
  }

  if (!data || data.length === 0) {
    return getDefaultParticipants();
  }

  return data.map(mapRowToParticipant);
}

export async function loadCorporateRecipients(): Promise<ParticipantRecord[]> {
  const { data, error } = await supabase
    .from("participants")
    .select("*")
    .in("id", [...CORPORATE_RECIPIENT_IDS])
    .order("name", { ascending: true });

  if (error) {
    console.warn("recipient participants fetch failed", error.message);
    return getDefaultParticipants().filter((p) => CORPORATE_RECIPIENT_IDS.includes(p.id as any));
  }

  return (data ?? []).map(mapRowToParticipant);
}

export async function getParticipantById(participantId: string): Promise<ParticipantRecord | null> {
  const { data, error } = await supabase
    .from("participants")
    .select("*")
    .eq("id", participantId)
    .maybeSingle();

  if (error || !data) {
    const fallback = getDefaultParticipants().find((p) => p.id === participantId);
    return fallback ?? null;
  }

  return mapRowToParticipant(data);
}

export function isCorporateParticipant(participantId?: string): boolean {
  return participantId === CORPORATE_PARTICIPANT_ID;
}
