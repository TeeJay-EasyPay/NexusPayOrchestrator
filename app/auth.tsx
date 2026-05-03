import { router } from "expo-router";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  TextInput,
  View,
} from "react-native";

import { AppButton } from "../src/components/ui/AppButton";
import { AppCard } from "../src/components/ui/AppCard";
import { AppText } from "../src/components/ui/AppText";
import { Screen } from "../src/components/ui/Screen";
import { useAuth } from "../src/state/AuthContext";
import { colors } from "../src/theme/colors";

export default function AuthScreen() {
  const { signIn, signUp } = useAuth();

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!email || !password) {
      Alert.alert("Missing details", "Please enter email and password.");
      return;
    }

    setLoading(true);

    const error =
      mode === "signin"
        ? await signIn(email.trim(), password)
        : await signUp(email.trim(), password);

    setLoading(false);

    if (error) {
      Alert.alert("Authentication failed", error);
      return;
    }

    if (mode === "signup") {
      router.push({
        pathname: "/check-email",
        params: {
          email: email.trim(),
        },
      });

      return;
    }

    Alert.alert(
      "Welcome back",
      "NexusPay secure session established."
    );
  }

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <View style={{ flex: 1, justifyContent: "center", gap: 20 }}>
          <View style={{ gap: 8 }}>
            <AppText variant="caption" color={colors.gold}>
              NexusPay secure access
            </AppText>

            <AppText variant="title" color={colors.textPrimary}>
              {mode === "signin" ? "Welcome Back" : "Create Account"}
            </AppText>

            <AppText variant="body" color={colors.textSecondary}>
              Enterprise-grade orchestration access for global settlement flows.
            </AppText>
          </View>

          <AppCard>
            <View style={{ gap: 14 }}>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="Email address"
                placeholderTextColor="#8CA0AE"
                autoCapitalize="none"
                keyboardType="email-address"
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

              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Password"
                placeholderTextColor="#8CA0AE"
                secureTextEntry
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
                title={loading ? "Connecting..." : mode === "signin" ? "Sign In" : "Create Account"}
                onPress={handleSubmit}
                disabled={loading}
              />

              <Pressable
                onPress={() =>
                  setMode((current) =>
                    current === "signin" ? "signup" : "signin"
                  )
                }
              >
                <AppText
                  variant="caption"
                  style={{
                    textAlign: "center",
                    color: colors.textDarkSecondary,
                    fontWeight: "700",
                  }}
                >
                  {mode === "signin"
                    ? "Need an account? Create one"
                    : "Already registered? Sign in"}
                </AppText>
              </Pressable>
            </View>
          </AppCard>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
