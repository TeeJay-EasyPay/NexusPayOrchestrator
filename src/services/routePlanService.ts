import { supabase } from "../lib/supabase";
import type { CanonicalRoutePlan, RoutePlanStatus } from "../types/routePlan";
import type { RouteQuote } from "../types/transfer";

export type RoutePlanEvent = {
  id: string;
  route_plan_id: string;
  event_type: string;
  from_status: string | null;
  to_status: string | null;
  reason: string | null;
  replacement_route_plan_id: string | null;
  created_at: string;
};

function planRow(plan: CanonicalRoutePlan, userId: string) {
  return {
    id: plan.id,
    transfer_id: plan.transferId,
    user_id: userId,
    plan_version: plan.version,
    status: plan.status,
    eligible: plan.eligible,
    rank: plan.rank,
    score: plan.score.value,
    funding_provider: plan.funding.provider.providerId,
    bridge_provider: plan.bridge.provider?.providerId ?? null,
    bridge_asset: plan.bridge.asset.value,
    payout_provider: plan.payout.provider.providerId,
    source_currency: plan.economics.sourceCurrency,
    destination_currency: plan.economics.destinationCurrency,
    quote_expires_at: plan.quoteExpiresAt,
    ...(plan.status === "APPROVED" ? { approved_at: new Date().toISOString() } : {}),
    ...(plan.status === "COMPLETED" ? { completed_at: new Date().toISOString() } : {}),
    plan,
    updated_at: new Date().toISOString(),
  };
}

async function currentUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function persistRoutePlans(routes: RouteQuote[]) {
  const userId = await currentUserId();
  const plans = routes.map((route) => route.routePlan).filter((plan): plan is CanonicalRoutePlan => Boolean(plan?.transferId));
  if (!userId || plans.length === 0) return false;
  const { error } = await supabase.from("route_plans").upsert(plans.map((plan) => planRow(plan, userId)));
  if (error) console.warn("Route plan persistence failed", error.message);
  return !error;
}

export async function transitionRoutePlan(
  route: RouteQuote,
  toStatus: RoutePlanStatus,
  reason: string,
  replacementRoute?: RouteQuote,
) {
  const plan = route.routePlan;
  const userId = await currentUserId();
  if (!plan?.transferId || !userId) return false;
  const { data: existing, error: existingError } = await supabase
    .from("route_plans")
    .select("status")
    .eq("id", plan.id)
    .eq("user_id", userId)
    .maybeSingle();
  if (existingError || !existing) {
    console.warn("Route plan transition rejected because the candidate was not persisted.");
    return false;
  }
  if (existing.status === toStatus) return true;
  const allowed: Record<string, RoutePlanStatus[]> = {
    CANDIDATE: ["APPROVED", "SUPERSEDED"],
    APPROVED: ["EXECUTING", "FAILED", "SUPERSEDED"],
    EXECUTING: ["COMPLETED", "FAILED"],
    FAILED: [],
    SUPERSEDED: [],
    COMPLETED: [],
  };
  if (!allowed[existing.status]?.includes(toStatus)) {
    console.warn(`Route plan transition ${existing.status} to ${toStatus} is not allowed.`);
    return false;
  }
  if (toStatus === "APPROVED") {
    const { error: supersedeError } = await supabase
      .from("route_plans")
      .update({ status: "SUPERSEDED", updated_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("transfer_id", plan.transferId)
      .eq("plan_version", plan.version)
      .eq("status", "APPROVED")
      .neq("id", plan.id);
    if (supersedeError) {
      console.warn("Prior route plan supersede failed", supersedeError.message);
      return false;
    }
  }
  const nextPlan = { ...plan, status: toStatus };
  const { error } = await supabase.from("route_plans").upsert(planRow(nextPlan, userId));
  if (error) {
    console.warn("Route plan transition failed", error.message);
    return false;
  }
  const { error: eventError } = await supabase.from("route_plan_events").insert({
    route_plan_id: plan.id,
    transfer_id: plan.transferId,
    user_id: userId,
    event_type: toStatus === "FAILED" && replacementRoute ? "ROUTE_FAILOVER" : `ROUTE_${toStatus}`,
    from_status: existing.status,
    to_status: toStatus,
    reason,
    replacement_route_plan_id: replacementRoute?.routePlan?.id ?? null,
    event_payload: {
      selected_route_plan_id: plan.id,
      replacement_route_plan_id: replacementRoute?.routePlan?.id ?? null,
      selected_provider: plan.payout.provider.providerName,
      replacement_provider: replacementRoute?.routePlan?.payout.provider.providerName ?? null,
    },
  });
  if (eventError) {
    console.warn("Route plan event persistence failed", eventError.message);
    return false;
  }
  return true;
}

export async function loadRoutePlanEvents(transferId: string): Promise<RoutePlanEvent[]> {
  const { data, error } = await supabase
    .from("route_plan_events")
    .select("id,route_plan_id,event_type,from_status,to_status,reason,replacement_route_plan_id,created_at")
    .eq("transfer_id", transferId)
    .order("created_at", { ascending: true });
  if (error) {
    console.warn("Route plan event load failed", error.message);
    return [];
  }
  return (data ?? []) as RoutePlanEvent[];
}
