import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    useWindowDimensions,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppDropdownMenu } from "../src/components/navigation/AppDropdownMenu";
import { supabase } from "../src/lib/supabase";
import {
    getNexusAISettings,
    NexusAISensitivity,
    NexusAISettings,
    updateNexusAISettings,
} from "../src/services/nexusAISettingsService";

export default function NexusAIScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const compactLayout = width < 500;

  const [settings, setSettings] = useState<NexusAISettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [infoOpen, setInfoOpen] = useState(false);
  const [debugMessage, setDebugMessage] = useState("Starting...");

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      setDebugMessage("Getting authenticated user...");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setDebugMessage("No authenticated user found.");
        setLoading(false);
        return;
      }

      setDebugMessage("Loading Nexus AI settings from Supabase...");

      const result = await getNexusAISettings(user.id);

      setDebugMessage("Settings loaded successfully.");
      setSettings(result);
    } catch (error: any) {
      console.error("Failed to load Nexus AI settings", error);

      setDebugMessage(
        error?.message ||
          JSON.stringify(error) ||
          "Unknown error loading Nexus AI settings"
      );
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

  const activeScreenCount = useMemo(() => {
    if (!settings?.master_enabled) return 0;

    return [
      settings.home_enabled,
      settings.route_enabled,
      settings.corridor_enabled,
      settings.tracking_enabled,
    ].filter(Boolean).length;
  }, [settings]);

  const sensitivityLabel =
    settings?.sensitivity === "conservative"
      ? "Conservative"
      : settings?.sensitivity === "aggressive"
        ? "Aggressive"
        : "Balanced";

  const estimatedActivity =
    settings?.sensitivity === "conservative"
      ? "Low"
      : settings?.sensitivity === "aggressive"
        ? "High"
        : "Medium";

  if (loading || !settings) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingTitle}>Loading Nexus AI settings...</Text>
          <Text style={styles.loadingSubtitle}>{debugMessage}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <AppDropdownMenu />

        <Text style={styles.title}>Nexus AI</Text>
        <Text style={styles.subtitle}>
          Control AI intelligence across NexusPay
        </Text>

        <View style={styles.statusCard}>
          <Text style={styles.cardTitle}>Nexus AI Status</Text>

          <View style={[styles.statusGrid, compactLayout && styles.statusGridCompact]}>
            <StatusItem
              icon="▣"
              label="Active Screens"
              value={String(activeScreenCount)}
              subValue="of 4"
              compactLayout={compactLayout}
            />

            <View
              style={[styles.statusDivider, compactLayout && styles.statusDividerCompact]}
            />

            <StatusItem
              icon="⌁"
              label="Sensitivity"
              value={sensitivityLabel}
              compactLayout={compactLayout}
            />

            <View
              style={[styles.statusDivider, compactLayout && styles.statusDividerCompact]}
            />

            <StatusItem
              icon="◴"
              label="Estimated Activity"
              value={estimatedActivity}
              compactLayout={compactLayout}
            />
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.masterRow}>
            <View style={styles.iconBubble}>
              <Text style={styles.iconText}>🤖</Text>
            </View>

            <View style={styles.masterTextWrap}>
              <Text style={styles.rowTitle}>Master AI</Text>
              <Text style={styles.rowSubtitle}>
                Enable or disable all AI intelligence across NexusPay
              </Text>
            </View>

            <View style={styles.switchWrap}>
              <Switch
                value={settings.master_enabled}
                onValueChange={(value) =>
                  updateSetting({ master_enabled: value })
                }
              />
              <Text
                style={[
                  styles.enabledPill,
                  !settings.master_enabled && styles.disabledPill,
                ]}
              >
                {settings.master_enabled ? "Enabled" : "Disabled"}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.iconBubbleSmall}>
              <Text style={styles.iconTextSmall}>▣</Text>
            </View>

            <View>
              <Text style={styles.cardTitle}>AI Enabled Screens</Text>
              <Text style={styles.cardSubtitle}>
                Choose where AI intelligence is active
              </Text>
            </View>
          </View>

          <ToggleRow
            icon="⌂"
            title="Home Intelligence"
            subtitle="Corridor insights, telemetry, and summaries"
            value={settings.home_enabled && settings.master_enabled}
            disabled={disabled}
            onChange={(value) => updateSetting({ home_enabled: value })}
          />

          <ToggleRow
            icon="⤨"
            title="Route Intelligence"
            subtitle="AI route reasoning and recommendations"
            value={settings.route_enabled && settings.master_enabled}
            disabled={disabled}
            onChange={(value) => updateSetting({ route_enabled: value })}
          />

          <ToggleRow
            icon="⌁"
            title="Corridor Intelligence"
            subtitle="Market conditions and performance insights"
            value={settings.corridor_enabled && settings.master_enabled}
            disabled={disabled}
            onChange={(value) => updateSetting({ corridor_enabled: value })}
          />

          <ToggleRow
            icon="▱"
            title="Track Intelligence"
            subtitle="Shipment monitoring and exception insights"
            value={settings.tracking_enabled && settings.master_enabled}
            disabled={disabled}
            onChange={(value) => updateSetting({ tracking_enabled: value })}
            isLast
          />
        </View>

        <View style={styles.card}>
          <View style={styles.sensitivityHeader}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.iconBubbleSmall}>
                <Text style={styles.iconTextSmall}>🛡</Text>
              </View>

              <View>
                <Text style={styles.cardTitle}>AI Sensitivity</Text>
                <Text style={styles.cardSubtitle}>
                  Control how proactive and detailed AI insights are
                </Text>
              </View>
            </View>

            <Pressable
              onPress={() => setInfoOpen(true)}
              style={styles.infoButton}
            >
              <Text style={styles.infoText}>i</Text>
            </Pressable>
          </View>

          <View style={styles.sensitivityGrid}>
            <SensitivityOption
              label="Low"
              description="Minimal insights"
              selected={settings.sensitivity === "conservative"}
              onPress={() => selectSensitivity("conservative")}
            />

            <SensitivityOption
              label="Balanced"
              description="Recommended"
              selected={settings.sensitivity === "balanced"}
              onPress={() => selectSensitivity("balanced")}
            />

            <SensitivityOption
              label="High"
              description="Maximum insights"
              selected={settings.sensitivity === "aggressive"}
              onPress={() => selectSensitivity("aggressive")}
            />
          </View>
        </View>

        <View style={styles.impactCard}>
          <View style={styles.impactHeader}>
            <View style={styles.iconBubbleSmallWhite}>
              <Text style={styles.impactIcon}>💡</Text>
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Current Setting Impact</Text>
              <Text style={styles.impactDescription}>
                AI is active on {activeScreenCount} screens with{" "}
                {settings.sensitivity} sensitivity. You’ll receive relevant
                insights without information overload.
              </Text>
            </View>

            <View style={styles.impactPill}>
              <Text style={styles.impactPillText}>{sensitivityLabel} Impact</Text>
            </View>
          </View>

          <View style={styles.impactMetrics}>
            <ImpactMetric label="Insight Relevance" value="High" />
            <ImpactMetric label="Response Time" value="Optimized" />
            <ImpactMetric
              label="Data Consumption"
              value={settings.sensitivity === "aggressive" ? "High" : "Medium"}
              warning
            />
            <ImpactMetric label="Battery Impact" value="Low" />
          </View>
        </View>

        <Pressable style={styles.dashboardButton} onPress={() => router.push("/")}>
          <Text style={styles.dashboardIcon}>⌂</Text>
          <Text style={styles.dashboardButtonText}>Return to Dashboard</Text>
        </Pressable>

        <Modal transparent visible={infoOpen} animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>AI Sensitivity Explained</Text>

              <Text style={styles.modalHeading}>Conservative / Low</Text>
              <Text style={styles.modalText}>
                AI refreshes only when major changes occur, such as route ranking
                changes, market closures or substantial value impact.
              </Text>

              <Text style={styles.modalHeading}>Balanced</Text>
              <Text style={styles.modalText}>
                Recommended for most users. AI refreshes when meaningful transfer
                value or route quality changes are detected.
              </Text>

              <Text style={styles.modalHeading}>Aggressive / High</Text>
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
    </SafeAreaView>
  );
}

