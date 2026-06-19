import React from "react";
import { StyleSheet, View } from "react-native";

import { colors } from "../../theme";
import type { DataProvenanceClassification } from "../../utils/operationsCommandCentre";
import { AppText } from "../ui/AppText";

type Props = {
  classification: DataProvenanceClassification;
};

const PROVENANCE_COLORS: Record<DataProvenanceClassification, string> = {
  LIVE: "#16A34A",
  DERIVED: "#2563EB",
  SIMULATED: "#D97706",
  MOCK: "#DC2626",
  FALLBACK: "#6B7280",
};

export function DataProvenanceBadge({ classification }: Props) {
  const color = PROVENANCE_COLORS[classification] ?? colors.textDarkMuted;

  return (
    <View style={[styles.badge, { backgroundColor: `${color}12`, borderColor: `${color}32` }]}>
      <AppText variant="caption" style={[styles.label, { color }]}>
        {classification}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 7,
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  label: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
});
