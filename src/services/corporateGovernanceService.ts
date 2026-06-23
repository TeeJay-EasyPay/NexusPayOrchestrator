import { supabase } from "../lib/supabase";
import {
  ApprovalRuleRecord,
  ApprovalRuleRoleRecord,
  AuditEventRecord,
  BatchApprovalDecision,
  BatchApprovalRecord,
  BatchTransferRecord,
  CorporateRole,
  PaymentCategoryRecord,
  PaymentTypeRecord,
  PayoutBatchRecord,
} from "../types/multiEntity";
import { getPersonasForRole, hasCorporatePermission } from "./corporateAccessService";
import type { PersonaOption } from "../types/multiEntity";

const DEFAULT_CATEGORIES: PaymentCategoryRecord[] = [
  { id: "people_payments", label: "People Payments", description: "Payroll, bonuses, commissions, contractors and reimbursements.", displayOrder: 10, active: true },
  { id: "supplier_payments", label: "Supplier Payments", description: "Supplier, vendor, procurement, inventory and manufacturing payments.", displayOrder: 20, active: true },
  { id: "operating_expenses", label: "Operating Expenses", description: "Rent, utilities, insurance, software, marketing, travel and training.", displayOrder: 30, active: true },
  { id: "financial_obligations", label: "Financial Obligations", description: "Loan repayments, mortgages, leasing and credit facilities.", displayOrder: 40, active: true },
  { id: "tax_regulatory", label: "Tax & Regulatory", description: "Tax, payroll tax, VAT and pension contributions.", displayOrder: 50, active: true },
  { id: "internal_transfers", label: "Internal Transfers", description: "Internal settlement and funding movements.", displayOrder: 60, active: true },
  { id: "investor_distributions", label: "Investor Distributions", description: "Dividends and partner distributions.", displayOrder: 70, active: true },
  { id: "other", label: "Other", description: "Miscellaneous corporate payments.", displayOrder: 80, active: true },
];

const DEFAULT_TYPES: PaymentTypeRecord[] = [
  ["payroll", "people_payments", "Payroll"],
  ["bonus", "people_payments", "Bonus"],
  ["commission", "people_payments", "Commission"],
  ["contractor", "people_payments", "Contractor"],
  ["expenses_reimbursement", "people_payments", "Expenses Reimbursement"],
  ["supplier", "supplier_payments", "Supplier"],
  ["vendor", "supplier_payments", "Vendor"],
  ["procurement", "supplier_payments", "Procurement"],
  ["inventory", "supplier_payments", "Inventory"],
  ["manufacturing", "supplier_payments", "Manufacturing"],
  ["rent", "operating_expenses", "Rent"],
  ["utilities", "operating_expenses", "Utilities"],
  ["insurance", "operating_expenses", "Insurance"],
  ["software", "operating_expenses", "Software"],
  ["marketing", "operating_expenses", "Marketing"],
  ["travel", "operating_expenses", "Travel"],
  ["training", "operating_expenses", "Training"],
  ["loan_repayment", "financial_obligations", "Loan Repayment"],
  ["mortgage", "financial_obligations", "Mortgage"],
  ["leasing", "financial_obligations", "Leasing"],
  ["credit_facility", "financial_obligations", "Credit Facility"],
  ["tax_payment", "tax_regulatory", "Tax Payment"],
  ["payroll_tax", "tax_regulatory", "Payroll Tax"],
  ["vat", "tax_regulatory", "VAT"],
  ["pension_contributions", "tax_regulatory", "Pension Contributions"],
  ["internal_settlement", "internal_transfers", "Internal Settlement"],
  ["internal_funding", "internal_transfers", "Internal Funding"],
  ["dividend", "investor_distributions", "Dividend"],
  ["partner_distribution", "investor_distributions", "Partner Distribution"],
  ["miscellaneous", "other", "Miscellaneous"],
].map(([id, categoryId, label], index) => ({
  id,
  categoryId,
  label,
  displayOrder: (index + 1) * 10,
  active: true,
}));

const DEFAULT_RULES: ApprovalRuleRecord[] = [
  rule("payroll-default", "payroll", "Payroll requires CFO approval", 0, null, ["cfo"]),
  rule("supplier-low", "supplier", "Supplier up to 10000 requires Finance Manager", 0, 10000, ["finance_manager"]),
  rule("supplier-mid", "supplier", "Supplier 10000 to 50000 requires Finance Manager and CFO", 10000, 50000, ["finance_manager", "cfo"]),
  rule("supplier-high", "supplier", "Supplier over 50000 requires CFO and CEO", 50000, null, ["cfo", "ceo"]),
  rule("dividend-default", "dividend", "Dividend requires CFO and CEO", 0, null, ["cfo", "ceo"]),
  rule("loan-default", "loan_repayment", "Loan repayment requires CFO", 0, null, ["cfo"]),
  rule("misc-default", "miscellaneous", "Miscellaneous requires Finance Manager", 0, null, ["finance_manager"]),
];