function StatusItem({
  icon,
  label,
  value,
  subValue,
  compactLayout,
}: {
  icon: string;
  label: string;
  value: string;
  subValue?: string;
  compactLayout?: boolean;
}) {
  return (
    <View style={[styles.statusItem, compactLayout && styles.statusItemCompact]}>
      <View style={styles.statusIconBubble}>
        <Text style={styles.statusIcon}>{icon}</Text>
      </View>

      <View style={styles.statusTextWrap}>
        <Text style={styles.statusLabel}>{label}</Text>
        <Text
          style={styles.statusValue}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.82}
        >
          {value}
        </Text>
        {subValue ? <Text style={styles.statusSubValue}>{subValue}</Text> : null}
      </View>
    </View>
  );
}

function ToggleRow({
  icon,
  title,
  subtitle,
  value,
  disabled,
  onChange,
  isLast,
}: {
  icon: string;
  title: string;
  subtitle: string;
  value: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
  isLast?: boolean;
}) {
  return (
    <View style={[styles.toggleRow, isLast && styles.noBorder]}>
      <View style={styles.toggleLeft}>
        <View style={[styles.toggleIcon, disabled && styles.toggleIconDisabled]}>
          <Text style={styles.toggleIconText}>{icon}</Text>
        </View>

        <View style={styles.toggleTextWrap}>
          <Text style={[styles.rowTitle, disabled && styles.disabledText]}>
            {title}
          </Text>
          <Text style={[styles.rowSubtitle, disabled && styles.disabledText]}>
            {subtitle}
          </Text>
        </View>
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
}: {
  label: string;
  description: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.sensitivityOption, selected && styles.sensitivitySelected]}
    >
      <View>
        <Text style={styles.sensitivityLabel}>{label}</Text>
        <Text style={styles.sensitivityDescription}>{description}</Text>
      </View>

      <View style={[styles.radioOuter, selected && styles.radioOuterSelected]}>
        {selected ? <View style={styles.radioInner} /> : null}
      </View>
    </Pressable>
  );
}

