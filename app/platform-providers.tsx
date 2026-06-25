import { Feather } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";

import { DataProvenanceBadge } from "../src/components/operations-v2/DataProvenanceBadge";
import { PlatformCard, PlatformShell } from "../src/components/platform/PlatformShell";
import { AppText } from "../src/components/ui/AppText";
import {
  loadPlatformAdministrationSnapshot,
  runPartnerConnectionTest,
  type PartnerConnectionTestRecord,
  type PlatformAdministrationSnapshot,
} from "../src/services/platformAdministrationService";
import { colors } from "../src/theme";
import type { DataProvenanceClassification } from "../src/utils/operationsCommandCentre";

export default function PlatformProvidersScreen() {
  const [snapshot, setSnapshot] = useState<PlatformAdministrationSnapshot | null>(null);
  const [testingProvider, setTestingProvider] = useState<string | null>(null);
  const [testMessage, setTestMessage] = useState<string | null>(null);

  useEffect(() => {
    void loadPlatformAdministrationSnapshot().then(setSnapshot);
  }, []);

  async function refresh() {
    const next = await loadPlatformAdministrationSnapshot();
    setSnapshot(next);
  }

  async function handleTestConnection(providerId: string) {
    setTestingProvider(providerId);
    setTestMessage(null);
    try {
      const result = await runPartnerConnectionTest(providerId, "sandbox");
      setTestMessage(result ? `${result.status}: ${result.responseSummary ?? result.readiness}` : "No test result returned.");
      await refresh();
    } catch (error) {
      setTestMessage(error instanceof Error ? error.message : "Connection test failed.");
    } finally {
      setTestingProvider(null);
    }
  }

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
        {testMessage ? (
          <AppText variant="caption" color={colors.textDarkSecondary}>{testMessage}</AppText>
        ) : null}
      </PlatformCard>

      {(snapshot?.providers ?? []).map((provider) => {
        const credentials = (snapshot?.credentials ?? []).filter((item) => item.providerId === provider.id);
        const connections = (snapshot?.connections ?? []).filter((item) => item.providerId === provider.id);
        const capabilities = (snapshot?.capabilities ?? []).filter((item) => item.providerId === provider.id);
        const latestTest = (snapshot?.connectionTests ?? []).find((item) => item.providerId === provider.id);
        return (
          <PlatformCard key={provider.id}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
              <View style={{ flex: 1 }}>
                <AppText variant="subheading" color={colors.textDarkPrimary} style={{ fontWeight: "900" }}>{provider.providerName}</AppText>
                <AppText variant="caption" color={colors.textDarkSecondary}>{provider.providerCategory} • {formatPartnerType(provider.partnerType)}</AppText>
              </View>
              <Readiness score={provider.readinessScore} />
            </View>
            <Row label="API Configured" value={provider.apiConfigured ? "Yes" : "No"} />
            <Row label="Sandbox" value={provider.sandboxEnabled ? "Enabled" : "Not enabled"} />
            <Row label="Production" value={provider.productionEnabled ? "Enabled" : "Not enabled"} />
            <Row label="Sandbox URL" value={provider.sandboxUrl ?? "Not recorded"} />
            <Row label="Supported Countries" value={provider.supportedCountries.length ? provider.supportedCountries.join(", ") : "Not recorded"} />
            {credentials.map((credential) => (
              <View key={credential.id} style={{ borderTopWidth: 1, borderTopColor: "#E2E8F0", paddingTop: 8, gap: 4 }}>
                <Row label={`${credential.environment} credential`} value={credential.configured ? "Configured" : "Not configured"} />
                <Row label="Reference" value={credential.credentialReference ?? "No reference recorded"} />
              </View>
            ))}
            {capabilities.length > 0 ? (
              <View style={{ borderTopWidth: 1, borderTopColor: "#E2E8F0", paddingTop: 8, gap: 8 }}>
                <AppText variant="caption" color={colors.textDarkPrimary} style={{ fontWeight: "900" }}>Capabilities</AppText>
                {capabilities.map((capability) => (
                  <View key={capability.id} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <AppText variant="caption" color={colors.textDarkPrimary} style={{ flex: 1, fontWeight: "800" }}>{capability.capabilityName}</AppText>
                    <DataProvenanceBadge classification={toProvenance(capability.provenance)} />
                    <AppText variant="caption" color={capability.enabled ? "#0F8A5F" : colors.textDarkMuted} style={{ fontWeight: "900" }}>
                      {capability.readinessStatus}
                    </AppText>
                  </View>
                ))}
              </View>
            ) : null}
            {connections.map((connection) => (
              <Row key={connection.id} label={`${connection.environment} connection`} value={`${connection.status} - ${connection.lastResult ?? "No result"}`} />
            ))}
            {latestTest ? <ConnectionTestSummary test={latestTest} /> : null}
            <Pressable
              onPress={() => handleTestConnection(provider.id)}
              disabled={testingProvider !== null}
              style={{
                minHeight: 42,
                borderRadius: 10,
                backgroundColor: provider.id === "yapily" ? "#087C89" : "#F8FAFC",
                borderWidth: 1,
                borderColor: provider.id === "yapily" ? "#087C89" : "#DDE6EE",
                paddingHorizontal: 12,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                opacity: testingProvider && testingProvider !== provider.id ? 0.55 : 1,
              }}
            >
              {testingProvider === provider.id ? (
                <ActivityIndicator size="small" color={provider.id === "yapily" ? "#FFFFFF" : "#087C89"} />
              ) : (
                <Feather name="activity" size={16} color={provider.id === "yapily" ? "#FFFFFF" : "#087C89"} />
              )}
              <AppText color={provider.id === "yapily" ? "#FFFFFF" : colors.textDarkPrimary} style={{ fontWeight: "900" }}>
                Test Connection
              </AppText>
            </Pressable>
          </PlatformCard>
        );
      })}
    </PlatformShell>
  );
}

