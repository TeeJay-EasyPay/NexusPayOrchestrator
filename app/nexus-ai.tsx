import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    View,
} from "react-native";
import { supabase } from "../src/lib/supabase";
import {
    getNexusAISettings,
    NexusAISensitivity,
    NexusAISettings,
    updateNexusAISettings,
} from "../src/services/nexusAISettingsService";

export default function NexusAIScreen() {
  const router = useRouter();

  const [settings, setSettings] = useState<NexusAISettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [infoOpen, setInfoOpen] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const result = await getNexusAISettings(user.id);
      setSettings(result);
    } catch (error) {
      console.error("Failed to load Nexus AI settings", error);
    } finally {
      setLoading(false);
    }
  }

  async function updateSetting(updates: Partial<NexusAISettings>) {
    if (!settings) return;

    const previous = settings;
    const next = { ...settings, ...updates };

    setSettings(next);

    try {
      const saved = await updateNexusAISettings(settings.user_id, updates);
      setSettings(saved);
    } catch (error) {
      console.error("Failed to update Nexus AI settings", error);
      setSettings(previous);
    }
  }

  function selectSensitivity(value: NexusAISensitivity) {
    updateSetting({ sensitivity: value });
  }

  const disabled = !settings?.master_enabled;

  if (loading || !settings) {
    return (
      <View style={styles.center}>
        <Text style={styles.loadingText}>Loading Nexus AI settings...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Pressable onPress={() => router.back()}>
        <Text style={styles.backText}>← Back</Text>
      </Pressable>

      <Text style={styles.title}>Nexus AI</Text>
      <Text style={styles.subtitle}>
        Control where AI intelligence is used across NexusPay.
      </Text>

      <View style={styles.card}>
        <View style={styles.row}>
          <View>
            <Text style={styles.rowTitle}>Master AI</Text>
            <Text style={styles.rowSubtitle}>
              Turn all Nexus AI features on or off.
            </Text>
          </View>

          <Switch
            value={settings.master_enabled}
            onValueChange={(value) =>
              updateSetting({ master_enabled: value })
            }
          />
        </View>
      </View>

      <Text style={styles.sectionTitle}>AI Enabled Screens</Text>

      <View style={styles.card}>
        <ToggleRow
          title="Home Intelligence"
          subtitle="AI summary for global value transfer conditions."
          value={settings.home_enabled && settings.master_enabled}
          disabled={disabled}
          onChange={(value) => updateSetting({ home_enabled: value })}
        />

        <ToggleRow
          title="Route Intelligence"
          subtitle="AI explains route scores and value impact."
          value={settings.route_enabled && settings.master_enabled}
          disabled={disabled}
          onChange={(value) => updateSetting({ route_enabled: value })}
        />

        <ToggleRow
          title="Transfer Tracking"
          subtitle="AI explanation during transfer progress."
          value={settings.tracking_enabled && settings.master_enabled}
          disabled={disabled}
          onChange={(value) => updateSetting({ tracking_enabled: value })}
        />

        <ToggleRow
          title="Corridor Intelligence"
          subtitle="AI commentary for corridor liquidity and FX feeds."
          value={settings.corridor_enabled && settings.master_enabled}
          disabled={disabled}
          onChange={(value) => updateSetting({ corridor_enabled: value })}
        />

        <ToggleRow
          title="Treasury Analysis"
          subtitle="AI commentary for treasury and capacity signals."
          value={settings.treasury_enabled && settings.master_enabled}
          disabled={disabled}
          onChange={(value) => updateSetting({ treasury_enabled: value })}
        />

        <ToggleRow
          title="Market Commentary"
          subtitle="AI commentary for global market conditions."
          value={settings.market_enabled && settings.master_enabled}
          disabled={disabled}
          onChange={(value) => updateSetting({ market_enabled: value })}
          isLast
        />
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>AI Sensitivity</Text>

        <Pressable onPress={() => setInfoOpen(true)} style={styles.infoButton}>
          <Text style={styles.infoText}>i</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <SensitivityOption
          label="Conservative"
          description="Lowest AI activity"
          selected={settings.sensitivity === "conservative"}
          onPress={() => selectSensitivity("conservative")}
        />

        <SensitivityOption
          label="Balanced"
          description="Recommended for most users"
          selected={settings.sensitivity === "balanced"}
          onPress={() => selectSensitivity("balanced")}
        />

        <SensitivityOption
          label="Aggressive"
          description="Most proactive intelligence"
          selected={settings.sensitivity === "aggressive"}
          onPress={() => selectSensitivity("aggressive")}
          isLast
        />
      </View>

      <View style={styles.impactCard}>
        <Text style={styles.impactTitle}>Current Setting Impact</Text>
        <Text style={styles.impactText}>
          AI Activity:{" "}
          {settings.sensitivity === "conservative"
            ? "Low"
            : settings.sensitivity === "balanced"
              ? "Medium"
              : "High"}
        </Text>
        <Text style={styles.impactText}>
          Estimated AI Cost:{" "}
          {settings.sensitivity === "aggressive" ? "Medium" : "Low"}
        </Text>
      </View>

      <Modal transparent visible={infoOpen} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>AI Sensitivity Explained</Text>

            <Text style={styles.modalHeading}>Conservative</Text>
            <Text style={styles.modalText}>
              AI refreshes only when major changes occur, such as route ranking
              changes, market closures or substantial value impact.
            </Text>

            <Text style={styles.modalHeading}>Balanced</Text>
            <Text style={styles.modalText}>
              Recommended for most users. AI refreshes when meaningful transfer
              value or route quality changes are detected.
            </Text>

            <Text style={styles.modalHeading}>Aggressive</Text>
            <Text style={styles.modalText}>
              AI responds to smaller optimisation opportunities, liquidity
              movements and route improvements.
            </Text>

            <Pressable
              style={styles.modalButton}
              onPress={() => setInfoOpen(false)}
            >
              <Text style={styles.modalButtonText}>OK</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function ToggleRow({
  title,
  subtitle,
  value,
  disabled,
  onChange,
  isLast,
}: {
  title: string;
  subtitle: string;
  value: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
  isLast?: boolean;
}) {
  return (
    <View style={[styles.toggleRow, isLast && styles.noBorder]}>
      <View style={styles.toggleTextWrap}>
        <Text style={[styles.rowTitle, disabled && styles.disabledText]}>
          {title}
        </Text>
        <Text style={[styles.rowSubtitle, disabled && styles.disabledText]}>
          {subtitle}
        </Text>
      </View>

      <Switch value={value} disabled={disabled} onValueChange={onChange} />
    </View>
  );
}

function SensitivityOption({
  label,
  description,
  selected,
  onPress,
  isLast,
}: {
  label: string;
  description: string;
  selected: boolean;
  onPress: () => void;
  isLast?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.sensitivityRow, isLast && styles.noBorder]}
    >
      <View style={styles.radioOuter}>
        {selected ? <View style={styles.radioInner} /> : null}
      </View>

      <View>
        <Text style={styles.rowTitle}>{label}</Text>
        <Text style={styles.rowSubtitle}>{description}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#07111f",
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    backgroundColor: "#07111f",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    color: "#dbeafe",
    fontSize: 16,
  },
  backText: {
    color: "#93c5fd",
    fontSize: 15,
    marginBottom: 18,
  },
  title: {
    color: "#ffffff",
    fontSize: 32,
    fontWeight: "800",
  },
  subtitle: {
    color: "#9ca3af",
    fontSize: 15,
    marginTop: 8,
    marginBottom: 22,
    lineHeight: 22,
  },
  sectionTitle: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "800",
    marginTop: 22,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  card: {
    backgroundColor: "#0f1f35",
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(147, 197, 253, 0.18)",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(148, 163, 184, 0.16)",
  },
  toggleTextWrap: {
    flex: 1,
    paddingRight: 16,
  },
  rowTitle: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  rowSubtitle: {
    color: "#94a3b8",
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
  disabledText: {
    opacity: 0.45,
  },
  noBorder: {
    borderBottomWidth: 0,
  },
  infoButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1d4ed8",
    marginTop: 10,
  },
  infoText: {
    color: "#ffffff",
    fontWeight: "800",
  },
  sensitivityRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(148, 163, 184, 0.16)",
    gap: 12,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#60a5fa",
    alignItems: "center",
    justifyContent: "center",
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#60a5fa",
  },
  impactCard: {
    marginTop: 18,
    padding: 16,
    borderRadius: 20,
    backgroundColor: "rgba(14, 165, 233, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.28)",
  },
  impactTitle: {
    color: "#e0f2fe",
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 8,
  },
  impactText: {
    color: "#bae6fd",
    fontSize: 14,
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.68)",
    alignItems: "center",
    justifyContent: "center",
    padding: 22,
  },
  modalCard: {
    backgroundColor: "#0f1f35",
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(147, 197, 253, 0.25)",
    width: "100%",
  },
  modalTitle: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 16,
  },
  modalHeading: {
    color: "#dbeafe",
    fontSize: 16,
    fontWeight: "800",
    marginTop: 12,
  },
  modalText: {
    color: "#94a3b8",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  modalButton: {
    backgroundColor: "#2563eb",
    paddingVertical: 13,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 22,
  },
  modalButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "800",
  },
});