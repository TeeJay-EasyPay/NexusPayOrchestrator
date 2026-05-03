import React from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppMenu } from "../navigation/AppMenu";
import { colors, spacing } from "../../theme";

type ScreenProps = {
  children: React.ReactNode;
  style?: ViewStyle;
};

export function Screen({ children, style }: ScreenProps) {
  return (
    <SafeAreaView style={[styles.container, style]}>
      <View style={styles.content}>{children}</View>
      <AppMenu />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.md,
    gap: spacing.md,
  },
  content: {
    flex: 1,
  },
});