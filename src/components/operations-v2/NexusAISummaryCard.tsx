import { Feather } from "@expo/vector-icons";
import React from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import type { IntelligenceReportResult } from "../../services/nexusAIService";
import { colors, spacing } from "../../theme";
import { AppCard } from "../ui/AppCard";
import { AppText } from "../ui/AppText";

type Props = {
  missionSummary: IntelligenceReportResult | null | undefined;
  missionSummaryLoading: boolean;
  missionSummaryStatus: string;
  operationsAIEnabled: boolean;
  nexusAILoading: boolean;
};

function FindingItem({ text, index }: { text: string; index: number }) {
  return (
    <View style={styles.findingRow}>
      <View style={styles.findingIndex}>
        <AppText variant="caption" style={styles.findingIndexText}>{index + 1}</AppText>
      </View>
      <AppText variant="caption" color={colors.textDarkSecondary} style={styles.findingText}>
        {text ?? ""}
      </AppText>
    </View>
  );
}

export function NexusAISummaryCard({
  missionSummary,
  missionSummaryLoading,
  missionSummaryStatus,
  operationsAIEnabled,
  nexusAILoading,
}: Props) {
  if (nexusAILoading) {
    return (
      <AppCard style={styles.card}>
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="small" color={colors.gold} />
          <AppText variant="caption" color={colors.textDarkMuted} style={styles.loadingText}>
            Loading AI configuration…
          </AppText>
        </View>
      </AppCard>
    );
  }

  if (!operationsAIEnabled) {
    return (
      <AppCard style={styles.card}>
        <View style={styles.header}>
          <Feather name="zap" size={18} color={colors.textDarkMuted} style={{ marginRight: 8 }} />
          <AppText variant="subheading" color={colors.textDarkPrimary} style={styles.title}>
            Nexus AI Mission Summary
          </AppText>
        </View>
        <View style={styles.disabledBlock}>
          <Feather name="toggle-left" size={22} color={colors.textDarkMuted} />
          <AppText variant="caption" color={colors.textDarkMuted} style={styles.disabledText}>
            AI mission summary is disabled. Enable Nexus AI in settings to activate corridor intelligence.
          </AppText>
        </View>
      </AppCard>
    );
  }

  if (missionSummaryLoading && !missionSummary) {
    return (
      <AppCard style={styles.card}>
        <View style={styles.header}>
          <Feather name="zap" size={18} color={colors.gold} style={{ marginRight: 8 }} />
          <AppText variant="subheading" color={colors.textDarkPrimary} style={styles.title}>
            Nexus AI Mission Summary
          </AppText>
        </View>
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="small" color={colors.gold} />
          <AppText variant="caption" color={colors.textDarkMuted} style={styles.loadingText}>
            {missionSummaryStatus ?? "Generating intelligence…"}
          </AppText>
        </View>
      </AppCard>
    );
  }

  const summary = missionSummary?.executiveSummary ?? null;
  const findings = Array.isArray(missionSummary?.keyFindings) ? missionSummary.keyFindings : [];
  const evidence = Array.isArray(missionSummary?.supportingEvidence) ? missionSummary.supportingEvidence : [];
  const confidence = Array.isArray(missionSummary?.confidenceIndicators) ? missionSummary.confidenceIndicators : [];

  return (
    <AppCard style={styles.card}>
      <View style={styles.header}>
        <Feather name="zap" size={18} color={colors.gold} style={{ marginRight: 8 }} />
        <AppText variant="subheading" color={colors.textDarkPrimary} style={styles.title}>
          Nexus AI Mission Summary
        </AppText>
        {missionSummaryLoading && (
          <ActivityIndicator size="small" color={colors.gold} style={{ marginLeft: 8 }} />
        )}
      </View>

      {summary ? (
        <View style={styles.summaryBlock}>
          <AppText variant="body" color={colors.textDarkPrimary} style={styles.summaryText}>
            {summary}
          </AppText>
        </View>
      ) : (
        <View style={styles.noSummary}>
          <AppText variant="caption" color={colors.textDarkMuted}>
            {missionSummaryStatus ?? "No summary available"}
          </AppText>
        </View>
      )}

      {findings.length > 0 && (
        <View style={styles.section}>
          <AppText variant="caption" style={styles.sectionLabel}>Key Findings</AppText>
          <View style={styles.findingList}>
            {findings.slice(0, 5).map((item, idx) => (
              <FindingItem key={idx} text={item} index={idx} />
            ))}
          </View>
        </View>
      )}

      {evidence.length > 0 && (
        <View style={styles.section}>
          <AppText variant="caption" style={styles.sectionLabel}>Supporting Evidence</AppText>
          <View style={styles.evidenceList}>
            {evidence.slice(0, 4).map((item, idx) => (
              <View key={idx} style={styles.evidenceRow}>
                <Feather name="corner-right-down" size={11} color={colors.textDarkMuted} />
                <AppText variant="caption" color={colors.textDarkSecondary} style={styles.evidenceText}>
                  {item ?? ""}
                </AppText>
              </View>
            ))}
          </View>
        </View>
      )}

      {confidence.length > 0 && (
        <View style={styles.confidenceRow}>
          {confidence.slice(0, 3).map((item, idx) => (
            <View key={idx} style={styles.confidenceBadge}>
              <AppText variant="caption" style={styles.confidenceText}>{item ?? ""}</AppText>
            </View>
          ))}
        </View>
      )}
    </AppCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  title: {
    fontWeight: "700",
    flex: 1,
  },
  loadingCenter: {
    alignItems: "center",
    paddingVertical: 24,
    gap: 10,
  },
  loadingText: {
    textAlign: "center",
    lineHeight: 18,
  },
  disabledBlock: {
    alignItems: "center",
    paddingVertical: 20,
    gap: 10,
  },
  disabledText: {
    textAlign: "center",
    maxWidth: 280,
    lineHeight: 18,
  },
  summaryBlock: {
    backgroundColor: `${colors.gold}0C`,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: `${colors.gold}20`,
    marginBottom: 16,
  },
  summaryText: {
    lineHeight: 22,
    fontSize: 14,
  },
  noSummary: {
    paddingVertical: 16,
    alignItems: "center",
  },
  section: {
    marginBottom: 14,
  },
  sectionLabel: {
    fontWeight: "700",
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: colors.textDarkMuted,
    marginBottom: 8,
  },
  findingList: {
    gap: 8,
  },
  findingRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  findingIndex: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: `${colors.gold}18`,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
    flexShrink: 0,
  },
  findingIndexText: {
    color: colors.gold,
    fontWeight: "800",
    fontSize: 10,
  },
  findingText: {
    flex: 1,
    lineHeight: 18,
    fontSize: 13,
  },
  evidenceList: {
    gap: 7,
  },
  evidenceRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 7,
  },
  evidenceText: {
    flex: 1,
    lineHeight: 17,
    fontSize: 12,
  },
  confidenceRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    marginTop: 4,
  },
  confidenceBadge: {
    backgroundColor: colors.cardSoft,
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  confidenceText: {
    color: colors.textDarkSecondary,
    fontWeight: "600",
    fontSize: 11,
  },
});
