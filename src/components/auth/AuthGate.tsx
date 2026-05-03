import { router, usePathname } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";

import { useAuth } from "../../state/AuthContext";
import { colors } from "../../theme/colors";
import { AppText } from "../ui/AppText";

const PUBLIC_ROUTES = new Set([
  "/auth",
  "/check-email",
  "/account-created",
]);

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { session, loading, demoAccessEnabled } = useAuth();
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
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.background,
          gap: 14,
          padding: 24,
        }}
      >
        <ActivityIndicator color={colors.gold} size="large" />
        <AppText variant="caption" color={colors.textSecondary}>
          Securing NexusPay session...
        </AppText>
      </View>
    );
  }

  if (!session && !demoAccessEnabled && !isPublicRoute) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator color={colors.gold} size="large" />
      </View>
    );
  }

  return <>{children}</>;
}