function rule(
  id: string,
  paymentTypeId: string,
  label: string,
  minAmount: number,
  maxAmount: number | null,
  roles: CorporateRole[],
): ApprovalRuleRecord {
  return {
    id,
    paymentTypeId,
    label,
    minAmount,
    maxAmount,
    sequential: true,
    enabled: true,
    roles: roles.map((role, index) => ({
      id: `${id}-${role}-${index}`,
      approvalRuleId: id,
      approvalRoleId: role,
      stageOrder: index + 1,
      required: true,
    })),
  };
}

function nowIso() {
  return new Date().toISOString();
}

function mapCategory(row: any): PaymentCategoryRecord {
  return {
    id: String(row.id),
    label: String(row.label),
    description: row.description ? String(row.description) : null,
    displayOrder: Number(row.display_order ?? 0),
    active: Boolean(row.active),
  };
}

function mapType(row: any): PaymentTypeRecord {
  return {
    id: String(row.id),
    categoryId: String(row.category_id),
    label: String(row.label),
    description: row.description ? String(row.description) : null,
    displayOrder: Number(row.display_order ?? 0),
    active: Boolean(row.active),
  };
}

function mapBatch(row: any): PayoutBatchRecord {
  return {
    id: String(row.id),
    senderParticipantId: String(row.sender_participant_id),
    totalValue: Number(row.total_value ?? 0),
    status: String(row.status ?? "CREATED") as PayoutBatchRecord["status"],
    createdAt: String(row.created_at ?? nowIso()),
    paymentCategoryId: row.payment_category_id ? String(row.payment_category_id) : null,
    paymentTypeId: row.payment_type_id ? String(row.payment_type_id) : null,
    createdByPersonaId: row.created_by_persona_id ? String(row.created_by_persona_id) : null,
    createdByRole: row.created_by_role ? String(row.created_by_role) : null,
    releasedByPersonaId: row.released_by_persona_id ? String(row.released_by_persona_id) : null,
    releasedAt: row.released_at ? String(row.released_at) : null,
    approvalStatus: String(row.approval_status ?? "NOT_REQUIRED") as PayoutBatchRecord["approvalStatus"],
  };
}

function mapApproval(row: any): BatchApprovalRecord {
  return {
    id: String(row.id),
    batchId: String(row.batch_id),
    approvalRuleId: row.approval_rule_id ? String(row.approval_rule_id) : null,
    approvalRoleId: String(row.approval_role_id) as CorporateRole,
    assignedPersonaId: String(row.assigned_persona_id),
    stageOrder: Number(row.stage_order ?? 1),
    decision: String(row.decision ?? "PENDING") as BatchApprovalDecision,
    decisionByPersonaId: row.decision_by_persona_id ? String(row.decision_by_persona_id) : null,
    decisionAt: row.decision_at ? String(row.decision_at) : null,
    comment: row.comment ? String(row.comment) : null,
    createdAt: String(row.created_at ?? nowIso()),
  };
}

function mapBatchTransfer(row: any): BatchTransferRecord {
  return {
    id: String(row.id),
    batchId: String(row.batch_id),
    senderParticipantId: String(row.sender_participant_id),
    recipientParticipantId: String(row.recipient_participant_id),
    amount: Number(row.amount),
    status: String(row.status ?? "CREATED") as BatchTransferRecord["status"],
    createdAt: String(row.created_at ?? nowIso()),
  };
}

function mapAudit(row: any): AuditEventRecord {
  return {
    id: String(row.id),
    entityType: String(row.entity_type),
    entityId: String(row.entity_id),
    actorPersonaId: row.actor_persona_id ? String(row.actor_persona_id) : null,
    actorRole: row.actor_role ? String(row.actor_role) : null,
    eventType: String(row.event_type),
    eventMessage: String(row.event_message),
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
    createdAt: String(row.created_at ?? nowIso()),
  };
}

export function getDefaultPaymentCategories() {
  return DEFAULT_CATEGORIES;
}

export function getDefaultPaymentTypes(categoryId?: string) {
  return categoryId ? DEFAULT_TYPES.filter((type) => type.categoryId === categoryId) : DEFAULT_TYPES;
}

