import { useRouter } from "expo-router";
import React, { useState } from "react";
import { View } from "react-native";

import { AppButton } from "../src/components/ui/AppButton";
import { AppCard } from "../src/components/ui/AppCard";
import { AppText } from "../src/components/ui/AppText";
import { Screen } from "../src/components/ui/Screen";
import { useAccount } from "../src/state/AccountContext";
import { useAuth } from "../src/state/AuthContext";
import { useDeviceUnlock } from "../src/state/DeviceUnlockContext";
import { colors } from "../src/theme/colors";

export default function MultiAccountPreviewScreen() {
  const router = useRouter();
  const { enableDemoAccess } = useAuth();
  const { setAccountScope } = useAccount();
  const { unlock, unlockWithPassword, biometricAvailable, lockApp } = useDeviceUnlock();
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

    setBusy(true);
    setErrorMessage(null);

    try {
      const unlocked = await requireUnlock();
      if (!unlocked) {
        setErrorMessage("Biometric unlock was cancelled.");
        return;
      }

      await setAccountScope("demo");
      const error = await enableDemoAccess();

      if (error) {
        setErrorMessage(error);
        return;
      }

      router.replace("/" as never);
    } finally {
      setBusy(false);
    }
  }

  async function openPersonalWorkspace() {
    if (busy) return;

    setBusy(true);
    setErrorMessage(null);

    try {
      const unlocked = await requireUnlock();
      if (!unlocked) {
        setErrorMessage("Biometric unlock was cancelled.");
        return;
      }

      await setAccountScope("personal");
      const error = await enableDemoAccess();

      if (error) {
        setErrorMessage(error);
        return;
      }

      router.replace("/consumer" as never);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: "center", gap: 18 }}>
        <View style={{ gap: 8 }}>
          <AppText variant="caption" color={colors.gold}>
            Startup validation and account selection
          </AppText>

          <AppText variant="title" color={colors.textPrimary}>
            NexusPay Multi-Account Preview
          </AppText>

          <AppText variant="body" color={colors.textSecondary}>
            Select the workspace you want to open. This screen also validates that the latest build is reaching the device.
          </AppText>
        </View>

        <AppCard>
          <View style={{ gap: 12 }}>
            <AppButton
              title={busy ? "Opening..." : "Demo Workspace"}
              onPress={openDemoWorkspace}
              disabled={busy}
            />

            <AppButton
              title={busy ? "Opening..." : "Personal Account"}
              onPress={openPersonalWorkspace}
              disabled={busy}
              variant="secondary"
            />

            <AppText variant="caption" color={colors.textDarkMuted}>
              Biometric unlock is required before opening either workspace.
            </AppText>

            {errorMessage ? (
              <AppText variant="caption" style={{ color: "#b91c1c" }}>
                {errorMessage}
              </AppText>
            ) : null}
          </View>
        </AppCard>
      </View>
    </Screen>
  );
}
