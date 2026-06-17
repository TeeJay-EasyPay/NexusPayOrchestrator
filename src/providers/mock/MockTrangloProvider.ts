/**
 * NexusPay Orchestrator — Mock Tranglo Payout Provider
 * External Rail Readiness Sprint — 2026-06-16
 *
 * Simulates Tranglo-style payout API behaviour.
 * Tranglo specialises in Southeast Asia and Africa mobile money corridors.
 *
 * Real integration requires: TRANGLO_API_KEY (server-side only)
 * No real credentials needed for mock mode.
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
  webhookSupport: true,
  retrySupport: true,
  cancellationSupport: true,
  returnSupport: false,
  fxLocking: false,
  supportedCurrencies: ['USD', 'EUR', 'MYR', 'IDR', 'PHP', 'THB', 'NGN', 'KES', 'GHS'],
  supportedCorridors: [
    'USD-NGN', 'USD-KES', 'USD-GHS', 'EUR-NGN',
    'GBP-NGN', 'GBP-KES', 'GBP-GHS',
    'USD-PHP', 'USD-IDR', 'USD-MYR',
  ],
};

type PayoutState = 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
const states = new Map<string, PayoutState>();

type Scenario = 'success' | 'fail' | 'delay';

function getScenario(): Scenario {
  const s = process.env['MOCK_PAYOUT_SCENARIO'] as Scenario | undefined;
  if (s === 'fail' || s === 'delay') return s;
  return 'success';
}

export const MockTrangloProvider: PayoutProvider = {
  providerName: 'MockTrangloProvider',
  providerType: 'payout',
  mode: 'mock',
  capabilities: CAPABILITY,

  async healthCheck(): Promise<ProviderStatus> {
    return {
      healthy: true,
      healthStatus: 'HEALTHY',
      lastChecked: new Date().toISOString(),
      message: '[MOCK] Tranglo API is operational',
      latencyMs: 55,
    };
  },

  async validateRecipient(recipient: PayoutRecipient): Promise<ProviderExecutionResult> {
    if (!recipient.name || (!recipient.mobileWallet && !recipient.accountNumber)) {
      return {
        status: 'FAILED',
        executedAt: new Date().toISOString(),
        errorCode: 'TRANGLO_INVALID_RECIPIENT',
        errorMessage: '[MOCK] Tranglo requires name and mobile wallet or account number',
        retryEligible: false,
      };
    }
    return {
      status: 'SUCCESS',
      executedAt: new Date().toISOString(),
      metadata: { provider: 'MockTrangloProvider', recipientValidated: true },
    };
  },

  async submitPayout(request: PayoutRequest): Promise<ProviderExecutionResult> {
    const scenario = getScenario();
    const ref = `tranglo-${Date.now().toString(36)}-${request.transferId.slice(0, 6)}`;

    if (scenario === 'fail') {
      states.set(request.transferId, 'FAILED');
      return {
        status: 'FAILED',
        externalReference: ref,
        executedAt: new Date().toISOString(),
        errorCode: 'TRANGLO_PAYOUT_FAILED',
        errorMessage: '[MOCK] Tranglo payout failed (simulated)',
        retryEligible: true,
      };
    }

    states.set(request.transferId, 'PROCESSING');
    return {
      status: 'PENDING',
      externalReference: ref,
      executedAt: new Date().toISOString(),
      metadata: {
        provider: 'MockTrangloProvider',
        corridor: `${request.sourceCurrency}-${request.destinationCurrency}`,
        scenario,
      },
    };
  },

  async getPayoutStatus(request: PayoutStatusRequest): Promise<ProviderExecutionResult> {
    const scenario = getScenario();
    const state = states.get(request.transferId) ?? 'PROCESSING';

    if (scenario === 'delay' && state === 'PROCESSING') {
      return {
        status: 'PENDING',
        externalReference: request.externalReference,
        executedAt: new Date().toISOString(),
        metadata: { provider: 'MockTrangloProvider', status: 'PROCESSING', delaySimulated: true },
      };
    }

    if (state === 'PROCESSING') {
      states.set(request.transferId, 'COMPLETED');
      return {
        status: 'SUCCESS',
        externalReference: request.externalReference,
        executedAt: new Date().toISOString(),
        metadata: { provider: 'MockTrangloProvider', completed: true },
      };
    }

    if (state === 'COMPLETED') {
      return { status: 'SUCCESS', externalReference: request.externalReference, executedAt: new Date().toISOString() };
    }

    return {
      status: 'FAILED',
      externalReference: request.externalReference,
      executedAt: new Date().toISOString(),
      errorCode: 'TRANGLO_PAYOUT_FAILED',
      retryEligible: true,
    };
  },

  async retryPayout(transferId: string, externalReference: string): Promise<ProviderExecutionResult> {
    states.set(transferId, 'PROCESSING');
    return {
      status: 'PENDING',
      externalReference: `${externalReference}-retry`,
      executedAt: new Date().toISOString(),
      metadata: { provider: 'MockTrangloProvider', retried: true },
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
