import { Feather } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";

import { DataProvenanceBadge } from "../src/components/operations-v2/DataProvenanceBadge";
import { PlatformCard, PlatformShell } from "../src/components/platform/PlatformShell";
import { AppText } from "../src/components/ui/AppText";
import {
  loadPlatformAdministrationSnapshot,
  runAirwallexPayoutCertification,
  runPartnerConnectionTest,
  type PartnerConnectionTestRecord,
  type PartnerProviderRecord,
  type PlatformAdministrationSnapshot,
} from "../src/services/platformAdministrationService";
import { colors } from "../src/theme";

export default function PlatformProvidersScreen() {
  const [snapshot, setSnapshot] = useState<PlatformAdministrationSnapshot | null>(null);
  const [testingProvider, setTestingProvider] = useState<string | null>(null);
  const [certifyingAirwallex, setCertifyingAirwallex] = useState(false);
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

  async function handleAirwallexCertification() {
    setCertifyingAirwallex(true);
    setTestMessage(null);
    try {
      const result = await runAirwallexPayoutCertification();
      setTestMessage(`${result.status}: ${result.providerMessage}${result.evidenceSummary ? ` ${result.evidenceSummary}` : ""}`);
      await refresh();
    } catch (error) {
      setTestMessage(error instanceof Error ? error.message : "Airwallex sandbox payout certification failed.");
    } finally {
      setCertifyingAirwallex(false);
    }
  }

  return (
    <PlatformShell routeKey="providers" title="Provider Connectivity" subtitle="Live partner connectivity tests and credential metadata without storing secrets in database fields.">
      <PlatformCard>
        <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
          <AppText variant="subheading" color={colors.textDarkPrimary} style={{ fontWeight: "900" }}>Live Connectivity Proof</AppText>
          <DataProvenanceBadge classification="LIVE" />
        </View>
        <AppText color={colors.textDarkSecondary}>
          Use these tests to prove partner reachability. Candidate partners remain marked as NO DATA until a live adapter or endpoint test exists.
        </AppText>
        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
          <QuickTestButton
            label="Test Airwallex"
            icon="credit-card"
            loading={testingProvider === "airwallex"}
            disabled={testingProvider !== null || certifyingAirwallex}
            onPress={() => handleTestConnection("airwallex")}
          />
          <QuickTestButton
            label="Test Nium"
            icon="globe"
            loading={testingProvider === "nium"}
            disabled={testingProvider !== null || certifyingAirwallex}
            onPress={() => handleTestConnection("nium")}
          />
          <QuickTestButton
            label="Test Yapily"
            icon="shield"
            loading={testingProvider === "yapily"}
            disabled={testingProvider !== null || certifyingAirwallex}
            onPress={() => handleTestConnection("yapily")}
          />
          <QuickTestButton
            label="Test Ripple/XRPL"
            icon="zap"
            loading={testingProvider === "ripple"}
            disabled={testingProvider !== null || certifyingAirwallex}
            onPress={() => handleTestConnection("ripple")}
          />
        </View>
        <Pressable
          onPress={handleAirwallexCertification}
          disabled={testingProvider !== null || certifyingAirwallex}
          style={{
            minHeight: 44,
            borderRadius: 10,
            backgroundColor: "#E5B64D",
            paddingHorizontal: 12,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            opacity: testingProvider !== null ? 0.55 : 1,
          }}
        >
          {certifyingAirwallex ? <ActivityIndicator size="small" color="#06111F" /> : <Feather name="send" size={16} color="#06111F" />}
          <AppText color="#06111F" style={{ fontWeight: "900" }}>Run Airwallex Sandbox Payout Certification</AppText>
        </Pressable>
        {testMessage ? (
          <AppText variant="caption" color={colors.textDarkSecondary}>{testMessage}</AppText>
        ) : null}
      </PlatformCard>

      {(snapshot?.providers ?? []).sort(sortConnectableFirst).map((provider) => {
        const credentials = (snapshot?.credentials ?? []).filter((item) => item.providerId === provider.id);
        const connections = (snapshot?.connections ?? []).filter((item) => item.providerId === provider.id);
        const capabilities = (snapshot?.capabilities ?? []).filter((item) => item.providerId === provider.id);
        const latestTest = (snapshot?.connectionTests ?? []).find((item) => item.providerId === provider.id);
        const connectable = isConnectableProvider(provider.id);
        const liveVerified = latestTest?.status === "SUCCESS";
        const verifiedClassification = provider.id === "ripple" ? "TESTNET" : "SANDBOX";

        return (
          <PlatformCard key={provider.id}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
              <View style={{ flex: 1 }}>
                <AppText variant="subheading" color={colors.textDarkPrimary} style={{ fontWeight: "900" }}>{provider.providerName}</AppText>
                <AppText variant="caption" color={colors.textDarkSecondary}>{provider.providerCategory} - {formatPartnerType(provider.partnerType)}</AppText>
              </View>
              <ConnectivityBadge liveVerified={liveVerified} connectable={connectable} />
            </View>

            <Row label="Connectivity" value={liveVerified ? `${verifiedClassification} test passed` : connectable ? "Test available" : "No live connection"} />
            <Row label="Credential Status" value={connectable && provider.apiConfigured ? "Secure backend reference configured" : "No live credential configured"} />
            <Row label="Production" value={provider.productionEnabled ? "Live production enabled" : "Not enabled"} />
            <Row label="Endpoint" value={provider.sandboxUrl ?? (provider.id === "ripple" ? "XRPL public testnet JSON-RPC" : "Not recorded")} />
            <Row label="Supported Countries" value={provider.supportedCountries.length ? provider.supportedCountries.join(", ") : "Not recorded"} />

            {credentials.map((credential) => (
              <View key={credential.id} style={{ borderTopWidth: 1, borderTopColor: "#E2E8F0", paddingTop: 8, gap: 4 }}>
                <Row label={`${credential.environment} credential`} value={connectable && credential.configured ? "Secure reference configured" : "No live credential"} />
                <Row label="Reference" value={credential.credentialReference ?? "No reference recorded"} />
              </View>
            ))}

            {capabilities.length > 0 ? (
              <View style={{ borderTopWidth: 1, borderTopColor: "#E2E8F0", paddingTop: 8, gap: 8 }}>
                <AppText variant="caption" color={colors.textDarkPrimary} style={{ fontWeight: "900" }}>Capabilities</AppText>
                {capabilities.map((capability) => (
                  <View key={capability.id} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <AppText variant="caption" color={colors.textDarkPrimary} style={{ flex: 1, fontWeight: "800" }}>{capability.capabilityName}</AppText>
                    <DataProvenanceBadge classification={liveVerified && connectable ? verifiedClassification : "NO_DATA"} />
                    <AppText variant="caption" color={liveVerified ? "#0F8A5F" : colors.textDarkMuted} style={{ fontWeight: "900" }}>
                      {liveVerified && connectable ? "Verified" : capability.readinessStatus}
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
              disabled={testingProvider !== null || !connectable}
              style={{
                minHeight: 42,
                borderRadius: 10,
                backgroundColor: connectable ? "#087C89" : "#F8FAFC",
                borderWidth: 1,
                borderColor: connectable ? "#087C89" : "#DDE6EE",
                paddingHorizontal: 12,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                opacity: !connectable || (testingProvider !== null && testingProvider !== provider.id) ? 0.55 : 1,
              }}
            >
              {testingProvider === provider.id ? (
                <ActivityIndicator size="small" color={connectable ? "#FFFFFF" : "#087C89"} />
              ) : (
                <Feather name={connectable ? "activity" : "lock"} size={16} color={connectable ? "#FFFFFF" : colors.textDarkMuted} />
              )}
              <AppText color={connectable ? "#FFFFFF" : colors.textDarkMuted} style={{ fontWeight: "900" }}>
                {connectable ? "Test Connection" : "No Live Test Adapter"}
              </AppText>
            </Pressable>
          </PlatformCard>
        );
      })}
    </PlatformShell>
  );
}

function isConnectableProvider(providerId: string) {
  return providerId === "airwallex" || providerId === "nium" || providerId === "yapily" || providerId === "ripple";
}

function sortConnectableFirst(a: PartnerProviderRecord, b: PartnerProviderRecord) {
  const aRank = isConnectableProvider(a.id) ? 0 : 1;
  const bRank = isConnectableProvider(b.id) ? 0 : 1;
  return aRank - bRank || a.providerName.localeCompare(b.providerName);
}

function formatPartnerType(value?: string | null) {
  if (value === "first_leg") return "First-leg partner";
  if (value === "last_leg") return "Last-leg partner";
  if (value === "settlement") return "Settlement partner";
  return "Infrastructure partner";
}

function ConnectivityBadge({ liveVerified, connectable }: { liveVerified: boolean; connectable: boolean }) {
  const color = liveVerified ? "#0F8A5F" : connectable ? "#087C89" : "#64748B";
  const label = liveVerified ? "VERIFIED" : connectable ? "TESTABLE" : "NO DATA";
  return (
    <View style={{ borderRadius: 999, backgroundColor: `${color}14`, borderColor: `${color}30`, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6 }}>
      <AppText variant="caption" color={color} style={{ fontWeight: "900" }}>{label}</AppText>
    </View>
  );
}

function QuickTestButton({
  label,
  icon,
  loading,
  disabled,
  onPress,
}: {
  label: string;
  icon: keyof typeof Feather.glyphMap;
  loading: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={{
        minHeight: 42,
        borderRadius: 10,
        backgroundColor: "#087C89",
        paddingHorizontal: 12,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        opacity: disabled && !loading ? 0.55 : 1,
        flexGrow: 1,
      }}
    >
      {loading ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Feather name={icon} size={16} color="#FFFFFF" />}
      <AppText color="#FFFFFF" style={{ fontWeight: "900" }}>{label}</AppText>
    </Pressable>
  );
}

function ConnectionTestSummary({ test }: { test: PartnerConnectionTestRecord }) {
  const statusColor = test.status === "SUCCESS" ? "#0F8A5F" : "#DC2626";
  return (
    <View style={{ borderTopWidth: 1, borderTopColor: "#E2E8F0", paddingTop: 8, gap: 4 }}>
      <Row label="Last Test" value={`${test.status} - ${new Date(test.testedAt).toLocaleString()}`} />
      <Row label="Response Time" value={test.responseTimeMs == null ? "Not recorded" : `${test.responseTimeMs}ms`} />
      <Row label="HTTP Status" value={test.httpStatus == null ? "Not recorded" : String(test.httpStatus)} />
      <Row label="Institutions" value={test.institutionCount == null ? "Not applicable" : String(test.institutionCount)} />
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
