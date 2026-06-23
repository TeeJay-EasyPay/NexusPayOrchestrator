import React, { useEffect, useState } from "react";
import { View } from "react-native";

import { DataProvenanceBadge } from "../src/components/operations-v2/DataProvenanceBadge";
import { PlatformCard, PlatformShell } from "../src/components/platform/PlatformShell";
import { AppText } from "../src/components/ui/AppText";
import { loadPlatformAdministrationSnapshot, type PlatformAdministrationSnapshot } from "../src/services/platformAdministrationService";
import { colors } from "../src/theme";

export default function PlatformCorridorsScreen() {
  const [snapshot, setSnapshot] = useState<PlatformAdministrationSnapshot | null>(null);

  useEffect(() => {
    void loadPlatformAdministrationSnapshot().then(setSnapshot);
  }, []);

  const providersById = new Map((snapshot?.providers ?? []).map((provider) => [provider.id, provider.providerName]));

  return (
    <PlatformShell routeKey="corridors" title="Corridor Management" subtitle="Provider corridor coverage and sandbox/production readiness.">
      <PlatformCard>
        <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
          <AppText variant="subheading" color={colors.textDarkPrimary} style={{ fontWeight: "900" }}>Supported Corridors</AppText>
          <DataProvenanceBadge classification="DERIVED" />
        </View>
        <AppText color={colors.textDarkSecondary}>Corridor readiness is derived from Platform Administration provider records.</AppText>
      </PlatformCard>

      {(snapshot?.corridors ?? []).map((corridor) => (
        <PlatformCard key={corridor.id}>
          <AppText variant="subheading" color={colors.textDarkPrimary} style={{ fontWeight: "900" }}>{corridor.corridorName}</AppText>
          <Row label="Provider" value={providersById.get(corridor.providerId) ?? corridor.providerId} />
          <Row label="Currency Route" value={`${corridor.sourceCurrency} -> ${corridor.destinationCurrency}`} />
          <Row label="Status" value={corridor.status} />
          <Row label="Sandbox Readiness" value={corridor.sandboxReadiness} />
          <Row label="Production Readiness" value={corridor.productionReadiness} />
          <AppText variant="caption" color={colors.textDarkSecondary}>{corridor.notes ?? "No notes recorded."}</AppText>
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
