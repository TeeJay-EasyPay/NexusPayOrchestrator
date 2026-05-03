import { Ionicons } from "@expo/vector-icons";
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
  const { signIn, signUp, enableDemoAccess } = useAuth();

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
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
      const normalizedError = error.toLowerCase();

      if (normalizedError.includes("password should be at least")) {
        Alert.alert(
          "Password Strength Requirement",
          "Passwords must contain at least 6 characters."
        );

        return;
      }

      if (normalizedError.includes("email not confirmed")) {
        Alert.alert(
          "Email Confirmation Required",
          "Please confirm your email address using the link sent to your inbox before signing in."
        );

        return;
      }

      if (normalizedError.includes("email rate limit exceeded")) {
        Alert.alert(
          "Email Limit Reached",
          "Too many confirmation emails have been requested in a short period. Please wait a few minutes before trying again."
        );

        return;
      }

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

    Alert.alert("Welcome back", "NexusPay secure session established.");
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

              <View
                style={{
                  borderWidth: 1,
                  borderColor: "#DDE6EE",
                  borderRadius: 18,
                  backgroundColor: "#F8FAFC",
                  flexDirection: "row",
                  alignItems: "center",
                  paddingLeft: 16,
                  paddingRight: 8,
                }}
              >
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Password"
                  placeholderTextColor="#8CA0AE"
                  secureTextEntry={!isPasswordVisible}
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={{
                    flex: 1,
                    paddingVertical: 16,
                    paddingRight: 10,
                    fontSize: 16,
                    color: colors.textDarkPrimary,
                  }}
                />

                <Pressable
                  onPress={() => setIsPasswordVisible((current) => !current)}
                  hitSlop={12}
                  accessibilityRole="button"
                  accessibilityLabel={
                    isPasswordVisible ? "Hide password" : "Show password"
                  }
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 21,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons
                    name={isPasswordVisible ? "eye-off-outline" : "eye-outline"}
                    size={22}
                    color={colors.textDarkSecondary}
                  />
                </Pressable>
              </View>

              <AppButton
                title={loading ? "Connecting..." : mode === "signin" ? "Sign In" : "Create Account"}
                onPress={handleSubmit}
                disabled={loading}
              />

              <AppButton
                title="Developer Demo Access"
                variant="secondary"
                onPress={enableDemoAccess}
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
