/**
 * NexusPay Orchestrator — Mock End-to-End Orchestration Runner
 * External Rail Readiness Sprint — 2026-06-16
 *
 * Demonstrates the full simulated transfer lifecycle:
 *
 *   Sender bank simulation
 *   → collection provider
 *   → NexusPay orchestration
 *   → route selection
 *   → payout provider
 *   → recipient credit simulation
 *
 * No real partner credentials required.
 * Existing simulated transfer capability is preserved unchanged.
 */

import {
    CollectionRequest,
    PayoutRecipient,
    PayoutRequest,
    resolveCollectionProvider,
    resolvePayoutProvider,
} from '../providers';

import {
    emitEvent,
    getConsumerTimeline,
    getEventsForTransfer,
    OrchestrationEvent,
} from './orchestrationEventService';

import {
    toLegacyStatus,
    TransferState,
    transition
} from './transferStateMachine';

import {
    updateCertificationStatus,
} from './routeCertificationService';

// ─── Orchestration Input ──────────────────────────────────────────────────────

export interface OrchestrationInput {
  transferId: string;
  userId: string;
  accountId: string;
  corridor: string;
  sourceCurrency: string;
  destinationCurrency: string;
  sourceAmount: number;
  destinationAmount: number;
  recipient: PayoutRecipient;
  reference: string;
  /** If true, simulate open banking authorization flow */
  requiresBankAuthorization?: boolean;
  /** Used by certification tests to record results */
  certificationRun?: {
    collectionProvider: string;
    payoutProvider: string;
  };
}

// ─── Orchestration Result ─────────────────────────────────────────────────────

export interface OrchestrationResult {
  transferId: string;
  finalState: TransferState;
  legacyStatus: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  events: OrchestrationEvent[];
  consumerTimeline: Array<{ label: string; timestamp: string; isError: boolean }>;
  collectionProvider: string;
  payoutProvider: string;
  collectionReference?: string;
  payoutReference?: string;
  error?: string;
}

// ─── Main Orchestration Function ──────────────────────────────────────────────

/**
 * Run a full mock end-to-end transfer orchestration.
 *
 * This is the canonical demonstration of the provider abstraction layer.
 * When real sandbox credentials are available, replace the mock provider
 * resolvers with real ones — the orchestration logic remains unchanged.
 */
