import React, { useEffect, useState } from "react";
import { View } from "react-native";

import { DataProvenanceBadge } from "../src/components/operations-v2/DataProvenanceBadge";
import { PlatformCard, PlatformShell } from "../src/components/platform/PlatformShell";
import { AppText } from "../src/components/ui/AppText";
import { loadPlatformAdministrationSnapshot, type PlatformAdministrationSnapshot } from "../src/services/platformAdministrationService";
import { colors } from "../src/theme";

export default function PlatformProvidersScreen() {
  const [snapshot, setSnapshot] = useState<PlatformAdministrationSnapshot | null>(null);

  useEffect(() => {
    void loadPlatformAdministrationSnapshot().then(setSnapshot);
  }, []);

  return (
    <PlatformShell routeKey="providers" title="Provider Configuration" subtitle="Credential metadata and connection status without storing secrets in database fields.">
      <PlatformCard>
        <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
          <AppText variant="subheading" color={colors.textDarkPrimary} style={{ fontWeight: "900" }}>Credential Metadata</AppText>
          <DataProvenanceBadge classification="DERIVED" />
        </View>
        <AppText color={colors.textDarkSecondary}>
          Secrets remain in Supabase Secrets, environment variables or secure storage. Only configuration state is tracked here.
        </AppText>
      </PlatformCard>

      {(snapshot?.providers ?? []).map((provider) => {
        const credentials = (snapshot?.credentials ?? []).filter((item) => item.providerId === provider.id);
        const connections = (snapshot?.connections ?? []).filter((item) => item.providerId === provider.id);
        return (
          <PlatformCard key={provider.id}>
            <AppText variant="subheading" color={colors.textDarkPrimary} style={{ fontWeight: "900" }}>{provider.providerName}</AppText>
            <Row label="API Configured" value={provider.apiConfigured ? "Yes" : "No"} />
            <Row label="Sandbox" value={provider.sandboxEnabled ? "Enabled" : "Not enabled"} />
            <Row label="Production" value={provider.productionEnabled ? "Enabled" : "Not enabled"} />
            {credentials.map((credential) => (
              <View key={credential.id} style={{ borderTopWidth: 1, borderTopColor: "#E2E8F0", paddingTop: 8, gap: 4 }}>
                <Row label={`${credential.environment} credential`} value={credential.configured ? "Configured" : "Not configured"} />
                <Row label="Reference" value={credential.credentialReference ?? "No reference recorded"} />
              </View>
            ))}
            {connections.map((connection) => (
              <Row key={connection.id} label={`${connection.environment} connection`} value={`${connection.status} - ${connection.lastResult ?? "No result"}`} />
            ))}
          </PlatformCard>
        );
      })}
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
