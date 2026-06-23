import React, { useEffect, useState } from "react";
import { View } from "react-native";

import { DataProvenanceBadge } from "../src/components/operations-v2/DataProvenanceBadge";
import { PlatformCard, PlatformShell } from "../src/components/platform/PlatformShell";
import { AppText } from "../src/components/ui/AppText";
import { loadAuditEvents } from "../src/services/corporateGovernanceService";
import { loadPlatformAdministrationSnapshot, type PlatformAdministrationSnapshot } from "../src/services/platformAdministrationService";
import { AuditEventRecord } from "../src/types/multiEntity";
import { colors } from "../src/theme";

export default function PlatformAuditScreen() {
  const [events, setEvents] = useState<AuditEventRecord[]>([]);
  const [snapshot, setSnapshot] = useState<PlatformAdministrationSnapshot | null>(null);

  useEffect(() => {
    void loadAuditEvents(20).then(setEvents);
    void loadPlatformAdministrationSnapshot().then(setSnapshot);
  }, []);

  return (
    <PlatformShell routeKey="audit" title="System Audit" subtitle="Recent platform changes, deployments, migrations, configuration and partner updates.">
      <PlatformCard>
        <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
          <AppText variant="subheading" color={colors.textDarkPrimary} style={{ fontWeight: "900" }}>Platform Change Visibility</AppText>
          <DataProvenanceBadge classification="DERIVED" />
        </View>
        <Row label="Provider records" value={String(snapshot?.providers.length ?? 0)} />
        <Row label="Corridor records" value={String(snapshot?.corridors.length ?? 0)} />
        <Row label="Credential metadata records" value={String(snapshot?.credentials.length ?? 0)} />
      </PlatformCard>

      <PlatformCard>
        <AppText variant="subheading" color={colors.textDarkPrimary} style={{ fontWeight: "900" }}>Recent Audit Events</AppText>
        {events.length === 0 ? <AppText color={colors.textDarkSecondary}>No audit events loaded.</AppText> : null}
        {events.map((event) => (
          <View key={event.id} style={{ borderTopWidth: 1, borderTopColor: "#E2E8F0", paddingTop: 9, gap: 3 }}>
            <AppText color={colors.textDarkPrimary} style={{ fontWeight: "800" }}>{event.eventType}</AppText>
            <AppText variant="caption" color={colors.textDarkSecondary}>{event.eventMessage}</AppText>
            <AppText variant="caption" color={colors.textDarkMuted}>{new Date(event.createdAt).toLocaleString()}</AppText>
          </View>
        ))}
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
