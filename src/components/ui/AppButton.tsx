import React from "react";
import {
  Pressable,
  PressableProps,
  StyleSheet,
  Text,
  ViewStyle,
} from "react-native";
import { colors, spacing } from "../../theme";

type AppButtonProps = PressableProps & {
  title: string;
  variant?: "primary" | "secondary";
  style?: ViewStyle;
};

export function AppButton({
  title,
  variant = "primary",
  style,
  ...props
}: AppButtonProps) {
  const isPrimary = variant === "primary";

  return (
    <Pressable
      style={[
        styles.button,
        {
          backgroundColor: isPrimary ? colors.gold : colors.cardSoft,
          borderColor: isPrimary ? colors.gold : colors.cardBorder,
        },
        style,
      ]}
      {...props}
    >
      <Text
        style={[
          styles.text,
          {
            color: isPrimary
              ? colors.background
              : colors.textDarkPrimary,
          },
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 18,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    fontSize: 16,
    fontWeight: "700",
  },
});