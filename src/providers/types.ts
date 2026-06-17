/**
 * NexusPay Orchestrator — Provider Types
 * External Rail Readiness Sprint — 2026-06-16
 *
 * Clean provider interfaces designed so that real sandbox providers can be
 * plugged in without redesigning the platform. All simulated flows continue
 * to work unchanged.
 */

// ─── Provider Mode ────────────────────────────────────────────────────────────

export type ProviderMode = 'mock' | 'sandbox' | 'live';

// ─── Provider Types ───────────────────────────────────────────────────────────

export type ProviderType = 'collection' | 'payout' | 'fx';

// ─── Provider Capability ─────────────────────────────────────────────────────

export interface ProviderCapability {
  /** Can initiate a collection/payout immediately */
  immediateExecution: boolean;
  /** Supports OAuth-style user authorization flow */
  authorizationFlow: boolean;
  /** Supports webhook-based status updates */
  webhookSupport: boolean;
  /** Supports retry on transient failure */
  retrySupport: boolean;
  /** Supports cancellation */
  cancellationSupport: boolean;
  /** Supports refund/return */
  returnSupport: boolean;
  /** Supports FX quote locking */
  fxLocking: boolean;
  /** Supported ISO 4217 currency codes */
  supportedCurrencies: string[];
  /** Supported corridor codes e.g. "GBP-NGN" */
  supportedCorridors: string[];
}

// ─── Provider Status ─────────────────────────────────────────────────────────

export type ProviderHealthStatus =
  | 'HEALTHY'
  | 'DEGRADED'
  | 'DOWN'
  | 'UNKNOWN'
  | 'MAINTENANCE';

export interface ProviderStatus {
  healthy: boolean;
  healthStatus: ProviderHealthStatus;
  lastChecked: string; // ISO 8601
  message?: string;
  latencyMs?: number;
}

// ─── Provider Execution Result ────────────────────────────────────────────────

export type ProviderExecutionStatus =
  | 'SUCCESS'
  | 'PENDING'
  | 'FAILED'
  | 'REQUIRES_AUTHORIZATION'
  | 'CANCELLED'
  | 'RETRY_RECOMMENDED';

export interface ProviderExecutionResult {
  status: ProviderExecutionStatus;
  /** Provider-specific external reference/transaction ID */
  externalReference?: string;
  /** ISO 8601 timestamp of execution */
  executedAt: string;
  /** Provider-specific raw response (for audit) */
  rawResponse?: Record<string, unknown>;
  /** Error code from provider */
  errorCode?: string;
  /** Human-readable error message */
  errorMessage?: string;
  /** Whether a retry is recommended */
  retryEligible?: boolean;
  /** URL to redirect user for authorization (collection providers) */
  authorizationUrl?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

// ─── Collection Provider ──────────────────────────────────────────────────────

export interface CollectionRequest {
  transferId: string;
  userId: string;
  accountId: string;
  amount: number;
  currency: string;
  reference: string;
  sourceAccountDetails?: Record<string, unknown>;
  redirectUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface CollectionStatusRequest {
  transferId: string;
  externalReference: string;
}

export interface CollectionProvider {
  readonly providerName: string;
  readonly providerType: 'collection';
  readonly mode: ProviderMode;
  readonly capabilities: ProviderCapability;

  /** Check provider health */
  healthCheck(): Promise<ProviderStatus>;

  /**
   * Initiate a collection. May return REQUIRES_AUTHORIZATION
   * with an authorizationUrl for open-banking flows.
   */
  initiateCollection(request: CollectionRequest): Promise<ProviderExecutionResult>;

  /**
   * Confirm user has authorized the collection (post-redirect).
   */
  confirmAuthorization(
    transferId: string,
    authorizationCode: string,
  ): Promise<ProviderExecutionResult>;

  /**
   * Poll/retrieve current collection status.
   */
  getCollectionStatus(request: CollectionStatusRequest): Promise<ProviderExecutionResult>;

  /**
   * Cancel a pending collection.
   */
  cancelCollection(transferId: string, externalReference: string): Promise<ProviderExecutionResult>;
}

// ─── Payout Provider ──────────────────────────────────────────────────────────

export interface PayoutRecipient {
  id: string;
  name: string;
  accountNumber?: string;
  routingCode?: string;
  bankCode?: string;
  iban?: string;
  swiftBic?: string;
  mobileWallet?: string;
  country: string;
  currency: string;
  metadata?: Record<string, unknown>;
}

export interface PayoutRequest {
  transferId: string;
  userId: string;
  accountId: string;
  amount: number;
  sourceCurrency: string;
  destinationCurrency: string;
  destinationAmount?: number;
  recipient: PayoutRecipient;
  reference: string;
  fxQuoteId?: string;
  metadata?: Record<string, unknown>;
}

export interface PayoutStatusRequest {
  transferId: string;
  externalReference: string;
}

export interface PayoutProvider {
  readonly providerName: string;
  readonly providerType: 'payout';
  readonly mode: ProviderMode;
  readonly capabilities: ProviderCapability;

  /** Check provider health */
  healthCheck(): Promise<ProviderStatus>;

  /**
   * Validate recipient details before submitting payout.
   */
  validateRecipient(recipient: PayoutRecipient): Promise<ProviderExecutionResult>;

  /**
   * Submit a payout to the provider.
   */
  submitPayout(request: PayoutRequest): Promise<ProviderExecutionResult>;

  /**
   * Retrieve current payout status.
   */
  getPayoutStatus(request: PayoutStatusRequest): Promise<ProviderExecutionResult>;

  /**
   * Retry a failed payout.
   */
  retryPayout(transferId: string, externalReference: string): Promise<ProviderExecutionResult>;

  /**
   * Cancel a pending payout (if supported).
   */
  cancelPayout(transferId: string, externalReference: string): Promise<ProviderExecutionResult>;
}

// ─── FX Provider ─────────────────────────────────────────────────────────────

export interface FXQuoteRequest {
  sourceCurrency: string;
  destinationCurrency: string;
  sourceAmount?: number;
  destinationAmount?: number;
  corridor?: string;
  transferId?: string;
}

export interface FXQuote {
  quoteId: string;
  sourceCurrency: string;
  destinationCurrency: string;
  sourceAmount: number;
  destinationAmount: number;
  exchangeRate: number;
  fee: number;
  feeCurrency: string;
  totalCost: number;
  expiresAt: string; // ISO 8601
  provider: string;
  locked: boolean;
}

export interface FXProvider {
  readonly providerName: string;
  readonly providerType: 'fx';
  readonly mode: ProviderMode;
  readonly capabilities: ProviderCapability;

  /** Check provider health */
  healthCheck(): Promise<ProviderStatus>;

  /**
   * Request an FX quote.
   */
  requestQuote(request: FXQuoteRequest): Promise<FXQuote>;

  /**
   * Lock a quote to guarantee the rate.
   */
  lockQuote(quoteId: string): Promise<FXQuote>;

  /**
   * Expire/release a locked quote.
   */
  expireQuote(quoteId: string): Promise<void>;
}

// ─── Provider Registry Entry ──────────────────────────────────────────────────

export interface ProviderRegistryEntry {
  name: string;
  type: ProviderType;
  mode: ProviderMode;
  enabled: boolean;
  priority: number;
  /** 0–100, higher is better */
  reliabilityScore: number;
  /** 0–100, higher is cheaper */
  costScore: number;
  /** 0–100, higher is faster */
  speedScore: number;
  supportedCorridors: string[];
  supportedCurrencies: string[];
  healthStatus: ProviderHealthStatus;
  lastHealthCheck?: string;
  description?: string;
}
