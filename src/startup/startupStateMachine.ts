import {
  DEFAULT_AUTHENTICATED_STARTUP_ROUTE,
  DEFAULT_UNAUTHENTICATED_STARTUP_ROUTE,
  isPublicStartupRoute,
  normalizeStartupPathname,
} from "./startupRoutes";

export type StartupPhase =
  | "bootstrapping"
  | "unauthenticated"
  | "authenticated"
  | "locked";

export type StartupRenderMode =
  | "content"
  | "startup-overlay"
  | "locked-overlay";

export type StartupRedirectReason =
  | "unauthenticated-protected-route"
  | "authenticated-public-route"
  | "locked-public-route"
  | "founder-validation-startup-override";

export type StartupRouteAction =
  | {
      type: "allow";
      targetRoute: null;
      reason: null;
    }
  | {
      type: "replace";
      targetRoute: string;
      reason: StartupRedirectReason;
    };

export type StartupDecisionInput = {
  pathname: string;
  loading: boolean;
  sessionValidated: boolean;
  resetInProgress: boolean;
  sessionPresent: boolean;
  demoAccessEnabled: boolean;
  locked: boolean;
  lastProtectedRoute: string | null;
};

export type StartupDecision = {
  phase: StartupPhase;
  pathname: string;
  isPublicRoute: boolean;
  hasAccess: boolean;
  routeAction: StartupRouteAction;
  renderMode: StartupRenderMode;
  startupDestination: string;
  startupComplete: boolean;
  routingDecision: string;
};

function fallbackProtectedRoute(route: string | null): string {
  if (!route || isPublicStartupRoute(route)) {
    return DEFAULT_AUTHENTICATED_STARTUP_ROUTE;
  }

  return normalizeStartupPathname(route);
}

function allowDecision(
  input: StartupDecisionInput,
  phase: StartupPhase,
  renderMode: StartupRenderMode,
  startupComplete: boolean
): StartupDecision {
  const pathname = normalizeStartupPathname(input.pathname);

  return {
    phase,
    pathname,
    isPublicRoute: isPublicStartupRoute(pathname),
    hasAccess: input.sessionValidated && (input.sessionPresent || input.demoAccessEnabled),
    routeAction: {
      type: "allow",
      targetRoute: null,
      reason: null,
    },
    renderMode,
    startupDestination: pathname,
    startupComplete,
    routingDecision: `allow:${pathname}`,
  };
}

function replaceDecision(
  input: StartupDecisionInput,
  phase: StartupPhase,
  targetRoute: string,
  reason: StartupRedirectReason
): StartupDecision {
  const pathname = normalizeStartupPathname(input.pathname);
  const target = normalizeStartupPathname(targetRoute);

  return {
    phase,
    pathname,
    isPublicRoute: isPublicStartupRoute(pathname),
    hasAccess: input.sessionValidated && (input.sessionPresent || input.demoAccessEnabled),
    routeAction: {
      type: "replace",
      targetRoute: target,
      reason,
    },
    renderMode: "startup-overlay",
    startupDestination: target,
    startupComplete: false,
    routingDecision: `replace:${pathname}->${target}`,
  };
}

export function resolveStartupDecision(input: StartupDecisionInput): StartupDecision {
  const pathname = normalizeStartupPathname(input.pathname);
  const isPublicRoute = isPublicStartupRoute(pathname);
  const authPending = input.loading || !input.sessionValidated || input.resetInProgress;

  if (authPending) {
    return allowDecision({ ...input, pathname }, "bootstrapping", "startup-overlay", false);
  }

  const hasAccess = input.sessionPresent || input.demoAccessEnabled;

  if (!hasAccess) {
    if (isPublicRoute) {
      return allowDecision(input, "unauthenticated", "content", true);
    }

    return replaceDecision(
      input,
      "unauthenticated",
      DEFAULT_UNAUTHENTICATED_STARTUP_ROUTE,
      "unauthenticated-protected-route"
    );
  }

  if (input.locked) {
    if (isPublicRoute) {
      return replaceDecision(
        input,
        "locked",
        fallbackProtectedRoute(input.lastProtectedRoute),
        "locked-public-route"
      );
    }

    return allowDecision(input, "locked", "locked-overlay", true);
  }

  if (isPublicRoute) {
    return replaceDecision(
      input,
      "authenticated",
      fallbackProtectedRoute(input.lastProtectedRoute),
      "authenticated-public-route"
    );
  }

  return allowDecision(input, "authenticated", "content", true);
}
