import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { TextInput, View } from "react-native";

import {
  ConsumerAction,
  ConsumerCard,
  ConsumerPill,
  ConsumerShell,
  consumerColors,
} from "../../src/components/consumer/ConsumerShell";
import { AppText } from "../../src/components/ui/AppText";
import {
  loadConsumerSettings,
  updateConsumerProfile,
} from "../../src/services/consumerSettingsService";
import { useAuth } from "../../src/state/AuthContext";

export default function ConsumerProfileScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const [displayName, setDisplayName] = useState("NexusPay User");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("United Kingdom");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;

    loadConsumerSettings().then((settings) => {
      if (!mounted) return;
      setDisplayName(settings.profile.displayName);
      setPhone(settings.profile.phone);
      setCountry(settings.profile.country);
    });

    return () => {
      mounted = false;
    };
  }, []);

  async function saveProfile() {
    setSaving(true);

    try {
      await updateConsumerProfile({
        displayName: displayName.trim() || "NexusPay User",
        phone: phone.trim(),
        country: country.trim() || "United Kingdom",
      });
    } finally {
      setSaving(false);
    }
  }

  const email = session?.user?.email ?? "Not signed in";

  return (
    <ConsumerShell
      eyebrow="PROFILE"
      title="Live profile"
      subtitle="Persisted personal profile, linked to the active authenticated account scope."
    >
      <ConsumerCard>
        <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <AppText color={consumerColors.text} style={{ fontSize: 22, fontWeight: "900" }}>
              {displayName}
            </AppText>
            <AppText color={consumerColors.muted}>{email}</AppText>
          </View>
          <ConsumerPill label="Personal active" tone="green" />
        </View>
      </ConsumerCard>

      <ConsumerCard>
        <AppText color={consumerColors.text} style={{ fontWeight: "900", fontSize: 18 }}>
          Profile management
        </AppText>
        <TextInput
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="Display name"
          placeholderTextColor={consumerColors.muted}
          style={{
            borderWidth: 1,
            borderColor: consumerColors.border,
            borderRadius: 8,
            paddingHorizontal: 12,
            paddingVertical: 10,
            backgroundColor: consumerColors.white,
            color: consumerColors.text,
          }}
        />
        <TextInput
          value={phone}
          onChangeText={setPhone}
          placeholder="Phone number"
          placeholderTextColor={consumerColors.muted}
          keyboardType="phone-pad"
          style={{
            borderWidth: 1,
            borderColor: consumerColors.border,
            borderRadius: 8,
            paddingHorizontal: 12,
            paddingVertical: 10,
            backgroundColor: consumerColors.white,
            color: consumerColors.text,
          }}
        />
        <TextInput
          value={country}
          onChangeText={setCountry}
          placeholder="Country"
          placeholderTextColor={consumerColors.muted}
          style={{
            borderWidth: 1,
            borderColor: consumerColors.border,
            borderRadius: 8,
            paddingHorizontal: 12,
            paddingVertical: 10,
            backgroundColor: consumerColors.white,
            color: consumerColors.text,
          }}
        />
        <ConsumerAction label={saving ? "Saving..." : "Save profile"} icon="save" onPress={saveProfile} />
      </ConsumerCard>

      <ConsumerCard>
        <AppText color={consumerColors.text} style={{ fontWeight: "900", fontSize: 18 }}>
          Verification
        </AppText>
        <AppText color={consumerColors.muted}>
          Verification helps increase limits and keeps your transfers protected.
        </AppText>
        <View style={{ gap: 10 }}>
          <ConsumerPill label="Identity checks pending" tone="gold" />
          <ConsumerPill label="Security alerts enabled" tone="green" />
          <ConsumerPill label="Data scoped to personal account" tone="blue" />
        </View>
      </ConsumerCard>

      <ConsumerAction label="Open settings" icon="settings" secondary onPress={() => router.push("/consumer/settings" as never)} />
    </ConsumerShell>
  );
}
