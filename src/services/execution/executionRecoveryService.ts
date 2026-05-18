import { supabase } from "../../lib/supabase";
import { ExecutionSnapshot } from "./executionEngine";

export type RecoverableExecutionSession = {
  id: string;
  transfer_id: string;
  state: string;
  progress_percent: number;
  updated_at: string;
  snapshot?: ExecutionSnapshot | null;
};

const RECOVERABLE_STATES = [
  "VALIDATING_IDEMPOTENCY",
  "AUTHORISING_ROUTE",
  "SETTLING_BRIDGE",
  "EXECUTING_PAYOUT",
  "VERIFYING_PAYOUT",
  "FAILOVER_EVALUATION",
];

export async function loadRecoverableExecutionSessions() {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return [] as RecoverableExecutionSession[];
    }

    const { data, error } = await supabase
      .from("execution_sessions")
      .select("id, transfer_id, state, progress_percent, updated_at, snapshot")
      .eq("user_id", user.id)
      .in("state", RECOVERABLE_STATES)
      .order("updated_at", { ascending: false });

    if (error) {
      console.warn("Failed to load recoverable execution sessions", error.message);
      return [] as RecoverableExecutionSession[];
    }

    return (data ?? []) as RecoverableExecutionSession[];
  } catch (error) {
    console.warn("Execution recovery lookup failed", error);
    return [] as RecoverableExecutionSession[];
  }
}

export async function loadLatestExecutionSnapshot(transferId: string) {
  try {
    const { data, error } = await supabase
      .from("execution_sessions")
      .select("snapshot")
      .eq("transfer_id", transferId)
      .single();

    if (error) {
      console.warn("Failed to load latest execution snapshot", error.message);
      return null;
    }

    return (data?.snapshot ?? null) as ExecutionSnapshot | null;
  } catch (error) {
    console.warn("Execution snapshot recovery failed", error);
    return null;
  }
}
