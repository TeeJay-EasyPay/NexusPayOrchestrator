import { supabase } from "../lib/supabase";
import { logStartupWarn } from "./startupLogger";

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

function isRlsError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const candidate = error as { message?: string; code?: string };
  const message = (candidate.message ?? "").toLowerCase();

  return (
    candidate.code === "42501" ||
    message.includes("row-level security") ||
    message.includes("policy")
  );
}

export async function getNexusAISettings(userId: string) {
  const { data, error } = await supabase
    .from("nexus_ai_settings")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    if (isRlsError(error)) {
      logStartupWarn({
        event: "nexus-ai-settings-select-rls",
        stage: "nexus-ai-init",
        status: "fallback",
        details: {
          userId,
          reason: error.message,
        },
      });
      return defaultNexusAISettings(userId);
    }

    throw error;
  }

  if (!data) {
    const defaults = defaultNexusAISettings(userId);

    const { data: inserted, error: insertError } = await supabase
      .from("nexus_ai_settings")
      .insert(defaults)
      .select("*")
      .single();

    if (insertError) {
      if (isRlsError(insertError)) {
        logStartupWarn({
          event: "nexus-ai-settings-insert-rls",
          stage: "nexus-ai-init",
          status: "fallback",
          details: {
            userId,
            reason: insertError.message,
          },
        });

        return defaults;
      }

      throw insertError;
    }

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

  if (error) {
    if (isRlsError(error)) {
      logStartupWarn({
        event: "nexus-ai-settings-update-rls",
        stage: "nexus-ai-init",
        status: "fallback",
        details: {
          userId,
          reason: error.message,
        },
      });

      return {
        ...defaultNexusAISettings(userId),
        ...updates,
      } as NexusAISettings;
    }

    throw error;
  }

  return data as NexusAISettings;
}