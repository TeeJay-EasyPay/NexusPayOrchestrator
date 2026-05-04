import { supabase } from "../lib/supabase";

export type AuditEventType =
  | "TRANSFER_CREATED"
  | "ROUTES_GENERATED"
  | "ROUTE_SELECTED"
  | "TRANSFER_STARTED"
  | "TRANSFER_COMPLETED"
  | "XRPL_SETTLEMENT_COMPLETED"
  | "RECIPIENT_SAVED"
  | "RECIPIENT_REUSED"
  | "RECIPIENT_FAVORITED"
  | "RECIPIENT_UNFAVORITED"
  | "RESEND_INITIATED"
  | "LOGIN"
  | "SIGNUP"
  | "LOGOUT";

interface WriteAuditLogInput {
  eventType: AuditEventType;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}

export async function writeAuditLog({
  eventType,
  entityType,
  entityId,
  metadata,
}: WriteAuditLogInput) {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    await supabase.from("audit_logs").insert({
      user_id: user?.id ?? null,
      event_type: eventType,
      entity_type: entityType ?? null,
      entity_id: entityId ?? null,
      metadata: metadata ?? {},
    });
  } catch (error) {
    console.error("Audit logging failed", error);
  }
}
