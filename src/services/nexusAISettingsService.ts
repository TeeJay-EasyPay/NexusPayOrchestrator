import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../lib/supabase";
import { getStoredAccountScope } from "../state/AccountContext";
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

function settingsStorageKey(userId: string, scope: "demo" | "personal") {
  return `nexus-ai-settings:${userId}:${scope}`;
}

async function getLocalSettings(userId: string, scope: "demo" | "personal") {
  const payload = await AsyncStorage.getItem(settingsStorageKey(userId, scope));
  if (!payload) return null;

  try {
    return JSON.parse(payload) as NexusAISettings;
  } catch {
    return null;
  }
}

async function setLocalSettings(userId: string, scope: "demo" | "personal", settings: NexusAISettings) {
  await AsyncStorage.setItem(settingsStorageKey(userId, scope), JSON.stringify(settings));
}

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
  const scope = await getStoredAccountScope();
  const local = await getLocalSettings(userId, scope);

  if (local) {
    return local;
  }

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
      const fallback = defaultNexusAISettings(userId);
      await setLocalSettings(userId, scope, fallback);
      return fallback;
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

        await setLocalSettings(userId, scope, defaults);
        return defaults;
      }

      throw insertError;
    }

    const insertedSettings = inserted as NexusAISettings;
    await setLocalSettings(userId, scope, insertedSettings);
    return insertedSettings;
  }

  const settings = data as NexusAISettings;
  await setLocalSettings(userId, scope, settings);
  return settings;
}

export async function updateNexusAISettings(
  userId: string,
  updates: Partial<Omit<NexusAISettings, "user_id">>
) {
  const scope = await getStoredAccountScope();
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

      const fallback = {
        ...defaultNexusAISettings(userId),
        ...updates,
      } as NexusAISettings;
      await setLocalSettings(userId, scope, fallback);
      return fallback;
    }

    throw error;
  }

  const settings = data as NexusAISettings;
  await setLocalSettings(userId, scope, settings);
  return settings;
}