function formatPartnerType(value?: string | null) {
  if (value === "first_leg") return "First-leg partner";
  if (value === "last_leg") return "Last-leg partner";
  if (value === "settlement") return "Settlement partner";
  return "Infrastructure partner";
}

function toProvenance(value: string): DataProvenanceClassification {
  const allowed: DataProvenanceClassification[] = ["LIVE", "DERIVED", "SIMULATED", "MOCK", "FALLBACK", "NO_DATA", "DIAGNOSTIC", "DISABLED"];
  return allowed.includes(value as DataProvenanceClassification) ? value as DataProvenanceClassification : "DERIVED";
}

function Readiness({ score }: { score: number }) {
  const color = score >= 75 ? "#0F8A5F" : score >= 45 ? "#D97706" : "#64748B";
  return (
    <View style={{ borderRadius: 999, backgroundColor: `${color}14`, borderColor: `${color}30`, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6 }}>
      <AppText variant="caption" color={color} style={{ fontWeight: "900" }}>{score}% Ready</AppText>
    </View>
  );
}

function ConnectionTestSummary({ test }: { test: PartnerConnectionTestRecord }) {
  const statusColor = test.status === "SUCCESS" ? "#0F8A5F" : "#DC2626";
  return (
    <View style={{ borderTopWidth: 1, borderTopColor: "#E2E8F0", paddingTop: 8, gap: 4 }}>
      <Row label="Last Test" value={`${test.status} • ${new Date(test.testedAt).toLocaleString()}`} />
      <Row label="Response Time" value={test.responseTimeMs == null ? "Not recorded" : `${test.responseTimeMs}ms`} />
      <Row label="Institutions" value={test.institutionCount == null ? "Not recorded" : String(test.institutionCount)} />
      <AppText variant="caption" color={statusColor} style={{ fontWeight: "800" }}>
        {test.responseSummary ?? test.errorMessage ?? test.readiness}
      </AppText>
    </View>
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
