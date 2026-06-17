/**
 * NexusPay Orchestrator — Mock Provider Index
 * External Rail Readiness Sprint — 2026-06-16
 *
 * Registers all mock providers into the provider registry.
 * Call initMockProviders() during app startup when EXPO_PUBLIC_PROVIDER_MODE=mock.
 */

export { MockBankSandboxCollectionProvider } from './MockBankSandboxCollectionProvider';
export { MockNiumProvider } from './MockNiumProvider';
export { MockOpenBankingCollectionProvider } from './MockOpenBankingCollectionProvider';
export { MockPayoutProvider } from './MockPayoutProvider';
export { MockThunesProvider } from './MockThunesProvider';
export { MockTrangloProvider } from './MockTrangloProvider';

import {
    registerCollectionProvider,
    registerPayoutProvider,
} from '../registry';

import { MockBankSandboxCollectionProvider } from './MockBankSandboxCollectionProvider';
import { MockNiumProvider } from './MockNiumProvider';
import { MockOpenBankingCollectionProvider } from './MockOpenBankingCollectionProvider';
import { MockPayoutProvider } from './MockPayoutProvider';
import { MockThunesProvider } from './MockThunesProvider';
import { MockTrangloProvider } from './MockTrangloProvider';

import { seedMockCertifications } from '../../services/routeCertificationService';

/**
 * Register all mock providers into the provider registry.
 * Safe to call multiple times — subsequent calls are idempotent
 * because the registry uses provider name as the key.
 *
 * Call this during App startup when EXPO_PUBLIC_PROVIDER_MODE=mock (default).
 */
export function initMockProviders(): void {
  // ── Collection Providers ──────────────────────────────────────────────────

  registerCollectionProvider(MockOpenBankingCollectionProvider, {
    enabled: true,
    priority: 90,
    reliabilityScore: 95,
    costScore: 70,
    speedScore: 80,
    supportedCorridors: ['*'],
    supportedCurrencies: ['GBP', 'EUR', 'USD'],
    healthStatus: 'UNKNOWN',
    description: 'Mock open banking provider (TrueLayer/Yapily/Tink style)',
  });

  registerCollectionProvider(MockBankSandboxCollectionProvider, {
    enabled: true,
    priority: 80,
    reliabilityScore: 90,
    costScore: 75,
    speedScore: 85,
    supportedCorridors: ['*'],
    supportedCurrencies: ['GBP', 'EUR', 'USD', 'NGN', 'KES'],
    healthStatus: 'UNKNOWN',
    description: 'Mock bank sandbox direct-pull provider (Token.io/Plaid style)',
  });

  // ── Payout Providers ──────────────────────────────────────────────────────

  registerPayoutProvider(MockPayoutProvider, {
    enabled: true,
    priority: 70,
    reliabilityScore: 85,
    costScore: 80,
    speedScore: 75,
    supportedCorridors: ['*'],
    supportedCurrencies: ['GBP', 'EUR', 'USD', 'NGN', 'KES', 'GHS'],
    healthStatus: 'UNKNOWN',
    description: 'Generic mock payout provider — fallback for all corridors',
  });

  registerPayoutProvider(MockNiumProvider, {
    enabled: true,
    priority: 90,
    reliabilityScore: 95,
    costScore: 72,
    speedScore: 88,
    supportedCorridors: [
      'GBP-NGN', 'GBP-KES', 'GBP-GHS', 'EUR-NGN', 'USD-NGN',
      'USD-KES', 'USD-GHS', 'GBP-INR', 'USD-PHP',
    ],
    supportedCurrencies: [
      'GBP', 'EUR', 'USD', 'SGD', 'AUD', 'HKD',
      'NGN', 'KES', 'GHS', 'ZAR', 'INR', 'PHP',
    ],
    healthStatus: 'UNKNOWN',
    description: 'Mock Nium provider — cross-border APAC/Africa specialist',
  });

  registerPayoutProvider(MockTrangloProvider, {
    enabled: true,
    priority: 85,
    reliabilityScore: 88,
    costScore: 78,
    speedScore: 82,
    supportedCorridors: [
      'USD-NGN', 'USD-KES', 'USD-GHS', 'EUR-NGN',
      'GBP-NGN', 'GBP-KES', 'GBP-GHS',
      'USD-PHP', 'USD-IDR', 'USD-MYR',
    ],
    supportedCurrencies: ['USD', 'EUR', 'MYR', 'IDR', 'PHP', 'THB', 'NGN', 'KES', 'GHS'],
    healthStatus: 'UNKNOWN',
    description: 'Mock Tranglo provider — SEA and Africa mobile money specialist',
  });

  registerPayoutProvider(MockThunesProvider, {
    enabled: true,
    priority: 88,
    reliabilityScore: 92,
    costScore: 74,
    speedScore: 83,
    supportedCorridors: [
      'GBP-NGN', 'GBP-KES', 'GBP-GHS', 'EUR-NGN', 'EUR-XOF',
      'USD-NGN', 'USD-KES', 'USD-GHS', 'USD-TZS', 'USD-UGX',
      'GBP-INR', 'USD-INR', 'USD-BRL', 'USD-MXN',
    ],
    supportedCurrencies: [
      'GBP', 'EUR', 'USD',
      'NGN', 'KES', 'GHS', 'TZS', 'UGX', 'ZAR', 'XOF',
      'BRL', 'MXN', 'INR', 'PKR', 'BDT',
    ],
    healthStatus: 'UNKNOWN',
    description: 'Mock Thunes provider — Africa, LATAM, APAC specialist',
  });

  // ── Route Certifications ──────────────────────────────────────────────────

  seedMockCertifications();
}
