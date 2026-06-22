export type ParticipantType = "CORPORATE" | "INDIVIDUAL" | "BUSINESS";

export type CorporateRole =
  | "corporate_user"
  | "ceo"
  | "cfo"
  | "cto"
  | "finance_manager"
  | "finance_director"
  | "auditor";

export type ParticipantRecord = {
  id: string;
  participantType: ParticipantType;
  name: string;
  country: string;
  bankName: string;
  accountLast4: string;
  currency: string;
  createdAt?: string;
};

export type PersonaKind = "PERSONAL" | "PARTICIPANT";
export type PersonaGroup = "CORPORATE_WORKSPACE" | "BUSINESS_ENTITY" | "PRIVATE_USER";

export type PersonaOption = {
  id: string;
  kind: PersonaKind;
  label: string;
  description: string;
  participantId?: string;
  participantType?: ParticipantType;
  corporateRole?: CorporateRole;
  personaGroup?: PersonaGroup;
  country?: string;
  bankName?: string;
  accountLast4?: string;
  currency?: string;
};

export type PayoutBatchStatus =
  | "CREATED"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "REJECTED"
  | "PROCESSING"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "FAILED";

export type BatchTransferStatus = "CREATED" | "ROUTING" | "IN_PROGRESS" | "DELIVERED";

export type PayoutBatchRecord = {
  id: string;
  senderParticipantId: string;
  totalValue: number;
  status: PayoutBatchStatus;
  createdAt: string;
  paymentCategoryId?: string | null;
  paymentTypeId?: string | null;
  createdByPersonaId?: string | null;
  createdByRole?: CorporateRole | string | null;
  releasedByPersonaId?: string | null;
  releasedAt?: string | null;
  approvalStatus?: "NOT_REQUIRED" | "PENDING" | "APPROVED" | "REJECTED";
};

export type BatchTransferRecord = {
  id: string;
  batchId: string;
  senderParticipantId: string;
  recipientParticipantId: string;
  amount: number;
  status: BatchTransferStatus;
  createdAt: string;
};

export type NotificationRecord = {
  id: string;
  participantId: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  notificationType?: string;
  metadata?: Record<string, unknown>;
};

export type PaymentCategoryRecord = {
  id: string;
  label: string;
  description?: string | null;
  displayOrder: number;
  active: boolean;
};

export type PaymentTypeRecord = {
  id: string;
  categoryId: string;
  label: string;
  description?: string | null;
  displayOrder: number;
  active: boolean;
};

export type ApprovalRoleRecord = {
  id: CorporateRole;
  label: string;
  description?: string | null;
  active: boolean;
};

export type ApprovalRuleRoleRecord = {
  id: string;
  approvalRuleId: string;
  approvalRoleId: CorporateRole;
  stageOrder: number;
  required: boolean;
};

export type ApprovalRuleRecord = {
  id: string;
  paymentTypeId: string;
  label: string;
  minAmount: number;
  maxAmount: number | null;
  sequential: boolean;
  enabled: boolean;
  roles: ApprovalRuleRoleRecord[];
};

export type BatchApprovalDecision = "PENDING" | "APPROVED" | "REJECTED" | "SKIPPED";

export type BatchApprovalRecord = {
  id: string;
  batchId: string;
  approvalRuleId?: string | null;
  approvalRoleId: CorporateRole;
  assignedPersonaId: string;
  stageOrder: number;
  decision: BatchApprovalDecision;
  decisionByPersonaId?: string | null;
  decisionAt?: string | null;
  comment?: string | null;
  createdAt: string;
};

export type AuditEventRecord = {
  id: string;
  entityType: string;
  entityId: string;
  actorPersonaId?: string | null;
  actorRole?: string | null;
  eventType: string;
  eventMessage: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};

const corporateBank = {
  participantId: "nexus-manufacturing-ltd",
  participantType: "CORPORATE" as const,
  personaGroup: "CORPORATE_WORKSPACE" as const,
  country: "United Kingdom",
  bankName: "Nexus Corporate Bank",
  accountLast4: "1000",
  currency: "GBP",
};

