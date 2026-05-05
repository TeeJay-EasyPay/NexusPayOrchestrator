import { router, usePathname } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";

import { useAuth } from "../../state/AuthContext";
import { useDeviceUnlock } from "../../state/DeviceUnlockContext";
import { colors } from "../../theme/colors";
import { AppText } from "../ui/AppText";
import { AppButton } from "../ui/AppButton";

const PUBLIC_ROUTES = new Set([
  "/auth",
  "/check-email",
  "/account-created",
]);

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { session, loading, demoAccessEnabled } = useAuth();
  const { locked, unlock } = useDeviceUnlock();
  const pathname = usePathname();
  const isPublicRoute = PUBLIC_ROUTES.has(pathname);

  useEffect(() => {
    if (loading) return;

    if (!session && !demoAccessEnabled && !isPublicRoute) {
      router.replace("/auth");
      return;
    }

    if ((session || demoAccessEnabled) && pathname === "/auth") {
      router.replace("/");
    }
  }, [session, loading, pathname, isPublicRoute, demoAccessEnabled]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.gold} size="large" />
      </View>
    );
  }

  if (session && locked && !isPublicRoute) {
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
        <AppText variant="title" color={colors.textPrimary}>
          Unlock NexusPay
        </AppText>

        <AppText variant="body" color={colors.textSecondary}>
          Secure access required
        </AppText>

        <AppButton title="Unlock" onPress={unlock} />
      </View>
    );
  }

  if (!session && !demoAccessEnabled && !isPublicRoute) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.gold} size="large" />
      </View>
    );
  }

  return <>{children}</>;
}
