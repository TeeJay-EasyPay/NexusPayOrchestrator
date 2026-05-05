import { usePathname, useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { useAuth } from "../../state/AuthContext";
import { useDeviceUnlock } from "../../state/DeviceUnlockContext";
import { colors } from "../../theme/colors";

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
  const { locked, unlock, biometricAvailable, unlockWithPassword } = useDeviceUnlock();
  const pathname = usePathname();
  const lastRedirectRef = useRef<string | null>(null);
  const unlockAttemptInProgressRef = useRef(false);

  const isPublicRoute = PUBLIC_ROUTES.has(pathname);
  const hasAccess = Boolean(session) || demoAccessEnabled;

  useEffect(() => {
    if (loading) return;

    const target = !hasAccess && !isPublicRoute
      ? "/auth"
      : hasAccess && isPublicRoute && !locked
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
  }, [hasAccess, isPublicRoute, loading, locked, pathname, router]);

  useEffect(() => {
    lastRedirectRef.current = null;
  }, [pathname]);

  useEffect(() => {
    if (loading || !hasAccess || !locked || isPublicRoute) return;
    if (unlockAttemptInProgressRef.current) return;

    unlockAttemptInProgressRef.current = true;

    async function runUnlock() {
      try {
        if (biometricAvailable) {
          await unlock();
        } else {
          unlockWithPassword();
        }
      } finally {
        unlockAttemptInProgressRef.current = false;
      }
    }

    runUnlock();
  }, [loading, hasAccess, locked, isPublicRoute, biometricAvailable, unlock, unlockWithPassword]);

  if (loading) {
    return (
      <View style={styles.root}>
        {children}
        <LoadingOverlay />
      </View>
    );
  }

  if (!hasAccess && !isPublicRoute) {
    return (
      <View style={styles.root}>
        {children}
        <LoadingOverlay />
      </View>
    );
  }

  // When returning from another app, do not show the old custom unlock screen.
  // Trigger the native biometric prompt and keep the app covered until it unlocks.
  if (hasAccess && locked && !isPublicRoute) {
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
