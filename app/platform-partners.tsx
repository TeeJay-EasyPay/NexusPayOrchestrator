import React, { useEffect, useState } from "react";
import { View } from "react-native";

import { DataProvenanceBadge } from "../src/components/operations-v2/DataProvenanceBadge";
import { PlatformCard, PlatformShell } from "../src/components/platform/PlatformShell";
import { AppText } from "../src/components/ui/AppText";
import { loadPlatformAdministrationSnapshot, type PlatformAdministrationSnapshot } from "../src/services/platformAdministrationService";
import { colors } from "../src/theme";

export default function PlatformPartnersScreen() {
  const [snapshot, setSnapshot] = useState<PlatformAdministrationSnapshot | null>(null);

  useEffect(() => {
    void loadPlatformAdministrationSnapshot().then(setSnapshot);
  }, []);

  const corridorsByProvider = new Map<string, string[]>();
  for (const corridor of snapshot?.corridors ?? []) {
    corridorsByProvider.set(corridor.providerId, [...(corridorsByProvider.get(corridor.providerId) ?? []), corridor.corridorName]);
  }

  return (
    <PlatformShell routeKey="partners" title="Partner Ecosystem" subtitle="External provider readiness, integration metadata and supported corridor visibility.">
      <PlatformCard>
        <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
          <AppText variant="subheading" color={colors.textDarkPrimary} style={{ fontWeight: "900" }}>External Providers</AppText>
          <DataProvenanceBadge classification="DERIVED" />
        </View>
        <AppText color={colors.textDarkSecondary}>API secrets are not stored here. This screen tracks integration state and credential metadata only.</AppText>
      </PlatformCard>

      {(snapshot?.providers ?? []).map((provider) => (
        <PlatformCard key={provider.id}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <AppText variant="subheading" color={colors.textDarkPrimary} style={{ fontWeight: "900" }}>{provider.providerName}</AppText>
              <AppText variant="caption" color={colors.textDarkSecondary}>{provider.providerCategory}</AppText>
            </View>
            <Status label={provider.status} />
          </View>
          <Row label="Sandbox Connected" value={provider.sandboxEnabled ? "Yes" : "No"} />
          <Row label="Production Connected" value={provider.productionEnabled ? "Yes" : "No"} />
          <Row label="API Configured" value={provider.apiConfigured ? "Metadata configured" : "Not configured"} />
          <Row label="Last Updated" value={new Date(provider.updatedAt).toLocaleString()} />
          <AppText variant="caption" color={colors.textDarkSecondary}>{provider.notes ?? "No notes recorded."}</AppText>
          <AppText variant="caption" color={colors.textDarkPrimary} style={{ fontWeight: "800" }}>
            Corridors: {(corridorsByProvider.get(provider.id) ?? ["None recorded"]).join(", ")}
          </AppText>
        </PlatformCard>
      ))}
    </PlatformShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
      <AppText variant="caption" color={colors.textDarkMuted}>{label}</AppText>
      <AppText variant="caption" color={colors.textDarkPrimary} style={{ fontWeight: "800", flexShrink: 1 }}>{value}</AppText>
    </View>
  );
}

function Status({ label }: { label: string }) {
  return (
    <View style={{ borderRadius: 999, backgroundColor: "#DDF4F2", paddingHorizontal: 10, paddingVertical: 6, alignSelf: "flex-start" }}>
      <AppText variant="caption" color="#087C89" style={{ fontWeight: "900" }}>{label}</AppText>
    </View>
  );
}
