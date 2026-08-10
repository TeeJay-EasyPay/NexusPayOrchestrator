import assert from "node:assert/strict";
import {
  buildUnifiedRecipientRequirements,
  materializeProviderRecipientDetails,
  validateUnifiedRecipientDetails,
} from "../../../src/services/recipientRequirementsService";
import type { AirwallexBeneficiarySchema } from "../../../src/services/airwallexBeneficiarySchemaService";
import type { NiumBeneficiarySchema } from "../../../src/services/niumBeneficiarySchemaService";

const fetchedAt = "2026-08-10T12:00:00.000Z";
const airwallex: AirwallexBeneficiarySchema = {
  provider: "Airwallex Sandbox",
  provenance: "SANDBOX",
  source: "Airwallex Beneficiary Form Schema API",
  transferMethod: "LOCAL",
  bankCountryCode: "MY",
  accountCurrency: "MYR",
  entityType: "PERSONAL",
  fetchedAt,
  fields: [
    { path: "beneficiary.bank_details.account_number", label: "Account number", placeholder: "Account number", type: "string", required: true, enabled: true, options: [], pattern: "^[0-9]{8,16}$" },
    { path: "beneficiary.bank_details.swift_code", label: "SWIFT", placeholder: "SWIFT", type: "string", required: true, enabled: true, options: [], pattern: "^[A-Z0-9]{8,11}$" },
    { path: "beneficiary.address.city", label: "City", placeholder: "City", type: "string", required: true, enabled: true, options: [] },
  ],
};

const nium: NiumBeneficiarySchema = {
  provider: "Nium Sandbox",
  provenance: "SANDBOX",
  source: "Nium Supported Corridors V3 API",
  payoutMethod: "LOCAL",
  destinationCountry: "MY",
  destinationCurrency: "MYR",
  beneficiaryAccountType: "INDIVIDUAL",
  routingCodeType: "SWIFT",
  deliveryTAT: "1-2 days",
  payoutConfigured: true,
  fetchedAt,
  fields: [
    { path: "beneficiaryAccountNumber", label: "Account number", placeholder: "Account number", type: "string", required: true, enabled: true, options: [], pattern: "^[0-9]{8,16}$" },
    { path: "routingCodeValue1", label: "SWIFT", placeholder: "SWIFT", type: "string", required: true, enabled: true, options: [], pattern: "^[A-Z0-9]{8,11}$" },
    { path: "beneficiaryCity", label: "City", placeholder: "City", type: "string", required: true, enabled: true, options: [] },
  ],
};

const requirements = buildUnifiedRecipientRequirements({ airwallex, nium });
assert.deepEqual(requirements.activeProviders, ["AIRWALLEX_SANDBOX", "NIUM_SANDBOX"]);
assert.equal(requirements.fields.filter((field) => field.key === "bankAccount").length, 1);
assert.equal(requirements.fields.find((field) => field.key === "bankAccount")?.sources.length, 2);

const values = { bankAccount: "12345678", swiftCode: "MBBEMYKLXXX", city: "Kuala Lumpur" };
assert.equal(validateUnifiedRecipientDetails(requirements, values), null);
assert.match(validateUnifiedRecipientDetails(requirements, { ...values, swiftCode: "invalid" }) ?? "", /required format/i);

const materialized = materializeProviderRecipientDetails({
  values,
  airwallex,
  nium,
  fixedAirwallex: {},
});
assert.equal(materialized.airwallex["beneficiary.bank_details.account_number"], values.bankAccount);
assert.equal(materialized.airwallex["beneficiary.bank_details.swift_code"], values.swiftCode);
assert.equal(materialized.nium.beneficiaryAccountNumber, values.bankAccount);
assert.equal(materialized.nium.routingCodeValue1, values.swiftCode);

const unavailableNium = buildUnifiedRecipientRequirements({ airwallex, nium: { ...nium, payoutConfigured: false } });
assert.deepEqual(unavailableNium.activeProviders, ["AIRWALLEX_SANDBOX"]);
assert.deepEqual(unavailableNium.observedProviders, ["AIRWALLEX_SANDBOX", "NIUM_SANDBOX"]);

console.log("PASS provider-neutral recipient requirements, validation and payload materialisation");
