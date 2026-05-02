import React from "react";
import { StyleSheet, Text, TextProps } from "react-native";
import { colors, typography } from "../../theme";

type Variant = "title" | "heading" | "subheading" | "body" | "caption";

type AppTextProps = TextProps & {
  variant?: Variant;
  color?: string;
};

export function AppText({
  children,
  variant = "body",
  color = colors.textDarkPrimary,
  style,
  ...props
}: AppTextProps) {
  return (
    <Text style={[styles.base, typography[variant], { color }, style]} {...props}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    letterSpacing: 0.2,
  },
});