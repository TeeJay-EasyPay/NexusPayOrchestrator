import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";

import { AppText } from "../src/components/ui/AppText";
import { Screen } from "../src/components/ui/Screen";
import { isCorporatePersona } from "../src/services/corporateAccessService";
import { seedDemoParticipantsIfMissing } from "../src/services/participantService";
import { useAccount } from "../src/state/AccountContext";
import { useAuth } from "../src/state/AuthContext";
import { useDeviceUnlock } from "../src/state/DeviceUnlockContext";
import { usePersona } from "../src/state/PersonaContext";
import { colors } from "../src/theme/colors";
import { PersonaOption } from "../src/types/multiEntity";

type PersonaGroupKey = "corporate" | "business" | "private";

function maskLast4(last4?: string): string {
  return last4 ? `****${last4}` : "****";
}

function personaMeta(persona: PersonaOption): string {
  if (isCorporatePersona(persona)) return persona.corporateRole?.replace(/_/g, " ").toUpperCase() ?? "CORPORATE";
  return [
    persona.participantType === "BUSINESS" ? "Business entity" : "Private user",
    persona.country,
    persona.bankName ? `${persona.bankName} ${maskLast4(persona.accountLast4)}` : null,
  ]
    .filter(Boolean)
    .join(" - ");
}

function groupPurpose(key: PersonaGroupKey): string {
  if (key === "corporate") return "Corporate governance, approvals, batch operations, reporting, audit, and operations oversight.";
  if (key === "business") return "Business operations, payments, receipts, recipients, and batch management.";
  return "Personal payments, receipts, and notifications.";
}

function groupTitle(key: PersonaGroupKey): string {
  if (key === "corporate") return "Corporate Workspace";
  if (key === "business") return "Business Entities";
  return "Private Users";
}

function groupIcon(key: PersonaGroupKey): keyof typeof Feather.glyphMap {
  if (key === "corporate") return "shield";
  if (key === "business") return "briefcase";
  return "user";
}

export default function MultiAccountPreviewScreen() {
  const router = useRouter();
  const { enableDemoAccess, enablePrivateUserAccess } = useAuth();
  const { setAccountScope } = useAccount();
  const { unlock, unlockWithPassword, biometricAvailable, lockApp } = useDeviceUnlock();
  const { personas, selectedPersona, selectPersona } = usePersona();
  const [busyTarget, setBusyTarget] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const groups = useMemo(
    () => ({
      corporate: personas.filter(isCorporatePersona),
      business: personas.filter((persona) => persona.personaGroup === "BUSINESS_ENTITY"),
      private: personas.filter((persona) => persona.personaGroup === "PRIVATE_USER"),
    }),
    [personas],
  );

  useEffect(() => {
    void seedDemoParticipantsIfMissing();
  }, []);

  async function requireUnlock() {
    lockApp();

    if (biometricAvailable) {
      return unlock();
    }

    unlockWithPassword();
    return true;
  }

  async function openPersona(persona: PersonaOption) {
    if (busyTarget) return;

    setBusyTarget(persona.id);
    setErrorMessage(null);

    try {
      const unlocked = await requireUnlock();
      if (!unlocked) {
        setErrorMessage("Biometric unlock was cancelled.");
        return;
      }

      await selectPersona(persona.id);

      if (isCorporatePersona(persona)) {
        await setAccountScope("demo");
        const error = await enableDemoAccess();
        if (error) {
          setErrorMessage(error);
          return;
        }
        router.replace("/corporate-dashboard" as never);
        return;
      }

      await setAccountScope("personal");
      const error = await enablePrivateUserAccess();
      if (error) {
        setErrorMessage(error);
        return;
      }

      router.replace("/consumer" as never);
    } finally {
      setBusyTarget(null);
    }
  }

  function renderGroup(key: PersonaGroupKey, items: PersonaOption[]) {
    const activeGroup = items.some((item) => item.id === selectedPersona.id);

    return (
      <View
        key={key}
        style={{
          borderRadius: 14,
          borderWidth: 1,
          borderColor: activeGroup ? "#6ED3D8" : "#DDE6EE",
          backgroundColor: "#FFFFFF",
          padding: 14,
          gap: 12,
        }}
      >
        <View style={{ flexDirection: "row", gap: 11, alignItems: "flex-start" }}>
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              backgroundColor: key === "corporate" ? "#0B3F4A" : key === "business" ? "#DDF4F2" : "#DCEBFF",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Feather name={groupIcon(key)} size={19} color={key === "corporate" ? "#6ED3D8" : key === "business" ? "#087C89" : "#0A3D78"} />
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <AppText variant="subheading" color={colors.textDarkPrimary} style={{ fontWeight: "900" }}>
              {groupTitle(key)}
            </AppText>
            <AppText variant="caption" color={colors.textDarkSecondary} style={{ lineHeight: 18 }}>
              {groupPurpose(key)}
            </AppText>
          </View>
        </View>

        <View style={{ gap: 8 }}>
          {items.map((persona) => {
            const active = persona.id === selectedPersona.id;
            const busy = busyTarget === persona.id;

            return (
              <Pressable
                key={persona.id}
                onPress={() => openPersona(persona)}
                disabled={busyTarget !== null}
                style={{
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: active ? "#6ED3D8" : "#E2E8F0",
                  backgroundColor: active ? "#F0FDFF" : "#F8FAFC",
                  paddingHorizontal: 12,
                  paddingVertical: 11,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <View style={{ flex: 1 }}>
                  <AppText variant="body" color={colors.textDarkPrimary} style={{ fontWeight: "900" }}>
                    {busy ? "Opening..." : persona.label}
                  </AppText>
                  <AppText variant="caption" color={colors.textDarkSecondary}>
                    {personaMeta(persona)}
                  </AppText>
                </View>
                <Feather name="chevron-right" size={18} color="#64748B" />
              </Pressable>
            );
          })}
        </View>
      </View>
    );
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 28 }}>
        <View style={{ gap: 8 }}>
          <AppText variant="caption" color={colors.gold}>
            Persona selection
          </AppText>

          <AppText variant="title" color={colors.textPrimary}>
            NexusPay Workspace Access
          </AppText>

          <AppText variant="body" color={colors.textSecondary}>
            Choose a workspace persona. Corporate access now uses role-based governance permissions.
          </AppText>
        </View>

        {renderGroup("corporate", groups.corporate)}
        {renderGroup("business", groups.business)}
        {renderGroup("private", groups.private)}

        {errorMessage ? (
          <View style={{ borderRadius: 10, backgroundColor: "#FFF1F2", borderWidth: 1, borderColor: "#FECDD3", padding: 12 }}>
            <AppText variant="caption" style={{ color: "#B91C1C", fontWeight: "800" }}>
              {errorMessage}
            </AppText>
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}
