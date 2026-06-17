/**
 * NexusPay Orchestrator — Mock Nium Payout Provider
 * External Rail Readiness Sprint — 2026-06-16
 *
 * Simulates Nium-style payout API behaviour for cross-border corridors.
 * Nium specialises in APAC, SEA, and Africa corridors.
 *
 * Real integration requires: NIUM_CLIENT_ID, NIUM_CLIENT_SECRET (server-side only)
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
  cancellationSupport: false,
  returnSupport: true,
  fxLocking: true,
  supportedCurrencies: [
    'GBP', 'EUR', 'USD', 'SGD', 'AUD', 'HKD',
    'NGN', 'KES', 'GHS', 'ZAR', 'INR', 'PHP',
  ],
  supportedCorridors: [
    'GBP-NGN', 'GBP-KES', 'GBP-GHS', 'EUR-NGN', 'USD-NGN',
    'USD-KES', 'USD-GHS', 'GBP-INR', 'USD-PHP',
  ],
};

type PayoutState = 'SUBMITTED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
const states = new Map<string, PayoutState>();

type Scenario = 'success' | 'fail' | 'delay';

function getScenario(): Scenario {
  const s = process.env['MOCK_PAYOUT_SCENARIO'] as Scenario | undefined;
  if (s === 'fail' || s === 'delay') return s;
  return 'success';
}

export const MockNiumProvider: PayoutProvider = {
  providerName: 'MockNiumProvider',
  providerType: 'payout',
  mode: 'mock',
  capabilities: CAPABILITY,

  async healthCheck(): Promise<ProviderStatus> {
    return {
      healthy: true,
      healthStatus: 'HEALTHY',
      lastChecked: new Date().toISOString(),
      message: '[MOCK] Nium API is operational',
      latencyMs: 45,
    };
  },

  async validateRecipient(recipient: PayoutRecipient): Promise<ProviderExecutionResult> {
    // Nium requires account number OR mobile wallet
    const hasAccountDetails =
      (recipient.accountNumber && recipient.bankCode) || recipient.mobileWallet;
    if (!hasAccountDetails) {
      return {
        status: 'FAILED',
        executedAt: new Date().toISOString(),
        errorCode: 'NIUM_INVALID_BENEFICIARY',
        errorMessage: '[MOCK] Nium requires account number + bank code OR mobile wallet',
        retryEligible: false,
      };
    }
    return {
      status: 'SUCCESS',
      executedAt: new Date().toISOString(),
      metadata: {
        provider: 'MockNiumProvider',
        validationMethod: recipient.mobileWallet ? 'mobile_wallet' : 'bank_account',
      },
    };
  },

  async submitPayout(request: PayoutRequest): Promise<ProviderExecutionResult> {
    const scenario = getScenario();
    const ref = `nium-mock-${Date.now().toString(36)}-${request.transferId.slice(0, 6)}`;

    if (scenario === 'fail') {
      states.set(request.transferId, 'FAILED');
      return {
        status: 'FAILED',
        externalReference: ref,
        executedAt: new Date().toISOString(),
        errorCode: 'NIUM_TRANSACTION_FAILED',
        errorMessage: '[MOCK] Nium rejected the payout (simulated failure)',
        retryEligible: true,
      };
    }

    states.set(request.transferId, 'SUBMITTED');
    return {
      status: 'PENDING',
      externalReference: ref,
      executedAt: new Date().toISOString(),
      metadata: {
        provider: 'MockNiumProvider',
        destinationCurrency: request.destinationCurrency,
        destinationAmount: request.destinationAmount,
        corridor: `${request.sourceCurrency}-${request.destinationCurrency}`,
        scenario,
      },
    };
  },

  async getPayoutStatus(request: PayoutStatusRequest): Promise<ProviderExecutionResult> {
    const scenario = getScenario();
    const state = states.get(request.transferId) ?? 'SUBMITTED';

    if (scenario === 'delay' && state === 'SUBMITTED') {
      states.set(request.transferId, 'PROCESSING');
      return {
        status: 'PENDING',
        externalReference: request.externalReference,
        executedAt: new Date().toISOString(),
        metadata: { provider: 'MockNiumProvider', niumStatus: 'PROCESSING', delaySimulated: true },
      };
    }

    if (state === 'SUBMITTED' || state === 'PROCESSING') {
      states.set(request.transferId, 'COMPLETED');
      return {
        status: 'SUCCESS',
        externalReference: request.externalReference,
        executedAt: new Date().toISOString(),
        metadata: {
          provider: 'MockNiumProvider',
          niumStatus: 'COMPLETED',
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
      errorCode: 'NIUM_TRANSACTION_FAILED',
      retryEligible: true,
    };
  },

  async retryPayout(transferId: string, externalReference: string): Promise<ProviderExecutionResult> {
    states.set(transferId, 'SUBMITTED');
    return {
      status: 'PENDING',
      externalReference: `${externalReference}-r1`,
      executedAt: new Date().toISOString(),
      metadata: { provider: 'MockNiumProvider', retried: true },
    };
  },

  async cancelPayout(_transferId: string, externalReference: string): Promise<ProviderExecutionResult> {
    return {
      status: 'FAILED',
      externalReference,
      executedAt: new Date().toISOString(),
      errorCode: 'NIUM_CANCELLATION_NOT_SUPPORTED',
      errorMessage: '[MOCK] Nium does not support payout cancellation after submission',
      retryEligible: false,
    };
  },
};
