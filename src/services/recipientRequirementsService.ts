import {
  AirwallexBeneficiarySchema,
  airwallexFieldFormatHint,
  airwallexFieldPlaceholder,
  fieldValue,
  generateAirwallexSandboxRecipient,
} from "./airwallexBeneficiarySchemaService";
import {
  NiumBeneficiarySchema,
  niumFieldHint,
  niumFieldPlaceholder,
} from "./niumBeneficiarySchemaService";

export type RecipientRequirementSource = "AIRWALLEX_SANDBOX" | "NIUM_SANDBOX";

export type UnifiedRecipientField = {
  key: string;
  label: string;
  required: boolean;
  placeholder: string;
  hint?: string | null;
  options: { label: string; value: string }[];
  sources: RecipientRequirementSource[];
  validators: { provider: RecipientRequirementSource; pattern?: string; minLength?: number; maxLength?: number; options?: string[] }[];
};

export type UnifiedRecipientRequirements = {
  fields: UnifiedRecipientField[];
  activeProviders: RecipientRequirementSource[];
  observedProviders: RecipientRequirementSource[];
  fetchedAt: string | null;
};

const FIXED_AIRWALLEX_PATHS = new Set([
  "beneficiary.type",
  "beneficiary.entity_type",
  "beneficiary.first_name",
  "beneficiary.last_name",
  "beneficiary.bank_details.account_name",
  "beneficiary.bank_details.account_currency",
  "beneficiary.bank_details.bank_country_code",
  "beneficiary.bank_details.bank_name",
  "beneficiary.address.country_code",
]);

export function canonicalRecipientFieldKey(path: string) {
  const normalized = path.toLowerCase();
  if (normalized.includes("account_number") || normalized.endsWith("accountnumber") || normalized.endsWith(".iban")) return "bankAccount";
  if (normalized.includes("swift") || normalized.includes("routing_value1") || normalized.endsWith("routingcodevalue1")) return "swiftCode";
  if (normalized.includes("street_address") || normalized.endsWith("beneficiaryaddress")) return "address";
  if (normalized.endsWith(".city") || normalized.endsWith("beneficiarycity")) return "city";
  if (normalized.includes("postcode") || normalized.includes("postal_code")) return "postcode";
  if (normalized.includes("date_of_birth") || normalized.endsWith("beneficiarydob")) return "dateOfBirth";
  if (normalized.includes("identification_type")) return "identificationType";
  if (normalized.includes("identification_value") || normalized.includes("identification_number")) return "identificationValue";
  if (normalized.includes("email")) return "email";
  if (normalized.includes("phone") || normalized.includes("mobile")) return "phone";
  if (normalized.endsWith(".state") || normalized.endsWith("beneficiarystate")) return "state";
  return `provider_${normalized.replace(/[^a-z0-9]+/g, "_")}`;
}

function preferredLabel(key: string, fallback: string) {
  const labels: Record<string, string> = {
    bankAccount: "IBAN / bank account number",
    swiftCode: "BIC / SWIFT code",
    address: "Recipient address",
    city: "City, town or locality",
    postcode: "Postcode",
    dateOfBirth: "Date of birth",
    identificationType: "Identification type",
    identificationValue: "Identification number",
    email: "Email address",
    phone: "Phone number",
    state: "State / region",
  };
  return labels[key] ?? fallback;
}

function mergeField(
  target: Map<string, UnifiedRecipientField>,
  input: Omit<UnifiedRecipientField, "sources" | "validators"> & {
    source: RecipientRequirementSource;
    validator: UnifiedRecipientField["validators"][number];
  },
) {
  const existing = target.get(input.key);
  if (!existing) {
    target.set(input.key, {
      key: input.key,
      label: preferredLabel(input.key, input.label),
      required: input.required,
      placeholder: input.placeholder,
      hint: input.hint,
      options: input.options,
      sources: [input.source],
      validators: [input.validator],
    });
    return;
  }
  existing.required ||= input.required;
  if (!existing.sources.includes(input.source)) existing.sources.push(input.source);
  existing.validators.push(input.validator);
  for (const option of input.options) {
    if (!existing.options.some((item) => item.value === option.value)) existing.options.push(option);
  }
  if (!existing.hint && input.hint) existing.hint = input.hint;
}

export function buildUnifiedRecipientRequirements(input: {
  airwallex: AirwallexBeneficiarySchema | null;
  nium: NiumBeneficiarySchema | null;
}) {
  const fields = new Map<string, UnifiedRecipientField>();
  const observedProviders: RecipientRequirementSource[] = [];
  const activeProviders: RecipientRequirementSource[] = [];

  if (input.airwallex) {
    observedProviders.push("AIRWALLEX_SANDBOX");
    activeProviders.push("AIRWALLEX_SANDBOX");
    input.airwallex.fields.filter((field) => field.enabled && !FIXED_AIRWALLEX_PATHS.has(field.path)).forEach((field) => {
      const key = canonicalRecipientFieldKey(field.path);
      mergeField(fields, {
        key,
        label: field.label,
        required: field.required,
        placeholder: airwallexFieldPlaceholder(field),
        hint: airwallexFieldFormatHint(field),
        options: field.options,
        source: "AIRWALLEX_SANDBOX",
        validator: { provider: "AIRWALLEX_SANDBOX", pattern: field.pattern, minLength: field.minLength, maxLength: field.maxLength, options: field.options.map((option) => option.value) },
      });
    });
  }

  if (input.nium) {
    observedProviders.push("NIUM_SANDBOX");
    if (input.nium.payoutConfigured) {
      activeProviders.push("NIUM_SANDBOX");
      input.nium.fields.filter((field) => field.enabled).forEach((field) => {
        const key = canonicalRecipientFieldKey(field.path);
        mergeField(fields, {
          key,
          label: field.label,
          required: field.required,
          placeholder: niumFieldPlaceholder(field),
          hint: niumFieldHint(field),
          options: field.options,
          source: "NIUM_SANDBOX",
          validator: { provider: "NIUM_SANDBOX", pattern: field.pattern, minLength: field.minLength, maxLength: field.maxLength, options: field.options.map((option) => option.value) },
        });
      });
    }
  }

  const mergedFields = [...fields.values()].map((field) => {
    const optionSets = field.validators.map((validator) => validator.options ?? []).filter((options) => options.length > 0);
    if (optionSets.length < 2) return field;
    const allowed = new Set(optionSets[0].filter((value) => optionSets.every((options) => options.includes(value))));
    return { ...field, options: field.options.filter((option) => allowed.has(option.value)) };
  });
  return {
    fields: mergedFields,
    activeProviders,
    observedProviders,
    fetchedAt: [input.airwallex?.fetchedAt, input.nium?.fetchedAt].filter(Boolean).sort().at(-1) ?? null,
  } satisfies UnifiedRecipientRequirements;
}

