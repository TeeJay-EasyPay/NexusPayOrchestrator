/**
 * NexusPay Orchestrator — Mock Generic Payout Provider
 * External Rail Readiness Sprint — 2026-06-16
 *
 * Generic payout provider for local/domestic corridors.
 * Can be used as a fallback when no corridor-specific provider is registered.
 *
 * No real partner credentials required.
 */

import {
    PayoutProvider,
    PayoutRecipient,
    PayoutRequest,
    PayoutStatusRequest,
    ProviderCapability,
    ProviderExecutionResult,
    ProviderStatus,
} from '../types';

const CAPABILITY: ProviderCapability = {
  immediateExecution: true,
  authorizationFlow: false,
  webhookSupport: false,
  retrySupport: true,
  cancellationSupport: true,
  returnSupport: true,
  fxLocking: false,
  supportedCurrencies: ['GBP', 'EUR', 'USD', 'NGN', 'KES', 'GHS'],
  supportedCorridors: ['*'],
};

type PayoutState = 'SUBMITTED' | 'ACCEPTED' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
const states = new Map<string, PayoutState>();
let pollCount = new Map<string, number>();

type Scenario = 'success' | 'fail' | 'delay';

function getScenario(): Scenario {
  const s = process.env['MOCK_PAYOUT_SCENARIO'] as Scenario | undefined;
  if (s === 'fail' || s === 'delay') return s;
  return 'success';
}

export const MockPayoutProvider: PayoutProvider = {
  providerName: 'MockPayoutProvider',
  providerType: 'payout',
  mode: 'mock',
  capabilities: CAPABILITY,

  async healthCheck(): Promise<ProviderStatus> {
    return {
      healthy: true,
      healthStatus: 'HEALTHY',
      lastChecked: new Date().toISOString(),
      message: 'Mock payout provider is healthy',
      latencyMs: 15,
    };
  },

  async validateRecipient(recipient: PayoutRecipient): Promise<ProviderExecutionResult> {
    if (!recipient.name || !recipient.country || !recipient.currency) {
      return {
        status: 'FAILED',
        executedAt: new Date().toISOString(),
        errorCode: 'INVALID_RECIPIENT',
        errorMessage: '[MOCK] Recipient missing required fields',
        retryEligible: false,
      };
    }
    return {
      status: 'SUCCESS',
      executedAt: new Date().toISOString(),
      metadata: { validatedFields: ['name', 'country', 'currency'] },
    };
  },

  async submitPayout(request: PayoutRequest): Promise<ProviderExecutionResult> {
    const scenario = getScenario();
    const ref = `mock-payout-${request.transferId.slice(0, 8)}`;

    if (scenario === 'fail') {
      states.set(request.transferId, 'FAILED');
      return {
        status: 'FAILED',
        externalReference: ref,
        executedAt: new Date().toISOString(),
        errorCode: 'PAYOUT_REJECTED',
        errorMessage: '[MOCK] Payout rejected by provider (simulated)',
        retryEligible: true,
      };
    }

    states.set(request.transferId, 'SUBMITTED');
    pollCount.set(request.transferId, 0);
    return {
      status: 'PENDING',
      externalReference: ref,
      executedAt: new Date().toISOString(),
      metadata: {
        provider: 'MockPayoutProvider',
        scenario,
        recipient: request.recipient.name,
        amount: request.destinationAmount ?? request.amount,
        currency: request.destinationCurrency,
      },
    };
  },

  async getPayoutStatus(request: PayoutStatusRequest): Promise<ProviderExecutionResult> {
    const scenario = getScenario();
    const state = states.get(request.transferId) ?? 'SUBMITTED';
    const count = (pollCount.get(request.transferId) ?? 0) + 1;
    pollCount.set(request.transferId, count);

    if (scenario === 'delay' && count < 3) {
      return {
        status: 'PENDING',
        externalReference: request.externalReference,
        executedAt: new Date().toISOString(),
        metadata: { provider: 'MockPayoutProvider', delaySimulated: true, pollCount: count },
      };
    }

    if (state === 'SUBMITTED' || state === 'ACCEPTED') {
      states.set(request.transferId, 'COMPLETED');
      return {
        status: 'SUCCESS',
        externalReference: request.externalReference,
        executedAt: new Date().toISOString(),
        metadata: {
          provider: 'MockPayoutProvider',
          completed: true,
          completedAt: new Date().toISOString(),
        },
      };
    }

    if (state === 'COMPLETED') {
      return { status: 'SUCCESS', externalReference: request.externalReference, executedAt: new Date().toISOString() };
    }

    return {
      status: 'FAILED',
      externalReference: request.externalReference,
      executedAt: new Date().toISOString(),
      errorCode: 'PAYOUT_FAILED',
      retryEligible: true,
    };
  },

  async retryPayout(transferId: string, externalReference: string): Promise<ProviderExecutionResult> {
    states.set(transferId, 'SUBMITTED');
    pollCount.set(transferId, 0);
    return {
      status: 'PENDING',
      externalReference: externalReference + '-retry',
      executedAt: new Date().toISOString(),
      metadata: { provider: 'MockPayoutProvider', retried: true },
    };
  },

  async cancelPayout(transferId: string, externalReference: string): Promise<ProviderExecutionResult> {
    states.set(transferId, 'CANCELLED');
    return {
      status: 'CANCELLED',
      externalReference,
      executedAt: new Date().toISOString(),
    };
  },
};
