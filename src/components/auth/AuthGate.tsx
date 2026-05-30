import { usePathname, useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { upsertStartupEvidence } from "../../services/startupEvidence";
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
  const {
    session,
    loading,
    demoAccessEnabled,
    startupPhase,
    resetInProgress,
    sessionValidated,
  } = useAuth();
  const { locked, unlock, biometricAvailable } = useDeviceUnlock();
  const pathname = usePathname();
  const lastRedirectRef = useRef<string | null>(null);
  const lastRedirectReasonRef = useRef<string | null>(null);
  const unlockPromptInFlightRef = useRef(false);
  const lastProtectedRouteRef = useRef<string>("/");
  const routingWatchdogTriggeredRef = useRef(false);

  const isPublicRoute = PUBLIC_ROUTES.has(pathname);
  const hasAccess = sessionValidated && (Boolean(session) || demoAccessEnabled);
  const finalAuthPhase =
    loading || !sessionValidated
      ? "bootstrapping"
      : hasAccess && locked
        ? "locked"
        : hasAccess
          ? "authenticated"
          : "unauthenticated";

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
        startupPhase,
        resetInProgress,
        sessionValidated,
        finalAuthPhase,
      },
    });
  }, [
    finalAuthPhase,
    hasAccess,
    loading,
    locked,
    pathname,
    resetInProgress,
    sessionValidated,
    startupPhase,
  ]);

  useEffect(() => {
    if (!isPublicRoute) {
      lastProtectedRouteRef.current = pathname;
    }
  }, [isPublicRoute, pathname]);

  useEffect(() => {
    if (finalAuthPhase === "bootstrapping") return;

    const canRedirectToProtected = finalAuthPhase === "authenticated";
    const redirectReason =
      finalAuthPhase === "unauthenticated" && !isPublicRoute
        ? "unauthenticated-protected-route"
        : canRedirectToProtected && isPublicRoute
          ? "authenticated-on-public-route"
          : null;

    const target = finalAuthPhase === "unauthenticated" && !isPublicRoute
      ? "/auth"
      : canRedirectToProtected && isPublicRoute
        ? lastProtectedRouteRef.current || "/"
        : null;

    if (!target || pathname === target || lastRedirectRef.current === target) {
      return;
    }

    lastRedirectRef.current = target;
    lastRedirectReasonRef.current = redirectReason;
    logStartupInfo({
      event: "routing-redirect",
      stage: "routing-init",
      status: "success",
      details: {
        from: pathname,
        to: target,
        redirectReason,
        finalAuthPhase,
      },
    });
    router.replace(target);
  }, [finalAuthPhase, isPublicRoute, pathname, router]);

  useEffect(() => {
    lastRedirectRef.current = null;
  }, [pathname]);

  useEffect(() => {
    const startupDestination =
      finalAuthPhase === "unauthenticated"
        ? "/auth"
        : finalAuthPhase === "authenticated"
          ? isPublicRoute
            ? lastProtectedRouteRef.current || "/"
            : pathname
          : pathname;

    void upsertStartupEvidence({
      finalAuthPhase,
      sessionValidated,
      redirectReason: lastRedirectReasonRef.current,
      startupDestination,
      routeReached: pathname,
    });
  }, [finalAuthPhase, isPublicRoute, pathname, sessionValidated]);

  useEffect(() => {
    if (finalAuthPhase === "bootstrapping") return;
    if (!hasAccess || isPublicRoute || !locked || !biometricAvailable) return;
    if (unlockPromptInFlightRef.current) return;

    unlockPromptInFlightRef.current = true;

    unlock().finally(() => {
      unlockPromptInFlightRef.current = false;
    });
  }, [finalAuthPhase, hasAccess, isPublicRoute, locked, biometricAvailable, unlock]);

  useEffect(() => {
    const bootstrapping = finalAuthPhase === "bootstrapping";

    if (!bootstrapping) {
      routingWatchdogTriggeredRef.current = false;
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
          resetInProgress,
          sessionValidated,
          finalAuthPhase,
        },
      });

      if (pathname !== "/auth") {
        router.replace("/auth");
      }
    }, ROUTING_BOOTSTRAP_TIMEOUT_MS);

    return () => clearTimeout(watchdog);
  }, [finalAuthPhase, pathname, resetInProgress, router, sessionValidated]);

  // Always render children at the same tree position so the expo-router Stack
  // is never unmounted/remounted during auth transitions. Previously the three
  // conditional branches each wrapped children in a View while the fallthrough
  // used a Fragment, causing the Stack to remount when pathname changed to a
  // public route — which left expo-router in a blank, unrecoverable state.
  const shouldShowOverlay =
    (finalAuthPhase === "bootstrapping" && !isPublicRoute) ||
    (finalAuthPhase === "unauthenticated" && !isPublicRoute) ||
    (finalAuthPhase === "locked" && !isPublicRoute);
  const shouldConcealChildren = shouldShowOverlay && !isPublicRoute;

  logStartupInfo({
    event: "authgate-render",
    stage: "routing-init",
    status: "start",
    details: {
      pathname,
      loading,
      hasAccess,
      locked,
      startupPhase,
      resetInProgress,
      sessionValidated,
      finalAuthPhase,
      isPublicRoute,
      shouldShowOverlay,
      shouldConcealChildren,
    },
  });

  return (
    <View style={styles.root}>
      <View pointerEvents={shouldConcealChildren ? "none" : "auto"} style={shouldConcealChildren ? styles.concealed : styles.content}>
        {children}
      </View>
      {shouldShowOverlay && <LoadingOverlay />}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  concealed: {
    flex: 1,
    opacity: 0,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
});
