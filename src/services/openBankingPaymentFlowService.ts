import { supabase } from "../lib/supabase";
import {
  Currency,
  OpenBankingPaymentFlow,
  OpenBankingPaymentFlowStep,
  OpenBankingProvenance,
  OpenBankingStepStatus,
} from "../types/transfer";

type StartOpenBankingPaymentFlowInput = {
  transferId: string;
  amount: number;
  currency: Currency;
  fundingReference?: string;
};

function mapStep(row: any): OpenBankingPaymentFlowStep {
  return {
    id: row.id,
    flowId: row.flow_id,
    transferId: row.transfer_id,
    stepKey: row.step_key,
    label: row.label,
    status: (row.status ?? "PENDING") as OpenBankingStepStatus,
    provider: row.provider ?? "Yapily",
    provenance: (row.provenance ?? "SANDBOX") as OpenBankingProvenance,
    sequence: Number(row.sequence ?? 0),
    responseTimeMs: row.response_time_ms ?? null,
    httpStatus: row.http_status ?? null,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
  };
}

function mapFlow(row: any, steps: any[] = []): OpenBankingPaymentFlow {
  return {
    id: row.id,
    transferId: row.transfer_id,
    providerId: row.provider_id ?? "yapily",
    environment: row.environment ?? "sandbox",
    institutionId: row.institution_id ?? null,
    institutionName: row.institution_name ?? null,
    paymentRequestId: row.payment_request_id ?? null,
    consentId: row.consent_id ?? null,
    authorizationUrl: row.authorization_url ?? null,
    status: row.status ?? "CREATED",
    amount: Number(row.amount ?? 0),
    currency: (row.currency ?? "GBP") as Currency,
    fundingReference: row.funding_reference ?? null,
    provenance: (row.provenance ?? "SANDBOX") as OpenBankingProvenance,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    steps: steps.map(mapStep).sort((a, b) => a.sequence - b.sequence),
  };
}

export async function startOpenBankingPaymentFlow(input: StartOpenBankingPaymentFlowInput) {
  const { data, error } = await supabase.functions.invoke("nexuspay-open-banking-payment-flow", {
    body: {
      action: "start",
      transferId: input.transferId,
      amount: input.amount,
      currency: input.currency,
      fundingReference: input.fundingReference,
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data?.flow) {
    throw new Error("Open banking flow did not return a persisted flow.");
  }

  return mapFlow(data.flow, data.steps ?? []);
}

export async function loadOpenBankingPaymentFlow(transferId: string) {
  const { data: flowRows, error: flowError } = await supabase
    .from("open_banking_payment_flows")
    .select("*")
    .eq("transfer_id", transferId)
    .order("created_at", { ascending: false })
    .limit(1);

  if (flowError) {
    console.warn("Failed to load open banking payment flow", flowError.message);
    return null;
  }

  const flowRow = flowRows?.[0];
  if (!flowRow) {
    return null;
  }

  const { data: stepRows, error: stepError } = await supabase
    .from("open_banking_payment_flow_steps")
    .select("*")
    .eq("flow_id", flowRow.id)
    .order("sequence", { ascending: true });

  if (stepError) {
    console.warn("Failed to load open banking payment flow steps", stepError.message);
    return mapFlow(flowRow, []);
  }

  return mapFlow(flowRow, stepRows ?? []);
}