export async function runMockOrchestration(
  input: OrchestrationInput,
): Promise<OrchestrationResult> {
  const { transferId, userId, accountId, corridor } = input;
  let currentState: TransferState = 'CREATED';
  let collectionRef: string | undefined;
  let payoutRef: string | undefined;
  let errorMessage: string | undefined;

  // ── Resolve Providers ───────────────────────────────────────────────────────
  const collectionProvider = resolveCollectionProvider(corridor);
  const payoutProvider = resolvePayoutProvider(corridor);

  if (!collectionProvider) {
    return buildErrorResult(input, currentState, 'No collection provider available for corridor');
  }
  if (!payoutProvider) {
    return buildErrorResult(input, currentState, 'No payout provider available for corridor');
  }

  const collectionProviderName = collectionProvider.providerName;
  const payoutProviderName = payoutProvider.providerName;

  // ── CREATED ─────────────────────────────────────────────────────────────────
  emitEvent({
    transferId,
    userId,
    accountId,
    provider: undefined,
    providerType: undefined,
    eventType: 'TRANSFER_CREATED',
    transferState: 'CREATED',
  });

  // ── Initiate Collection ──────────────────────────────────────────────────────
  const collectionReq: CollectionRequest = {
    transferId,
    userId,
    accountId,
    amount: input.sourceAmount,
    currency: input.sourceCurrency,
    reference: input.reference,
    redirectUrl: 'nexuspay://collection-callback',
  };

  const collectionResult = await collectionProvider.initiateCollection(collectionReq);
  collectionRef = collectionResult.externalReference;

  if (collectionResult.status === 'REQUIRES_AUTHORIZATION') {
    const t1 = transition(currentState, 'AWAITING_COLLECTION_AUTHORIZATION');
    if (!t1.success) return buildErrorResult(input, currentState, t1.error);
    currentState = t1.state;

    emitEvent({
      transferId, userId, accountId,
      provider: collectionProviderName,
      providerType: 'collection',
      eventType: 'COLLECTION_AUTHORIZATION_REQUESTED',
      providerStatus: 'REQUIRES_AUTHORIZATION',
      transferState: currentState,
      externalReference: collectionRef,
      metadata: { authorizationUrl: collectionResult.authorizationUrl },
    });

    // Simulate user completing bank authorization
    const authResult = await collectionProvider.confirmAuthorization(
      transferId,
      'mock-auth-code-' + transferId.slice(0, 6),
    );

    if (authResult.status === 'FAILED') {
      const tf = transition(currentState, 'FAILED');
      if (tf.success) currentState = tf.state;
      emitEvent({
        transferId, userId, accountId,
        provider: collectionProviderName,
        providerType: 'collection',
        eventType: 'COLLECTION_FAILED',
        providerStatus: 'FAILED',
        transferState: currentState,
        errorCode: authResult.errorCode,
        errorMessage: authResult.errorMessage,
      });
      errorMessage = authResult.errorMessage;
      return finalResult(input, currentState, collectionProviderName, payoutProviderName, collectionRef, payoutRef, errorMessage);
    }

    const t2 = transition(currentState, 'COLLECTION_AUTHORIZED');
    if (!t2.success) return buildErrorResult(input, currentState, t2.error);
    currentState = t2.state;

    emitEvent({
      transferId, userId, accountId,
      provider: collectionProviderName,
      providerType: 'collection',
      eventType: 'COLLECTION_AUTHORIZATION_RECEIVED',
      providerStatus: 'PENDING',
      transferState: currentState,
      externalReference: collectionRef,
    });
  } else if (collectionResult.status === 'FAILED') {
    const tf = transition(currentState, 'FAILED');
    if (tf.success) currentState = tf.state;
    emitEvent({
      transferId, userId, accountId,
      provider: collectionProviderName,
      providerType: 'collection',
      eventType: 'COLLECTION_FAILED',
      providerStatus: 'FAILED',
      transferState: currentState,
      errorCode: collectionResult.errorCode,
      errorMessage: collectionResult.errorMessage,
    });
    return finalResult(input, currentState, collectionProviderName, payoutProviderName, collectionRef, payoutRef, collectionResult.errorMessage);
  }

  // ── Collection Pending ───────────────────────────────────────────────────────
  const t3 = transition(currentState, 'COLLECTION_PENDING');
  if (!t3.success) return buildErrorResult(input, currentState, t3.error);
  currentState = t3.state;

  emitEvent({
    transferId, userId, accountId,
    provider: collectionProviderName,
    providerType: 'collection',
    eventType: 'COLLECTION_INITIATED',
    providerStatus: 'PENDING',
    transferState: currentState,
    externalReference: collectionRef,
  });

  // ── Poll Collection ──────────────────────────────────────────────────────────
  const collectionStatus = await collectionProvider.getCollectionStatus({
    transferId,
    externalReference: collectionRef ?? '',
  });

  if (collectionStatus.status === 'FAILED') {
    const tf = transition(currentState, 'FAILED');
    if (tf.success) currentState = tf.state;
    emitEvent({
      transferId, userId, accountId,
      provider: collectionProviderName,
      providerType: 'collection',
      eventType: 'COLLECTION_FAILED',
      providerStatus: 'FAILED',
      transferState: currentState,
      errorCode: collectionStatus.errorCode,
    });
    return finalResult(input, currentState, collectionProviderName, payoutProviderName, collectionRef, payoutRef, 'Collection failed');
  }

  // ── Collection Settled ───────────────────────────────────────────────────────
  const t4 = transition(currentState, 'COLLECTION_SETTLED');
  if (!t4.success) return buildErrorResult(input, currentState, t4.error);
  currentState = t4.state;

  emitEvent({
    transferId, userId, accountId,
    provider: collectionProviderName,
    providerType: 'collection',
    eventType: 'COLLECTION_SETTLED',
    providerStatus: 'SUCCESS',
    transferState: currentState,
    externalReference: collectionRef,
  });

  // ── Route Selected ───────────────────────────────────────────────────────────
  const t5 = transition(currentState, 'ROUTE_SELECTED');
  if (!t5.success) return buildErrorResult(input, currentState, t5.error);
  currentState = t5.state;

  emitEvent({
    transferId, userId, accountId,
    provider: payoutProviderName,
    providerType: 'payout',
    eventType: 'ROUTE_SELECTED',
    transferState: currentState,
    metadata: {
      corridor,
      collectionProvider: collectionProviderName,
      payoutProvider: payoutProviderName,
    },
  });

  // ── Validate Recipient ───────────────────────────────────────────────────────
  const recipientValidation = await payoutProvider.validateRecipient(input.recipient);
  if (recipientValidation.status === 'FAILED') {
    const tf = transition(currentState, 'FAILED');
    if (tf.success) currentState = tf.state;
    emitEvent({
      transferId, userId, accountId,
      provider: payoutProviderName,
      providerType: 'payout',
      eventType: 'PAYOUT_FAILED',
      providerStatus: 'FAILED',
      transferState: currentState,
      errorCode: recipientValidation.errorCode,
      errorMessage: 'Recipient validation failed',
    });
    return finalResult(input, currentState, collectionProviderName, payoutProviderName, collectionRef, payoutRef, 'Recipient validation failed');
  }

  // ── Submit Payout ────────────────────────────────────────────────────────────
  const payoutReq: PayoutRequest = {
    transferId,
    userId,
    accountId,
    amount: input.sourceAmount,
    sourceCurrency: input.sourceCurrency,
    destinationCurrency: input.destinationCurrency,
    destinationAmount: input.destinationAmount,
    recipient: input.recipient,
    reference: input.reference,
  };

  const payoutResult = await payoutProvider.submitPayout(payoutReq);
  payoutRef = payoutResult.externalReference;

  if (payoutResult.status === 'FAILED') {
    const tf = transition(currentState, 'FAILED');
    if (tf.success) currentState = tf.state;
    emitEvent({
      transferId, userId, accountId,
      provider: payoutProviderName,
      providerType: 'payout',
      eventType: 'PAYOUT_FAILED',
      providerStatus: 'FAILED',
      transferState: currentState,
      externalReference: payoutRef,
      errorCode: payoutResult.errorCode,
    });
    return finalResult(input, currentState, collectionProviderName, payoutProviderName, collectionRef, payoutRef, 'Payout submission failed');
  }

  const t6 = transition(currentState, 'PAYOUT_SUBMITTED');
  if (!t6.success) return buildErrorResult(input, currentState, t6.error);
  currentState = t6.state;

  emitEvent({
    transferId, userId, accountId,
    provider: payoutProviderName,
    providerType: 'payout',
    eventType: 'PAYOUT_INITIATED',
    providerStatus: 'PENDING',
    transferState: currentState,
    externalReference: payoutRef,
  });

  // ── Poll Payout ──────────────────────────────────────────────────────────────
  const payoutStatus = await payoutProvider.getPayoutStatus({
    transferId,
    externalReference: payoutRef ?? '',
  });

  if (payoutStatus.status === 'FAILED') {
    const tf = transition(currentState, 'FAILED');
    if (tf.success) currentState = tf.state;
    emitEvent({
      transferId, userId, accountId,
      provider: payoutProviderName,
      providerType: 'payout',
      eventType: 'PAYOUT_FAILED',
      providerStatus: 'FAILED',
      transferState: currentState,
      externalReference: payoutRef,
    });
    return finalResult(input, currentState, collectionProviderName, payoutProviderName, collectionRef, payoutRef, 'Payout failed');
  }

  // ── Payout Accepted / Pending ────────────────────────────────────────────────
  const t7 = transition(currentState, 'PAYOUT_ACCEPTED');
  if (t7.success) currentState = t7.state;

  const t8 = transition(currentState, 'PAYOUT_PENDING');
  if (t8.success) currentState = t8.state;

  emitEvent({
    transferId, userId, accountId,
    provider: payoutProviderName,
    providerType: 'payout',
    eventType: 'PAYOUT_ACCEPTED',
    providerStatus: 'SUCCESS',
    transferState: currentState,
    externalReference: payoutRef,
  });

  // ── Recipient Credited ───────────────────────────────────────────────────────
  const t9 = transition(currentState, 'RECIPIENT_CREDITED');
  if (t9.success) currentState = t9.state;

  emitEvent({
    transferId, userId, accountId,
    provider: payoutProviderName,
    providerType: 'payout',
    eventType: 'RECIPIENT_CREDITED',
    providerStatus: 'SUCCESS',
    transferState: currentState,
    externalReference: payoutRef,
    metadata: { recipientName: input.recipient.name },
  });

  // ── Completed ────────────────────────────────────────────────────────────────
  const t10 = transition(currentState, 'COMPLETED');
  if (t10.success) currentState = t10.state;

  emitEvent({
    transferId, userId, accountId,
    provider: payoutProviderName,
    providerType: 'payout',
    eventType: 'TRANSFER_COMPLETED',
    providerStatus: 'SUCCESS',
    transferState: currentState,
    externalReference: payoutRef,
  });

  // ── Update Certification (if this is a certification run) ────────────────────
  if (input.certificationRun) {
    updateCertificationStatus(
      corridor,
      input.certificationRun.collectionProvider,
      input.certificationRun.payoutProvider,
      {
        status: 'PASS',
        certificationResult: 'Mock end-to-end orchestration completed successfully',
        lastTested: new Date().toISOString(),
        evidence: `transfer:${transferId}`,
      },
    );
  }

  return finalResult(input, currentState, collectionProviderName, payoutProviderName, collectionRef, payoutRef, undefined);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function finalResult(
  input: OrchestrationInput,
  state: TransferState,
  collectionProviderName: string,
  payoutProviderName: string,
  collectionRef?: string,
  payoutRef?: string,
  error?: string,
): OrchestrationResult {
  return {
    transferId: input.transferId,
    finalState: state,
    legacyStatus: toLegacyStatus(state),
    events: getEventsForTransfer(input.transferId),
    consumerTimeline: getConsumerTimeline(input.transferId),
    collectionProvider: collectionProviderName,
    payoutProvider: payoutProviderName,
    collectionReference: collectionRef,
    payoutReference: payoutRef,
    error,
  };
}

function buildErrorResult(
  input: OrchestrationInput,
  state: TransferState,
  error: string,
): OrchestrationResult {
  return {
    transferId: input.transferId,
    finalState: state,
    legacyStatus: toLegacyStatus(state),
    events: getEventsForTransfer(input.transferId),
    consumerTimeline: getConsumerTimeline(input.transferId),
    collectionProvider: 'UNKNOWN',
    payoutProvider: 'UNKNOWN',
    error,
  };
}
