/**
 * NexusPay Orchestrator — Transfer State Machine
 * External Rail Readiness Sprint — 2026-06-16
 *
 * Formalises the full transfer lifecycle so that external rail orchestration
 * can be introduced without changing consumer-facing screens.
 *
 * Consumer screens map internal states → simplified display labels.
 * Corporate screens can surface the full operational state.
 */

// ─── Transfer States ──────────────────────────────────────────────────────────

export type TransferState =
  | 'CREATED'
  | 'AWAITING_COLLECTION_AUTHORIZATION'
  | 'COLLECTION_AUTHORIZED'
  | 'COLLECTION_PENDING'
  | 'COLLECTION_SETTLED'
  | 'ROUTE_SELECTED'
  | 'FX_QUOTED'
  | 'FX_LOCKED'
  | 'PAYOUT_SUBMITTED'
  | 'PAYOUT_ACCEPTED'
  | 'PAYOUT_PENDING'
  | 'RECIPIENT_CREDITED'
  | 'COMPLETED'
  | 'FAILED'
  | 'RETURN_PENDING'
  | 'RETURNED'
  | 'CANCELLED';

// ─── Consumer-Friendly Status Labels ─────────────────────────────────────────

export const CONSUMER_STATUS_LABEL: Record<TransferState, string> = {
  CREATED: 'Processing',
  AWAITING_COLLECTION_AUTHORIZATION: 'Awaiting your approval',
  COLLECTION_AUTHORIZED: 'Approved — collecting funds',
  COLLECTION_PENDING: 'Collecting funds',
  COLLECTION_SETTLED: 'Funds received',
  ROUTE_SELECTED: 'Sending',
  FX_QUOTED: 'Confirming rate',
  FX_LOCKED: 'Rate confirmed',
  PAYOUT_SUBMITTED: 'Sending to recipient',
  PAYOUT_ACCEPTED: 'Payment accepted',
  PAYOUT_PENDING: 'Payment on its way',
  RECIPIENT_CREDITED: 'Delivered',
  COMPLETED: 'Completed',
  FAILED: 'Transfer failed',
  RETURN_PENDING: 'Return in progress',
  RETURNED: 'Funds returned',
  CANCELLED: 'Cancelled',
};

// ─── Corporate-Friendly Status Labels ────────────────────────────────────────

export const CORPORATE_STATUS_LABEL: Record<TransferState, string> = {
  CREATED: 'CREATED',
  AWAITING_COLLECTION_AUTHORIZATION: 'AWAITING_COLLECTION_AUTHORIZATION',
  COLLECTION_AUTHORIZED: 'COLLECTION_AUTHORIZED',
  COLLECTION_PENDING: 'COLLECTION_PENDING',
  COLLECTION_SETTLED: 'COLLECTION_SETTLED',
  ROUTE_SELECTED: 'ROUTE_SELECTED',
  FX_QUOTED: 'FX_QUOTED',
  FX_LOCKED: 'FX_LOCKED',
  PAYOUT_SUBMITTED: 'PAYOUT_SUBMITTED',
  PAYOUT_ACCEPTED: 'PAYOUT_ACCEPTED',
  PAYOUT_PENDING: 'PAYOUT_PENDING',
  RECIPIENT_CREDITED: 'RECIPIENT_CREDITED',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  RETURN_PENDING: 'RETURN_PENDING',
  RETURNED: 'RETURNED',
  CANCELLED: 'CANCELLED',
};

// ─── Terminal States ──────────────────────────────────────────────────────────

export const TERMINAL_STATES: ReadonlySet<TransferState> = new Set([
  'COMPLETED',
  'FAILED',
  'RETURNED',
  'CANCELLED',
]);

export function isTerminalState(state: TransferState): boolean {
  return TERMINAL_STATES.has(state);
}

// ─── Valid Transitions ────────────────────────────────────────────────────────

