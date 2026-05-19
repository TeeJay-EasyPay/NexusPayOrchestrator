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

const SUCCESSOR_EVENT_MAP: Partial<
  Record<TransactionAuditEventType, TransactionAuditEventType[]>
> = {
  ROUTE_EXECUTION_COMPLETED: ["EXECUTION_STARTED", "ROUTE_EXECUTION_STARTED"],
  XRPL_VALIDATED: ["XRPL_SUBMITTED"],
  PAYOUT_COMPLETED: ["PAYOUT_INITIATED", "PAYOUT_PROCESSING"],
  TRANSFER_COMPLETED: [
    "EXECUTION_STARTED",
    "ROUTE_EXECUTION_STARTED",
    "PAYOUT_INITIATED",
    "PAYOUT_PROCESSING",
  ],
  TRANSFER_FAILED: [
    "EXECUTION_STARTED",
    "ROUTE_EXECUTION_STARTED",
    "XRPL_SUBMITTED",
    "PAYOUT_INITIATED",
    "PAYOUT_PROCESSING",
  ],
  PAYOUT_FAILED: ["PAYOUT_INITIATED", "PAYOUT_PROCESSING"],
};

async function getCurrentUserId() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user?.id ?? null;
}

export async function resolvePendingAuditEvents({
  transactionId,
  eventTypes,
  resolvedStatus = "SUCCESS",
  resolutionMessage,
  metadata,
}: {
  transactionId: string;
  eventTypes: TransactionAuditEventType[];
  resolvedStatus?: Exclude<TransactionAuditStatus, "PENDING">;
  resolutionMessage?: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    const userId = await getCurrentUserId();

    if (!userId || eventTypes.length === 0) {
      return;
    }

    const patch: Record<string, unknown> = {
      status: resolvedStatus,
      metadata: {
        resolved_by_successor: true,
        resolved_at: new Date().toISOString(),
        ...(metadata ?? {}),
      },
    };

    if (resolutionMessage) {
      patch.message = resolutionMessage;
    }

    const { error } = await supabase
      .from("transaction_audit_logs")
      .update(patch)
      .eq("user_id", userId)
      .eq("transaction_id", transactionId)
      .eq("status", "PENDING")
      .in("event_type", eventTypes);

    if (error) {
      console.warn("Pending audit event resolution failed", error.message);
    }
  } catch (error) {
    console.warn("Pending audit event resolution failed", error);
  }
}

export async function writeTransactionAuditLog({
  transactionId,
  eventType,
  status,
  message,
  metadata,
}: WriteTransactionAuditLogInput) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return;
    }

    const successorEvents = SUCCESSOR_EVENT_MAP[eventType] ?? [];

    if (status === "SUCCESS" || status === "FAILED") {
      await resolvePendingAuditEvents({
        transactionId,
        eventTypes: successorEvents,
        resolvedStatus: status === "FAILED" ? "FAILED" : "SUCCESS",
        resolutionMessage:
          status === "FAILED"
            ? "Lifecycle event resolved by downstream failure."
            : "Lifecycle event resolved by downstream successful milestone.",
        metadata: {
          resolved_by_event_type: eventType,
        },
      });
    }

    const { error } = await supabase.from("transaction_audit_logs").insert({
      transaction_id: transactionId,
      user_id: userId,
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
    const userId = await getCurrentUserId();

    if (!userId) {
      return [];
    }

    const { data, error } = await supabase
      .from("transaction_audit_logs")
      .select("*")
      .eq("user_id", userId)
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
