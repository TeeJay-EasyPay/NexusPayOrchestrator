import { router } from "expo-router";
import { useState } from "react";
import { Alert, TextInput, View } from "react-native";

import { useAuth } from "../../state/AuthContext";
import { useDeviceUnlock } from "../../state/DeviceUnlockContext";
import { colors } from "../../theme/colors";
import { AppButton } from "../ui/AppButton";
import { AppCard } from "../ui/AppCard";
import { AppText } from "../ui/AppText";

export function UnlockPanel() {
  const { session, signIn, signOut } = useAuth();
  const { unlock, unlockWithPassword, biometricAvailable } = useDeviceUnlock();
  const [password, setPassword] = useState("");
  const [checking, setChecking] = useState(false);

  async function handlePasswordUnlock() {
    if (!session?.user?.email) return;

    if (!password.trim()) {
      Alert.alert("Password required", "Please enter your account password to unlock NexusPay.");
      return;
    }

    setChecking(true);
    const error = await signIn(session.user.email, password);
    setChecking(false);

    if (error) {
      Alert.alert("Unlock failed", "The password entered did not unlock this account.");
      return;
    }

    unlockWithPassword();
  }

  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colors.background,
        gap: 16,
        padding: 24,
      }}
    >
      <View style={{ alignItems: "center", gap: 8 }}>
        <AppText variant="caption" color={colors.gold}>
          Secure session required
        </AppText>
        <AppText variant="title" color={colors.textPrimary}>
          Unlock NexusPay
        </AppText>
        <AppText variant="body" color={colors.textSecondary} style={{ textAlign: "center" }}>
          {biometricAvailable
            ? "Use biometrics or your account password to continue."
            : "Enter your account password to continue."}
        </AppText>
      </View>

      <AppCard style={{ width: "100%" }}>
        <View style={{ gap: 14 }}>
          {biometricAvailable ? (
            <AppButton title="Unlock with biometrics" onPress={unlock} />
          ) : null}

          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Account password"
            placeholderTextColor="#8CA0AE"
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            style={{
              borderWidth: 1,
              borderColor: "#DDE6EE",
              borderRadius: 18,
              padding: 16,
              backgroundColor: "#F8FAFC",
              fontSize: 16,
              color: colors.textDarkPrimary,
            }}
          />

          <AppButton
            title={checking ? "Checking..." : "Unlock with password"}
            onPress={handlePasswordUnlock}
            disabled={checking}
          />

          <AppButton
            title="Use another account"
            variant="secondary"
            onPress={async () => {
              await signOut();
              router.replace("/auth");
            }}
          />
        </View>
      </AppCard>
    </View>
  );
}
