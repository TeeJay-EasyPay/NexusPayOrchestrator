import { supabase } from "../../lib/supabase";
import { ExecutionSnapshot, ExecutionState } from "./executionEngine";

export type PersistedExecutionSession = {
  id: string;
  transfer_id: string;
  user_id: string;
  state: ExecutionState;
  progress_percent: number;
  active_step_index: number;
  idempotency_key: string;
  active_provider?: string | null;
  failover_used: boolean;
  payout_status?: string | null;
  xrpl_status?: string | null;
  human_status?: string | null;
  snapshot: ExecutionSnapshot;
  last_error?: string | null;
  created_at?: string;
  updated_at?: string;
  completed_at?: string | null;
};

function isTerminalState(state: ExecutionState) {
  return state === "COMPLETED" || state === "FAILED";
}

export async function persistExecutionSnapshot(snapshot: ExecutionSnapshot) {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return;
    }

    const now = new Date().toISOString();

    const { error } = await supabase.from("execution_sessions").upsert({
      id: snapshot.transferId,
      transfer_id: snapshot.transferId,
      user_id: user.id,
      state: snapshot.state,
      progress_percent: snapshot.progressPercent,
      active_step_index: snapshot.activeStepIndex,
      idempotency_key: snapshot.idempotencyKey,
      active_provider: snapshot.activeRoute?.provider ?? null,
      failover_used: snapshot.failoverUsed,
      payout_status: snapshot.payoutStatus,
      xrpl_status: snapshot.xrplStatus,
      human_status: snapshot.humanStatus,
      snapshot,
      last_error: snapshot.error ?? null,
      updated_at: now,
      completed_at: isTerminalState(snapshot.state) ? now : null,
    });

    if (error) {
      console.warn("Execution snapshot persistence failed", error.message);
    }
  } catch (error) {
    console.warn("Execution snapshot persistence failed", error);
  }
}

export async function loadExecutionSession(transferId: string) {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return null;
    }

    const { data, error } = await supabase
      .from("execution_sessions")
      .select("*")
      .eq("user_id", user.id)
      .eq("transfer_id", transferId)
      .maybeSingle();

    if (error) {
      console.warn("Execution session load failed", error.message);
      return null;
    }

    return data as PersistedExecutionSession | null;
  } catch (error) {
    console.warn("Execution session load failed", error);
    return null;
  }
}

export async function loadRecoverableExecutionSessions() {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return [];
    }

    const { data, error } = await supabase
      .from("execution_sessions")
      .select("*")
      .eq("user_id", user.id)
      .not("state", "in", "(COMPLETED,FAILED)")
      .order("updated_at", { ascending: false })
      .limit(10);

    if (error) {
      console.warn("Recoverable execution session load failed", error.message);
      return [];
    }

    return (data ?? []) as PersistedExecutionSession[];
  } catch (error) {
    console.warn("Recoverable execution session load failed", error);
    return [];
  }
}

export async function loadRecentExecutionSessions(limit = 60) {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return [];
    }

    const { data, error } = await supabase
      .from("execution_sessions")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.warn("Recent execution session load failed", error.message);
      return [];
    }

    return (data ?? []) as PersistedExecutionSession[];
  } catch (error) {
    console.warn("Recent execution session load failed", error);
    return [];
  }
}
