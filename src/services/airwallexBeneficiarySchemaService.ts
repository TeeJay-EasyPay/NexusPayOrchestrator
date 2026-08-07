import { supabase } from "../lib/supabase";
import { AirwallexTransferMethod, Currency } from "../types/transfer";

export type AirwallexFieldOption = {
  label: string;
  value: string;
};

export type AirwallexBeneficiaryField = {
  path: string;
  required: boolean;
  enabled: boolean;
  label: string;
  placeholder: string;
  description?: string;
  type: string;
  defaultValue?: string;
  options: AirwallexFieldOption[];
  pattern?: string;
  minLength?: number;
  maxLength?: number;
};

export type AirwallexBeneficiarySchema = {
  provider: "Airwallex Sandbox";
  provenance: "SANDBOX";
  source: "Airwallex Beneficiary Form Schema API";
  transferMethod: AirwallexTransferMethod;
  bankCountryCode: string;
  accountCurrency: Currency;
  entityType: "PERSONAL";
  fields: AirwallexBeneficiaryField[];
  fetchedAt: string;
};

type SchemaResponse = AirwallexBeneficiarySchema & { error?: string };

async function edgeErrorMessage(error: unknown) {
  const context = error && typeof error === "object" && "context" in error
    ? (error as { context?: unknown }).context
    : null;

  if (context instanceof Response) {
    const payload = await context.clone().json().catch(() => null) as { error?: string } | null;
    if (payload?.error) return payload.error;
  }

  return error instanceof Error ? error.message : "Airwallex recipient requirements are unavailable.";
}

export async function getAirwallexBeneficiarySchema(input: {
  country: string;
  currency: Currency;
}) {
  const { data, error } = await supabase.functions.invoke<SchemaResponse>("nexuspay-submit-payout", {
    body: {
      providerId: "airwallex",
      environment: "sandbox",
      operation: "beneficiary_schema",
      destinationCountry: input.country,
      destinationCurrency: input.currency,
      entityType: "PERSONAL",
    },
  });

  if (error) throw new Error(await edgeErrorMessage(error));
  if (!data?.fields || !data.transferMethod) {
    throw new Error(data?.error ?? "Airwallex returned no recipient requirements for this corridor.");
  }

  return data;
}

export function fieldValue(
  field: AirwallexBeneficiaryField,
  values: Record<string, string>,
  fixedValues: Record<string, string>,
) {
  return values[field.path] ?? fixedValues[field.path] ?? field.defaultValue ?? "";
}

export function materializeAirwallexBeneficiaryFields(
  schema: AirwallexBeneficiarySchema,
  values: Record<string, string>,
  fixedValues: Record<string, string>,
) {
  return Object.fromEntries(
    schema.fields
      .map((field) => [field.path, fieldValue(field, values, fixedValues).trim()] as const)
      .filter(([, value]) => value.length > 0),
  );
}

export function validateAirwallexBeneficiaryFields(
  schema: AirwallexBeneficiarySchema | null,
  values: Record<string, string>,
  fixedValues: Record<string, string>,
) {
  if (!schema) return "Airwallex recipient requirements have not loaded.";

  for (const field of schema.fields.filter((item) => item.enabled)) {
    const value = fieldValue(field, values, fixedValues).trim();
    if (field.required && !value) return `${field.label} is required.`;
    if (!value) continue;
    if (field.minLength && value.length < field.minLength) {
      return `${field.label} must contain at least ${field.minLength} characters.`;
    }
    if (field.maxLength && value.length > field.maxLength) {
      return `${field.label} must contain no more than ${field.maxLength} characters.`;
    }
    if (field.pattern) {
      try {
        if (!new RegExp(field.pattern).test(value)) return `${field.label} is not in the required format.`;
      } catch {
        // Airwallex remains the authoritative validator if it returns a non-JavaScript pattern.
      }
    }
  }

  return null;
}
