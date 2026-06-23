import React, { useEffect, useState } from "react";
import { View } from "react-native";

import { DataProvenanceBadge } from "../src/components/operations-v2/DataProvenanceBadge";
import { PlatformCard, PlatformShell } from "../src/components/platform/PlatformShell";
import { AppText } from "../src/components/ui/AppText";
import { loadPlatformHealthSnapshot, type PlatformHealthSnapshot } from "../src/services/platformHealthService";
import { colors } from "../src/theme";

export default function PlatformHealthAdminScreen() {
  const [snapshot, setSnapshot] = useState<PlatformHealthSnapshot | null>(null);

  useEffect(() => {
    void loadPlatformHealthSnapshot({ aiEnabled: false, realtimeStatus: "Diagnostic Mode" }).then(setSnapshot);
  }, []);

  return (
    <PlatformShell routeKey="health" title="Platform Health" subtitle="Platform administration view of Supabase, OpenAI, XRPL, partner APIs, webhooks and environment status.">
      {(snapshot ? Object.values(snapshot.domains) : []).map((item) => (
        <PlatformCard key={item.domain}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
            <View style={{ flex: 1 }}>
              <AppText variant="subheading" color={colors.textDarkPrimary} style={{ fontWeight: "900" }}>{item.label}</AppText>
              <AppText variant="caption" color={colors.textDarkSecondary}>{item.source}</AppText>
            </View>
            <DataProvenanceBadge classification={item.provenance} />
          </View>
          <Row label="Status" value={item.status} />
          <Row label="Confidence" value={item.confidence} />
          <Row label="Last Updated" value={new Date(item.lastUpdated).toLocaleString()} />
          <AppText color={colors.textDarkSecondary}>{item.reason}</AppText>
        </PlatformCard>
      ))}

      <PlatformCard>
        <AppText variant="subheading" color={colors.textDarkPrimary} style={{ fontWeight: "900" }}>Platform Components</AppText>
        <Row label="Supabase" value="Configured" />
        <Row label="OpenAI" value="Configured by environment metadata" />
        <Row label="XRPL" value="Configured by environment metadata" />
        <Row label="Partner APIs" value="Tracked in Provider Configuration" />
        <Row label="Webhooks" value="No live webhook telemetry connected" />
      </PlatformCard>
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
