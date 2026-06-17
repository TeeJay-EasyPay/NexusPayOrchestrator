export const DEFAULT_AUTHENTICATED_STARTUP_ROUTE = "/";
export const DEFAULT_UNAUTHENTICATED_STARTUP_ROUTE = "/multi-account-preview";

export const PUBLIC_STARTUP_ROUTES = new Set([
  "/multi-account-preview",
  "/auth",
  "/check-email",
  "/account-created",
]);

export function normalizeStartupPathname(pathname?: string | null): string {
  if (!pathname || pathname === "/index") {
    return DEFAULT_AUTHENTICATED_STARTUP_ROUTE;
  }

  const [withoutQuery] = pathname.split("?");
  const normalized =
    withoutQuery.endsWith("/") && withoutQuery !== "/"
      ? withoutQuery.slice(0, -1)
      : withoutQuery;

  return normalized || DEFAULT_AUTHENTICATED_STARTUP_ROUTE;
}

export function isPublicStartupRoute(pathname?: string | null): boolean {
  return PUBLIC_STARTUP_ROUTES.has(normalizeStartupPathname(pathname));
}
