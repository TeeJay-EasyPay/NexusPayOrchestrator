import "react-native-url-polyfill/auto";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

import { logStartupInfo, logStartupWarn } from "../services/startupLogger";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl.startsWith("https://") &&
    supabaseUrl.includes(".supabase.co")
);

if (isSupabaseConfigured) {
  logStartupInfo({
    event: "supabase-client-configured",
    stage: "supabase-init",
    status: "success",
  });
} else {
  logStartupWarn({
    event: "supabase-client-fallback-config",
    stage: "supabase-init",
    status: "fallback",
    details: {
      reason: getSupabaseConfigError(),
    },
  });
}

export function getSupabaseConfigError() {
  if (!supabaseUrl) {
    return "Missing EXPO_PUBLIC_SUPABASE_URL in your .env file.";
  }

  if (!supabaseAnonKey) {
    return "Missing EXPO_PUBLIC_SUPABASE_ANON_KEY in your .env file.";
  }

  if (!supabaseUrl.startsWith("https://") || !supabaseUrl.includes(".supabase.co")) {
    return "EXPO_PUBLIC_SUPABASE_URL must look like https://your-project-ref.supabase.co";
  }

  return null;
}

const fallbackSupabaseUrl = "https://example.supabase.co";
const fallbackSupabaseAnonKey = "fallback-anon-key";

export const supabase = createClient(
  supabaseUrl || fallbackSupabaseUrl,
  supabaseAnonKey || fallbackSupabaseAnonKey,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);
