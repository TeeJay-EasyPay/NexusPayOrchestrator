import { Feather } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";

import { DataProvenanceBadge } from "../src/components/operations-v2/DataProvenanceBadge";
import { PlatformCard, PlatformShell } from "../src/components/platform/PlatformShell";
import { AppText } from "../src/components/ui/AppText";
import { loadPlatformHealthSnapshot, type PlatformHealthSnapshot } from "../src/services/platformHealthService";
import { loadPlatformAdministrationSnapshot, type PlatformAdministrationSnapshot } from "../src/services/platformAdministrationService";
import { colors } from "../src/theme";

export default function PlatformAdminScreen() {
  const router = useRouter();
  const [snapshot, setSnapshot] = useState<PlatformAdministrationSnapshot | null>(null);
  const [health, setHealth] = useState<PlatformHealthSnapshot | null>(null);

  useEffect(() => {
    void loadPlatformAdministrationSnapshot().then(setSnapshot);
    void loadPlatformHealthSnapshot({ aiEnabled: false, realtimeStatus: "Diagnostic Mode" }).then(setHealth);
  }, []);

  const summary = useMemo(() => {
    const providers = snapshot?.providers ?? [];
    const corridors = snapshot?.corridors ?? [];
    return {
      providers: providers.length,
      sandbox: providers.filter((item) => item.sandboxEnabled).length,
      production: providers.filter((item) => item.productionEnabled).length,
      corridors: corridors.length,
      configured: providers.filter((item) => item.apiConfigured).length,
    };
  }, [snapshot]);

  return (
    <PlatformShell
      routeKey="home"
      title="Platform Administration"
      subtitle="Operational management layer for NexusPay infrastructure, partners, corridors and readiness."
    >
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        <Metric label="Partners" value={String(summary.providers)} icon="share-2" />
        <Metric label="Corridors" value={String(summary.corridors)} icon="map" />
        <Metric label="Sandbox Ready" value={String(summary.sandbox)} icon="server" />
        <Metric label="API Configured" value={String(summary.configured)} icon="key" />
      </View>

      <PlatformCard>
        <Header title="Partner Ecosystem" badge="DERIVED" />
        <AppText color={colors.textDarkSecondary}>
          {summary.providers} external provider records are tracked across payment networks, open banking, settlement rails and local payout partners.
        </AppText>
        <Action label="Open Partner Ecosystem" icon="arrow-right" onPress={() => router.push("/platform-partners" as never)} />
      </PlatformCard>

      <PlatformCard>
        <Header title="Corridor Coverage" badge="DERIVED" />
        <AppText color={colors.textDarkSecondary}>
          {summary.corridors} provider corridors are recorded with sandbox and production readiness status.
        </AppText>
        <Action label="Open Corridor Management" icon="arrow-right" onPress={() => router.push("/platform-corridors" as never)} />
      </PlatformCard>

      <PlatformCard>
        <Header title="Provider Connectivity" badge="DERIVED" />
        <AppText color={colors.textDarkSecondary}>
          {summary.sandbox} sandbox connection(s), {summary.production} production connection(s), and {summary.configured} API metadata configuration(s) are visible.
        </AppText>
      </PlatformCard>

      <PlatformCard>
        <Header title="Platform Health" badge="DERIVED" />
        {health ? (
          <View style={{ gap: 8 }}>
            {Object.values(health.domains).slice(0, 4).map((item) => (
              <View key={item.domain} style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
                <AppText color={colors.textDarkPrimary} style={{ fontWeight: "800", flex: 1 }}>{item.label}</AppText>
                <AppText color={item.status === "HEALTHY" ? "#0F8A5F" : item.status === "NO_DATA" ? "#64748B" : "#8C5D06"} style={{ fontWeight: "900" }}>
                  {item.status}
                </AppText>
              </View>
            ))}
          </View>
        ) : (
          <AppText color={colors.textDarkSecondary}>Loading health model...</AppText>
        )}
      </PlatformCard>

      <PlatformCard>
        <Header title="Environment Status" badge="SIMULATED" />
        <AppText color={colors.textDarkSecondary}>
          Development and sandbox are visible; pilot and production are readiness placeholders until release pipelines are connected.
        </AppText>
      </PlatformCard>

      <PlatformCard>
        <Header title="Recent Platform Activity" badge="DERIVED" />
        <AppText color={colors.textDarkSecondary}>
          Partner metadata migration deployed and Platform Administration workspace enabled.
        </AppText>
      </PlatformCard>
    </PlatformShell>
  );
}

function Header({ title, badge }: { title: string; badge: "LIVE" | "DERIVED" | "SIMULATED" | "MOCK" | "FALLBACK" }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
      <AppText variant="subheading" color={colors.textDarkPrimary} style={{ fontWeight: "900", flex: 1 }}>{title}</AppText>
      <DataProvenanceBadge classification={badge} />
    </View>
  );
}

function Metric({ label, value, icon }: { label: string; value: string; icon: keyof typeof Feather.glyphMap }) {
  return (
    <View style={{ flexGrow: 1, flexBasis: "47%", minWidth: 145 }}>
      <PlatformCard>
        <Feather name={icon} size={18} color="#087C89" />
        <AppText variant="caption" color={colors.textDarkMuted}>{label}</AppText>
        <AppText variant="subheading" color={colors.textDarkPrimary} style={{ fontWeight: "900" }}>{value}</AppText>
      </PlatformCard>
    </View>
  );
}

function Action({ label, icon, onPress }: { label: string; icon: keyof typeof Feather.glyphMap; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ minHeight: 42, borderRadius: 10, borderWidth: 1, borderColor: "#DDE6EE", backgroundColor: "#F8FAFC", paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 8 }}>
      <Feather name={icon} size={16} color="#0B3F4A" />
      <AppText color={colors.textDarkPrimary} style={{ fontWeight: "900", flexShrink: 1 }}>{label}</AppText>
    </Pressable>
  );
}