export function validateUnifiedRecipientDetails(requirements: UnifiedRecipientRequirements, values: Record<string, string>) {
  if (requirements.activeProviders.length === 0) return "No payout provider currently has executable recipient requirements for this corridor.";
  for (const field of requirements.fields) {
    const value = (values[field.key] ?? "").trim();
    if (field.required && !value) return `${field.label} is required.`;
    if (!value) continue;
    for (const validator of field.validators.filter((item) => requirements.activeProviders.includes(item.provider))) {
      if (validator.options?.length && !validator.options.includes(value)) return `${field.label} is not supported by every eligible payout route.`;
      if (validator.minLength && value.length < validator.minLength) return `${field.label} must contain at least ${validator.minLength} characters.`;
      if (validator.maxLength && value.length > validator.maxLength) return `${field.label} must contain no more than ${validator.maxLength} characters.`;
      if (validator.pattern) {
        try {
          if (!new RegExp(validator.pattern).test(value)) return `${field.label} is not in the required format. ${field.hint ?? ""}`.trim();
        } catch {
          // The provider remains authoritative for patterns that are not JavaScript-compatible.
        }
      }
    }
  }
  return null;
}

export function materializeProviderRecipientDetails(input: {
  values: Record<string, string>;
  airwallex: AirwallexBeneficiarySchema | null;
  nium: NiumBeneficiarySchema | null;
  fixedAirwallex: Record<string, string>;
}) {
  const airwallex = input.airwallex
    ? Object.fromEntries(input.airwallex.fields.map((field) => {
        const value = FIXED_AIRWALLEX_PATHS.has(field.path)
          ? fieldValue(field, {}, input.fixedAirwallex)
          : input.values[canonicalRecipientFieldKey(field.path)] ?? field.defaultValue ?? "";
        return [field.path, value.trim()];
      }).filter(([, value]) => value))
    : {};
  const nium = input.nium
    ? Object.fromEntries(input.nium.fields.map((field) => [field.path, (input.values[canonicalRecipientFieldKey(field.path)] ?? "").trim()]).filter(([, value]) => value))
    : {};
  return { airwallex, nium };
}

function randomDigits(length: number) {
  return Array.from({ length }, () => Math.floor(Math.random() * 10)).join("");
}

export function generateUnifiedSandboxRecipient(input: {
  requirements: UnifiedRecipientRequirements;
  airwallex: AirwallexBeneficiarySchema | null;
  suggestedBanks: readonly string[];
}) {
  const airwallexGenerated = input.airwallex
    ? generateAirwallexSandboxRecipient(input.airwallex, input.suggestedBanks)
    : { firstName: "Amina", lastName: "Rahman", bankName: input.suggestedBanks[0] ?? "Sandbox Bank", values: {} };
  const values: Record<string, string> = {};
  if (input.airwallex) {
    for (const field of input.airwallex.fields) {
      const generated = airwallexGenerated.values[field.path];
      if (generated) values[canonicalRecipientFieldKey(field.path)] = generated;
    }
  }
  for (const field of input.requirements.fields) {
    if (values[field.key]) continue;
    if (field.options.length) values[field.key] = field.options[0].value;
    else if (field.key === "swiftCode") values[field.key] = "NXPYGB2LXXX";
    else if (field.key === "bankAccount") values[field.key] = `000${randomDigits(9)}`;
    else if (field.key === "address") values[field.key] = `${10 + Math.floor(Math.random() * 80)} Sandbox Avenue`;
    else if (field.key === "city") values[field.key] = "Central District";
    else if (field.key === "postcode") values[field.key] = randomDigits(5);
    else if (field.key === "dateOfBirth") values[field.key] = "1990-05-24";
    else if (field.key === "identificationType") values[field.key] = "PASSPORT";
    else if (field.key === "identificationValue") values[field.key] = `P${randomDigits(8)}`;
    else if (field.key === "email") values[field.key] = `sandbox.recipient.${randomDigits(4)}@example.com`;
    else if (field.required) values[field.key] = `TEST${randomDigits(8)}`;
  }
  return { ...airwallexGenerated, values };
}

export function normalizeStoredProviderRecipientDetails(...records: (Record<string, string> | undefined)[]) {
  const values: Record<string, string> = {};
  for (const record of records) {
    for (const [path, value] of Object.entries(record ?? {})) {
      if (value) values[canonicalRecipientFieldKey(path)] = value;
    }
  }
  return values;
}
