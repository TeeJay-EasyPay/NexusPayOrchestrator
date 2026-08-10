import { supabase } from "../lib/supabase";
import { Currency } from "../types/transfer";

export type NiumBeneficiaryField = {
  path: string;
  required: boolean;
  enabled: boolean;
  label: string;
  placeholder: string;
  description?: string;
  type: string;
  options: { label: string; value: string }[];
  pattern?: string;
  minLength?: number;
  maxLength?: number;
};

export type NiumBeneficiarySchema = {
  provider: "Nium Sandbox";
  provenance: "SANDBOX";
  source: "Nium Supported Corridors V3 API";
  payoutMethod: "LOCAL";
  destinationCountry: string;
  destinationCurrency: Currency;
  beneficiaryAccountType: "INDIVIDUAL";
  routingCodeType: string;
  deliveryTAT: string;
  minimumAmount?: number | null;
  maximumAmount?: number | null;
  payoutConfigured: boolean;
  fields: NiumBeneficiaryField[];
  fetchedAt: string;
};

async function edgeError(error: unknown) {
  const context = error && typeof error === "object" && "context" in error
    ? (error as { context?: unknown }).context
    : null;
  if (context instanceof Response) {
    const payload = await context.clone().json().catch(() => null) as { error?: string; action?: string } | null;
    if (payload?.error) return `${payload.error}${payload.action ? ` ${payload.action}` : ""}`;
  }
  return error instanceof Error ? error.message : "Nium recipient requirements are unavailable.";
}

export async function getNiumBeneficiarySchema(input: { country: string; currency: Currency }) {
  const { data, error } = await supabase.functions.invoke<NiumBeneficiarySchema>("nexuspay-submit-payout", {
    body: {
      providerId: "nium",
      environment: "sandbox",
      operation: "beneficiary_schema",
      destinationCountry: input.country,
      destinationCurrency: input.currency,
    },
  });
  if (error) throw new Error(await edgeError(error));
  if (!data?.fields) throw new Error("Nium returned no recipient requirements for this corridor.");
  return data;
}

export type NiumFxQuote = {
  provider: "Nium Sandbox";
  provenance: "SANDBOX";
  source: "Nium Exchange Rate V2 API";
  quoteId: string;
  sourceCurrency: Currency;
  destinationCurrency: Currency;
  sourceAmount: number;
  destinationAmount: number;
  exchangeRate: number;
  markupRate?: number | null;
  expiryDate?: string;
  payoutConfigured: boolean;
};

export async function getNiumFxQuote(input: { sourceCurrency: Currency; destinationCurrency: Currency; sourceAmount: number }) {
  const { data, error } = await supabase.functions.invoke<NiumFxQuote>("nexuspay-submit-payout", {
    body: { providerId: "nium", environment: "sandbox", operation: "fx_quote", ...input },
  });
  if (error) throw new Error(await edgeError(error));
  if (!data?.exchangeRate || !data.quoteId) throw new Error("Nium returned no usable sandbox FX quote.");
  return data;
}

export function niumFieldHint(field: NiumBeneficiaryField) {
  if (field.path === "routingCodeValue1") return "Use an 8 or 11-character uppercase BIC/SWIFT code.";
  if (field.path === "beneficiaryAccountNumber") return "Enter the recipient IBAN or bank account number without spaces.";
  if (field.path === "beneficiaryAddress") return "Enter the street, village or recognised locality; do not use a PO Box.";
  if (field.path === "beneficiaryCity") return "Enter the city, town, village or nearest recognised locality.";
  if (field.path === "beneficiaryPostcode") return "Use 2 to 12 letters or digits as used by the recipient bank.";
  if (field.path === "beneficiaryIdentificationValue") return "Enter the recipient's matching passport or national ID number.";
  return field.description ?? null;
}

export function niumFieldPlaceholder(field: NiumBeneficiaryField) {
  if (field.path === "routingCodeValue1") return "8 or 11-character BIC/SWIFT";
  if (field.path === "beneficiaryAccountNumber") return "IBAN or bank account number";
  if (field.path === "beneficiaryCity") return "City, town, village or locality";
  return field.placeholder || field.label;
}

export function validateNiumBeneficiaryFields(schema: NiumBeneficiarySchema | null, values: Record<string, string>) {
  if (!schema) return "Nium recipient requirements have not loaded.";
  for (const field of schema.fields.filter((item) => item.enabled)) {
    const value = (values[field.path] ?? "").trim();
    if (field.required && !value) return `${field.label} is required.`;
    if (!value) continue;
    if (field.minLength && value.length < field.minLength) return `${field.label} must contain at least ${field.minLength} characters.`;
    if (field.maxLength && value.length > field.maxLength) return `${field.label} must contain no more than ${field.maxLength} characters.`;
    if (field.pattern) {
      try {
        if (!new RegExp(field.pattern).test(value)) return `${field.label} is not in the required format. ${niumFieldHint(field) ?? ""}`.trim();
      } catch {
        // Nium remains authoritative when its pattern is not JavaScript-compatible.
      }
    }
  }
  return null;
}

export function materializeNiumBeneficiaryFields(schema: NiumBeneficiarySchema, values: Record<string, string>) {
  return Object.fromEntries(schema.fields.map((field) => [field.path, (values[field.path] ?? "").trim()]).filter(([, value]) => value));
}
