import { router, usePathname } from "expo-router";
import { useEffect, useRef } from "react";
import { ActivityIndicator, View } from "react-native";

import { useAuth } from "../../state/AuthContext";
import { useDeviceUnlock } from "../../state/DeviceUnlockContext";
import { colors } from "../../theme/colors";
import { UnlockPanel } from "./UnlockPanel";

const PUBLIC_ROUTES = new Set([
  "/auth",
  "/check-email",
  "/account-created",
]);

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { session, loading, demoAccessEnabled } = useAuth();
  const { locked } = useDeviceUnlock();
  const pathname = usePathname();
  const isPublicRoute = PUBLIC_ROUTES.has(pathname);

  const hasRedirectedRef = useRef(false);

  useEffect(() => {
    if (loading) return;

    if (hasRedirectedRef.current) return;

    if (!session && !demoAccessEnabled && !isPublicRoute) {
      hasRedirectedRef.current = true;
      router.replace("/auth");
      return;
    }

    if ((session || demoAccessEnabled) && pathname === "/auth") {
      hasRedirectedRef.current = true;
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
    return <UnlockPanel />;
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
