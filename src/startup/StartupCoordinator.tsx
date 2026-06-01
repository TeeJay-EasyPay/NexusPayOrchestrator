import { usePathname, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useMemo, useRef } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { UnlockPanel } from "../components/auth/UnlockPanel";
import { upsertStartupEvidence } from "../services/startupEvidence";
import { logStartupInfo } from "../services/startupLogger";
import { useAuth } from "../state/AuthContext";
import { useDeviceUnlock } from "../state/DeviceUnlockContext";
import { colors } from "../theme/colors";
import { isPublicStartupRoute, normalizeStartupPathname } from "./startupRoutes";
import { resolveStartupDecision } from "./startupStateMachine";

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

function LoadingOverlay() {
  return (
    <View style={styles.overlay}>
      <ActivityIndicator color={colors.gold} size="large" />
    </View>
  );
}

export function StartupCoordinator({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = normalizeStartupPathname(usePathname());
  const {
    session,
    loading,
    demoAccessEnabled,
    resetInProgress,
    sessionValidated,
  } = useAuth();
  const { locked } = useDeviceUnlock();

  const lastProtectedRouteRef = useRef<string>("/");
  const redirectInFlightRef = useRef<string | null>(null);
  const evidenceSequenceRef = useRef(0);
  const splashHiddenRef = useRef(false);

  if (!isPublicStartupRoute(pathname)) {
    lastProtectedRouteRef.current = pathname;
  }

  const decision = useMemo(
    () =>
      resolveStartupDecision({
        pathname,
        loading,
        sessionValidated,
        resetInProgress,
        sessionPresent: Boolean(session),
        demoAccessEnabled,
        locked,
        lastProtectedRoute: lastProtectedRouteRef.current,
      }),
    [
      demoAccessEnabled,
      loading,
      locked,
      pathname,
      resetInProgress,
      session,
      sessionValidated,
    ]
  );

  useEffect(() => {
    evidenceSequenceRef.current += 1;
    const sequence = evidenceSequenceRef.current;

    logStartupInfo({
      event: "startup-v2-decision",
      stage: "routing-init",
      status: decision.startupComplete ? "success" : "start",
      details: {
        sequence,
        pathname,
        finalAuthPhase: decision.phase,
        hasSession: Boolean(session),
        demoAccessEnabled,
        sessionValidated,
        resetInProgress,
        locked,
        isPublicRoute: decision.isPublicRoute,
        routeAction: decision.routeAction.type,
        redirectReason: decision.routeAction.reason,
        targetRoute: decision.routeAction.targetRoute,
        startupDestination: decision.startupDestination,
        routeReached: pathname,
        routingDecision: decision.routingDecision,
        renderMode: decision.renderMode,
        startupComplete: decision.startupComplete,
      },
    });

    void upsertStartupEvidence({
      sequence,
      finalAuthPhase: decision.phase,
      sessionValidated,
      hasSession: Boolean(session),
      demoAccessEnabled,
      redirectReason: decision.routeAction.reason,
      startupDestination: decision.startupDestination,
      routeReached: pathname,
      routingDecision: decision.routingDecision,
      routeAction: decision.routeAction.type,
      startupComplete: decision.startupComplete,
    });
  }, [
    decision,
    demoAccessEnabled,
    locked,
    pathname,
    resetInProgress,
    session,
    sessionValidated,
  ]);

  useEffect(() => {
    if (decision.routeAction.type !== "replace") {
      redirectInFlightRef.current = null;
      return;
    }

    const target = decision.routeAction.targetRoute;

    if (!target || pathname === target) {
      redirectInFlightRef.current = null;
      return;
    }

    if (redirectInFlightRef.current === target) {
      return;
    }

    redirectInFlightRef.current = target;

    logStartupInfo({
      event: "startup-v2-route-replace",
      stage: "routing-init",
      status: "success",
      details: {
        from: pathname,
        to: target,
        redirectReason: decision.routeAction.reason,
        finalAuthPhase: decision.phase,
      },
    });

    router.replace(target as never);
  }, [decision, pathname, router]);

  useEffect(() => {
    redirectInFlightRef.current = null;
  }, [pathname]);

  useEffect(() => {
    if (splashHiddenRef.current || decision.renderMode === "startup-overlay") {
      return;
    }

    splashHiddenRef.current = true;
    logStartupInfo({
      event: "startup-v2-splash-hide",
      stage: "routing-init",
      status: "success",
      details: {
        renderMode: decision.renderMode,
        routingDecision: decision.routingDecision,
      },
    });

    SplashScreen.hide();
    void SplashScreen.hideAsync().catch(() => undefined);
  }, [decision.renderMode, decision.routingDecision]);

  const shouldConcealChildren = decision.renderMode !== "content";

  return (
    <View style={styles.root}>
      <View
        pointerEvents={shouldConcealChildren ? "none" : "auto"}
        style={shouldConcealChildren ? styles.concealed : styles.content}
      >
        {children}
      </View>

      {decision.renderMode === "startup-overlay" ? <LoadingOverlay /> : null}

      {decision.renderMode === "locked-overlay" ? (
        <View style={styles.overlay}>
          <UnlockPanel />
        </View>
      ) : null}
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
    alignItems: "stretch",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
});