const VALID_TRANSITIONS: Record<TransferState, TransferState[]> = {
  CREATED: [
    'AWAITING_COLLECTION_AUTHORIZATION',
    'COLLECTION_PENDING',
    'CANCELLED',
    'FAILED',
  ],
  AWAITING_COLLECTION_AUTHORIZATION: [
    'COLLECTION_AUTHORIZED',
    'CANCELLED',
    'FAILED',
  ],
  COLLECTION_AUTHORIZED: [
    'COLLECTION_PENDING',
    'FAILED',
    'CANCELLED',
  ],
  COLLECTION_PENDING: [
    'COLLECTION_SETTLED',
    'FAILED',
    'RETURN_PENDING',
  ],
  COLLECTION_SETTLED: [
    'ROUTE_SELECTED',
    'FAILED',
    'RETURN_PENDING',
  ],
  ROUTE_SELECTED: [
    'FX_QUOTED',
    'PAYOUT_SUBMITTED',
    'FAILED',
  ],
  FX_QUOTED: [
    'FX_LOCKED',
    'ROUTE_SELECTED',
    'FAILED',
  ],
  FX_LOCKED: [
    'PAYOUT_SUBMITTED',
    'FAILED',
  ],
  PAYOUT_SUBMITTED: [
    'PAYOUT_ACCEPTED',
    'FAILED',
    'RETURN_PENDING',
  ],
  PAYOUT_ACCEPTED: [
    'PAYOUT_PENDING',
    'FAILED',
    'RETURN_PENDING',
  ],
  PAYOUT_PENDING: [
    'RECIPIENT_CREDITED',
    'FAILED',
    'RETURN_PENDING',
  ],
  RECIPIENT_CREDITED: [
    'COMPLETED',
  ],
  COMPLETED: [],
  FAILED: [
    'RETURN_PENDING',
    'CREATED', // re-attempt from scratch
  ],
  RETURN_PENDING: [
    'RETURNED',
    'FAILED',
  ],
  RETURNED: [],
  CANCELLED: [],
};

// ─── Transition Validation ────────────────────────────────────────────────────

export function canTransition(from: TransferState, to: TransferState): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export function transition(
  current: TransferState,
  next: TransferState,
): { success: true; state: TransferState } | { success: false; error: string } {
  if (!canTransition(current, next)) {
    return {
      success: false,
      error: `Invalid transition: ${current} → ${next}`,
    };
  }
  return { success: true, state: next };
}

// ─── State Metadata ───────────────────────────────────────────────────────────

export interface TransferStateMetadata {
  state: TransferState;
  consumerLabel: string;
  corporateLabel: string;
  isTerminal: boolean;
  allowedNextStates: TransferState[];
}

export function getStateMetadata(state: TransferState): TransferStateMetadata {
  return {
    state,
    consumerLabel: CONSUMER_STATUS_LABEL[state],
    corporateLabel: CORPORATE_STATUS_LABEL[state],
    isTerminal: isTerminalState(state),
    allowedNextStates: VALID_TRANSITIONS[state] ?? [],
  };
}

// ─── Backward Compatibility ───────────────────────────────────────────────────

/**
 * Map internal TransferState to the simulated "status" string used
 * by existing consumer/corporate screens. This preserves existing
 * screen behaviour while the richer state machine runs underneath.
 */
export function toLegacyStatus(
  state: TransferState,
): 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' {
  switch (state) {
    case 'CREATED':
    case 'AWAITING_COLLECTION_AUTHORIZATION':
    case 'COLLECTION_AUTHORIZED':
    case 'COLLECTION_PENDING':
      return 'pending';
    case 'COLLECTION_SETTLED':
    case 'ROUTE_SELECTED':
    case 'FX_QUOTED':
    case 'FX_LOCKED':
    case 'PAYOUT_SUBMITTED':
    case 'PAYOUT_ACCEPTED':
    case 'PAYOUT_PENDING':
    case 'RECIPIENT_CREDITED':
    case 'RETURN_PENDING':
      return 'processing';
    case 'COMPLETED':
      return 'completed';
    case 'FAILED':
      return 'failed';
    case 'RETURNED':
    case 'CANCELLED':
      return 'cancelled';
    default:
      return 'pending';
  }
}
