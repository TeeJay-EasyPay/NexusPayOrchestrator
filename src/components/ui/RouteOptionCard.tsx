import * as Haptics from "expo-haptics";
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { colors, spacing } from "../../theme";
import { ScoredRoute } from "../../types";
import { AppCard } from "../ui/AppCard";
import { AppText } from "../ui/AppText";

type RouteOptionCardProps = {
  route: ScoredRoute;
  onPress?: () => void;
};

function getEmoji(label?: string) {
  if (label === "Best Overall") return "✨";
  if (label === "Cheapest") return "💰";
  if (label === "Fastest") return "⚡";
  return "🧭";
}

export function RouteOptionCard({ route, onPress }: RouteOptionCardProps) {
  async function handlePress() {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.();
  }

  return (
    <Pressable onPress={handlePress}>
      <AppCard style={route.label === "Best Overall" ? styles.bestCard : undefined}>
        <View style={{ gap: spacing.sm }}>
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <AppText variant="caption" color={colors.gold}>
                {getEmoji(route.label)} {route.label ?? "Available Route"}
              </AppText>

              <AppText variant="subheading" color={colors.textDarkPrimary}>
                {route.title}
              </AppText>
            </View>

            <View style={styles.scoreBadge}>
              <AppText variant="caption" color={colors.textDarkPrimary}>
                {Math.round(route.finalScore)}
              </AppText>
            </View>
          </View>

          <AppText variant="body" color={colors.textDarkSecondary}>
            {route.path}
          </AppText>

          <View style={styles.amountBox}>
            <AppText variant="caption" color={colors.textDarkMuted}>
              Recipient receives
            </AppText>
            <AppText variant="heading" color={colors.textDarkPrimary}>
              ₱{route.recipientReceivesPhp.toLocaleString()}
            </AppText>
          </View>

          <View style={styles.metricsRow}>
            <View style={styles.metric}>
              <AppText variant="caption" color={colors.textDarkMuted}>
                Fee
              </AppText>
              <AppText variant="body" color={colors.textDarkPrimary}>
                £{route.feeGbp.toFixed(2)}
              </AppText>
            </View>

            <View style={styles.metric}>
              <AppText variant="caption" color={colors.textDarkMuted}>
                ETA
              </AppText>
              <AppText variant="body" color={colors.textDarkPrimary}>
                {route.etaMinutes} mins
              </AppText>
            </View>

            <View style={styles.metric}>
              <AppText variant="caption" color={colors.textDarkMuted}>
                Confidence
              </AppText>
              <AppText variant="body" color={colors.textDarkPrimary}>
                {route.reliabilityPercent}%
              </AppText>
            </View>
          </View>

          <View style={styles.reasonBox}>
            <AppText variant="caption" color={colors.textDarkSecondary}>
              {route.reason}
            </AppText>
          </View>

          <AppText variant="caption" color={colors.gold}>
            Tap to select this route →
          </AppText>
        </View>
      </AppCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bestCard: {
    borderColor: colors.gold,
    borderWidth: 2,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  scoreBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.goldSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  amountBox: {
    backgroundColor: colors.cardSoft,
    borderRadius: 18,
    padding: spacing.md,
  },
  metricsRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  metric: {
    flex: 1,
    backgroundColor: colors.cardSoft,
    borderRadius: 16,
    padding: spacing.sm,
  },
  reasonBox: {
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    paddingTop: spacing.sm,
  },
});