function ImpactMetric({
  label,
  value,
  warning,
}: {
  label: string;
  value: string;
  warning?: boolean;
}) {
  return (
    <View style={styles.impactMetric}>
      <Text style={styles.impactMetricLabel}>{label}</Text>
      <Text style={[styles.impactMetricValue, warning && styles.warningText]}>
        {value}
      </Text>
    </View>
  );
}

const NAVY = "#07111f";
const GOLD = "#F4B63F";
const TEAL = "#073F49";
const TEXT_DARK = "#0F172A";
const TEXT_MUTED = "#475569";
const BORDER = "#E2E8F0";

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: NAVY,
  },
  container: {
    flex: 1,
    backgroundColor: NAVY,
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: NAVY,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  loadingTitle: {
    color: "#E2E8F0",
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  loadingSubtitle: {
    color: "#94A3B8",
    marginTop: 16,
    textAlign: "center",
    lineHeight: 22,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 42,
    fontWeight: "900",
    marginTop: 28,
  },
  subtitle: {
    color: "#CBD5E1",
    fontSize: 17,
    marginTop: 6,
    marginBottom: 22,
    lineHeight: 24,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  statusCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  cardTitle: {
    color: TEXT_DARK,
    fontSize: 20,
    fontWeight: "900",
  },
  cardSubtitle: {
    color: TEXT_MUTED,
    fontSize: 14,
    marginTop: 3,
    lineHeight: 19,
  },
  statusGrid: {
    marginTop: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statusGridCompact: {
    flexDirection: "column",
    alignItems: "stretch",
  },
  statusItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  statusItemCompact: {
    width: "100%",
    flex: 0,
  },
  statusTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  statusIconBubble: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#E6F6F8",
    alignItems: "center",
    justifyContent: "center",
  },
  statusIcon: {
    color: TEAL,
    fontSize: 22,
    fontWeight: "900",
  },
  statusLabel: {
    color: TEXT_DARK,
    fontSize: 12,
    fontWeight: "700",
  },
  statusValue: {
    color: TEAL,
    fontSize: 20,
    fontWeight: "900",
    marginTop: 2,
    flexShrink: 1,
  },
  statusSubValue: {
    color: TEXT_MUTED,
    fontSize: 12,
    marginTop: -1,
  },
  statusDivider: {
    width: 1,
    height: 44,
    backgroundColor: BORDER,
    marginHorizontal: 8,
  },
  statusDividerCompact: {
    width: "100%",
    height: 1,
    marginHorizontal: 0,
    marginVertical: 10,
  },
  masterRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconBubble: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: "#E6F6F8",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  iconText: {
    fontSize: 28,
  },
  masterTextWrap: {
    flex: 1,
    paddingRight: 10,
  },
  switchWrap: {
    alignItems: "center",
    gap: 8,
  },
  enabledPill: {
    color: "#15803D",
    backgroundColor: "#DCFCE7",
    overflow: "hidden",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    fontSize: 12,
    fontWeight: "900",
  },
  disabledPill: {
    color: "#64748B",
    backgroundColor: "#E2E8F0",
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
  },
  iconBubbleSmall: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: "#E6F6F8",
    alignItems: "center",
    justifyContent: "center",
  },
  iconTextSmall: {
    color: TEAL,
    fontSize: 22,
    fontWeight: "900",
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  toggleLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    paddingRight: 14,
  },
  toggleIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: TEAL,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  toggleIconDisabled: {
    backgroundColor: "#CBD5E1",
  },
  toggleIconText: {
    color: "#FFFFFF",
    fontSize: 19,
    fontWeight: "900",
  },
  toggleTextWrap: {
    flex: 1,
  },
  rowTitle: {
    color: TEXT_DARK,
    fontSize: 16,
    fontWeight: "900",
  },
  rowSubtitle: {
    color: TEXT_MUTED,
    fontSize: 13,
    marginTop: 3,
    lineHeight: 18,
  },
  disabledText: {
    opacity: 0.45,
  },
  noBorder: {
    borderBottomWidth: 0,
  },
  sensitivityHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  infoButton: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: TEXT_DARK,
    marginTop: 2,
  },
  infoText: {
    color: TEXT_DARK,
    fontWeight: "900",
  },
  sensitivityGrid: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
  },
  sensitivityOption: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    paddingVertical: 13,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 78,
  },
  sensitivitySelected: {
    backgroundColor: "#ECFEFF",
    borderColor: "#67C7D4",
  },
  sensitivityLabel: {
    color: TEXT_DARK,
    fontSize: 14,
    fontWeight: "900",
    textAlign: "center",
  },
  sensitivityDescription: {
    color: TEXT_MUTED,
    fontSize: 11,
    marginTop: 3,
    textAlign: "center",
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  radioOuterSelected: {
    borderColor: TEAL,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: TEAL,
  },
  impactCard: {
    backgroundColor: "#F0FBFD",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#BFEAF1",
    marginBottom: 18,
  },
  impactHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  iconBubbleSmallWhite: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#BFEAF1",
    alignItems: "center",
    justifyContent: "center",
  },
  impactIcon: {
    fontSize: 23,
  },
  impactDescription: {
    color: TEXT_MUTED,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 5,
  },
  impactPill: {
    backgroundColor: "#CFF3F8",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  impactPillText: {
    color: TEAL,
    fontSize: 11,
    fontWeight: "900",
  },
  impactMetrics: {
    marginTop: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  impactMetric: {
    flex: 1,
    borderRightWidth: 1,
    borderRightColor: "#BFEAF1",
    paddingRight: 8,
  },
  impactMetricLabel: {
    color: TEXT_DARK,
    fontSize: 11,
    fontWeight: "700",
  },
  impactMetricValue: {
    color: "#16A34A",
    fontSize: 12,
    fontWeight: "900",
    marginTop: 4,
  },
  warningText: {
    color: "#F97316",
  },
  dashboardButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 12,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 18,
  },
  dashboardIcon: {
    color: TEXT_DARK,
    fontSize: 28,
    fontWeight: "900",
  },
  dashboardButtonText: {
    color: "#000000",
    fontSize: 20,
    fontWeight: "900",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.68)",
    alignItems: "center",
    justifyContent: "center",
    padding: 22,
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: BORDER,
    width: "100%",
  },
  modalTitle: {
    color: TEXT_DARK,
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 16,
  },
  modalHeading: {
    color: TEAL,
    fontSize: 16,
    fontWeight: "900",
    marginTop: 12,
  },
  modalText: {
    color: TEXT_MUTED,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  modalButton: {
    backgroundColor: TEAL,
    paddingVertical: 13,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 22,
  },
  modalButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
  },
});