export async function loadPaymentCategories(): Promise<PaymentCategoryRecord[]> {
  const { data, error } = await supabase.from("payment_categories").select("*").eq("active", true).order("display_order");
  if (error) {
    console.warn("payment categories unavailable", error.message);
    return DEFAULT_CATEGORIES;
  }
  return (data ?? []).map(mapCategory);
}

export async function loadPaymentTypes(categoryId?: string): Promise<PaymentTypeRecord[]> {
  let query = supabase.from("payment_types").select("*").eq("active", true).order("display_order");
  if (categoryId) query = query.eq("category_id", categoryId);
  const { data, error } = await query;
  if (error) {
    console.warn("payment types unavailable", error.message);
    return getDefaultPaymentTypes(categoryId);
  }
  return (data ?? []).map(mapType);
}

export async function loadApprovalRules(): Promise<ApprovalRuleRecord[]> {
  const { data: ruleRows, error } = await supabase
    .from("approval_rules")
    .select("*")
    .order("min_amount", { ascending: true });

  if (error) {
    console.warn("approval rules unavailable", error.message);
    return DEFAULT_RULES;
  }

  const rules = ruleRows ?? [];
  const ruleIds = rules.map((row: any) => String(row.id));
  const { data: roleRows } = ruleIds.length
    ? await supabase.from("approval_rule_roles").select("*").in("approval_rule_id", ruleIds).order("stage_order")
    : { data: [] as any[] };

  const rolesByRule = new Map<string, ApprovalRuleRoleRecord[]>();
  for (const row of roleRows ?? []) {
    const approvalRuleId = String((row as any).approval_rule_id);
    const next = rolesByRule.get(approvalRuleId) ?? [];
    next.push({
      id: String((row as any).id),
      approvalRuleId,
      approvalRoleId: String((row as any).approval_role_id) as CorporateRole,
      stageOrder: Number((row as any).stage_order ?? 1),
      required: Boolean((row as any).required),
    });
    rolesByRule.set(approvalRuleId, next);
  }

  return rules.map((row: any) => ({
    id: String(row.id),
    paymentTypeId: String(row.payment_type_id),
    label: String(row.label),
    minAmount: Number(row.min_amount ?? 0),
    maxAmount: row.max_amount === null || row.max_amount === undefined ? null : Number(row.max_amount),
    sequential: Boolean(row.sequential),
    enabled: Boolean(row.enabled),
    roles: (rolesByRule.get(String(row.id)) ?? []).sort((a, b) => a.stageOrder - b.stageOrder),
  }));
}

export async function saveApprovalRuleConfig(input: {
  persona: PersonaOption;
  ruleId: string;
  enabled: boolean;
  sequential: boolean;
  minAmount: number;
  maxAmount: number | null;
  roleIds: CorporateRole[];
}) {
  if (!hasCorporatePermission(input.persona, "configure_governance")) {
    throw new Error("This persona cannot configure approval governance.");
  }

  const { error } = await supabase
    .from("approval_rules")
    .update({
      enabled: input.enabled,
      sequential: input.sequential,
      min_amount: input.minAmount,
      max_amount: input.maxAmount,
      updated_by_persona_id: input.persona.id,
      updated_at: nowIso(),
    })
    .eq("id", input.ruleId);

  if (error) throw new Error(error.message);

  await supabase.from("approval_rule_roles").delete().eq("approval_rule_id", input.ruleId);

  if (input.roleIds.length) {
    const { error: rolesError } = await supabase.from("approval_rule_roles").insert(
      input.roleIds.map((role, index) => ({
        approval_rule_id: input.ruleId,
        approval_role_id: role,
        stage_order: index + 1,
        required: true,
      })),
    );
    if (rolesError) throw new Error(rolesError.message);
  }

  await writeAuditEvent({
    entityType: "approval_rule",
    entityId: input.ruleId,
    actor: input.persona,
    eventType: "APPROVAL_RULE_UPDATED",
    eventMessage: "Approval governance rule updated.",
    metadata: { roleIds: input.roleIds, enabled: input.enabled, sequential: input.sequential },
  });
}

export function evaluateApprovalRule(
  rules: ApprovalRuleRecord[],
  paymentTypeId: string,
  amount: number,
): ApprovalRuleRecord | null {
  return (
    rules
      .filter((ruleItem) => ruleItem.enabled && ruleItem.paymentTypeId === paymentTypeId)
      .filter((ruleItem) => amount >= ruleItem.minAmount && (ruleItem.maxAmount === null || amount <= ruleItem.maxAmount))
      .sort((a, b) => b.minAmount - a.minAmount)[0] ?? null
  );
}

