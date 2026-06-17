/**
 * NexusPay Orchestrator — Orchestration Event Service
 * External Rail Readiness Sprint — 2026-06-16
 *
 * Captures every provider interaction as a structured event.
 * Events drive:
 *   - Consumer tracking timeline
 *   - Corporate operational dashboard
 *   - Audit trail
 *   - Future compliance review
 *   - Provider performance analysis
 */

import { ProviderExecutionStatus, ProviderType } from '../providers/types';
import { TransferState } from './transferStateMachine';

// ─── Event Types ──────────────────────────────────────────────────────────────

export type OrchestrationEventType =
  | 'TRANSFER_CREATED'
  | 'COLLECTION_INITIATED'
  | 'COLLECTION_AUTHORIZATION_REQUESTED'
  | 'COLLECTION_AUTHORIZATION_RECEIVED'
  | 'COLLECTION_CONFIRMED'
  | 'COLLECTION_SETTLED'
  | 'COLLECTION_FAILED'
  | 'COLLECTION_CANCELLED'
  | 'ROUTE_SELECTED'
  | 'FX_QUOTE_REQUESTED'
  | 'FX_QUOTE_RECEIVED'
  | 'FX_QUOTE_LOCKED'
  | 'FX_QUOTE_EXPIRED'
  | 'PAYOUT_INITIATED'
  | 'PAYOUT_ACCEPTED'
  | 'PAYOUT_COMPLETED'
  | 'PAYOUT_FAILED'
  | 'PAYOUT_CANCELLED'
  | 'PAYOUT_RETRY_ATTEMPTED'
  | 'RECIPIENT_CREDITED'
  | 'TRANSFER_COMPLETED'
  | 'TRANSFER_FAILED'
  | 'TRANSFER_CANCELLED'
  | 'RETURN_INITIATED'
  | 'RETURN_COMPLETED'
  | 'HEALTH_CHECK_RAN'
  | 'PROVIDER_ERROR';

// ─── Event Model ──────────────────────────────────────────────────────────────

export interface OrchestrationEvent {
  /** UUID for this event */
  eventId: string;
  /** The transfer this event belongs to */
  transferId: string;
  /** User who owns the transfer */
  userId: string;
  /** Account scope (personal / corporate / demo) */
  accountId: string;
  /** Provider name (e.g. MockOpenBankingCollectionProvider) */
  provider?: string;
  /** Provider type */
  providerType?: ProviderType;
  /** Event type */
  eventType: OrchestrationEventType;
  /** Provider execution status at point of event */
  providerStatus?: ProviderExecutionStatus;
  /** Transfer state after this event */
  transferState: TransferState;
  /** ISO 8601 timestamp */
  timestamp: string;
  /** Provider-assigned external reference */
  externalReference?: string;
  /** Error code if applicable */
  errorCode?: string;
  /** Error message if applicable */
  errorMessage?: string;
  /** Whether a retry is eligible */
  retryEligible?: boolean;
  /** Additional structured metadata */
  metadata?: Record<string, unknown>;
}

// ─── In-Memory Event Store ────────────────────────────────────────────────────
// In production, events should be persisted via Supabase Edge Functions.
// This in-memory store allows mock end-to-end flows to work without a
// database connection during the sandbox phase.

const eventStore = new Map<string, OrchestrationEvent[]>();

// ─── UUID Helper ──────────────────────────────────────────────────────────────

