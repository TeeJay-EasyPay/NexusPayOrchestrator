import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from "react-native";

import { AppButton } from "../src/components/ui/AppButton";
import { AppCard } from "../src/components/ui/AppCard";
import { AppText } from "../src/components/ui/AppText";
import { Screen } from "../src/components/ui/Screen";
import { useAuth } from "../src/state/AuthContext";
import { colors, spacing } from "../src/theme";

type AuthMode = "sign-in" | "sign-up";

function AuthInput({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  secureTextEntry?: boolean;
}) {
  return (
    <View style={{ gap: 8 }}>
      <AppText variant="caption" color={colors.textDarkMuted}>
        {label}
      </AppText>

      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        autoCapitalize="none"
        autoCorrect={false}
        secureTextEntry={secureTextEntry}
        style={{
          minHeight: 52,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: "#DDE6EF",
          backgroundColor: "#FFFFFF",
          paddingHorizontal: 14,
          color: colors.textDarkPrimary,
          fontSize: 16,
        }}
      />
    </View>
  );
}

export default function AuthScreen() {
  const router = useRouter();
  const { signIn, signUp, enableDemoAccess } = useAuth();

  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isSignUp = mode === "sign-up";
  const primaryTitle = isSignUp ? "Create Secure Account" : "Sign In Securely";

  async function handlePrimaryAction() {
    if (busy) return;

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password) {
      setErrorMessage("Please enter your email address and password.");
      return;
    }

    setBusy(true);
    setErrorMessage(null);

    try {
      const error = isSignUp
        ? await signUp(cleanEmail, password)
        : await signIn(cleanEmail, password);

      if (error) {
        setErrorMessage(error);
        return;
      }

      if (isSignUp) {
        router.replace({ pathname: "/check-email", params: { email: cleanEmail } });
        return;
      }

      router.replace("/");
    } finally {
      setBusy(false);
    }
  }

  async function handleDemoAccess() {
    if (busy) return;

    setBusy(true);
    setErrorMessage(null);

    try {
      const error = await enableDemoAccess();

      if (error) {
        setErrorMessage(error);
        return;
      }

      router.replace("/");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
        >
          <View style={{ gap: spacing.lg, paddingBottom: 32 }}>
            <View style={{ gap: 8 }}>
              <AppText variant="caption" color={colors.gold}>
                NexusPay secure access
              </AppText>

              <AppText variant="title" color={colors.textPrimary}>
                Orchestrator Login
              </AppText>

              <AppText variant="body" color={colors.textSecondary}>
                Access your FX routing, XRPL proof, payout simulation, and audit-ready transfer workspace.
              </AppText>
            </View>

            <AppCard>
              <View style={{ gap: 18 }}>
                <View
                  style={{
                    flexDirection: "row",
                    padding: 4,
                    borderRadius: 18,
                    backgroundColor: "#EEF3F8",
                    gap: 4,
                  }}
                >
                  <Pressable
                    onPress={() => {
                      setMode("sign-in");
                      setErrorMessage(null);
                    }}
                    style={{
                      flex: 1,
                      paddingVertical: 10,
                      borderRadius: 14,
                      alignItems: "center",
                      backgroundColor: !isSignUp ? colors.gold : "transparent",
                    }}
                  >
                    <AppText
                      variant="caption"
                      color={!isSignUp ? colors.background : colors.textDarkSecondary}
                      style={{ fontWeight: "900" }}
                    >
                      Sign in
                    </AppText>
                  </Pressable>

                  <Pressable
                    onPress={() => {
                      setMode("sign-up");
                      setErrorMessage(null);
                    }}
                    style={{
                      flex: 1,
                      paddingVertical: 10,
                      borderRadius: 14,
                      alignItems: "center",
                      backgroundColor: isSignUp ? colors.gold : "transparent",
                    }}
                  >
                    <AppText
                      variant="caption"
                      color={isSignUp ? colors.background : colors.textDarkSecondary}
                      style={{ fontWeight: "900" }}
                    >
                      Create account
                    </AppText>
                  </Pressable>
                </View>

                <AuthInput
                  label="Email address"
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                />

                <AuthInput
                  label="Password"
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter your secure password"
                  secureTextEntry
                />

                {errorMessage ? (
                  <View
                    style={{
                      padding: 12,
                      borderRadius: 16,
                      backgroundColor: "#FEF2F2",
                      borderWidth: 1,
                      borderColor: "#FECACA",
                    }}
                  >
                    <AppText variant="caption" color={colors.danger}>
                      {errorMessage}
                    </AppText>
                  </View>
                ) : null}

                <AppButton
                  title={busy ? "Please wait..." : primaryTitle}
                  onPress={handlePrimaryAction}
                  disabled={busy}
                  style={{ opacity: busy ? 0.7 : 1 }}
                />

                <AppButton
                  title="Enter Demo Workspace"
                  variant="secondary"
                  onPress={handleDemoAccess}
                  disabled={busy}
                  style={{ opacity: busy ? 0.7 : 1 }}
                />

                {busy ? <ActivityIndicator color={colors.gold} /> : null}

                <AppText variant="caption" color={colors.textDarkMuted}>
                  {isSignUp
                    ? "After account creation, check your email to confirm access."
                    : "Use your Supabase account or the configured demo workspace."}
                </AppText>
              </View>
            </AppCard>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
