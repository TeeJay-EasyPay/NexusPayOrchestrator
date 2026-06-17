/**
 * NexusPay Orchestrator — Provider Registry
 * External Rail Readiness Sprint — 2026-06-16
 *
 * Pluggable registry of collection, payout, and FX providers.
 * All providers are resolved by mode (mock/sandbox/live) at runtime.
 * No real partner credentials required.
 */

import {
    CollectionProvider,
    FXProvider,
    PayoutProvider,
    ProviderHealthStatus,
    ProviderMode,
    ProviderRegistryEntry,
    ProviderType,
} from './types';

// ─── Registry Store ───────────────────────────────────────────────────────────

interface RegistryStore {
  collection: Map<string, CollectionProvider>;
  payout: Map<string, PayoutProvider>;
  fx: Map<string, FXProvider>;
  meta: Map<string, ProviderRegistryEntry>;
}

const store: RegistryStore = {
  collection: new Map(),
  payout: new Map(),
  fx: new Map(),
  meta: new Map(),
};

// ─── Registration ─────────────────────────────────────────────────────────────

export function registerCollectionProvider(
  provider: CollectionProvider,
  meta: Omit<ProviderRegistryEntry, 'name' | 'type' | 'mode'>,
): void {
  store.collection.set(provider.providerName, provider);
  store.meta.set(provider.providerName, {
    name: provider.providerName,
    type: 'collection',
    mode: provider.mode,
    ...meta,
  });
}

export function registerPayoutProvider(
  provider: PayoutProvider,
  meta: Omit<ProviderRegistryEntry, 'name' | 'type' | 'mode'>,
): void {
  store.payout.set(provider.providerName, provider);
  store.meta.set(provider.providerName, {
    name: provider.providerName,
    type: 'payout',
    mode: provider.mode,
    ...meta,
  });
}

export function registerFXProvider(
  provider: FXProvider,
  meta: Omit<ProviderRegistryEntry, 'name' | 'type' | 'mode'>,
): void {
  store.fx.set(provider.providerName, provider);
  store.meta.set(provider.providerName, {
    name: provider.providerName,
    type: 'fx',
    mode: provider.mode,
    ...meta,
  });
}

// ─── Resolution ───────────────────────────────────────────────────────────────

/**
 * Get the active provider mode from environment.
 * Defaults to 'mock' when EXPO_PUBLIC_PROVIDER_MODE is not set.
 */
export function getProviderMode(): ProviderMode {
  const mode = process.env['EXPO_PUBLIC_PROVIDER_MODE'] as ProviderMode | undefined;
  if (mode === 'sandbox' || mode === 'live') return mode;
  return 'mock';
}

/**
 * Resolve the highest-priority enabled collection provider for a corridor.
 */
export function resolveCollectionProvider(
  corridor: string,
  mode?: ProviderMode,
): CollectionProvider | null {
  const targetMode = mode ?? getProviderMode();
  let best: CollectionProvider | null = null;
  let bestPriority = -1;

  for (const [name, provider] of store.collection) {
    if (provider.mode !== targetMode) continue;
    const meta = store.meta.get(name);
    if (!meta || !meta.enabled) continue;
    if (!meta.supportedCorridors.includes(corridor) && !meta.supportedCorridors.includes('*'))
      continue;
    if (meta.priority > bestPriority) {
      bestPriority = meta.priority;
      best = provider;
    }
  }

  return best;
}

/**
 * Resolve the highest-priority enabled payout provider for a corridor.
 */
export function resolvePayoutProvider(
  corridor: string,
  mode?: ProviderMode,
): PayoutProvider | null {
  const targetMode = mode ?? getProviderMode();
  let best: PayoutProvider | null = null;
  let bestPriority = -1;

  for (const [name, provider] of store.payout) {
    if (provider.mode !== targetMode) continue;
    const meta = store.meta.get(name);
    if (!meta || !meta.enabled) continue;
    if (!meta.supportedCorridors.includes(corridor) && !meta.supportedCorridors.includes('*'))
      continue;
    if (meta.priority > bestPriority) {
      bestPriority = meta.priority;
      best = provider;
    }
  }

  return best;
}

/**
 * Resolve the highest-priority enabled FX provider for a currency pair.
 */
export function resolveFXProvider(
  sourceCurrency: string,
  destinationCurrency: string,
  mode?: ProviderMode,
): FXProvider | null {
  const targetMode = mode ?? getProviderMode();
  const pair = `${sourceCurrency}-${destinationCurrency}`;
  let best: FXProvider | null = null;
  let bestPriority = -1;

  for (const [name, provider] of store.fx) {
    if (provider.mode !== targetMode) continue;
    const meta = store.meta.get(name);
    if (!meta || !meta.enabled) continue;
    if (
      !meta.supportedCurrencies.includes(sourceCurrency) ||
      !meta.supportedCurrencies.includes(destinationCurrency)
    ) {
      if (!meta.supportedCorridors.includes(pair) && !meta.supportedCorridors.includes('*'))
        continue;
    }
    if (meta.priority > bestPriority) {
      bestPriority = meta.priority;
      best = provider;
    }
  }

  return best;
}

// ─── Health Checks ────────────────────────────────────────────────────────────

export async function runHealthChecks(): Promise<Record<string, ProviderHealthStatus>> {
  const results: Record<string, ProviderHealthStatus> = {};

  const checks: Promise<void>[] = [];

  for (const [name, provider] of store.collection) {
    checks.push(
      provider
        .healthCheck()
        .then((status) => {
          results[name] = status.healthStatus;
          const meta = store.meta.get(name);
          if (meta) {
            meta.healthStatus = status.healthStatus;
            meta.lastHealthCheck = new Date().toISOString();
          }
        })
        .catch(() => {
          results[name] = 'UNKNOWN';
        }),
    );
  }

  for (const [name, provider] of store.payout) {
    checks.push(
      provider
        .healthCheck()
        .then((status) => {
          results[name] = status.healthStatus;
          const meta = store.meta.get(name);
          if (meta) {
            meta.healthStatus = status.healthStatus;
            meta.lastHealthCheck = new Date().toISOString();
          }
        })
        .catch(() => {
          results[name] = 'UNKNOWN';
        }),
    );
  }

  for (const [name, provider] of store.fx) {
    checks.push(
      provider
        .healthCheck()
        .then((status) => {
          results[name] = status.healthStatus;
          const meta = store.meta.get(name);
          if (meta) {
            meta.healthStatus = status.healthStatus;
            meta.lastHealthCheck = new Date().toISOString();
          }
        })
        .catch(() => {
          results[name] = 'UNKNOWN';
        }),
    );
  }

  await Promise.allSettled(checks);
  return results;
}

// ─── Listing ──────────────────────────────────────────────────────────────────

export function listAllProviders(): ProviderRegistryEntry[] {
  return Array.from(store.meta.values());
}

export function listProvidersByType(type: ProviderType): ProviderRegistryEntry[] {
  return Array.from(store.meta.values()).filter((p) => p.type === type);
}

export function getProviderMeta(name: string): ProviderRegistryEntry | undefined {
  return store.meta.get(name);
}

// ─── Enable / Disable ─────────────────────────────────────────────────────────

export function setProviderEnabled(name: string, enabled: boolean): void {
  const meta = store.meta.get(name);
  if (meta) meta.enabled = enabled;
}
