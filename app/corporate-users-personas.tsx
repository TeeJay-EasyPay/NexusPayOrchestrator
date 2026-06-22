import React from "react";
import { View } from "react-native";

import { CorporateCard, CorporateShell } from "../src/components/corporate/CorporateShell";
import { AppText } from "../src/components/ui/AppText";
import { getRoleLabel } from "../src/services/corporateAccessService";
import { usePersona } from "../src/state/PersonaContext";
import { colors } from "../src/theme";

export default function CorporateUsersPersonasScreen() {
  const { personas } = usePersona();
  const corporatePersonas = personas.filter((persona) => persona.personaGroup === "CORPORATE_WORKSPACE");

  return (
    <CorporateShell
      routeKey="users_personas"
      title="Users & Personas"
      subtitle="Corporate persona registry and role assignment overview."
    >
      <CorporateCard>
        <AppText variant="subheading" color={colors.textDarkPrimary} style={{ fontWeight: "900" }}>
          Corporate Persona Model
        </AppText>
        <AppText color={colors.textDarkSecondary}>
          Personas are configured in the application seed model for this preview. Database-backed user administration is isolated here for Corporate User only.
        </AppText>
      </CorporateCard>

      {corporatePersonas.map((persona) => (
        <CorporateCard key={persona.id}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <AppText color={colors.textDarkPrimary} style={{ fontWeight: "900" }}>{persona.label}</AppText>
              <AppText variant="caption" color={colors.textDarkSecondary}>{getRoleLabel(persona.corporateRole)}</AppText>
            </View>
            <AppText variant="caption" color={colors.textDarkMuted}>{persona.id}</AppText>
          </View>
        </CorporateCard>
      ))}
    </CorporateShell>
  );
}