export const DEMO_PERSONAS: PersonaOption[] = [
  {
    id: "corporate-demo",
    kind: "PARTICIPANT",
    corporateRole: "corporate_user",
    label: "Corporate User",
    description: "Corporate platform administrator",
    ...corporateBank,
  },
  {
    id: "corporate-ceo",
    kind: "PARTICIPANT",
    corporateRole: "ceo",
    label: "Chief Executive Officer (CEO)",
    description: "Corporate governance and executive approvals",
    ...corporateBank,
  },
  {
    id: "corporate-cfo",
    kind: "PARTICIPANT",
    corporateRole: "cfo",
    label: "Chief Financial Officer (CFO)",
    description: "Finance approvals, reporting and batch review",
    ...corporateBank,
  },
  {
    id: "corporate-cto",
    kind: "PARTICIPANT",
    corporateRole: "cto",
    label: "Chief Technology Officer (CTO)",
    description: "Operations intelligence and platform health",
    ...corporateBank,
  },
  {
    id: "finance-manager",
    kind: "PARTICIPANT",
    corporateRole: "finance_manager",
    label: "Finance Manager",
    description: "Batch creation, recipients and threshold approvals",
    ...corporateBank,
  },
  {
    id: "finance-director",
    kind: "PARTICIPANT",
    corporateRole: "finance_director",
    label: "Finance Director",
    description: "Higher-value approvals and reporting",
    ...corporateBank,
  },
  {
    id: "corporate-auditor",
    kind: "PARTICIPANT",
    corporateRole: "auditor",
    label: "Auditor",
    description: "Audit logs, governance rules and read-only reporting",
    ...corporateBank,
  },
  {
    id: "alpha-trading-llc",
    kind: "PARTICIPANT",
    participantId: "alpha-trading-llc",
    participantType: "BUSINESS",
    personaGroup: "BUSINESS_ENTITY",
    label: "Alpha Trading LLC",
    description: "Business entity - UAE",
    country: "UAE",
    bankName: "ADCB",
    accountLast4: "1134",
    currency: "AED",
  },
  {
    id: "manila-services-inc",
    kind: "PARTICIPANT",
    participantId: "manila-services-inc",
    participantType: "BUSINESS",
    personaGroup: "BUSINESS_ENTITY",
    label: "Manila Services Inc",
    description: "Business entity - Philippines",
    country: "Philippines",
    bankName: "BDO",
    accountLast4: "5588",
    currency: "PHP",
  },
  {
    id: "kuala-lumpur-logistics",
    kind: "PARTICIPANT",
    participantId: "kuala-lumpur-logistics",
    participantType: "BUSINESS",
    personaGroup: "BUSINESS_ENTITY",
    label: "Kuala Lumpur Logistics",
    description: "Business entity - Malaysia",
    country: "Malaysia",
    bankName: "CIMB",
    accountLast4: "7744",
    currency: "MYR",
  },
  {
    id: "anne-santos",
    kind: "PARTICIPANT",
    participantId: "anne-santos",
    participantType: "INDIVIDUAL",
    personaGroup: "PRIVATE_USER",
    label: "Anne",
    description: "Private user - Philippines",
    country: "Philippines",
    bankName: "BDO Unibank",
    accountLast4: "8421",
    currency: "PHP",
  },
  {
    id: "james-rahman",
    kind: "PARTICIPANT",
    participantId: "james-rahman",
    participantType: "INDIVIDUAL",
    personaGroup: "PRIVATE_USER",
    label: "James",
    description: "Private user - Malaysia",
    country: "Malaysia",
    bankName: "Maybank",
    accountLast4: "3157",
    currency: "MYR",
  },
  {
    id: "maria-santos",
    kind: "PARTICIPANT",
    participantId: "maria-santos",
    participantType: "INDIVIDUAL",
    personaGroup: "PRIVATE_USER",
    label: "Maria",
    description: "Private user - Philippines",
    country: "Philippines",
    bankName: "BPI",
    accountLast4: "7812",
    currency: "PHP",
  },
  {
    id: "john-khan",
    kind: "PARTICIPANT",
    participantId: "john-khan",
    participantType: "INDIVIDUAL",
    personaGroup: "PRIVATE_USER",
    label: "John",
    description: "Private user - UAE",
    country: "UAE",
    bankName: "Emirates NBD",
    accountLast4: "9912",
    currency: "AED",
  },
];

export const CORPORATE_PARTICIPANT_ID = "nexus-manufacturing-ltd";

export const CORPORATE_RECIPIENT_IDS = [
  "anne-santos",
  "james-rahman",
  "maria-santos",
  "john-khan",
  "alpha-trading-llc",
  "manila-services-inc",
  "kuala-lumpur-logistics",
] as const;
