import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";

import { AppButton } from "../src/components/ui/AppButton";
import { AppCard } from "../src/components/ui/AppCard";
import { AppText } from "../src/components/ui/AppText";
import { Screen } from "../src/components/ui/Screen";
import { seedDemoParticipantsIfMissing } from "../src/services/participantService";
import { useAccount } from "../src/state/AccountContext";
import { useAuth } from "../src/state/AuthContext";
import { useDeviceUnlock } from "../src/state/DeviceUnlockContext";
import { usePersona } from "../src/state/PersonaContext";
import { colors } from "../src/theme/colors";
import { PersonaOption } from "../src/types/multiEntity";

function maskLast4(last4?: string): string {
  return last4 ? `****${last4}` : "****";
}

function personaMeta(persona: PersonaOption): string {
  if (persona.kind === "PERSONAL") return "Personal account";
  return [
    persona.participantType === "CORPORATE" ? "Corporate workspace" : "Persona account",
    persona.country,
    persona.bankName ? `${persona.bankName} ${maskLast4(persona.accountLast4)}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

export default function MultiAccountPreviewScreen() {
  const router = useRouter();
  const { enableDemoAccess, enablePrivateUserAccess } = useAuth();
  const { setAccountScope } = useAccount();
  const { unlock, unlockWithPassword, biometricAvailable, lockApp } = useDeviceUnlock();
  const { personas, selectedPersona, selectPersona } = usePersona();
  const [busyTarget, setBusyTarget] = useState<"corporate" | "personal" | "persona" | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState(selectedPersona.id);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const busy = busyTarget !== null;

  const personaOptions = useMemo(
    () => personas.filter((persona) => persona.kind === "PARTICIPANT" && persona.id !== "corporate-demo"),
    [personas],
  );

  useEffect(() => {
    const selectedIsPersonaOption = personaOptions.some((persona) => persona.id === selectedPersona.id);
    setSelectedId(selectedIsPersonaOption ? selectedPersona.id : personaOptions[0]?.id ?? selectedPersona.id);
  }, [personaOptions, selectedPersona.id]);

  useEffect(() => {
    void seedDemoParticipantsIfMissing();
  }, []);

  const selectedOption = useMemo(
    () => personaOptions.find((persona) => persona.id === selectedId) ?? personaOptions[0],
    [personaOptions, selectedId],
  );

  async function requireUnlock() {
    lockApp();

    if (biometricAvailable) {
      return unlock();
    }

    unlockWithPassword();
    return true;
  }

  async function openDemoWorkspace() {
    if (busy) return;

    setBusyTarget("corporate");
    setErrorMessage(null);

    try {
      const unlocked = await requireUnlock();
      if (!unlocked) {
        setErrorMessage("Biometric unlock was cancelled.");
        return;
      }

      await selectPersona("corporate-demo");
      await setAccountScope("demo");
      const error = await enableDemoAccess();

      if (error) {
        setErrorMessage(error);
        return;
      }

      router.replace("/" as never);
    } finally {
      setBusyTarget(null);
    }
  }

  async function openPersonalWorkspace(persona: PersonaOption = personas[0], target: "personal" | "persona" = "persona") {
    if (busy) return;

    setBusyTarget(target);
    setErrorMessage(null);
    setSelectorOpen(false);

    try {
      const unlocked = await requireUnlock();
      if (!unlocked) {
        setErrorMessage("Biometric unlock was cancelled.");
        return;
      }

      await selectPersona(persona.id);

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

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 28 }}>
        <View style={{ gap: 8 }}>
          <AppText variant="caption" color={colors.gold}>
            Startup validation and account selection
          </AppText>

          <AppText variant="title" color={colors.textPrimary}>
            NexusPay Multi-Account Preview
          </AppText>

          <AppText variant="body" color={colors.textSecondary}>
            Open a workspace directly or select a persona to experience the full NexusPay personal app with persona-specific data.
          </AppText>
        </View>

        <AppCard>
          <View style={{ gap: 12 }}>
            <AppText variant="subheading" color={colors.textDarkPrimary} style={{ fontWeight: "800" }}>
              Workspace entry
            </AppText>

            <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
              <View style={{ flex: 1, minWidth: 150 }}>
                <AppButton
                  title={busyTarget === "corporate" ? "Opening..." : "Corporate Workspace"}
                  onPress={openDemoWorkspace}
                  disabled={busy}
                />
              </View>

              <View style={{ flex: 1, minWidth: 150 }}>
                <AppButton
                  title={busyTarget === "personal" ? "Opening..." : "Personal Account"}
                  onPress={() => openPersonalWorkspace(personas[0], "personal")}
                  disabled={busy}
                  variant="secondary"
                />
              </View>
            </View>

            <AppText variant="caption" color={colors.textDarkMuted}>
              Biometric unlock is required before opening any workspace.
            </AppText>
          </View>
        </AppCard>

        <AppCard>
          <View style={{ gap: 10 }}>
            <View>
              <AppText variant="caption" color={colors.textDarkMuted}>
                Optional persona selection
              </AppText>
              <AppText variant="subheading" color={colors.textDarkPrimary} style={{ fontWeight: "800" }}>
                Continue as {selectedOption?.label ?? "a persona"}
              </AppText>
              {selectedOption ? (
                <AppText variant="caption" color={colors.textDarkSecondary}>
                  {personaMeta(selectedOption)}
                </AppText>
              ) : null}
            </View>

            <View style={{ gap: 8 }}>
              <Pressable
                onPress={() => setSelectorOpen((open) => !open)}
                disabled={busy || personaOptions.length === 0}
                style={{
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: selectorOpen ? colors.gold : "#CBD5E1",
                  backgroundColor: "#F8FAFC",
                  paddingHorizontal: 12,
                  paddingVertical: 12,
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <View style={{ flex: 1 }}>
                  <AppText variant="body" color={colors.textDarkPrimary} style={{ fontWeight: "900" }}>
                    {selectedOption?.label ?? "Select a persona"}
                  </AppText>
                  {selectedOption ? (
                    <AppText variant="caption" color={colors.textDarkSecondary}>
                      {personaMeta(selectedOption)}
                    </AppText>
                  ) : null}
                </View>
                <AppText variant="subheading" color={colors.textDarkMuted} style={{ fontWeight: "900" }}>
                  {selectorOpen ? "^" : "v"}
                </AppText>
              </Pressable>

              {selectorOpen ? (
                <View
                  style={{
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: "#DDE6EE",
                    backgroundColor: "#FFFFFF",
                    overflow: "hidden",
                  }}
                >
                  {personaOptions.map((persona) => {
                    const active = selectedId === persona.id;

                    return (
                      <Pressable
                        key={persona.id}
                        onPress={() => {
                          setSelectedId(persona.id);
                          setSelectorOpen(false);
                        }}
                        style={{
                          borderBottomWidth: 1,
                          borderBottomColor: "#EEF2F6",
                          backgroundColor: active ? "#FFF7E6" : "#FFFFFF",
                          paddingHorizontal: 12,
                          paddingVertical: 11,
                        }}
                      >
                        <AppText variant="body" color={colors.textDarkPrimary} style={{ fontWeight: "800" }}>
                          {persona.label}
                        </AppText>
                        <AppText variant="caption" color={colors.textDarkSecondary}>
                          {personaMeta(persona)}
                        </AppText>
                      </Pressable>
                    );
                  })}
                </View>
              ) : null}
            </View>

            <AppButton
              title={busyTarget === "persona" ? "Opening..." : "Continue"}
              onPress={() => selectedOption && openPersonalWorkspace(selectedOption, "persona")}
              disabled={busy || !selectedOption}
            />

            {errorMessage ? (
              <AppText variant="caption" style={{ color: "#b91c1c" }}>
                {errorMessage}
              </AppText>
            ) : null}
          </View>
        </AppCard>
      </ScrollView>
    </Screen>
  );
}
