import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";

import { supabase } from "../lib/supabase";
import {
    getNexusAISettings,
    NexusAISettings,
    updateNexusAISettings,
} from "../services/nexusAISettingsService";

export type NexusAIScreenKey =
  | "home_enabled"
  | "route_enabled"
  | "tracking_enabled"
  | "corridor_enabled";

type UseNexusAISettingsResult = {
  settings: NexusAISettings | null;
  loading: boolean;
  refresh: () => Promise<void>;
  updateScreenEnabled: (key: NexusAIScreenKey, value: boolean) => Promise<void>;
};

export function useNexusAISettings(): UseNexusAISettingsResult {
  const [settings, setSettings] = useState<NexusAISettings | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setSettings(null);
        return;
      }

      const nextSettings = await getNexusAISettings(user.id);

      setSettings(nextSettings);
    } catch (error) {
      console.warn("Failed to load Nexus AI settings", error);
      setSettings(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh])
  );

  const updateScreenEnabled = useCallback(
    async (key: NexusAIScreenKey, value: boolean) => {
      if (!settings) return;

      const previous = settings;
      const next = { ...settings, [key]: value };

      setSettings(next);

      try {
        const saved = await updateNexusAISettings(settings.user_id, {
          [key]: value,
        });

        setSettings(saved);
      } catch (error) {
        console.error("Failed to update Nexus AI settings", error);
        setSettings(previous);
      }
    },
    [settings]
  );

  return {
    settings,
    loading,
    refresh,
    updateScreenEnabled,
  };
}

export function useNexusAIScreenSetting(key: NexusAIScreenKey) {
  const { settings, loading, refresh, updateScreenEnabled } = useNexusAISettings();

  const enabled = Boolean(settings?.master_enabled && settings?.[key]);
  const disabled = Boolean(settings && !settings.master_enabled);

  const toggle = useCallback(
    async (value: boolean) => {
      await updateScreenEnabled(key, value);
    },
    [key, updateScreenEnabled]
  );

  return {
    settings,
    loading,
    refresh,
    enabled,
    disabled,
    toggle,
  };
}