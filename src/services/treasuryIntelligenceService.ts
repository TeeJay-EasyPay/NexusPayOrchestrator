import { supabase } from "../lib/supabase";
import { TreasuryIntelligenceSignal } from "../lib/treasuryIntelligence";
import { Currency, RailType } from "../types/transfer";

interface WriteTreasurySnapshotInput {
  transactionId: string;
  routeId: string;
  provider: string;
  rail: RailType;
  currency: Currency;
  bridgeAsset?: Currency;
  treasurySignal: TreasuryIntelligenceSignal;
}

export type TreasuryLiquiditySnapshotRow = {
  id: string;
  transaction_id: string;
  route_id: string;
  user_id: string;
  corridor: string;
  recipient_currency: string;
  provider: string;
  rail: string;
  bridge_asset: string | null;
  corridor_liquidity_depth: string;
  corridor_pressure: string;
  corridor_capacity_score: number;
  corridor_preferred_rail: string | null;
  corridor_preferred_bridge_asset: string | null;
  corridor_insight: string;
  partner_liquidity_depth: string;
  partner_pressure: string;
  partner_capacity_score: number;
  partner_settlement_capacity: string;
  partner_insight: string;
  rail_liquidity_depth: string;
  rail_pressure: string;
  rail_capacity_score: number;
  rail_settlement_capacity: string;
  rail_insight: string;
  treasury_score: number;
  treasury_pressure_penalty: number;
  liquidity_recommendation: string;
  decision_factors: string[];
  snapshot_payload: Record<string, unknown>;
  created_at: string;
};

export async function writeTreasuryLiquiditySnapshot({
  transactionId,
  routeId,
  provider,
  rail,
  currency,
  bridgeAsset,
  treasurySignal,
}: WriteTreasurySnapshotInput) {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return;
    }

    const payload = {
      transaction_id: transactionId,
      route_id: routeId,
      user_id: user.id,

      corridor: treasurySignal.corridor.corridor,
      recipient_currency: currency,
      provider,
      rail,
      bridge_asset: bridgeAsset ?? null,

      corridor_liquidity_depth:
        treasurySignal.corridor.liquidityDepth,

      corridor_pressure:
        treasurySignal.corridor.pressure,

      corridor_capacity_score:
        treasurySignal.corridor.availableCapacityScore,

      corridor_preferred_rail:
        treasurySignal.corridor.preferredRail,

      corridor_preferred_bridge_asset:
        treasurySignal.corridor.preferredBridgeAsset ?? null,

      corridor_insight: treasurySignal.corridor.insight,

      partner_liquidity_depth:
        treasurySignal.partner.liquidityDepth,

      partner_pressure:
        treasurySignal.partner.pressure,

      partner_capacity_score:
        treasurySignal.partner.availableCapacityScore,

      partner_settlement_capacity:
        treasurySignal.partner.settlementCapacity,

      partner_insight: treasurySignal.partner.insight,

      rail_liquidity_depth:
        treasurySignal.rail.liquidityDepth,

      rail_pressure:
        treasurySignal.rail.pressure,

      rail_capacity_score:
        treasurySignal.rail.availableCapacityScore,

      rail_settlement_capacity:
        treasurySignal.rail.settlementCapacity,

      rail_insight: treasurySignal.rail.insight,

      treasury_score: treasurySignal.treasuryScore,

      treasury_pressure_penalty:
        treasurySignal.treasuryPressurePenalty,

      liquidity_recommendation:
        treasurySignal.liquidityRecommendation,

      decision_factors: treasurySignal.decisionFactors,

      snapshot_payload: treasurySignal,
    };

    const { error } = await supabase
      .from("treasury_liquidity_snapshots")
      .upsert(payload, {
        onConflict: "transaction_id,route_id,user_id",
      });

    if (error) {
      console.warn("Treasury snapshot insert failed", error.message);
    }
  } catch (error) {
    console.warn("Treasury snapshot logging failed", error);
  }
}

export async function loadTreasurySnapshots(transactionId: string) {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return [];
    }

    const { data, error } = await supabase
      .from("treasury_liquidity_snapshots")
      .select("*")
      .eq("user_id", user.id)
      .eq("transaction_id", transactionId)
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("Failed to load treasury snapshots", error.message);
      return [];
    }

    return (data ?? []) as TreasuryLiquiditySnapshotRow[];
  } catch (error) {
    console.warn("Treasury snapshot retrieval failed", error);
    return [];
  }
}

export async function loadRecentTreasurySnapshots(limit = 25) {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return [];
    }

    const { data, error } = await supabase
      .from("treasury_liquidity_snapshots")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.warn("Failed to load recent treasury snapshots", error.message);
      return [];
    }

    return (data ?? []) as TreasuryLiquiditySnapshotRow[];
  } catch (error) {
    console.warn("Recent treasury snapshot retrieval failed", error);
    return [];
  }
}
