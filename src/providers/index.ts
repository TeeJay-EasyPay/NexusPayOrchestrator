/**
 * NexusPay Orchestrator — Provider System Index
 * External Rail Readiness Sprint — 2026-06-16
 *
 * Single entry point for the provider abstraction layer.
 * Import provider interfaces, registry functions, and mock adapters from here.
 */

// ── Types ─────────────────────────────────────────────────────────────────────
export type {
    CollectionProvider, CollectionRequest,
    CollectionStatusRequest, FXProvider, FXQuote, FXQuoteRequest, PayoutProvider, PayoutRecipient,
    PayoutRequest,
    PayoutStatusRequest, ProviderCapability, ProviderExecutionResult, ProviderExecutionStatus, ProviderHealthStatus, ProviderMode, ProviderRegistryEntry, ProviderStatus, ProviderType
} from './types';

// ── Registry ──────────────────────────────────────────────────────────────────
export {
    getProviderMeta, getProviderMode, listAllProviders,
    listProvidersByType, registerCollectionProvider, registerFXProvider, registerPayoutProvider, resolveCollectionProvider, resolveFXProvider, resolvePayoutProvider, runHealthChecks, setProviderEnabled
} from './registry';

// ── Mock Providers ────────────────────────────────────────────────────────────
export { initMockProviders } from './mock/index';

