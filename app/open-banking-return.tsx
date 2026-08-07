import * as WebBrowser from "expo-web-browser";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppText } from "../src/components/ui/AppText";
import { colors } from "../src/theme";

WebBrowser.maybeCompleteAuthSession();

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default function OpenBankingReturnScreen() {
  const params = useLocalSearchParams<{ outcome?: string | string[] }>();
  const outcome = firstParam(params.outcome);
  const paymentSubmitted = outcome === "payment_submitted";

  useEffect(() => {
    const timer = setTimeout(() => {
      if (router.canGoBack()) {
        router.back();
        return;
      }

      router.replace("/");
    }, 350);

    return () => clearTimeout(timer);
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>
        <ActivityIndicator size="large" color={colors.success} />
        <AppText variant="heading" color={colors.textPrimary} style={styles.title}>
          {paymentSubmitted ? "Bank authorisation received" : "Returning to NexusPay"}
        </AppText>
        <AppText color={colors.textSecondary} style={styles.message}>
          NexusPay is verifying the persisted Yapily payment result.
        </AppText>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    paddingHorizontal: 32,
  },
  title: {
    textAlign: "center",
  },
  message: {
    textAlign: "center",
  },
});
