import { router } from "expo-router";
import { View } from "react-native";

import { AppButton } from "../src/components/ui/AppButton";
import { AppCard } from "../src/components/ui/AppCard";
import { AppText } from "../src/components/ui/AppText";
import { Screen } from "../src/components/ui/Screen";
import { colors } from "../src/theme/colors";

export default function AccountCreatedScreen() {
  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: "center", gap: 20 }}>
        <View style={{ gap: 8 }}>
          <AppText variant="caption" color={colors.gold}>
            NexusPay identity verified
          </AppText>

          <AppText variant="title" color={colors.textPrimary}>
            Account Confirmed
          </AppText>

          <AppText variant="body" color={colors.textSecondary}>
            Your email address has been confirmed and your NexusPay account is now active.
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
                Secure onboarding complete
              </AppText>

              <AppText variant="subheading" color="#FFFFFF">
                Authentication successfully verified
              </AppText>
            </View>

            <AppText variant="body" color={colors.textDarkSecondary}>
              Continue to the secure login screen and access your NexusPay orchestration dashboard.
            </AppText>

            <AppButton
              title="Continue to Login"
              onPress={() => router.replace("/multi-account-preview")}
            />
          </View>
        </AppCard>
      </View>
    </Screen>
  );
}
