-- Nium sandbox payout-provider metadata and generic recipient provenance.
-- Secrets remain in Supabase Edge Function secrets and are never stored here.

alter table if exists public.recipients
  add column if not exists payout_provider_id text;

alter table if exists public.recipients
  drop constraint if exists recipients_payout_provider_id_check;

alter table if exists public.recipients
  add constraint recipients_payout_provider_id_check
  check (payout_provider_id is null or payout_provider_id in ('AIRWALLEX_SANDBOX', 'NIUM_SANDBOX'));

comment on column public.recipients.payout_provider_id is
  'Provider whose dynamic schema supplied beneficiary_details; no provider secret is stored.';
comment on column public.recipients.beneficiary_details is
  'User-owned provider-defined payout fields collected from the selected sandbox provider; governed by recipient RLS.';
comment on column public.recipients.beneficiary_transfer_method is
  'Provider payout method selected by current corridor evidence.';
comment on column public.recipients.beneficiary_schema_fetched_at is
  'Timestamp of the provider schema used to collect beneficiary details.';

insert into public.partner_providers (
  id, provider_name, provider_category, website, status,
  sandbox_enabled, production_enabled, api_configured, notes, updated_at
) values (
  'nium', 'Nium', 'Payment Network', 'https://www.nium.com', 'Testing',
  true, false, true,
  'Authenticated sandbox corridor and FX discovery. Payout execution requires Nium customer and wallet identifiers.',
  now()
)
on conflict (id) do update set
  status = excluded.status,
  sandbox_enabled = excluded.sandbox_enabled,
  production_enabled = excluded.production_enabled,
  api_configured = excluded.api_configured,
  notes = excluded.notes,
  updated_at = now();

insert into public.partner_credentials_metadata (
  provider_id, environment, configured, credential_reference, last_updated, notes
) values (
  'nium', 'sandbox', true, 'supabase-secrets:NIUM_CLIENT_ID,NIUM_API_KEY,NIUM_CUSTOMER_HASH_ID(optional),NIUM_WALLET_HASH_ID(optional)', now(),
  'Metadata only. API credentials are configured; payout customer and wallet identifiers are independently required.'
)
on conflict (provider_id, environment) do update set
  configured = excluded.configured,
  credential_reference = excluded.credential_reference,
  last_updated = excluded.last_updated,
  notes = excluded.notes;

insert into public.partner_capabilities (
  provider_id, environment, capability_code, capability_name, capability_type, enabled, readiness_status, provenance, notes
) values
  ('nium', 'sandbox', 'API_AUTHENTICATION', 'API authentication', 'payout', true, 'Testing', 'NO_DATA', 'Validated only by a read-only deployed connection test.'),
  ('nium', 'sandbox', 'SUPPORTED_CORRIDORS_READ', 'Supported corridor discovery', 'payout', true, 'Testing', 'NO_DATA', 'Reads Nium V3 supported-corridor evidence.'),
  ('nium', 'sandbox', 'BENEFICIARY_SCHEMA', 'Dynamic beneficiary requirements', 'payout', true, 'Testing', 'NO_DATA', 'Derived directly from the selected Nium corridor mandatoryDataRequirement.'),
  ('nium', 'sandbox', 'FX_QUOTE', 'Sandbox FX quote', 'payout', true, 'Testing', 'NO_DATA', 'Reads Nium sandbox exchange-rate evidence.'),
  ('nium', 'sandbox', 'BENEFICIARY_CREATION', 'Beneficiary creation', 'payout', false, 'Not configured', 'NO_DATA', 'Requires configured Nium sandbox customer and wallet.'),
  ('nium', 'sandbox', 'PAYOUT_CREATION', 'Payout creation', 'payout', false, 'Not configured', 'NO_DATA', 'Requires configured Nium sandbox customer and wallet.'),
  ('nium', 'sandbox', 'PAYOUT_STATUS', 'Payout status retrieval', 'payout', false, 'Not configured', 'NO_DATA', 'Requires a submitted Nium sandbox remittance.'),
  ('nium', 'sandbox', 'PAYOUT_WEBHOOKS', 'Signed payout webhooks', 'payout', false, 'Not configured', 'NO_DATA', 'No secure Nium webhook verification contract is configured.')
on conflict (provider_id, environment, capability_code) do update set
  capability_name = excluded.capability_name,
  capability_type = excluded.capability_type,
  enabled = excluded.enabled,
  readiness_status = excluded.readiness_status,
  provenance = excluded.provenance,
  notes = excluded.notes,
  updated_at = now();