export async function writeAuditEvent(input: {
  entityType: string;
  entityId: string;
  actor?: PersonaOption | null;
  eventType: string;
  eventMessage: string;
  metadata?: Record<string, unknown>;
}) {
  const { error } = await supabase.from("audit_events").insert({
    entity_type: input.entityType,
    entity_id: input.entityId,
    actor_persona_id: input.actor?.id ?? null,
    actor_role: input.actor?.corporateRole ?? null,
    event_type: input.eventType,
    event_message: input.eventMessage,
    metadata: input.metadata ?? {},
  });
  if (error) console.warn("audit event write failed", error.message);
}

export async function createApprovalRequestsForBatch(input: {
  batchId: string;
  paymentTypeId: string;
  amount: number;
  actor: PersonaOption;
}) {
  const rules = await loadApprovalRules();
  const matchedRule = evaluateApprovalRule(rules, input.paymentTypeId, input.amount);

  if (!matchedRule || matchedRule.roles.length === 0) {
    await supabase
      .from("payout_batches")
      .update({ approval_status: "NOT_REQUIRED", status: "APPROVED" })
      .eq("id", input.batchId);
    return { rule: null, approvals: [] as BatchApprovalRecord[] };
  }

  const approvalPayload = matchedRule.roles.flatMap((role) =>
    getPersonasForRole(role.approvalRoleId).map((personaId) => ({
      batch_id: input.batchId,
      approval_rule_id: matchedRule.id,
      approval_role_id: role.approvalRoleId,
      assigned_persona_id: personaId,
      stage_order: role.stageOrder,
      decision: "PENDING",
    })),
  );

  const { data, error } = await supabase.from("batch_approvals").insert(approvalPayload).select("*");
  if (error) throw new Error(error.message);

  await supabase
    .from("payout_batches")
    .update({ approval_status: "PENDING", status: "PENDING_APPROVAL" })
    .eq("id", input.batchId);

  const approvals = (data ?? []).map(mapApproval);

  const notificationPayload = approvals.map((approval) => ({
    participant_id: "nexus-manufacturing-ltd",
    title: "Approval request assigned",
    message: `Batch ${input.batchId.slice(0, 8)} for ${input.amount.toLocaleString()} requires ${approval.approvalRoleId.replace(/_/g, " ")} approval.`,
    read: false,
    notification_type: "APPROVAL_REQUEST",
    metadata: {
      batchId: input.batchId,
      assignedPersonaId: approval.assignedPersonaId,
      approvalId: approval.id,
      approvalRoleId: approval.approvalRoleId,
      paymentTypeId: input.paymentTypeId,
      amount: input.amount,
    },
  }));
  if (notificationPayload.length) {
    await supabase.from("notifications").insert(notificationPayload);
  }

  await writeAuditEvent({
    entityType: "payout_batch",
    entityId: input.batchId,
    actor: input.actor,
    eventType: "APPROVAL_REQUESTS_CREATED",
    eventMessage: "Approval requests created from governance rule.",
    metadata: { ruleId: matchedRule.id, paymentTypeId: input.paymentTypeId, amount: input.amount },
  });

  return { rule: matchedRule, approvals };
}

export async function loadBatchApprovals(batchId?: string): Promise<BatchApprovalRecord[]> {
  let query = supabase.from("batch_approvals").select("*").order("created_at", { ascending: false });
  if (batchId) query = query.eq("batch_id", batchId);
  const { data, error } = await query;
  if (error) {
    console.warn("batch approvals unavailable", error.message);
    return [];
  }
  return (data ?? []).map(mapApproval);
}

export async function loadPayoutBatchesByIds(batchIds: string[]): Promise<PayoutBatchRecord[]> {
  if (batchIds.length === 0) return [];

  const { data, error } = await supabase
    .from("payout_batches")
    .select("*")
    .in("id", batchIds);

  if (error) {
    console.warn("payout batches by id unavailable", error.message);
    return [];
  }

  return (data ?? []).map(mapBatch);
}

export async function loadBatchTransfersForBatches(batchIds: string[]): Promise<BatchTransferRecord[]> {
  if (batchIds.length === 0) return [];

  const { data, error } = await supabase
    .from("batch_transfers")
    .select("*")
    .in("batch_id", batchIds)
    .order("created_at", { ascending: true });

  if (error) {
    console.warn("batch transfer details unavailable", error.message);
    return [];
  }

  return (data ?? []).map(mapBatchTransfer);
}

export async function loadApprovalQueue(persona: PersonaOption): Promise<BatchApprovalRecord[]> {
  const { data, error } = await supabase
    .from("batch_approvals")
    .select("*")
    .eq("assigned_persona_id", persona.id)
    .eq("decision", "PENDING")
    .order("created_at", { ascending: false });
  if (error) {
    console.warn("approval queue unavailable", error.message);
    return [];
  }
  return (data ?? []).map(mapApproval);
}

