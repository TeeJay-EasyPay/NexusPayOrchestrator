import React from "react";
import { View } from "react-native";

import { DataProvenanceBadge } from "../src/components/operations-v2/DataProvenanceBadge";
import { PlatformCard, PlatformShell } from "../src/components/platform/PlatformShell";
import { AppText } from "../src/components/ui/AppText";
import { colors } from "../src/theme";

export default function PlatformSettingsScreen() {
  return (
    <PlatformShell routeKey="settings" title="Settings" subtitle="Platform administration configuration boundaries and secure operations posture.">
      <PlatformCard>
        <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
          <AppText variant="subheading" color={colors.textDarkPrimary} style={{ fontWeight: "900" }}>Credential Storage Policy</AppText>
          <DataProvenanceBadge classification="DERIVED" />
        </View>
        <AppText color={colors.textDarkSecondary}>
          API secrets must remain in Supabase Secrets, environment variables or secure storage. Platform Administration stores only metadata and readiness state.
        </AppText>
      </PlatformCard>

      <PlatformCard>
        <AppText variant="subheading" color={colors.textDarkPrimary} style={{ fontWeight: "900" }}>Workspace Isolation</AppText>
        <Row label="Corporate Governance" value="Separate workspace" />
        <Row label="Business Operations" value="Separate workspace" />
        <Row label="Private Users" value="Separate workspace" />
        <Row label="Platform Administration" value="NexusPay operational management layer" />
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
