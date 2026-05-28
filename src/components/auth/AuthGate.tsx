import { usePathname, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import {
    logStartupInfo,
    logStartupWarn,
} from "../../services/startupLogger";
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

const ROUTING_BOOTSTRAP_TIMEOUT_MS = 6000;

export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { session, loading, demoAccessEnabled } = useAuth();
  const { locked, unlock, biometricAvailable } = useDeviceUnlock();
  const pathname = usePathname();
  const lastRedirectRef = useRef<string | null>(null);
  const unlockPromptInFlightRef = useRef(false);
  const lastProtectedRouteRef = useRef<string>("/");
  const routingWatchdogTriggeredRef = useRef(false);
  const [allowRenderOnWatchdog, setAllowRenderOnWatchdog] = useState(false);

  const isPublicRoute = PUBLIC_ROUTES.has(pathname);
  const hasAccess = Boolean(session) || demoAccessEnabled;

  useEffect(() => {
    logStartupInfo({
      event: "routing-state",
      stage: "routing-init",
      status: "start",
      details: {
        pathname,
        loading,
        hasAccess,
        locked,
      },
    });
  }, [hasAccess, loading, locked, pathname]);

  useEffect(() => {
    if (!isPublicRoute) {
      lastProtectedRouteRef.current = pathname;
    }
  }, [isPublicRoute, pathname]);

  useEffect(() => {
    if (loading) return;

    const target = !hasAccess && !isPublicRoute
      ? "/auth"
      : hasAccess && isPublicRoute && !locked
        ? lastProtectedRouteRef.current || "/"
        : null;

    if (!target || pathname === target || lastRedirectRef.current === target) {
      return;
    }

    lastRedirectRef.current = target;
    logStartupInfo({
      event: "routing-redirect",
      stage: "routing-init",
      status: "success",
      details: {
        from: pathname,
        to: target,
      },
    });
    router.replace(target);
  }, [hasAccess, isPublicRoute, loading, locked, pathname, router]);

  useEffect(() => {
    lastRedirectRef.current = null;
  }, [pathname]);

  useEffect(() => {
    if (loading) return;
    if (!hasAccess || isPublicRoute || !locked || !biometricAvailable) return;
    if (unlockPromptInFlightRef.current) return;

    unlockPromptInFlightRef.current = true;

    unlock().finally(() => {
      unlockPromptInFlightRef.current = false;
    });
  }, [loading, hasAccess, isPublicRoute, locked, biometricAvailable, unlock]);

  useEffect(() => {
    if (!loading) {
      routingWatchdogTriggeredRef.current = false;
      setAllowRenderOnWatchdog(false);
      return;
    }

    const watchdog = setTimeout(() => {
      if (routingWatchdogTriggeredRef.current) {
        return;
      }

      routingWatchdogTriggeredRef.current = true;

      logStartupWarn({
        event: "routing-watchdog-timeout",
        stage: "routing-init",
        status: "fallback",
        details: {
          pathname,
          timeoutMs: ROUTING_BOOTSTRAP_TIMEOUT_MS,
        },
      });

      if (pathname !== "/auth") {
        router.replace("/auth");
      }

      setAllowRenderOnWatchdog(true);
    }, ROUTING_BOOTSTRAP_TIMEOUT_MS);

    return () => clearTimeout(watchdog);
  }, [loading, pathname, router]);

  // Always render children at the same tree position so the expo-router Stack
  // is never unmounted/remounted during auth transitions. Previously the three
  // conditional branches each wrapped children in a View while the fallthrough
  // used a Fragment, causing the Stack to remount when pathname changed to a
  // public route — which left expo-router in a blank, unrecoverable state.
  const shouldShowOverlay =
    (!allowRenderOnWatchdog && loading) ||
    (!allowRenderOnWatchdog && !hasAccess && !isPublicRoute) ||
    (!allowRenderOnWatchdog && hasAccess && locked && !isPublicRoute);

  logStartupInfo({
    event: "authgate-render",
    stage: "routing-init",
    status: "start",
    details: {
      pathname,
      loading,
      hasAccess,
      locked,
      isPublicRoute,
      allowRenderOnWatchdog,
      shouldShowOverlay,
    },
  });

  return (
    <View style={styles.root}>
      {children}
      {shouldShowOverlay && <LoadingOverlay />}
    </View>
  );
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
