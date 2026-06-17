/**
 * NexusPay Orchestrator — Mock Thunes Payout Provider
 * External Rail Readiness Sprint — 2026-06-16
 *
 * Simulates Thunes-style payout API behaviour.
 * Thunes specialises in cross-border payments to Africa, LATAM, and APAC
 * including mobile money and bank transfers.
 *
 * Real integration requires: THUNES_API_KEY (server-side only)
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
  returnSupport: true,
  fxLocking: true,
  supportedCurrencies: [
    'GBP', 'EUR', 'USD',
    'NGN', 'KES', 'GHS', 'TZS', 'UGX', 'ZAR', 'XOF',
    'BRL', 'MXN', 'INR', 'PKR', 'BDT',
  ],
  supportedCorridors: [
    'GBP-NGN', 'GBP-KES', 'GBP-GHS', 'EUR-NGN', 'EUR-XOF',
    'USD-NGN', 'USD-KES', 'USD-GHS', 'USD-TZS', 'USD-UGX',
    'GBP-INR', 'USD-INR', 'USD-BRL', 'USD-MXN',
  ],
};

type PayoutState = 'SUBMITTED' | 'IN_TRANSIT' | 'PAID' | 'FAILED' | 'CANCELLED' | 'REVERSED';
const states = new Map<string, PayoutState>();
const pollCounts = new Map<string, number>();

type Scenario = 'success' | 'fail' | 'delay';

function getScenario(): Scenario {
  const s = process.env['MOCK_PAYOUT_SCENARIO'] as Scenario | undefined;
  if (s === 'fail' || s === 'delay') return s;
  return 'success';
}

export const MockThunesProvider: PayoutProvider = {
  providerName: 'MockThunesProvider',
  providerType: 'payout',
  mode: 'mock',
  capabilities: CAPABILITY,

  async healthCheck(): Promise<ProviderStatus> {
    return {
      healthy: true,
      healthStatus: 'HEALTHY',
      lastChecked: new Date().toISOString(),
      message: '[MOCK] Thunes API is operational',
      latencyMs: 62,
    };
  },

  async validateRecipient(recipient: PayoutRecipient): Promise<ProviderExecutionResult> {
    if (!recipient.name || !recipient.country || !recipient.currency) {
      return {
        status: 'FAILED',
        executedAt: new Date().toISOString(),
        errorCode: 'THUNES_INVALID_BENEFICIARY',
        errorMessage: '[MOCK] Thunes requires name, country, and currency',
        retryEligible: false,
      };
    }
    return {
      status: 'SUCCESS',
      executedAt: new Date().toISOString(),
      metadata: { provider: 'MockThunesProvider', beneficiaryValidated: true },
    };
  },

  async submitPayout(request: PayoutRequest): Promise<ProviderExecutionResult> {
    const scenario = getScenario();
    const ref = `thunes-${Date.now().toString(36)}-${request.transferId.slice(0, 6)}`;

    if (scenario === 'fail') {
      states.set(request.transferId, 'FAILED');
      return {
        status: 'FAILED',
        externalReference: ref,
        executedAt: new Date().toISOString(),
        errorCode: 'THUNES_TRANSACTION_DECLINED',
        errorMessage: '[MOCK] Thunes declined the transaction (simulated)',
        retryEligible: true,
      };
    }

    states.set(request.transferId, 'SUBMITTED');
    pollCounts.set(request.transferId, 0);
    return {
      status: 'PENDING',
      externalReference: ref,
      executedAt: new Date().toISOString(),
      metadata: {
        provider: 'MockThunesProvider',
        thunesTransactionId: ref,
        corridor: `${request.sourceCurrency}-${request.destinationCurrency}`,
        scenario,
      },
    };
  },

  async getPayoutStatus(request: PayoutStatusRequest): Promise<ProviderExecutionResult> {
    const scenario = getScenario();
    const state = states.get(request.transferId) ?? 'SUBMITTED';
    const count = (pollCounts.get(request.transferId) ?? 0) + 1;
    pollCounts.set(request.transferId, count);

    if (scenario === 'delay' && count < 4) {
      // Thunes transitions through IN_TRANSIT before PAID
      if (state === 'SUBMITTED') states.set(request.transferId, 'IN_TRANSIT');
      return {
        status: 'PENDING',
        externalReference: request.externalReference,
        executedAt: new Date().toISOString(),
        metadata: {
          provider: 'MockThunesProvider',
          thunesStatus: states.get(request.transferId),
          delaySimulated: true,
          pollCount: count,
        },
      };
    }

    if (state === 'SUBMITTED') {
      states.set(request.transferId, 'IN_TRANSIT');
      return {
        status: 'PENDING',
        externalReference: request.externalReference,
        executedAt: new Date().toISOString(),
        metadata: { provider: 'MockThunesProvider', thunesStatus: 'IN_TRANSIT' },
      };
    }

    if (state === 'IN_TRANSIT') {
      states.set(request.transferId, 'PAID');
      return {
        status: 'SUCCESS',
        externalReference: request.externalReference,
        executedAt: new Date().toISOString(),
        metadata: {
          provider: 'MockThunesProvider',
          thunesStatus: 'PAID',
          paidAt: new Date().toISOString(),
        },
      };
    }

    if (state === 'PAID') {
      return { status: 'SUCCESS', externalReference: request.externalReference, executedAt: new Date().toISOString() };
    }

    return {
      status: 'FAILED',
      externalReference: request.externalReference,
      executedAt: new Date().toISOString(),
      errorCode: 'THUNES_TRANSACTION_FAILED',
      retryEligible: true,
    };
  },

  async retryPayout(transferId: string, externalReference: string): Promise<ProviderExecutionResult> {
    states.set(transferId, 'SUBMITTED');
    pollCounts.set(transferId, 0);
    return {
      status: 'PENDING',
      externalReference: `${externalReference}-r1`,
      executedAt: new Date().toISOString(),
      metadata: { provider: 'MockThunesProvider', retried: true },
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
