import { router, useLocalSearchParams } from "expo-router";
import { View } from "react-native";

import { AppButton } from "../src/components/ui/AppButton";
import { AppCard } from "../src/components/ui/AppCard";
import { AppText } from "../src/components/ui/AppText";
import { Screen } from "../src/components/ui/Screen";
import { colors } from "../src/theme/colors";

export default function CheckEmailScreen() {
  const params = useLocalSearchParams();
  const email = typeof params.email === "string" ? params.email : "your email address";

  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: "center", gap: 20 }}>
        <View style={{ gap: 8 }}>
          <AppText variant="caption" color={colors.gold}>
            Confirm your NexusPay account
          </AppText>

          <AppText variant="title" color={colors.textPrimary}>
            Check Your Email
          </AppText>

          <AppText variant="body" color={colors.textSecondary}>
            We have sent a secure confirmation link to complete your account setup.
          </AppText>
        </View>

        <AppCard>
          <View style={{ gap: 14 }}>
            <View
              style={{
                padding: 16,
                borderRadius: 22,
                backgroundColor: "#0B3F4A",
                gap: 8,
              }}
            >
              <AppText variant="caption" color="#BFEAF1">
                Confirmation sent to
              </AppText>

              <AppText variant="subheading" color="#FFFFFF">
                {email}
              </AppText>
            </View>

            <AppText variant="body" color={colors.textDarkSecondary}>
              To complete creation of your account, open the email from Supabase Auth and tap the confirmation link.
            </AppText>

            <AppText variant="caption" color={colors.textDarkMuted}>
              After confirmation, NexusPay will open the account-created screen. You can then return to login and access your account.
            </AppText>

            <AppButton title="Back to Login" onPress={() => router.replace("/multi-account-preview")} />
          </View>
        </AppCard>
      </View>
    </Screen>
  );
}
