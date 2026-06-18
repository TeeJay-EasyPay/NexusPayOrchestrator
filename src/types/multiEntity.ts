export type ParticipantType = "CORPORATE" | "INDIVIDUAL" | "BUSINESS";

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

export type PersonaOption = {
  id: string;
  kind: PersonaKind;
  label: string;
  description: string;
  participantId?: string;
  participantType?: ParticipantType;
  country?: string;
  bankName?: string;
  accountLast4?: string;
  currency?: string;
};

export type PayoutBatchStatus = "CREATED" | "IN_PROGRESS" | "COMPLETED";

export type BatchTransferStatus = "CREATED" | "ROUTING" | "IN_PROGRESS" | "DELIVERED";

export type PayoutBatchRecord = {
  id: string;
  senderParticipantId: string;
  totalValue: number;
  status: PayoutBatchStatus;
  createdAt: string;
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
};

export const DEMO_PERSONAS: PersonaOption[] = [
  {
    id: "personal-user",
    kind: "PERSONAL",
    label: "Existing Personal User",
    description: "Current personal account demo flow",
  },
  {
    id: "corporate-demo",
    kind: "PARTICIPANT",
    participantId: "nexus-manufacturing-ltd",
    participantType: "CORPORATE",
    label: "Corporate User",
    description: "Nexus Manufacturing Ltd",
    country: "United Kingdom",
    bankName: "Nexus Treasury Bank",
    accountLast4: "1000",
    currency: "GBP",
  },
  {
    id: "anne-santos",
    kind: "PARTICIPANT",
    participantId: "anne-santos",
    participantType: "INDIVIDUAL",
    label: "Anne Santos",
    description: "Individual · Philippines",
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
    label: "James Rahman",
    description: "Individual · Malaysia",
    country: "Malaysia",
    bankName: "Maybank",
    accountLast4: "3157",
    currency: "MYR",
  },
  {
    id: "sarah-khan",
    kind: "PARTICIPANT",
    participantId: "sarah-khan",
    participantType: "INDIVIDUAL",
    label: "Sarah Khan",
    description: "Individual · UAE",
    country: "UAE",
    bankName: "Emirates NBD",
    accountLast4: "9912",
    currency: "AED",
  },
  {
    id: "alpha-trading-llc",
    kind: "PARTICIPANT",
    participantId: "alpha-trading-llc",
    participantType: "BUSINESS",
    label: "Alpha Trading LLC",
    description: "Business · UAE",
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
    label: "Manila Services Inc",
    description: "Business · Philippines",
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
    label: "Kuala Lumpur Logistics",
    description: "Business · Malaysia",
    country: "Malaysia",
    bankName: "CIMB",
    accountLast4: "7744",
    currency: "MYR",
  },
];

export const CORPORATE_PARTICIPANT_ID = "nexus-manufacturing-ltd";

export const CORPORATE_RECIPIENT_IDS = [
  "anne-santos",
  "james-rahman",
  "sarah-khan",
  "alpha-trading-llc",
  "manila-services-inc",
  "kuala-lumpur-logistics",
] as const;
