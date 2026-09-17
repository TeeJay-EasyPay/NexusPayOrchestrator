// Legacy runtime 1.0.0 has no native Sumsub SDK. Keep REST status checks available.

import { supabase } from "../lib/supabase";

export type ComplianceSubjectType = "INDIVIDUAL" | "COMPANY" | "PLATFORM";
export type ComplianceStatus = {
  verificationStatus: string;
  reviewAnswer?: string | null;
  amlStatus: string;
  applicantExists: boolean;
  subjectType: ComplianceSubjectType;
  levelName?: string;
  steps?: { id: string; status: string }[];
  stepsAvailable?: boolean;
};

type PersonaInput = { personaId: string; personaGroup: string; subjectType: ComplianceSubjectType };

async function invoke<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>("nexuspay-sumsub", { body });
  if (error) {
    const detail = await error.context?.json?.().catch(() => null);
    const code = detail?.error;
    const messages: Record<string, string> = {
      SUMSUB_COMPANY_LEVEL_NOT_CONFIGURED: "Company verification is not configured in the provider sandbox yet.",
      SUMSUB_TRANSACTION_MONITORING_NOT_CONFIGURED: "Transaction monitoring is not enabled in the provider sandbox yet.",
      SUMSUB_UNREACHABLE: "The verification provider is temporarily unreachable. Please retry.",
      AUTHENTICATION_REQUIRED: "Please sign in again to continue verification.",
      VERIFIED_APPLICANT_REQUIRED: "Complete identity verification before submitting a transaction for screening.",
    };
    throw new Error(messages[code] ?? code ?? error.message);
  }
  if (data && typeof data === "object" && "error" in data) throw new Error(String((data as { error: unknown }).error));
  return data as T;
}

export function loadComplianceStatus(input: PersonaInput) {
  return invoke<ComplianceStatus>({ operation: "status", ...input });
}

export function loadComplianceHealth(input: PersonaInput) {
  return invoke<Record<string, unknown>>({ operation: input.subjectType === "PLATFORM" ? "overview" : "health", ...input });
}

export function loadTransactionChecks(input: PersonaInput) {
  return invoke<{ checks: { transfer_id: string; status: string; review_answer: string | null; updated_at: string }[] }>({ operation: "transaction_status", ...input });
}

export async function launchIdentityVerification(_input: PersonaInput): Promise<never> {
  throw new Error("Identity capture requires the newer NexusPay app with the verification SDK. This visual update keeps your existing app compatible; verification status remains available.");
}

export function submitTransactionScreening(input: PersonaInput & { transferId: string; amount: number; currency: string; counterpartyId: string; counterpartyName: string }) {
  return invoke<{ submitted: boolean; status: string; providerTransactionId?: string | null }>({ operation: "submit_transaction", ...input });
}
