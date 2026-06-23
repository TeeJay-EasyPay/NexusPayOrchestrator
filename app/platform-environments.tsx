import React from "react";
import { View } from "react-native";

import { DataProvenanceBadge } from "../src/components/operations-v2/DataProvenanceBadge";
import { PlatformCard, PlatformShell } from "../src/components/platform/PlatformShell";
import { AppText } from "../src/components/ui/AppText";
import { colors } from "../src/theme";

const environments = [
  { name: "Development", status: "Active", deployment: "Local / preview workflow", ota: "Preview branch", build: "Developer build" },
  { name: "Sandbox", status: "Active", deployment: "EAS preview OTA", ota: "Preview branch", build: "Runtime 1.0.0" },
  { name: "Pilot", status: "Planned", deployment: "Not connected", ota: "Not published", build: "Not built" },
  { name: "Production", status: "Planned", deployment: "Not connected", ota: "Not published", build: "Not built" },
];

export default function PlatformEnvironmentsScreen() {
  return (
    <PlatformShell routeKey="environments" title="Environment Management" subtitle="Visibility into development, sandbox, pilot and production readiness.">
      <PlatformCard>
        <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
          <AppText variant="subheading" color={colors.textDarkPrimary} style={{ fontWeight: "900" }}>Environment Status</AppText>
          <DataProvenanceBadge classification="SIMULATED" />
        </View>
        <AppText color={colors.textDarkSecondary}>Deployment state is manually modelled until CI/CD telemetry is connected.</AppText>
      </PlatformCard>

      {environments.map((environment) => (
        <PlatformCard key={environment.name}>
          <AppText variant="subheading" color={colors.textDarkPrimary} style={{ fontWeight: "900" }}>{environment.name}</AppText>
          <Row label="Status" value={environment.status} />
          <Row label="Last Deployment" value={environment.deployment} />
          <Row label="OTA Status" value={environment.ota} />
          <Row label="Build Status" value={environment.build} />
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
