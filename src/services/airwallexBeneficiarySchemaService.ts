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

export type AirwallexSandboxRecipient = {
  firstName: string;
  lastName: string;
  bankName: string;
  values: Record<string, string>;
};

const SANDBOX_NAMES = [
  ["Amina", "Rahman"],
  ["Daniel", "Santos"],
  ["Leila", "Hassan"],
  ["Marcus", "Lim"],
  ["Nadia", "Ibrahim"],
  ["Priya", "Nair"],
] as const;

const SANDBOX_BANKS: Record<string, { name: string; swift: string }> = {
  PH: { name: "BDO", swift: "BNORPHMMXXX" },
  MY: { name: "Maybank", swift: "MBBEMYKLXXX" },
  AE: { name: "Emirates NBD", swift: "EBILAEADXXX" },
  SA: { name: "Al Rajhi Bank", swift: "RJHISARIXXX" },
  QA: { name: "QNB", swift: "QNBAQAQAXXX" },
  KW: { name: "NBK", swift: "NBOKKWKWXXX" },
  BH: { name: "NBB", swift: "NBOBBHBMXXX" },
  OM: { name: "Bank Muscat", swift: "BMUSOMRXXXX" },
  SG: { name: "DBS", swift: "DBSSSGSGXXX" },
  TH: { name: "Bangkok Bank", swift: "BKKBTHBKXXX" },
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

function exactCharacterCount(pattern?: string) {
  if (!pattern) return null;
  const match = pattern.match(/\\d\{(\d+)\}|\[0-9\]\{(\d+)\}/);
  return match ? Number(match[1] ?? match[2]) : null;
}

function patternRange(pattern?: string) {
  if (!pattern) return null;
  const match = pattern.match(/\{(\d+),(\d+)\}/);
  return match ? { minimum: Number(match[1]), maximum: Number(match[2]) } : null;
}

function ibanPatternDetails(pattern?: string) {
  if (!pattern) return null;
  const match = pattern.match(/^\^([A-Z]{2})\[0-9\]\{(\d+)\}\[a-zA-Z0-9\]\{(\d+)\}\$$/);
  if (!match) return null;
  const checkDigits = Number(match[2]);
  const accountCharacters = Number(match[3]);
  return {
    countryCode: match[1],
    checkDigits,
    accountCharacters,
    totalCharacters: 2 + checkDigits + accountCharacters,
  };
}

function randomItem<T>(items: readonly T[]) {
  return items[Math.floor(Math.random() * items.length)];
}

function randomDigits(length: number) {
  return Array.from({ length }, () => Math.floor(Math.random() * 10)).join("");
}

function randomLettersAndDigits(length: number) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  return Array.from({ length }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
}

function mod97(value: string) {
  let remainder = 0;
  for (const character of value) {
    remainder = (remainder * 10 + Number(character)) % 97;
  }
  return remainder;
}

function generateIban(pattern?: string) {
  const details = ibanPatternDetails(pattern);
  if (!details) return "";
  const bban = randomLettersAndDigits(details.accountCharacters);
  const countryDigits = details.countryCode
    .split("")
    .map((character) => character.charCodeAt(0) - 55)
    .join("");
  const bbanDigits = bban
    .split("")
    .map((character) => /[A-Z]/.test(character) ? character.charCodeAt(0) - 55 : character)
    .join("");
  const checkDigits = String(98 - mod97(`${bbanDigits}${countryDigits}00`)).padStart(2, "0");
  return `${details.countryCode}${checkDigits}${bban}`;
}

function sandboxFieldValue(field: AirwallexBeneficiaryField, countryCode: string) {
  if (field.options.length > 0) return randomItem(field.options).value;
  if (field.defaultValue) return field.defaultValue;

  const path = field.path.toLowerCase();
  if (path.endsWith("date_of_birth")) return `${1975 + Math.floor(Math.random() * 25)}-0${1 + Math.floor(Math.random() * 8)}-${String(10 + Math.floor(Math.random() * 18)).padStart(2, "0")}`;
  if (path.endsWith("iban")) return generateIban(field.pattern);
  if (path.endsWith("swift_code")) return SANDBOX_BANKS[countryCode]?.swift ?? `NXPY${countryCode}XX`;
  if (path.includes("email")) return `sandbox.recipient.${randomDigits(4)}@example.com`;
  if (path.endsWith("city")) return "Central District";
  if (path.includes("street_address")) return `${10 + Math.floor(Math.random() * 80)} Sandbox Avenue`;
  if (path.includes("postcode") || path.includes("postal_code")) {
    if (field.pattern?.includes("{5}([\\-]\\d{4})?")) return `${randomDigits(5)}-${randomDigits(4)}`;
    if (field.pattern?.includes("{3}\\d?")) return randomDigits(4);
    return randomDigits(exactCharacterCount(field.pattern) ?? field.minLength ?? 5);
  }
  if (path.includes("phone") || path.includes("mobile")) return `+1${randomDigits(10)}`;

  const range = patternRange(field.pattern);
  const exactLength = exactCharacterCount(field.pattern);
  const minimum = exactLength ?? field.minLength ?? range?.minimum ?? 8;
  const maximum = exactLength ?? field.maxLength ?? range?.maximum ?? Math.max(minimum, 12);
  const length = Math.min(Math.max(minimum, 10), maximum);
  const digitsOnly = Boolean(field.pattern?.match(/\[0-9\]|\\d/)) && !field.pattern?.match(/A-Za-z|a-zA-Z|\\s\\S/);
  if (path.includes("account_number") || path.includes("routing_value")) {
    return digitsOnly ? randomDigits(length) : randomLettersAndDigits(length);
  }
  return randomLettersAndDigits(length);
}

export function generateAirwallexSandboxRecipient(
  schema: AirwallexBeneficiarySchema,
  suggestedBanks: readonly string[] = [],
): AirwallexSandboxRecipient {
  const [firstName, lastName] = randomItem(SANDBOX_NAMES);
  const configuredBank = SANDBOX_BANKS[schema.bankCountryCode];
  const bankName = configuredBank?.name ?? suggestedBanks[0] ?? "NexusPay Sandbox Bank";
  const values = Object.fromEntries(
    schema.fields
      .filter((field) => field.enabled && !FIXED_GENERATOR_PATHS.has(field.path))
      .map((field) => [field.path, sandboxFieldValue(field, schema.bankCountryCode)] as const)
      .filter(([, value]) => value.length > 0),
  );

  return { firstName, lastName, bankName, values };
}

const FIXED_GENERATOR_PATHS = new Set([
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

export function airwallexFieldFormatHint(field: AirwallexBeneficiaryField) {
  const path = field.path.toLowerCase();
  if (path.endsWith("date_of_birth")) return "Use YYYY-MM-DD, for example 1990-05-24.";

  if (path.endsWith("iban")) {
    const details = ibanPatternDetails(field.pattern);
    if (details) {
      return `Use a ${details.totalCharacters}-character ${details.countryCode} IBAN without spaces: ${details.countryCode}, ${details.checkDigits} check digits, then ${details.accountCharacters} letters or digits.`;
    }
    return "Enter the complete IBAN without spaces.";
  }

  if (path.endsWith("swift_code")) {
    const countryCode = field.pattern?.match(/\[A-Z\]\{4\}([A-Z]{2})/)?.[1];
    return countryCode
      ? `Use an 8 or 11-character uppercase BIC/SWIFT code with ${countryCode} in positions 5-6.`
      : "Enter the bank BIC/SWIFT code using 8 or 11 uppercase characters.";
  }

  if (path.includes("email")) return "Use a complete email address, for example name@example.com.";
  if (path.endsWith("city")) return "Enter the city, town, village or nearest recognised locality, up to 50 characters.";

  if (path.includes("postcode") || path.includes("postal_code")) {
    if (field.pattern?.includes("{5}([\\-]\\d{4})?")) return "Use 5 digits or the extended format 12345-6789.";
    if (field.pattern?.includes("{3}\\d?")) return "Use 3 or 4 digits.";
    const exactCount = exactCharacterCount(field.pattern);
    if (exactCount) return `Enter exactly ${exactCount} digits.`;
  }

  const range = patternRange(field.pattern);
  if (range) {
    const digitsOnly = Boolean(field.pattern?.match(/\[0-9\]|\\d/)) && !field.pattern?.match(/A-Za-z|a-zA-Z|\\s\\S/);
    const lettersOrDigits = Boolean(field.pattern?.match(/0-9A-Za-z|a-zA-Z0-9/));
    const unit = digitsOnly ? "digits" : lettersOrDigits ? "letters or digits" : "characters";
    if (path.includes("street_address")) {
      return `Use ${range.minimum} to ${range.maximum} characters and include a street or locality name; numbers alone are not accepted.`;
    }
    return `Use ${range.minimum} to ${range.maximum} ${unit}.`;
  }

  if (field.minLength && field.maxLength && field.minLength === field.maxLength) {
    return `Enter exactly ${field.minLength} characters.`;
  }
  if (field.minLength && field.maxLength) {
    return `Enter between ${field.minLength} and ${field.maxLength} characters.`;
  }
  if (field.maxLength) return `Enter no more than ${field.maxLength} characters.`;
  return null;
}

export function airwallexFieldPlaceholder(field: AirwallexBeneficiaryField) {
  const path = field.path.toLowerCase();
  if (path.endsWith("date_of_birth")) return "YYYY-MM-DD";
  if (path.endsWith("iban")) {
    const details = ibanPatternDetails(field.pattern);
    return details ? `${details.countryCode} IBAN - ${details.totalCharacters} characters` : "IBAN without spaces";
  }
  if (path.endsWith("swift_code")) return "8 or 11-character BIC/SWIFT";
  if (path.endsWith("city")) return "City, town, village or locality";
  if (path.includes("postcode") || path.includes("postal_code")) {
    if (field.pattern?.includes("{5}([\\-]\\d{4})?")) return "12345 or 12345-6789";
    if (field.pattern?.includes("{3}\\d?")) return "3 or 4-digit postal code";
    const exactCount = exactCharacterCount(field.pattern);
    if (exactCount) return `${exactCount}-digit postcode`;
  }
  const range = patternRange(field.pattern);
  if (range && path.includes("account_number")) return `${range.minimum}-${range.maximum} character account number`;
  return field.placeholder || field.label;
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
        if (!new RegExp(field.pattern).test(value)) {
          const hint = airwallexFieldFormatHint(field);
          return hint ? `${field.label} is not in the required format. ${hint}` : `${field.label} is not in the required format.`;
        }
      } catch {
        // Airwallex remains the authoritative validator if it returns a non-JavaScript pattern.
      }
    }
  }

  return null;
}
