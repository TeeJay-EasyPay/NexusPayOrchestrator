import { RouteOperationalEvent } from "../lib/routeOperationalState";
import { supabase } from "../lib/supabase";
import { RouteQuote } from "../types/transfer";

interface WriteRouteOperationalEventInput {
  transactionId: string;
  route: RouteQuote;
  event: RouteOperationalEvent;
}

export type RouteOperationalEventRow = {
  id: string;
  transaction_id: string;
  route_id: string;
  user_id: string;
  provider: string;
  corridor: string | null;
  rail: string;
  event_type: string;
  severity: "INFO" | "WATCH" | "DEGRADED" | "FAILOVER";
  status: "OPEN" | "RESOLVED" | "SIMULATED";
  message: string;
  recommendation: string;
  degradation_score: number;
  failover_recommended: boolean;
  preferred_action: string;
  event_payload: Record<string, unknown>;
  created_at: string;
};

export async function writeRouteOperationalEvent({
  transactionId,
  route,
  event,
}: WriteRouteOperationalEventInput) {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return;
    }

    const payload = {
      transaction_id: transactionId,
      route_id: route.id,
      user_id: user.id,
      provider: route.provider,
      corridor: route.treasuryCorridor ?? null,
      rail: route.rail,
      event_type: event.eventType,
      severity: event.severity,
      status: event.status,
      message: event.message,
      recommendation: event.recommendation,
      degradation_score: event.degradationScore,
      failover_recommended: event.failoverRecommended,
      preferred_action: event.preferredAction,
      event_payload: event.payload,
    };

    const { error } = await supabase
      .from("route_operational_events")
      .upsert(payload, {
        onConflict: "transaction_id,route_id,user_id,event_type",
      });

    if (error) {
      console.warn("Route operational event insert failed", error.message);
    }
  } catch (error) {
    console.warn("Route operational event logging failed", error);
  }
}

export async function loadRecentRouteOperationalEvents(limit = 25) {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return [];
    }

    const { data, error } = await supabase
      .from("route_operational_events")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.warn("Failed to load route operational events", error.message);
      return [];
    }

    return (data ?? []) as RouteOperationalEventRow[];
  } catch (error) {
    console.warn("Route operational event retrieval failed", error);
    return [];
  }
}