function generateEventId(): string {
  // RFC4122 v4-compatible UUID using Math.random
  // NOTE: Replace with crypto.randomUUID() when available in runtime
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ─── Event Emission ───────────────────────────────────────────────────────────

export function emitEvent(
  event: Omit<OrchestrationEvent, 'eventId' | 'timestamp'>,
): OrchestrationEvent {
  const fullEvent: OrchestrationEvent = {
    ...event,
    eventId: generateEventId(),
    timestamp: new Date().toISOString(),
  };

  const existing = eventStore.get(event.transferId) ?? [];
  existing.push(fullEvent);
  eventStore.set(event.transferId, existing);

  return fullEvent;
}

// ─── Event Retrieval ──────────────────────────────────────────────────────────

export function getEventsForTransfer(transferId: string): OrchestrationEvent[] {
  return eventStore.get(transferId) ?? [];
}

export function getLatestEvent(transferId: string): OrchestrationEvent | undefined {
  const events = eventStore.get(transferId) ?? [];
  return events[events.length - 1];
}

/**
 * Returns events scoped to a specific account.
 * Ensures cross-account data isolation.
 */
export function getEventsForAccount(accountId: string): OrchestrationEvent[] {
  const all: OrchestrationEvent[] = [];
  for (const events of eventStore.values()) {
    for (const event of events) {
      if (event.accountId === accountId) {
        all.push(event);
      }
    }
  }
  return all.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

/**
 * Consumer-facing timeline: simplified event list for tracking screens.
 * Filters to only consumer-appropriate events.
 */
export function getConsumerTimeline(
  transferId: string,
): Array<{ label: string; timestamp: string; isError: boolean }> {
  const events = getEventsForTransfer(transferId);
  return events
    .filter((e) => CONSUMER_VISIBLE_EVENTS.has(e.eventType))
    .map((e) => ({
      label: CONSUMER_EVENT_LABEL[e.eventType] ?? e.eventType,
      timestamp: e.timestamp,
      isError: ERROR_EVENTS.has(e.eventType),
    }));
}

// ─── Consumer Event Filtering ─────────────────────────────────────────────────

const CONSUMER_VISIBLE_EVENTS: ReadonlySet<OrchestrationEventType> = new Set([
  'TRANSFER_CREATED',
  'COLLECTION_AUTHORIZATION_REQUESTED',
  'COLLECTION_AUTHORIZATION_RECEIVED',
  'COLLECTION_SETTLED',
  'COLLECTION_FAILED',
  'PAYOUT_INITIATED',
  'PAYOUT_COMPLETED',
  'PAYOUT_FAILED',
  'RECIPIENT_CREDITED',
  'TRANSFER_COMPLETED',
  'TRANSFER_FAILED',
  'TRANSFER_CANCELLED',
  'RETURN_INITIATED',
  'RETURN_COMPLETED',
]);

const CONSUMER_EVENT_LABEL: Partial<Record<OrchestrationEventType, string>> = {
  TRANSFER_CREATED: 'Transfer started',
  COLLECTION_AUTHORIZATION_REQUESTED: 'Bank approval required',
  COLLECTION_AUTHORIZATION_RECEIVED: 'Bank approved',
  COLLECTION_SETTLED: 'Funds received',
  COLLECTION_FAILED: 'Collection failed',
  PAYOUT_INITIATED: 'Sending to recipient',
  PAYOUT_COMPLETED: 'Delivered',
  PAYOUT_FAILED: 'Delivery failed',
  RECIPIENT_CREDITED: 'Recipient credited',
  TRANSFER_COMPLETED: 'Transfer complete',
  TRANSFER_FAILED: 'Transfer failed',
  TRANSFER_CANCELLED: 'Transfer cancelled',
  RETURN_INITIATED: 'Return started',
  RETURN_COMPLETED: 'Funds returned',
};

const ERROR_EVENTS: ReadonlySet<OrchestrationEventType> = new Set([
  'COLLECTION_FAILED',
  'PAYOUT_FAILED',
  'TRANSFER_FAILED',
  'PROVIDER_ERROR',
]);

// ─── Audit Export ─────────────────────────────────────────────────────────────

/**
 * Export all events for a transfer as a structured audit record.
 * Suitable for compliance and regulatory review.
 */
export function exportAuditTrail(transferId: string): {
  transferId: string;
  eventCount: number;
  firstEvent: string | undefined;
  lastEvent: string | undefined;
  events: OrchestrationEvent[];
} {
  const events = getEventsForTransfer(transferId);
  return {
    transferId,
    eventCount: events.length,
    firstEvent: events[0]?.timestamp,
    lastEvent: events[events.length - 1]?.timestamp,
    events,
  };
}

// ─── Provider Performance Analytics ──────────────────────────────────────────

/**
 * Summarise provider performance from event history.
 * For use in corporate operational dashboard.
 */
export function analyseProviderPerformance(providerName: string): {
  provider: string;
  totalEvents: number;
  successCount: number;
  failureCount: number;
  successRate: number;
} {
  let total = 0;
  let success = 0;
  let failure = 0;

  for (const events of eventStore.values()) {
    for (const event of events) {
      if (event.provider !== providerName) continue;
      total++;
      if (
        event.providerStatus === 'SUCCESS' ||
        event.eventType === 'PAYOUT_COMPLETED' ||
        event.eventType === 'COLLECTION_SETTLED'
      ) {
        success++;
      } else if (
        event.providerStatus === 'FAILED' ||
        event.eventType === 'PAYOUT_FAILED' ||
        event.eventType === 'COLLECTION_FAILED'
      ) {
        failure++;
      }
    }
  }

  return {
    provider: providerName,
    totalEvents: total,
    successCount: success,
    failureCount: failure,
    successRate: total > 0 ? Math.round((success / total) * 100) : 0,
  };
}
