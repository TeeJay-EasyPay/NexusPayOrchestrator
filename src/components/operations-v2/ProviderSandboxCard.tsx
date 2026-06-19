/**
 * ProviderSandboxCard — Operations V2
 * External Rail Readiness Sprint — 2026-06-16
 *
 * Corporate-only card that triggers a mock end-to-end orchestration run
 * and displays the resulting provider event timeline.
 *
 * Clearly labelled [MOCK]. Consumer screens are not affected.
 * No real provider credentials are used.
 */

import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

import { listAllProviders } from "../../providers/registry";
import {
  OrchestrationInput,
  OrchestrationResult,
  runMockOrchestration,
} from "../../services/mockOrchestrationRunner";
import { colors, spacing } from "../../theme";
import { AppCard } from "../ui/AppCard";
import { AppText } from "../ui/AppText";
import { DataProvenanceBadge } from "./DataProvenanceBadge";

// ─── Corridors available for mock test runs ───────────────────────────────────

const CORRIDORS: { label: string; value: string; from: string; to: string }[] = [
  { label: "GBP → NGN", value: "GBP-NGN", from: "GBP", to: "NGN" },
  { label: "GBP → KES", value: "GBP-KES", from: "GBP", to: "KES" },
  { label: "GBP → GHS", value: "GBP-GHS", from: "GBP", to: "GHS" },
  { label: "USD → NGN", value: "USD-NGN", from: "USD", to: "NGN" },
  { label: "EUR → NGN", value: "EUR-NGN", from: "EUR", to: "NGN" },
];

// ─── Simple UUID for test transfer IDs ───────────────────────────────────────

function generateTestId(): string {
  return "test-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7);
}

// ─── Provider Registry Summary ────────────────────────────────────────────────

function RegistrySummary() {
  const providers = listAllProviders();
  const collection = providers.filter((p) => p.type === "collection");
  const payout = providers.filter((p) => p.type === "payout");

  if (providers.length === 0) {
    return (
      <View style={styles.registryRow}>
        <Feather name="alert-circle" size={13} color={colors.warning} style={{ marginRight: 6 }} />
        <AppText variant="caption" color={colors.warning}>
          No providers registered — call initMockProviders() at startup
        </AppText>
      </View>
    );
  }

  return (
    <View style={styles.registryBlock}>
      <View style={styles.registryRow}>
        <Feather name="check-circle" size={13} color={colors.success} style={{ marginRight: 6 }} />
        <AppText variant="caption" color={colors.textDarkPrimary}>
          <AppText variant="caption" style={{ fontWeight: "700" }}>{collection.length}</AppText>
          {" collection provider"}
          {collection.length !== 1 ? "s" : ""}
          {"  ·  "}
          <AppText variant="caption" style={{ fontWeight: "700" }}>{payout.length}</AppText>
          {" payout provider"}
          {payout.length !== 1 ? "s" : ""}
          {" registered"}
        </AppText>
      </View>
      <AppText variant="caption" color={colors.textDarkMuted} style={styles.providerNames}>
        {providers.map((p) => p.name).join("  ·  ")}
      </AppText>
    </View>
  );
}

// ─── Event Timeline Row ───────────────────────────────────────────────────────

function TimelineRow({
  label,
  timestamp,
  isError,
  isLast,
}: {
  label: string;
  timestamp: string;
  isError: boolean;
  isLast: boolean;
}) {
  const dotColor = isError ? colors.danger : colors.success;
  const time = new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <View style={styles.timelineRow}>
      <View style={styles.timelineLeft}>
        <View style={[styles.timelineDot, { backgroundColor: dotColor }]} />
        {!isLast && <View style={styles.timelineLine} />}
      </View>
      <View style={styles.timelineContent}>
        <AppText variant="caption" color={isError ? colors.danger : colors.textDarkPrimary} style={styles.timelineLabel}>
          {label}
        </AppText>
        <AppText variant="caption" color={colors.textDarkMuted} style={styles.timelineTime}>
          {time}
        </AppText>
      </View>
    </View>
  );
}

