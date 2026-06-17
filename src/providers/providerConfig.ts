/**
 * NexusPay Orchestrator — Provider Configuration
 * External Rail Readiness Sprint — 2026-06-16
 *
 * Environment variable conventions for external provider integration.
 *
 * SECURITY MODEL:
 * ─────────────────────────────────────────────────────────────────────────────
 * FRONTEND-SAFE variables (can appear in EXPO_PUBLIC_ namespace):
 *   - EXPO_PUBLIC_PROVIDER_MODE       ('mock' | 'sandbox' | 'live')
 *   - EXPO_PUBLIC_COLLECTION_PROVIDER (provider name for display only)
 *   - EXPO_PUBLIC_PAYOUT_PROVIDER     (provider name for display only)
 *
 * SERVER-SIDE ONLY (must NEVER appear in mobile app bundle):
 *   - TRUELAYER_CLIENT_ID
 *   - TRUELAYER_CLIENT_SECRET
 *   - YAPILY_CLIENT_ID
 *   - YAPILY_CLIENT_SECRET
 *   - PLAID_CLIENT_ID
 *   - PLAID_CLIENT_SECRET
 *   - TINK_CLIENT_ID
 *   - TINK_CLIENT_SECRET
 *   - TOKEN_IO_CLIENT_ID
 *   - TOKEN_IO_CLIENT_SECRET
 *   - NIUM_CLIENT_ID
 *   - NIUM_CLIENT_SECRET
 *   - TRANGLO_API_KEY
 *   - THUNES_API_KEY
 *   - CURRENCYCLOUD_LOGIN_ID
 *   - CURRENCYCLOUD_API_KEY
 *   - AIRWALLEX_CLIENT_ID
 *   - AIRWALLEX_CLIENT_SECRET
 *   - RAPYD_ACCESS_KEY
 *   - RAPYD_SECRET_KEY
 *
 * All server-side secrets should be stored in:
 *   - Supabase Edge Function Secrets (for Edge Function execution)
 *   - NOT in .env files committed to source control
 *   - NOT in the Expo app bundle
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ─── Frontend-Safe Config ─────────────────────────────────────────────────────

export interface ProviderPublicConfig {
  /** Current provider mode: mock | sandbox | live */
  mode: 'mock' | 'sandbox' | 'live';
  /** Active collection provider name (for UI display) */
  collectionProviderName: string;
  /** Active payout provider name (for UI display) */
  payoutProviderName: string;
}

export function getProviderPublicConfig(): ProviderPublicConfig {
  const mode =
    (process.env['EXPO_PUBLIC_PROVIDER_MODE'] as 'mock' | 'sandbox' | 'live') ?? 'mock';
  return {
    mode,
    collectionProviderName:
      process.env['EXPO_PUBLIC_COLLECTION_PROVIDER'] ?? 'MockOpenBankingCollectionProvider',
    payoutProviderName:
      process.env['EXPO_PUBLIC_PAYOUT_PROVIDER'] ?? 'MockNiumProvider',
  };
}

// ─── Edge Function Contract ───────────────────────────────────────────────────

/**
 * Recommended Supabase Edge Functions for provider execution.
 *
 * These functions should own all server-side provider calls so that:
 * 1. Provider secrets never reach the mobile client.
 * 2. Provider events are persisted server-side before the client is notified.
 * 3. Retries and webhook handling are managed server-side.
 * 4. Audit trail is server-authoritative.
 */
export const EDGE_FUNCTION_CONTRACTS = {
  /** Initiate a collection with the configured first-leg provider */
  INITIATE_COLLECTION: 'nexuspay-initiate-collection',

  /** Confirm collection authorization after user redirect */
  CONFIRM_COLLECTION_AUTH: 'nexuspay-confirm-collection-auth',

  /** Poll collection status */
  GET_COLLECTION_STATUS: 'nexuspay-get-collection-status',

  /** Submit payout to last-leg provider */
  SUBMIT_PAYOUT: 'nexuspay-submit-payout',

  /** Poll payout status */
  GET_PAYOUT_STATUS: 'nexuspay-get-payout-status',

  /** Handle inbound provider webhook */
  PROVIDER_WEBHOOK: 'nexuspay-provider-webhook',

  /** Request FX quote */
  REQUEST_FX_QUOTE: 'nexuspay-request-fx-quote',

  /** Lock FX quote */
  LOCK_FX_QUOTE: 'nexuspay-lock-fx-quote',

  /** Run provider health checks */
  HEALTH_CHECK: 'nexuspay-provider-health-check',
} as const;

// ─── Supabase Table Recommendations ──────────────────────────────────────────

/**
 * Recommended Supabase tables for external rail readiness.
 * These tables should be created when transitioning from mock to sandbox.
 *
 * provider_execution_sessions:
 *   id, transfer_id, user_id, account_id, provider, provider_type,
 *   mode, status, initiated_at, completed_at, external_reference, metadata
 *
 * provider_events:
 *   id, transfer_id, user_id, account_id, provider, provider_type,
 *   event_type, provider_status, transfer_state, timestamp,
 *   external_reference, error_code, error_message, retry_eligible, metadata
 *
 * provider_webhooks:
 *   id, provider, event_type, payload, received_at, processed, processed_at, error
 *
 * route_certifications:
 *   id, corridor, collection_provider, payout_provider, fx_provider,
 *   status, certification_result, last_tested, evidence,
 *   failure_reason, retry_recommendation, founder_approval_state,
 *   founder_approved_at, created_at, updated_at
 *
 * sandbox_test_results:
 *   id, test_run_id, corridor, collection_provider, payout_provider,
 *   scenario, result, events_captured, duration_ms, ran_at, error
 */
export const SUPABASE_TABLE_NAMES = {
  PROVIDER_EXECUTION_SESSIONS: 'provider_execution_sessions',
  PROVIDER_EVENTS: 'provider_events',
  PROVIDER_WEBHOOKS: 'provider_webhooks',
  ROUTE_CERTIFICATIONS: 'route_certifications',
  SANDBOX_TEST_RESULTS: 'sandbox_test_results',
} as const;
