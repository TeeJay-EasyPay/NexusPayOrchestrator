import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppButton } from "../src/components/ui/AppButton";
import { AppCard } from "../src/components/ui/AppCard";
import { AppText } from "../src/components/ui/AppText";
import { useAuth } from "../src/state/AuthContext";
import { useDeviceUnlock } from "../src/state/DeviceUnlockContext";
import { colors, spacing } from "../src/theme";

// ─── Auth screen render diagnostics ──────────────────────────────────────────
let _authGlobalRenderCount = 0;

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
  // ─── Render-pass counter ──────────────────────────────────────────────────
  _authGlobalRenderCount += 1;
  const renderPass = _authGlobalRenderCount;
  console.log("[AUTH-RENDER] pass=" + renderPass + " ts=" + new Date().toISOString());

  // Hooks must be called unconditionally — do not wrap in try/catch
  const router = useRouter();
  const { signIn, signUp, enableDemoAccess } = useAuth();
  const { unlock, biometricAvailable, unlockWithPassword, lockApp } = useDeviceUnlock();

  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // ─── Mount / unmount lifecycle ─────────────────────────────────────────────
  useEffect(() => {
    console.log("[AUTH-MOUNT] auth screen mounted ts=" + new Date().toISOString());
    return () => {
      console.log("[AUTH-UNMOUNT] auth screen unmounted ts=" + new Date().toISOString());
    };
  }, []);

  // ─── Render-state diagnostic ───────────────────────────────────────────────
  useEffect(() => {
    console.log("[AUTH-STATE]", {
      mode,
      busy,
      errorMessage,
      biometricAvailable,
      renderPass,
      ts: new Date().toISOString(),
    });
  });

  const isSignUp = mode === "sign-up";
  const primaryTitle = isSignUp ? "Create Secure Account" : "Sign In Securely";

  async function requireDeviceUnlock() {
    console.log("[AUTH-OP] requireDeviceUnlock start biometricAvailable=" + biometricAvailable);
    lockApp();

    if (biometricAvailable) {
      const result = await unlock();
      console.log("[AUTH-OP] requireDeviceUnlock biometric result=" + result);
      return result;
    }

    unlockWithPassword();
    console.log("[AUTH-OP] requireDeviceUnlock password-fallback done");
    return true;
  }

  async function handlePrimaryAction() {
    if (busy) return;

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password) {
      setErrorMessage("Please enter your email address and password.");
      return;
    }

    console.log("[AUTH-OP] handlePrimaryAction start mode=" + mode);
    setBusy(true);
    setErrorMessage(null);

    try {
      if (!isSignUp) {
        console.log("[AUTH-OP] requireDeviceUnlock begin");
        const unlocked = await requireDeviceUnlock();
        console.log("[AUTH-OP] requireDeviceUnlock end unlocked=" + unlocked);

        if (!unlocked) {
          setErrorMessage("Device unlock was cancelled. Please try again to continue.");
          return;
        }
      }

      console.log("[AUTH-OP] calling " + (isSignUp ? "signUp" : "signIn"));
      const error = isSignUp
        ? await signUp(cleanEmail, password)
        : await signIn(cleanEmail, password);
      console.log("[AUTH-OP] auth call complete error=" + error);

      if (error) {
        if (!isSignUp) lockApp();
        setErrorMessage(error);
        return;
      }

      if (isSignUp) {
        console.log("[AUTH-OP] navigating to check-email");
        router.replace({ pathname: "/check-email", params: { email: cleanEmail } });
      }
    } catch (e) {
      console.error("[AUTH-OP] handlePrimaryAction caught unexpected error:", e);
      setErrorMessage("An unexpected error occurred. Please try again.");
    } finally {
      setBusy(false);
      console.log("[AUTH-OP] handlePrimaryAction finally done");
    }
  }

  async function handleDemoAccess() {
    if (busy) return;

    console.log("[AUTH-OP] handleDemoAccess start");
    setBusy(true);
    setErrorMessage(null);

    try {
      console.log("[AUTH-OP] requireDeviceUnlock for demo begin");
      const unlocked = await requireDeviceUnlock();
      console.log("[AUTH-OP] requireDeviceUnlock for demo end unlocked=" + unlocked);

      if (!unlocked) {
        setErrorMessage("Device unlock was cancelled. Please try again to continue.");
        return;
      }

      console.log("[AUTH-OP] calling enableDemoAccess");
      const error = await enableDemoAccess();
      console.log("[AUTH-OP] enableDemoAccess complete error=" + error);

      if (error) {
        lockApp();
        setErrorMessage(error);
      }
    } catch (e) {
      console.error("[AUTH-OP] handleDemoAccess caught unexpected error:", e);
      setErrorMessage("Demo access failed unexpectedly. Please try again.");
    } finally {
      setBusy(false);
      console.log("[AUTH-OP] handleDemoAccess finally done");
    }
  }

  // ─── Log every render to prove component is executing ─────────────────────
  console.log("[AUTH-RENDER-COMPLETE] JSX about to be returned pass=" + renderPass);

  return (
    // ── Bypass Screen component: render directly into SafeAreaView ──────────
    // Screen uses SafeAreaView from react-native-safe-area-context internally.
    // Rendering here directly isolates whether Screen is the failure point.
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* RENDER-PROOF BANNER — remove once screen is visible */}
      <View
        style={{
          backgroundColor: "#1A3A5C",
          paddingVertical: 6,
          paddingHorizontal: 12,
          alignItems: "center",
        }}
      >
        <Text style={{ color: "#D6A84F", fontSize: 11, fontFamily: "monospace" }}>
          {"[AUTH-RENDER-PROOF] pass=" + renderPass + " ts=" + new Date().toISOString()}
        </Text>
      </View>

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
    </SafeAreaView>
  );
}