// ─── Result Summary ───────────────────────────────────────────────────────────

function ResultSummary({ result }: { result: OrchestrationResult }) {
  const isSuccess = result.finalState === "COMPLETED";
  const statusColor = isSuccess ? colors.success : colors.danger;
  const statusIcon: React.ComponentProps<typeof Feather>["name"] = isSuccess
    ? "check-circle"
    : "x-circle";

  return (
    <View style={styles.resultBlock}>
      <View style={[styles.resultHeader, { borderColor: `${statusColor}30` }]}>
        <Feather name={statusIcon} size={15} color={statusColor} style={{ marginRight: 6 }} />
        <AppText variant="caption" style={[styles.resultState, { color: statusColor }]}>
          {result.finalState}
        </AppText>
        <AppText variant="caption" color={colors.textDarkMuted} style={styles.resultMeta}>
          · {result.collectionProvider.replace("Mock", "").replace("Provider", "")} → {result.payoutProvider.replace("Mock", "").replace("Provider", "")}
        </AppText>
      </View>

      {result.error ? (
        <AppText variant="caption" color={colors.danger} style={styles.errorText}>
          {result.error}
        </AppText>
      ) : null}

      <View style={styles.refRow}>
        {result.collectionReference ? (
          <AppText variant="caption" color={colors.textDarkMuted}>
            Collection ref: {result.collectionReference}
          </AppText>
        ) : null}
        {result.payoutReference ? (
          <AppText variant="caption" color={colors.textDarkMuted}>
            Payout ref: {result.payoutReference}
          </AppText>
        ) : null}
      </View>

      {result.consumerTimeline.length > 0 ? (
        <View style={styles.timeline}>
          <AppText variant="caption" color={colors.textDarkMuted} style={styles.timelineHeading}>
            EVENT TIMELINE ({result.events.length} events)
          </AppText>
          {result.consumerTimeline.map((item, i) => (
            <TimelineRow
              key={i}
              label={item.label}
              timestamp={item.timestamp}
              isError={item.isError}
              isLast={i === result.consumerTimeline.length - 1}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

// ─── Main Card ────────────────────────────────────────────────────────────────

type Props = {
  showDataSources?: boolean;
};

export function ProviderSandboxCard({ showDataSources = true }: Props) {
  const [selectedCorridor, setSelectedCorridor] = useState(0);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<OrchestrationResult | null>(null);

  const corridor = CORRIDORS[selectedCorridor];

  const handleRun = async () => {
    if (running || !corridor) return;
    setRunning(true);
    setResult(null);

    const input: OrchestrationInput = {
      transferId: generateTestId(),
      userId: "mock-user-ops",
      accountId: "mock-account-corporate",
      corridor: corridor.value,
      sourceCurrency: corridor.from,
      destinationCurrency: corridor.to,
      sourceAmount: 500,
      destinationAmount: corridor.from === "GBP" ? 750000 : 475000,
      reference: "MOCK-TEST-" + Date.now().toString(36).toUpperCase(),
      requiresBankAuthorization: true,
      recipient: {
        id: "mock-recipient-001",
        name: "Test Recipient",
        accountNumber: "0123456789",
        bankCode: "MOCK001",
        country: corridor.to === "NGN" ? "NG" : corridor.to === "KES" ? "KE" : "GH",
        currency: corridor.to,
      },
      certificationRun: {
        collectionProvider: "MockOpenBankingCollectionProvider",
        payoutProvider: "MockNiumProvider",
      },
    };

    try {
      const output = await runMockOrchestration(input);
      setResult(output);
    } finally {
      setRunning(false);
    }
  };

  return (
    <AppCard style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <Feather name="zap" size={18} color={colors.gold} style={{ marginRight: 8 }} />
        <AppText variant="subheading" color={colors.textDarkPrimary} style={styles.title}>
          Provider Sandbox
        </AppText>
        {showDataSources && <DataProvenanceBadge classification="MOCK" />}
      </View>

      <AppText variant="caption" color={colors.textDarkMuted} style={styles.description}>
        Runs a full simulated transfer: bank collection → routing → payout → recipient credit.
        No real partner credentials required.
      </AppText>

      {/* Registry status */}
      <View style={styles.sectionGap} />
      <RegistrySummary />

      {/* Corridor selector */}
      <View style={styles.sectionGap} />
      <AppText variant="caption" color={colors.textDarkMuted} style={styles.sectionLabel}>
        SELECT CORRIDOR
      </AppText>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.corridorScroll}>
        {CORRIDORS.map((c, i) => (
          <Pressable
            key={c.value}
            onPress={() => {
              setSelectedCorridor(i);
              setResult(null);
            }}
            style={[
              styles.corridorChip,
              i === selectedCorridor && styles.corridorChipSelected,
            ]}
          >
            <AppText
              variant="caption"
              color={i === selectedCorridor ? colors.textDarkPrimary : colors.textDarkMuted}
              style={styles.corridorChipText}
            >
              {c.label}
            </AppText>
          </Pressable>
        ))}
      </ScrollView>

      {/* Run button */}
      <View style={styles.sectionGap} />
      <Pressable
        onPress={() => { void handleRun(); }}
        disabled={running}
        style={({ pressed }) => [
          styles.runButton,
          running && styles.runButtonDisabled,
          pressed && !running && styles.runButtonPressed,
        ]}
      >
        {running ? (
          <ActivityIndicator size="small" color={colors.textDarkPrimary} style={{ marginRight: 8 }} />
        ) : (
          <Feather name="play" size={14} color={colors.textDarkPrimary} style={{ marginRight: 8 }} />
        )}
        <AppText variant="caption" color={colors.textDarkPrimary} style={styles.runButtonText}>
          {running ? "Running orchestration…" : `Run mock end-to-end · ${corridor?.label ?? ""}`}
        </AppText>
      </Pressable>

      {/* Result */}
      {result !== null ? (
        <>
          <View style={styles.sectionGap} />
          <ResultSummary result={result} />
        </>
      ) : null}
    </AppCard>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  title: {
    fontWeight: "700",
    flex: 1,
  },
  description: {
    lineHeight: 18,
    marginBottom: 4,
  },
  sectionGap: {
    height: 12,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  registryBlock: {
    gap: 4,
  },
  registryRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  providerNames: {
    fontSize: 10,
    lineHeight: 16,
    paddingLeft: 19,
  },
  corridorScroll: {
    flexGrow: 0,
  },
  corridorChip: {
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    backgroundColor: colors.cardSoft,
  },
  corridorChipSelected: {
    borderColor: colors.gold,
    backgroundColor: "#FFF8E1",
  },
  corridorChipText: {
    fontWeight: "600",
    fontSize: 12,
  },
  runButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.gold,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  runButtonDisabled: {
    opacity: 0.6,
  },
  runButtonPressed: {
    opacity: 0.85,
  },
  runButtonText: {
    fontWeight: "700",
    fontSize: 13,
  },
  resultBlock: {
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    paddingTop: 12,
    gap: 8,
  },
  resultHeader: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: colors.cardSoft,
  },
  resultState: {
    fontWeight: "700",
    fontSize: 12,
  },
  resultMeta: {
    marginLeft: 6,
    flex: 1,
  },
  errorText: {
    fontSize: 11,
    lineHeight: 16,
  },
  refRow: {
    gap: 2,
  },
  timeline: {
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    paddingTop: 10,
    gap: 0,
  },
  timelineHeading: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  timelineRow: {
    flexDirection: "row",
    minHeight: 32,
  },
  timelineLeft: {
    width: 20,
    alignItems: "center",
  },
  timelineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 3,
  },
  timelineLine: {
    flex: 1,
    width: 1,
    backgroundColor: colors.cardBorder,
    marginTop: 2,
  },
  timelineContent: {
    flex: 1,
    paddingLeft: 8,
    paddingBottom: 10,
    gap: 2,
  },
  timelineLabel: {
    fontWeight: "600",
    fontSize: 12,
    lineHeight: 17,
  },
  timelineTime: {
    fontSize: 10,
    lineHeight: 14,
  },
});
