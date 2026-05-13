import { supabase } from "../lib/supabase";

export type TransactionAuditStatus =
  | "PENDING"
  | "SUCCESS"
  | "FAILED"
  | "INFO";

export type TransactionAuditEventType =
  | "TRANSFER_CREATED"
  | "ROUTES_GENERATED"
  | "ROUTE_SELECTED"
  | "FUNDING_METHOD_SELECTED"
  | "FUNDING_AUTHORISED"
  | "EXECUTION_STARTED"
  | "ROUTE_EXECUTION_STARTED"
  | "XRPL_SUBMITTED"
  | "XRPL_VALIDATED"
  | "PAYOUT_INITIATED"
  | "PAYOUT_PROCESSING"
  | "PAYOUT_COMPLETED"
  | "PAYOUT_FAILED"
  | "PROVIDER_TIMEOUT"
  | "RETRY_SCHEDULED"
  | "FAILOVER_TRIGGERED"
  | "IDEMPOTENCY_BLOCKED"
  | "ROUTE_EXECUTION_COMPLETED"
  | "TRANSFER_COMPLETED"
  | "TRANSFER_FAILED";

interface WriteTransactionAuditLogInput {
  transactionId: string;
  eventType: TransactionAuditEventType;
  status: TransactionAuditStatus;
  message: string;
  metadata?: Record<string, unknown>;
}

export async function writeTransactionAuditLog({
  transactionId,
  eventType,
  status,
  message,
  metadata,
}: WriteTransactionAuditLogInput) {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return;
    }

    const { error } = await supabase.from("transaction_audit_logs").insert({
      transaction_id: transactionId,
      user_id: user.id,
      event_type: eventType,
      status,
      message,
      metadata: metadata ?? {},
    });

    if (error) {
      console.warn("Transaction audit insert failed", error.message);
    }
  } catch (error) {
    console.warn("Transaction audit logging failed", error);
  }
}

export async function loadTransactionAuditLogs(transactionId: string) {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return [];
    }

    const { data, error } = await supabase
      .from("transaction_audit_logs")
      .select("*")
      .eq("user_id", user.id)
      .eq("transaction_id", transactionId)
      .order("created_at", { ascending: true });

    if (error) {
      console.warn("Failed to load transaction audit logs", error.message);
      return [];
    }

    return data ?? [];
  } catch (error) {
    console.warn("Transaction audit retrieval failed", error);
    return [];
  }
}
