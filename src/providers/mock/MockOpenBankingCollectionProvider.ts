/**
 * NexusPay Orchestrator — Mock Open Banking Collection Provider
 * External Rail Readiness Sprint — 2026-06-16
 *
 * Simulates a TrueLayer/Yapily/Tink-style open banking collection flow:
 *   1. Initiate → redirect user to bank auth
 *   2. User authorises → callback received
 *   3. Funds collected from source account
 *
 * No real partner credentials required.
 */

import {
    CollectionProvider,
    CollectionRequest,
    CollectionStatusRequest,
    ProviderCapability,
    ProviderExecutionResult,
    ProviderStatus,
} from '../types';

const CAPABILITY: ProviderCapability = {
  immediateExecution: false,
  authorizationFlow: true,
  webhookSupport: true,
  retrySupport: true,
  cancellationSupport: true,
  returnSupport: true,
  fxLocking: false,
  supportedCurrencies: ['GBP', 'EUR', 'USD'],
  supportedCorridors: ['*'],
};

// ─── Simulated State Store ────────────────────────────────────────────────────

type CollectionState =
  | 'AWAITING_AUTHORIZATION'
  | 'AUTHORIZED'
  | 'PENDING'
  | 'SETTLED'
  | 'FAILED'
  | 'CANCELLED';

const collectionStates = new Map<string, CollectionState>();

// ─── Scenario Control ─────────────────────────────────────────────────────────
// Set MOCK_COLLECTION_SCENARIO to simulate different outcomes.

type CollectionScenario = 'success' | 'fail' | 'delay' | 'auth_fail';

function getScenario(): CollectionScenario {
  const scenario = process.env['MOCK_COLLECTION_SCENARIO'] as CollectionScenario | undefined;
  if (scenario === 'fail' || scenario === 'delay' || scenario === 'auth_fail') return scenario;
  return 'success';
}

// ─── Provider Implementation ──────────────────────────────────────────────────

export const MockOpenBankingCollectionProvider: CollectionProvider = {
  providerName: 'MockOpenBankingCollectionProvider',
  providerType: 'collection',
  mode: 'mock',
  capabilities: CAPABILITY,

  async healthCheck(): Promise<ProviderStatus> {
    return {
      healthy: true,
      healthStatus: 'HEALTHY',
      lastChecked: new Date().toISOString(),
      message: 'Mock open banking provider is healthy',
      latencyMs: 12,
    };
  },

  async initiateCollection(request: CollectionRequest): Promise<ProviderExecutionResult> {
    const scenario = getScenario();

    if (scenario === 'fail') {
      collectionStates.set(request.transferId, 'FAILED');
      return {
        status: 'FAILED',
        executedAt: new Date().toISOString(),
        errorCode: 'COLLECTION_INITIATION_FAILED',
        errorMessage: '[MOCK] Collection initiation failed (simulated failure)',
        retryEligible: true,
      };
    }

    collectionStates.set(request.transferId, 'AWAITING_AUTHORIZATION');
    const externalRef = `mock-ob-${request.transferId.slice(0, 8)}`;

    return {
      status: 'REQUIRES_AUTHORIZATION',
      externalReference: externalRef,
      executedAt: new Date().toISOString(),
      authorizationUrl: `https://mock-bank.sandbox.nexuspay.com/auth?ref=${externalRef}&redirect=${encodeURIComponent(request.redirectUrl ?? 'nexuspay://collection-callback')}`,
      metadata: {
        provider: 'MockOpenBankingCollectionProvider',
        scenario,
        transferId: request.transferId,
        amount: request.amount,
        currency: request.currency,
      },
    };
  },

  async confirmAuthorization(
    transferId: string,
    _authorizationCode: string,
  ): Promise<ProviderExecutionResult> {
    const scenario = getScenario();

    if (scenario === 'auth_fail') {
      collectionStates.set(transferId, 'FAILED');
      return {
        status: 'FAILED',
        executedAt: new Date().toISOString(),
        errorCode: 'AUTHORIZATION_DENIED',
        errorMessage: '[MOCK] User denied bank authorization (simulated)',
        retryEligible: false,
      };
    }

    collectionStates.set(transferId, 'PENDING');
    return {
      status: 'PENDING',
      externalReference: `mock-ob-auth-${transferId.slice(0, 8)}`,
      executedAt: new Date().toISOString(),
      metadata: {
        provider: 'MockOpenBankingCollectionProvider',
        authorizationConfirmed: true,
      },
    };
  },

  async getCollectionStatus(request: CollectionStatusRequest): Promise<ProviderExecutionResult> {
    const scenario = getScenario();
    const state = collectionStates.get(request.transferId) ?? 'PENDING';

    // Simulate delay scenario: stays PENDING
    if (scenario === 'delay' && state === 'PENDING') {
      return {
        status: 'PENDING',
        externalReference: request.externalReference,
        executedAt: new Date().toISOString(),
        metadata: { provider: 'MockOpenBankingCollectionProvider', delaySimulated: true },
      };
    }

    // Auto-progress from PENDING → SETTLED on poll
    if (state === 'PENDING') {
      collectionStates.set(request.transferId, 'SETTLED');
      return {
        status: 'SUCCESS',
        externalReference: request.externalReference,
        executedAt: new Date().toISOString(),
        metadata: {
          provider: 'MockOpenBankingCollectionProvider',
          settled: true,
          settledAt: new Date().toISOString(),
        },
      };
    }

    if (state === 'SETTLED') {
      return {
        status: 'SUCCESS',
        externalReference: request.externalReference,
        executedAt: new Date().toISOString(),
      };
    }

    if (state === 'FAILED') {
      return {
        status: 'FAILED',
        externalReference: request.externalReference,
        executedAt: new Date().toISOString(),
        errorCode: 'COLLECTION_FAILED',
        errorMessage: '[MOCK] Collection failed',
        retryEligible: true,
      };
    }

    return {
      status: 'PENDING',
      externalReference: request.externalReference,
      executedAt: new Date().toISOString(),
    };
  },

  async cancelCollection(transferId: string, externalReference: string): Promise<ProviderExecutionResult> {
    collectionStates.set(transferId, 'CANCELLED');
    return {
      status: 'CANCELLED',
      externalReference,
      executedAt: new Date().toISOString(),
      metadata: { provider: 'MockOpenBankingCollectionProvider', cancelled: true },
    };
  },
};
