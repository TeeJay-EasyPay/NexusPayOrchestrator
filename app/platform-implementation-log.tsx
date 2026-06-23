import React from "react";
import { View } from "react-native";

import { DataProvenanceBadge } from "../src/components/operations-v2/DataProvenanceBadge";
import { PlatformCard, PlatformShell } from "../src/components/platform/PlatformShell";
import { AppText } from "../src/components/ui/AppText";
import { colors } from "../src/theme";

const entries = [
  "Platform Administration Framework V1 created.",
  "Partner provider, corridor, credential metadata and connection status tables deployed.",
  "Platform Administrator persona and workspace card added.",
  "Platform Administration screens added for partners, corridors, providers, health, environments, audit and settings.",
];

export default function PlatformImplementationLogScreen() {
  return (
    <PlatformShell routeKey="implementation_log" title="Implementation Log" subtitle="Founder-visible implementation trace for Platform Administration work.">
      <PlatformCard>
        <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
          <AppText variant="subheading" color={colors.textDarkPrimary} style={{ fontWeight: "900" }}>Running Log Location</AppText>
          <DataProvenanceBadge classification="DERIVED" />
        </View>
        <AppText color={colors.textDarkSecondary}>
          Durable implementation history is maintained in governance/implementation-log/IMPLEMENTATION_LOG.md.
        </AppText>
      </PlatformCard>

      <PlatformCard>
        <AppText variant="subheading" color={colors.textDarkPrimary} style={{ fontWeight: "900" }}>Current Platform Administration Entries</AppText>
        {entries.map((entry) => (
          <View key={entry} style={{ borderTopWidth: 1, borderTopColor: "#E2E8F0", paddingTop: 9 }}>
            <AppText color={colors.textDarkPrimary} style={{ fontWeight: "800" }}>{entry}</AppText>
          </View>
        ))}
      </PlatformCard>
    </PlatformShell>
  );
}
