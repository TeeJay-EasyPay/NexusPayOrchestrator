import React from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import { colors, shadows, spacing } from "../../theme";

type AppCardProps = {
  children: React.ReactNode;
  style?: ViewStyle;
};

export function AppCard({ children, style }: AppCardProps) {
  return <View style={[styles.card, shadows.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
});