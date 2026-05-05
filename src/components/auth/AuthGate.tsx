import { usePathname, useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { useAuth } from "../../state/AuthContext";
import { useDeviceUnlock } from "../../state/DeviceUnlockContext";
import { colors } from "../../theme/colors";
import { UnlockPanel } from "./UnlockPanel";

const PUBLIC_ROUTES = new Set([
  "/auth",
  "/check-email",
  "/account-created",
]);

function LoadingOverlay() {
  return (
    <View style={styles.overlay}>
      <ActivityIndicator color={colors.gold} size="large" />
    </View>
  );
}

export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { session, loading, demoAccessEnabled } = useAuth();
  const { locked } = useDeviceUnlock();
  const pathname = usePathname();
  const lastRedirectRef = useRef<string | null>(null);

  const isPublicRoute = PUBLIC_ROUTES.has(pathname);
  const hasAccess = Boolean(session) || demoAccessEnabled;

  useEffect(() => {
    if (loading) return;

    const target = !hasAccess && !isPublicRoute
      ? "/auth"
      : hasAccess && isPublicRoute
        ? "/"
        : null;

    if (!target || pathname === target || lastRedirectRef.current === target) {
      return;
    }

    lastRedirectRef.current = target;

    const timeout = setTimeout(() => {
      router.replace(target);
    }, 0);

    return () => clearTimeout(timeout);
  }, [hasAccess, isPublicRoute, loading, pathname, router]);

  useEffect(() => {
    lastRedirectRef.current = null;
  }, [pathname]);

  // Important: keep the Expo Router Stack mounted while redirecting.
  // If we replace children with a loading screen, the navigator has no registered routes,
  // which causes warnings like: action REPLACE with name "index" was not handled.
  if (loading) {
    return (
      <View style={styles.root}>
        {children}
        <LoadingOverlay />
      </View>
    );
  }

  if (hasAccess && locked && !isPublicRoute) {
    return <UnlockPanel />;
  }

  if (!hasAccess && !isPublicRoute) {
    return (
      <View style={styles.root}>
        {children}
        <LoadingOverlay />
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
});
