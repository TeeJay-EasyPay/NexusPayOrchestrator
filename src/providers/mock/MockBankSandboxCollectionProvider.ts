/**
 * NexusPay Orchestrator — Mock Bank Sandbox Collection Provider
 * External Rail Readiness Sprint — 2026-06-16
 *
 * Simulates a direct bank sandbox collection (e.g. Token.io, Plaid, or
 * bank-direct API) where funds are pulled without a user redirect.
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
  immediateExecution: true,
  authorizationFlow: false,
  webhookSupport: true,
  retrySupport: true,
  cancellationSupport: true,
  returnSupport: true,
  fxLocking: false,
  supportedCurrencies: ['GBP', 'EUR', 'USD', 'NGN', 'KES'],
  supportedCorridors: ['*'],
};

type CollectionState = 'PENDING' | 'SETTLED' | 'FAILED' | 'CANCELLED';

const states = new Map<string, CollectionState>();

type Scenario = 'success' | 'fail' | 'delay';

function getScenario(): Scenario {
  const s = process.env['MOCK_COLLECTION_SCENARIO'] as Scenario | undefined;
  if (s === 'fail' || s === 'delay') return s;
  return 'success';
}

export const MockBankSandboxCollectionProvider: CollectionProvider = {
  providerName: 'MockBankSandboxCollectionProvider',
  providerType: 'collection',
  mode: 'mock',
  capabilities: CAPABILITY,

  async healthCheck(): Promise<ProviderStatus> {
    return {
      healthy: true,
      healthStatus: 'HEALTHY',
      lastChecked: new Date().toISOString(),
      message: 'Mock bank sandbox provider is healthy',
      latencyMs: 8,
    };
  },

  async initiateCollection(request: CollectionRequest): Promise<ProviderExecutionResult> {
    const scenario = getScenario();
    const ref = `mock-bank-${request.transferId.slice(0, 8)}`;

    if (scenario === 'fail') {
      states.set(request.transferId, 'FAILED');
      return {
        status: 'FAILED',
        externalReference: ref,
        executedAt: new Date().toISOString(),
        errorCode: 'INSUFFICIENT_FUNDS',
        errorMessage: '[MOCK] Insufficient funds in source account (simulated)',
        retryEligible: false,
      };
    }

    states.set(request.transferId, 'PENDING');
    return {
      status: 'PENDING',
      externalReference: ref,
      executedAt: new Date().toISOString(),
      metadata: {
        provider: 'MockBankSandboxCollectionProvider',
        scenario,
        amount: request.amount,
        currency: request.currency,
      },
    };
  },

  async confirmAuthorization(
    _transferId: string,
    _authorizationCode: string,
  ): Promise<ProviderExecutionResult> {
    // No authorization flow for direct bank sandbox
    return {
      status: 'FAILED',
      executedAt: new Date().toISOString(),
      errorCode: 'NOT_SUPPORTED',
      errorMessage: 'MockBankSandboxCollectionProvider does not support authorization flows',
    };
  },

  async getCollectionStatus(request: CollectionStatusRequest): Promise<ProviderExecutionResult> {
    const scenario = getScenario();
    const state = states.get(request.transferId) ?? 'PENDING';

    if (scenario === 'delay' && state === 'PENDING') {
      return {
        status: 'PENDING',
        externalReference: request.externalReference,
        executedAt: new Date().toISOString(),
        metadata: { provider: 'MockBankSandboxCollectionProvider', delaySimulated: true },
      };
    }

    if (state === 'PENDING') {
      states.set(request.transferId, 'SETTLED');
      return {
        status: 'SUCCESS',
        externalReference: request.externalReference,
        executedAt: new Date().toISOString(),
        metadata: {
          provider: 'MockBankSandboxCollectionProvider',
          settled: true,
        },
      };
    }

    if (state === 'SETTLED') {
      return { status: 'SUCCESS', externalReference: request.externalReference, executedAt: new Date().toISOString() };
    }

    return {
      status: 'FAILED',
      externalReference: request.externalReference,
      executedAt: new Date().toISOString(),
      errorCode: 'COLLECTION_FAILED',
      retryEligible: true,
    };
  },

  async cancelCollection(transferId: string, externalReference: string): Promise<ProviderExecutionResult> {
    states.set(transferId, 'CANCELLED');
    return {
      status: 'CANCELLED',
      externalReference,
      executedAt: new Date().toISOString(),
    };
  },
};
