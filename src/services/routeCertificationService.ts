/**
 * NexusPay Orchestrator — Route Certification Service
 * External Rail Readiness Sprint — 2026-06-16
 *
 * Tracks certification status for every route/corridor/provider combination.
 * Required before a production corridor can be activated.
 */

// ─── Certification Status ─────────────────────────────────────────────────────

export type CertificationStatus =
  | 'UNKNOWN'
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'PASS'
  | 'FAIL'
  | 'BLOCKED'
  | 'NEEDS_PARTNER_ACCESS';

// ─── Founder Approval State ───────────────────────────────────────────────────

export type FounderApprovalState =
  | 'NOT_REVIEWED'
  | 'APPROVED'
  | 'REJECTED'
  | 'PENDING_REVIEW';

// ─── Route Certification Record ───────────────────────────────────────────────

export interface RouteCertificationRecord {
  /** Unique certification ID */
  id: string;
  /** e.g. "GBP-NGN" */
  corridor: string;
  /** e.g. "MockOpenBankingCollectionProvider" */
  collectionProvider: string;
  /** e.g. "MockNiumProvider" */
  payoutProvider: string;
  /** Optional FX provider */
  fxProvider?: string;
  /** Current certification status */
  status: CertificationStatus;
  /** Summary result from last test run */
  certificationResult?: string;
  /** ISO 8601 timestamp of last test */
  lastTested?: string;
  /** Evidence reference (log ID, test run ID, etc.) */
  evidence?: string;
  /** Reason for failure/block */
  failureReason?: string;
  /** Recommendation for next steps */
  retryRecommendation?: string;
  /** Whether founder has approved this route for production */
  founderApprovalState: FounderApprovalState;
  /** ISO 8601 timestamp of founder approval */
  founderApprovedAt?: string;
  /** Created at */
  createdAt: string;
  /** Last updated */
  updatedAt: string;
}

// ─── In-Memory Store ──────────────────────────────────────────────────────────

const certificationStore = new Map<string, RouteCertificationRecord>();

function buildKey(
  corridor: string,
  collectionProvider: string,
  payoutProvider: string,
  fxProvider?: string,
): string {
  return [corridor, collectionProvider, payoutProvider, fxProvider ?? 'NONE'].join('::');
}

// ─── UUID Helper ──────────────────────────────────────────────────────────────

function generateId(): string {
  return 'cert-' + Math.random().toString(36).slice(2, 11);
}

// ─── Registration ─────────────────────────────────────────────────────────────

export function registerCertification(
  corridor: string,
  collectionProvider: string,
  payoutProvider: string,
  fxProvider?: string,
): RouteCertificationRecord {
  const key = buildKey(corridor, collectionProvider, payoutProvider, fxProvider);
  const existing = certificationStore.get(key);
  if (existing) return existing;

  const record: RouteCertificationRecord = {
    id: generateId(),
    corridor,
    collectionProvider,
    payoutProvider,
    fxProvider,
    status: 'NOT_STARTED',
    founderApprovalState: 'NOT_REVIEWED',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  certificationStore.set(key, record);
  return record;
}

// ─── Update ───────────────────────────────────────────────────────────────────

export function updateCertificationStatus(
  corridor: string,
  collectionProvider: string,
  payoutProvider: string,
  update: Partial<
    Pick<
      RouteCertificationRecord,
      | 'status'
      | 'certificationResult'
      | 'lastTested'
      | 'evidence'
      | 'failureReason'
      | 'retryRecommendation'
    >
  >,
  fxProvider?: string,
): RouteCertificationRecord | null {
  const key = buildKey(corridor, collectionProvider, payoutProvider, fxProvider);
  const record = certificationStore.get(key);
  if (!record) return null;

  Object.assign(record, update, { updatedAt: new Date().toISOString() });
  return record;
}

export function setFounderApproval(
  corridor: string,
  collectionProvider: string,
  payoutProvider: string,
  state: FounderApprovalState,
  fxProvider?: string,
): RouteCertificationRecord | null {
  const key = buildKey(corridor, collectionProvider, payoutProvider, fxProvider);
  const record = certificationStore.get(key);
  if (!record) return null;

  record.founderApprovalState = state;
  if (state === 'APPROVED') {
    record.founderApprovedAt = new Date().toISOString();
  }
  record.updatedAt = new Date().toISOString();
  return record;
}

// ─── Retrieval ────────────────────────────────────────────────────────────────

export function getCertification(
  corridor: string,
  collectionProvider: string,
  payoutProvider: string,
  fxProvider?: string,
): RouteCertificationRecord | undefined {
  const key = buildKey(corridor, collectionProvider, payoutProvider, fxProvider);
  return certificationStore.get(key);
}

export function listAllCertifications(): RouteCertificationRecord[] {
  return Array.from(certificationStore.values());
}

export function listCertificationsByCorridor(corridor: string): RouteCertificationRecord[] {
  return Array.from(certificationStore.values()).filter((r) => r.corridor === corridor);
}

export function listCertificationsByStatus(status: CertificationStatus): RouteCertificationRecord[] {
  return Array.from(certificationStore.values()).filter((r) => r.status === status);
}

// ─── Certification Summary ────────────────────────────────────────────────────

export interface CertificationSummary {
  total: number;
  byStatus: Record<CertificationStatus, number>;
  passRate: number;
  readyForProduction: number;
}

export function getCertificationSummary(): CertificationSummary {
  const all = listAllCertifications();
  const byStatus: Record<CertificationStatus, number> = {
    UNKNOWN: 0,
    NOT_STARTED: 0,
    IN_PROGRESS: 0,
    PASS: 0,
    FAIL: 0,
    BLOCKED: 0,
    NEEDS_PARTNER_ACCESS: 0,
  };

  for (const record of all) {
    byStatus[record.status] = (byStatus[record.status] ?? 0) + 1;
  }

  const passCount = byStatus['PASS'];
  const passRate = all.length > 0 ? Math.round((passCount / all.length) * 100) : 0;
  const readyForProduction = all.filter(
    (r) => r.status === 'PASS' && r.founderApprovalState === 'APPROVED',
  ).length;

  return { total: all.length, byStatus, passRate, readyForProduction };
}

// ─── Seed Initial Mock Certifications ────────────────────────────────────────

/**
 * Register the initial set of mock certifications for sandbox validation.
 * Call this during app initialisation when in mock/sandbox mode.
 */
export function seedMockCertifications(): void {
  const corridors = ['GBP-NGN', 'GBP-KES', 'GBP-GHS', 'EUR-NGN', 'USD-NGN'];
  const collectionProviders = ['MockOpenBankingCollectionProvider', 'MockBankSandboxCollectionProvider'];
  const payoutProviders = ['MockNiumProvider', 'MockTrangloProvider', 'MockThunesProvider'];

  for (const corridor of corridors) {
    for (const cp of collectionProviders) {
      for (const pp of payoutProviders) {
        registerCertification(corridor, cp, pp);
      }
    }
  }
}
