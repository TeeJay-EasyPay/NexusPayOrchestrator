-- Promote only capabilities and corridors already proven by provider-issued sandbox evidence.

alter table public.partner_supported_corridors
  drop constraint if exists partner_supported_corridors_provenance_check;
alter table public.partner_supported_corridors
  add constraint partner_supported_corridors_provenance_check
  check (provenance in ('LIVE', 'SANDBOX', 'TESTNET', 'DERIVED', 'SIMULATED', 'FALLBACK', 'NO_DATA', 'DIAGNOSTIC', 'DISABLED'));

update public.partner_capabilities
set
  enabled = true,
  readiness_status = 'Validated',
  provenance = 'SANDBOX',
  last_validated_at = evidence.validated_at,
  notes = 'Yapily accepted a sandbox payment authorisation request and issued provider references; customer consent and payment creation remain flow-level evidence.',
  updated_at = now()
from (
  select max(updated_at) as validated_at
  from public.open_banking_payment_flows
  where provider_id = 'yapily'
    and environment = 'sandbox'
    and payment_request_id is not null
    and consent_id is not null
) evidence
where provider_id = 'yapily'
  and capability_code = 'PAYMENT_INITIATION'
  and environment = 'sandbox'
  and evidence.validated_at is not null;

update public.partner_capabilities
set
  enabled = true,
  readiness_status = 'Validated',
  provenance = 'SANDBOX',
  last_validated_at = evidence.validated_at,
  notes = 'Authenticated Airwallex sandbox beneficiary validation, transfer validation and transfer creation have succeeded.',
  updated_at = now()
from (
  select max(completed_at) as validated_at
  from public.provider_payout_intents
  where provider_id = 'airwallex'
    and environment = 'sandbox'
    and canonical_status = 'PAID_OUT'
    and provider_beneficiary_id is not null
    and provider_transfer_id is not null
) evidence
where provider_id = 'airwallex'
  and capability_code in ('BENEFICIARY_VALIDATION', 'TRANSFER_VALIDATION', 'TRANSFER_CREATION')
  and environment = 'sandbox'
  and evidence.validated_at is not null;

update public.partner_supported_corridors corridor
set
  readiness_status = 'Validated',
  provenance = 'SANDBOX',
  last_validated_at = evidence.validated_at,
  notes = 'Validated by an authenticated completed Airwallex sandbox payout for this corridor.',
  updated_at = now()
from (
  select
    source_currency,
    destination_country,
    destination_currency,
    max(completed_at) as validated_at
  from public.provider_payout_intents
  where provider_id = 'airwallex'
    and environment = 'sandbox'
    and canonical_status = 'PAID_OUT'
    and provider_beneficiary_id is not null
    and provider_transfer_id is not null
  group by source_currency, destination_country, destination_currency
) evidence
where corridor.provider_id = 'airwallex'
  and corridor.environment = 'sandbox'
  and corridor.source_country = 'United Kingdom'
  and corridor.source_currency = evidence.source_currency
  and corridor.destination_country = evidence.destination_country
  and corridor.destination_currency = evidence.destination_currency
  and evidence.validated_at is not null;

-- Rollback:
-- Restore readiness/provenance from the preceding provider migrations only after preserving
-- the provider payout and open-banking audit records used by this evidence promotion.
