import { RealtimeChannel } from "@supabase/supabase-js";

import { supabase } from "../../lib/supabase";
import { ExecutionSnapshot } from "./executionEngine";
import { PersistedExecutionSession } from "./executionPersistenceService";

type ExecutionSessionPayload = {
  new?: PersistedExecutionSession;
  old?: PersistedExecutionSession;
};

type SubscribeToExecutionSessionInput = {
  transferId: string;
  onSession: (session: PersistedExecutionSession) => void;
  onSnapshot?: (snapshot: ExecutionSnapshot) => void;
  onError?: (message: string) => void;
};

type SubscribeToRecentExecutionSessionsInput = {
  onSession: (session: PersistedExecutionSession) => void;
  onError?: (message: string) => void;
};

function safeSnapshot(value: unknown) {
  if (!value || typeof value !== "object") return null;
  return value as ExecutionSnapshot;
}

function createChannelName(prefix: string, id?: string) {
  return `${prefix}_${id ?? "all"}_${Date.now()}`;
}

export function subscribeToExecutionSession({
  transferId,
  onSession,
  onSnapshot,
  onError,
}: SubscribeToExecutionSessionInput) {
  let channel: RealtimeChannel | null = null;

  try {
    channel = (supabase
      .channel(createChannelName("execution_session", transferId)) as any)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "execution_sessions",
          filter: `transfer_id=eq.${transferId}`,
        },
        (payload: ExecutionSessionPayload) => {
          const session = payload.new;
          if (!session) return;

          onSession(session);

          const snapshot = safeSnapshot(session.snapshot);
          if (snapshot) {
            onSnapshot?.(snapshot);
          }
        }
      )
      .subscribe((status: string) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          onError?.(`Realtime execution subscription status: ${status}`);
        }
      });
  } catch (error) {
    onError?.(error instanceof Error ? error.message : String(error));
  }

  return () => {
    if (channel) {
      supabase.removeChannel(channel);
    }
  };
}

export function subscribeToRecentExecutionSessions({
  onSession,
  onError,
}: SubscribeToRecentExecutionSessionsInput) {
  let channel: RealtimeChannel | null = null;

  try {
    channel = (supabase
      .channel(createChannelName("execution_sessions")) as any)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "execution_sessions",
        },
        (payload: ExecutionSessionPayload) => {
          const session = payload.new;
          if (session) {
            onSession(session);
          }
        }
      )
      .subscribe((status: string) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          onError?.(`Realtime execution feed status: ${status}`);
        }
      });
  } catch (error) {
    onError?.(error instanceof Error ? error.message : String(error));
  }

  return () => {
    if (channel) {
      supabase.removeChannel(channel);
    }
  };
}