export async function decideApproval(input: {
  approvalId: string;
  decision: "APPROVED" | "REJECTED";
  comment?: string;
  actor: PersonaOption;
}) {
  if (!hasCorporatePermission(input.actor, "approve_payments")) {
    throw new Error("This persona cannot approve or reject payments.");
  }

  const { data: approvalRow, error: approvalLoadError } = await supabase
    .from("batch_approvals")
    .select("*")
    .eq("id", input.approvalId)
    .maybeSingle();

  if (approvalLoadError || !approvalRow) {
    throw new Error(approvalLoadError?.message ?? "Approval request not found.");
  }

  if (String((approvalRow as any).assigned_persona_id) !== input.actor.id) {
    throw new Error("This approval request is assigned to another persona.");
  }

  if (String((approvalRow as any).decision) !== "PENDING") {
    throw new Error("This approval request has already been decided.");
  }

  const batchId = String((approvalRow as any).batch_id);

  const { error } = await supabase
    .from("batch_approvals")
    .update({
      decision: input.decision,
      decision_by_persona_id: input.actor.id,
      decision_at: nowIso(),
      comment: input.comment ?? null,
    })
    .eq("id", input.approvalId);
  if (error) throw new Error(error.message);

  const approvals = await loadBatchApprovals(batchId);
  const rejected = approvals.some((approval) => approval.id === input.approvalId ? input.decision === "REJECTED" : approval.decision === "REJECTED");
  const allApproved = approvals.every((approval) => approval.id === input.approvalId ? input.decision === "APPROVED" : approval.decision === "APPROVED");

  if (rejected) {
    await supabase.from("payout_batches").update({ approval_status: "REJECTED", status: "REJECTED" }).eq("id", batchId);
  } else if (allApproved) {
    await supabase.from("payout_batches").update({ approval_status: "APPROVED", status: "APPROVED" }).eq("id", batchId);
    await supabase.from("notifications").insert({
      participant_id: "nexus-manufacturing-ltd",
      title: "Batch ready for release",
      message: `Batch ${batchId.slice(0, 8)} has all required approvals and is ready for release.`,
      read: false,
      notification_type: "BATCH_READY_FOR_RELEASE",
      metadata: { batchId, assignedPersonaId: "batch-payments-processor" },
    });
  }

  await writeAuditEvent({
    entityType: "payout_batch",
    entityId: batchId,
    actor: input.actor,
    eventType: `APPROVAL_${input.decision}`,
    eventMessage: `Approval request ${input.decision.toLowerCase()}.`,
    metadata: { approvalId: input.approvalId, comment: input.comment ?? null },
  });
}

export async function releaseApprovedBatch(batchId: string, actor: PersonaOption) {
  if (!hasCorporatePermission(actor, "release_batches")) {
    throw new Error("This persona cannot release approved batches.");
  }

  const approvals = await loadBatchApprovals(batchId);
  if (approvals.length > 0 && approvals.some((approval) => approval.decision !== "APPROVED")) {
    throw new Error("Batch cannot be released until all approvals are complete.");
  }

  const { data, error } = await supabase
    .from("payout_batches")
    .update({
      status: "COMPLETED",
      released_by_persona_id: actor.id,
      released_at: nowIso(),
      approval_status: approvals.length > 0 ? "APPROVED" : "NOT_REQUIRED",
    })
    .eq("id", batchId)
    .eq("status", "APPROVED")
    .is("released_at", null)
    .select("*")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) {
    throw new Error("Batch is not eligible for release or has already been released.");
  }

  await supabase.from("batch_transfers").update({ status: "DELIVERED" }).eq("batch_id", batchId);

  await writeAuditEvent({
    entityType: "payout_batch",
    entityId: batchId,
    actor,
    eventType: "BATCH_RELEASED",
    eventMessage: "Approved batch released.",
    metadata: { approvalCount: approvals.length },
  });
}

export async function loadPayoutBatches(limit = 50): Promise<PayoutBatchRecord[]> {
  const { data, error } = await supabase
    .from("payout_batches")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.warn("payout batches unavailable", error.message);
    return [];
  }
  return (data ?? []).map(mapBatch);
}

export async function loadAuditEvents(limit = 50): Promise<AuditEventRecord[]> {
  const { data, error } = await supabase
    .from("audit_events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.warn("audit events unavailable", error.message);
    return [];
  }
  return (data ?? []).map(mapAudit);
}
