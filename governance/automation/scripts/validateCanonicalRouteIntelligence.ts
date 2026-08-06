import process from "node:process";
import Module from "node:module";

type RouteQuoteModule = typeof import("../../../src/services/routeIntelligenceService");

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function main() {
  process.loadEnvFile?.(".env");
  const memory = new Map<string, string>();
  const moduleLoader = Module as unknown as {
    _load: (request: string, parent: unknown, isMain: boolean) => unknown;
  };
  const originalLoad = moduleLoader._load;
  moduleLoader._load = (request, parent, isMain) => {
    if (request === "@react-native-async-storage/async-storage") {
      return {
        __esModule: true,
        default: {
          getItem: async (key: string) => memory.get(key) ?? null,
          setItem: async (key: string, value: string) => { memory.set(key, value); },
          removeItem: async (key: string) => { memory.delete(key); },
        },
      };
    }
    return originalLoad(request, parent, isMain);
  };
  const originalLog = console.log;
  console.log = () => undefined;

  const [{ supabase }, routeModule, planModule] = await Promise.all([
    import("../../../src/lib/supabase"),
    import("../../../src/services/routeIntelligenceService") as Promise<RouteQuoteModule>,
    import("../../../src/services/routePlanService"),
  ]);
  const email = process.env.EXPO_PUBLIC_DEMO_EMAIL;
  const password = process.env.EXPO_PUBLIC_DEMO_PASSWORD;
  assert(email && password, "Demo authentication is not configured for route validation.");
  const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
  assert(!authError, `Route validation authentication failed: ${authError?.message}`);

  const input = {
    amount: 250,
    destinationCurrency: "PHP" as const,
    destinationCountry: "Philippines",
    payoutMethod: "BANK" as const,
    fundingMethod: "OPEN_BANKING" as const,
    actualRlusdBalance: 0,
  };
  const first = await routeModule.generateCanonicalRouteQuotes(input);
  const second = await routeModule.generateCanonicalRouteQuotes(input);
  assert(first.length === 2, "Canonical engine must return direct and XRPL evidence candidates.");
  assert(first.every((route) => route.routePlan?.schemaVersion === "1.0"), "Every route requires Route Plan V1.");
  assert(first.every((route, index) => route.id !== second[index]?.id), "Repeat payments must recalculate new route-plan IDs.");
  assert(first.every((route) => route.routePlan?.economics.fxRate.provenance !== "FALLBACK"), "Canonical routes must never consume compile-time FX fallback rates.");

  const direct = first.find((route) => !route.routePlan?.bridge.required);
  const xrpl = first.find((route) => route.routePlan?.bridge.required);
  assert(direct?.routePlan?.settlementMethod.value === "DIRECT_BANKING", "Direct settlement plan missing.");
  assert(xrpl?.routePlan?.settlementMethod.value === "XRPL_BRIDGE", "XRPL settlement plan missing.");
  assert(xrpl.routePlan?.eligible === false, "XRPL/RLUSD must remain blocked without executable path evidence.");
  assert(xrpl.routePlan?.score.value === null, "Blocked XRPL route must not carry a fabricated score.");

  const persistenceTransferId = crypto.randomUUID();
  const persistedRoutes = routeModule.bindRouteQuotesToTransfer(first, persistenceTransferId);
  assert(await planModule.persistRoutePlans(persistedRoutes), "Route Plan candidates were not persisted.");
  for (const route of persistedRoutes) {
    assert(
      await planModule.transitionRoutePlan(route, "SUPERSEDED", "Automated canonical Route Plan validation completed."),
      `Route Plan ${route.id} could not be closed after validation.`,
    );
  }
  const persistenceEvents = await planModule.loadRoutePlanEvents(persistenceTransferId);
  assert(persistenceEvents.length === persistedRoutes.length, "Immutable Route Plan transition events are incomplete.");
  await supabase.auth.signOut();
  const { data: anonymousRows, error: anonymousError } = await supabase
    .from("route_plans")
    .select("id")
    .eq("transfer_id", persistenceTransferId);
  assert(Boolean(anonymousError) || anonymousRows?.length === 0, "Anonymous access exposed an owner-scoped Route Plan.");

  console.log = originalLog;
  process.stdout.write(`${JSON.stringify({
    result: "PASS",
    directRoute: {
      eligible: direct.routePlan?.eligible,
      score: direct.routePlan?.score.value,
      fxProvenance: direct.routePlan?.economics.fxRate.provenance,
      fundingProvenance: direct.routePlan?.funding.provider.status.provenance,
      payoutProvenance: direct.routePlan?.payout.provider.status.provenance,
      reasons: direct.routePlan?.eligibilityReasons,
    },
    xrplRoute: {
      eligible: xrpl.routePlan?.eligible,
      score: xrpl.routePlan?.score.value,
      reasons: xrpl.routePlan?.eligibilityReasons,
    },
    repeatRouteRecalculated: true,
    persistence: {
      transferId: persistenceTransferId,
      plansPersisted: persistedRoutes.length,
      transitionEvents: persistenceEvents.length,
      terminalTestStatus: "SUPERSEDED",
      anonymousReadBlocked: true,
    },
  }, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
