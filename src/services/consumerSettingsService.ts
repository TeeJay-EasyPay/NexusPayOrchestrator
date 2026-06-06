import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../lib/supabase";
import { getStoredAccountScope } from "../state/AccountContext";

export type ConsumerProfile = {
  displayName: string;
  phone: string;
  country: string;
};

export type ConsumerPreferences = {
  transferNotifications: boolean;
  marketingNotifications: boolean;
  securityNotifications: boolean;
  preferredLanding: "home" | "send" | "transfers";
};

type ConsumerSettingsPayload = {
  profile: ConsumerProfile;
  preferences: ConsumerPreferences;
};

const DEFAULT_PROFILE: ConsumerProfile = {
  displayName: "NexusPay User",
  phone: "",
  country: "United Kingdom",
};

const DEFAULT_PREFERENCES: ConsumerPreferences = {
  transferNotifications: true,
  marketingNotifications: false,
  securityNotifications: true,
  preferredLanding: "home",
};

function buildSettingsKey(userId: string, scope: "demo" | "personal") {
  return `consumer-settings:${userId}:${scope}`;
}

async function resolveStorageKey() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const scope = await getStoredAccountScope();
  const userId = user?.id ?? "anonymous";

  return buildSettingsKey(userId, scope);
}

export async function loadConsumerSettings(): Promise<ConsumerSettingsPayload> {
  const key = await resolveStorageKey();
  const payload = await AsyncStorage.getItem(key);

  if (!payload) {
    return {
      profile: DEFAULT_PROFILE,
      preferences: DEFAULT_PREFERENCES,
    };
  }

  try {
    const parsed = JSON.parse(payload) as Partial<ConsumerSettingsPayload>;

    return {
      profile: {
        ...DEFAULT_PROFILE,
        ...(parsed.profile ?? {}),
      },
      preferences: {
        ...DEFAULT_PREFERENCES,
        ...(parsed.preferences ?? {}),
      },
    };
  } catch {
    return {
      profile: DEFAULT_PROFILE,
      preferences: DEFAULT_PREFERENCES,
    };
  }
}

async function saveConsumerSettings(payload: ConsumerSettingsPayload) {
  const key = await resolveStorageKey();
  await AsyncStorage.setItem(key, JSON.stringify(payload));
}

export async function updateConsumerProfile(
  updates: Partial<ConsumerProfile>
): Promise<ConsumerProfile> {
  const existing = await loadConsumerSettings();
  const nextProfile = {
    ...existing.profile,
    ...updates,
  };

  await saveConsumerSettings({
    ...existing,
    profile: nextProfile,
  });

  return nextProfile;
}

export async function updateConsumerPreferences(
  updates: Partial<ConsumerPreferences>
): Promise<ConsumerPreferences> {
  const existing = await loadConsumerSettings();
  const nextPreferences = {
    ...existing.preferences,
    ...updates,
  };

  await saveConsumerSettings({
    ...existing,
    preferences: nextPreferences,
  });

  return nextPreferences;
}
