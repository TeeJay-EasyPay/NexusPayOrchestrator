import React from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import { spacing } from "../../theme";

type AppCardProps = {
  children: React.ReactNode;
  style?: ViewStyle;
};

export function AppCard({ children, style }: AppCardProps) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: spacing.lg,

    shadowColor: "#020713",
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,

    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.92)",
  },
});
