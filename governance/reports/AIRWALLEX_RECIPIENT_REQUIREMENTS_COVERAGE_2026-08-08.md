# Airwallex Recipient Requirements Coverage Review

Date: 2026-08-08

## Executive Outcome

NexusPay queried the authenticated Airwallex Sandbox beneficiary form-schema API for every destination currently displayed in Send. Ten corridors returned current provider schemas. Indonesia and Vietnam returned no supported schema and remain unavailable; NexusPay does not substitute local fields or claim that those routes are executable.

The Corporate and consumer payment screens use the same shared schema renderer. Provider option sets are searchable selectors. Free-text fields remain free text when Airwallex supplies no authoritative option set, including every audited city field.

## Coverage Matrix

| Destination | Currency | Airwallex method | Provider-backed recipient requirements | App bank suggestions reviewed |
|---|---:|---|---|---|
| Philippines | PHP | LOCAL | DOB, PH BIC, 8-19 digit account, 4-digit postal code, address, locality, email | BDO, BPI, Metrobank |
| Malaysia | MYR | LOCAL | DOB, MY BIC, 5-19 digit account, 5-digit postcode, address, locality, 16-state selector, email | Maybank, CIMB, Public Bank |
| UAE | AED | LOCAL | 23-character AE IBAN, address, locality, email | Emirates NBD, ADCB |
| Saudi Arabia | SAR | SWIFT | DOB, 24-character SA IBAN, 5-digit or extended postal code, address, locality, email | Al Rajhi Bank, SNB, Riyad Bank |
| Qatar | QAR | SWIFT | DOB, 29-character QA IBAN, address, locality, email | QNB, Commercial Bank of Qatar |
| Kuwait | KWD | SWIFT | DOB, 30-character KW IBAN, 5-digit postal code, address, locality, email | NBK, KFH, Boubyan Bank |
| Bahrain | BHD | SWIFT | DOB, 22-character BH IBAN, 3-4 digit postal code, address, locality, email | NBB, BBK, Khaleeji Bank |
| Oman | OMR | SWIFT | DOB, OM BIC, account number, 3-digit postal code, address, locality, email | Bank Muscat, NBO, Sohar International |
| Singapore | SGD | LOCAL | Transfer-method selector, DOB, SG BIC, 7-17 character account, 6-digit postal code, address, locality, email | DBS, OCBC, UOB |
| Thailand | THB | LOCAL | DOB, TH BIC, 7-12 digit account, 5-digit postal code, address, locality, 78-province selector, email | Bangkok Bank, Kasikornbank, SCB |
| Indonesia | IDR | UNAVAILABLE | Airwallex Sandbox returned no supported schema | BCA, Mandiri, BNI are app directory suggestions only |
| Vietnam | VND | UNAVAILABLE | Airwallex Sandbox returned no supported schema | Vietcombank, BIDV, Techcombank are app directory suggestions only |

## Bank Directory Finding

The bank names displayed by NexusPay are common-bank suggestions from the local corridor directory, not a complete or Airwallex-certified institution list. Both payment screens now allow another bank name to be entered. The actual destination is validated from the provider-required IBAN, BIC/SWIFT, routing code or account details.

Airwallex's supported-financial-institutions endpoint is intended for schema fields that return a dynamic lookup definition. None of the audited sandbox schemas exposed that definition for the current corridors, so NexusPay does not fabricate a complete bank list.

## Locality Finding

Airwallex returned every audited city field as free text, generally allowing up to 50 characters. NexusPay therefore accepts a city, town, village or nearest recognised locality. Country is already fixed from the destination selected earlier; Malaysia and Thailand additionally return authoritative state/province selectors.

## Validation

- Authenticated schema requests for all 12 displayed corridors: completed.
- Supported schemas: 10.
- Explicitly unavailable schemas: 2.
- Shared Corporate/consumer renderer: confirmed.
- No compile-time country format table introduced.
- No city, bank or account data fabricated.
