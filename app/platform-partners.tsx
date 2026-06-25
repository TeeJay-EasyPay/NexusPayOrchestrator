import React, { useEffect, useState } from "react";
import { View } from "react-native";

import { DataProvenanceBadge } from "../src/components/operations-v2/DataProvenanceBadge";
import { PlatformCard, PlatformShell } from "../src/components/platform/PlatformShell";
import { AppText } from "../src/components/ui/AppText";
import {
  loadPlatformAdministrationSnapshot,
  type PartnerProviderRecord,
  type PlatformAdministrationSnapshot,
} from "../src/services/platformAdministrationService";
import { colors } from "../src/theme";

export default function PlatformPartnersScreen() {
  const [snapshot, setSnapshot] = useState<PlatformAdministrationSnapshot | null>(null);

  useEffect(() => {
    void loadPlatformAdministrationSnapshot().then(setSnapshot);
  }, []);

  const corridorsByProvider = new Map<string, string[]>();
  for (const corridor of snapshot?.supportedCorridors ?? []) {
    corridorsByProvider.set(corridor.providerId, [...(corridorsByProvider.get(corridor.providerId) ?? []), corridor.corridorCode]);
  }

  const liveProviderIds = new Set((snapshot?.connectionTests ?? []).filter((item) => item.status === "SUCCESS").map((item) => item.providerId));

  return (
    <PlatformShell routeKey="partners" title="Partner Ecosystem" subtitle="External providers separated into live-tested partners and candidate partners.">
      <PlatformCard>
        <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
          <AppText variant="subheading" color={colors.textDarkPrimary} style={{ fontWeight: "900" }}>Partner Connectivity Truth</AppText>
          <DataProvenanceBadge classification={liveProviderIds.size > 0 ? "LIVE" : "NO_DATA"} />
        </View>
        <AppText color={colors.textDarkSecondary}>
          Partner cards only show LIVE when a connection test has succeeded. Candidate partners remain NO DATA until a test adapter exists and passes.
        </AppText>
      </PlatformCard>

      {(snapshot?.providers ?? []).sort(sortConnectableFirst).map((provider) => {
        const live = liveProviderIds.has(provider.id);
        const connectable = provider.id === "yapily" || provider.id === "ripple";
        return (
          <PlatformCard key={provider.id}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
              <View style={{ flex: 1 }}>
                <AppText variant="subheading" color={colors.textDarkPrimary} style={{ fontWeight: "900" }}>{provider.providerName}</AppText>
                <AppText variant="caption" color={colors.textDarkSecondary}>
                  {provider.providerCategory} - {formatPartnerType(provider.partnerType)}
                </AppText>
              </View>
              <Status label={live ? "LIVE" : connectable ? "TESTABLE" : "NO DATA"} live={live} connectable={connectable} />
            </View>
            <Row label="Connectivity" value={live ? "Successful live test recorded" : connectable ? "Test available in Provider Connectivity" : "No live connection adapter"} />
            <Row label="Credential State" value={connectable && provider.apiConfigured ? "Secure backend reference configured" : "No live credential configured"} />
            <Row label="Production" value={provider.productionEnabled ? "Live production enabled" : "Not enabled"} />
            <Row label="Countries" value={provider.supportedCountries.length ? provider.supportedCountries.join(", ") : "Not recorded"} />
            <Row label="Last Successful Test" value={provider.lastSuccessfulTestAt ? new Date(provider.lastSuccessfulTestAt).toLocaleString() : "No successful test recorded"} />
            <Row label="Last Updated" value={new Date(provider.updatedAt).toLocaleString()} />
            <AppText variant="caption" color={colors.textDarkSecondary}>{provider.notes ?? "No notes recorded."}</AppText>
            <AppText variant="caption" color={colors.textDarkPrimary} style={{ fontWeight: "800" }}>
              Corridors: {(corridorsByProvider.get(provider.id) ?? ["None recorded"]).join(", ")}
            </AppText>
          </PlatformCard>
        );
      })}
    </PlatformShell>
  );
}

function sortConnectableFirst(a: PartnerProviderRecord, b: PartnerProviderRecord) {
  const aRank = a.id === "yapily" || a.id === "ripple" ? 0 : 1;
  const bRank = b.id === "yapily" || b.id === "ripple" ? 0 : 1;
  return aRank - bRank || a.providerName.localeCompare(b.providerName);
}

function formatPartnerType(value?: string | null) {
  if (value === "first_leg") return "First-leg";
  if (value === "last_leg") return "Last-leg";
  if (value === "settlement") return "Settlement";
  return "Infrastructure";
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
      <AppText variant="caption" color={colors.textDarkMuted}>{label}</AppText>
      <AppText variant="caption" color={colors.textDarkPrimary} style={{ fontWeight: "800", flexShrink: 1 }}>{value}</AppText>
    </View>
  );
}

function Status({ label, live, connectable }: { label: string; live: boolean; connectable: boolean }) {
  const color = live ? "#0F8A5F" : connectable ? "#087C89" : "#64748B";
  return (
    <View style={{ borderRadius: 999, backgroundColor: `${color}14`, borderColor: `${color}30`, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6, alignSelf: "flex-start" }}>
      <AppText variant="caption" color={color} style={{ fontWeight: "900" }}>{label}</AppText>
    </View>
  );
}
