import { supabase } from "../lib/supabase";

export type NexusAISensitivity = "conservative" | "balanced" | "aggressive";

export type NexusAISettings = {
  user_id: string;
  master_enabled: boolean;
  home_enabled: boolean;
  route_enabled: boolean;
  tracking_enabled: boolean;
  corridor_enabled: boolean;
  treasury_enabled: boolean;
  market_enabled: boolean;
  sensitivity: NexusAISensitivity;
  updated_at?: string;
};

export const defaultNexusAISettings = (userId: string): NexusAISettings => ({
  user_id: userId,
  master_enabled: true,
  home_enabled: true,
  route_enabled: true,
  tracking_enabled: false,
  corridor_enabled: true,
  treasury_enabled: false,
  market_enabled: false,
  sensitivity: "balanced",
});

export async function getNexusAISettings(userId: string) {
  const { data, error } = await supabase
    .from("nexus_ai_settings")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    const defaults = defaultNexusAISettings(userId);

    const { data: inserted, error: insertError } = await supabase
      .from("nexus_ai_settings")
      .insert(defaults)
      .select("*")
      .single();

    if (insertError) throw insertError;
    return inserted as NexusAISettings;
  }

  return data as NexusAISettings;
}

export async function updateNexusAISettings(
  userId: string,
  updates: Partial<Omit<NexusAISettings, "user_id">>
) {
  const { data, error } = await supabase
    .from("nexus_ai_settings")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error) throw error;

  return data as NexusAISettings;
}