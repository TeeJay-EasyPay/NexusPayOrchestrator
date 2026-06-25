-- NexusPay Orchestrator
-- Partner connectivity honesty cleanup
-- Only live-tested/connectable partners should appear configured in Platform Administration.

update public.partner_providers
set
  sandbox_enabled = false,
  production_enabled = false,
  api_configured = false,
  status = case
    when id = 'nium' then 'Researching'
    when id = 'tranglo' then 'Researching'
    else status
  end,
  readiness_score = 0,
  notes = case
    when id = 'nium' then 'Candidate last-leg provider. No live NexusPay connectivity configured yet.'
    when id = 'tranglo' then 'Candidate last-leg provider. No live NexusPay connectivity configured yet.'
    else notes
  end,
  updated_at = now()
where id in ('nium', 'tranglo');

update public.partner_providers
set
  sandbox_enabled = true,
  production_enabled = false,
  api_configured = true,
  status = 'Sandbox Active',
  readiness_score = greatest(readiness_score, 76),
  notes = 'Open banking provider with backend-only Supabase Secret configuration and live sandbox connectivity testing.',
  updated_at = now()
where id = 'yapily';

update public.partner_providers
set
  sandbox_enabled = true,
  production_enabled = false,
  api_configured = true,
  status = 'Testing',
  readiness_score = greatest(readiness_score, 60),
  notes = 'XRPL testnet connectivity is available through public testnet infrastructure. No API secret is stored.',
  updated_at = now()
where id = 'ripple';

update public.partner_capabilities
set
  enabled = false,
  readiness_status = 'No live connection',
  provenance = 'NO_DATA',
  notes = 'Candidate capability only. No live connection adapter or credentials are configured.',
  updated_at = now()
where provider_id in ('nium', 'tranglo', 'thunes');

update public.partner_supported_corridors
set
  readiness_status = 'No live connection',
  provenance = 'NO_DATA',
  notes = 'Candidate corridor only. No live provider connectivity is configured.',
  updated_at = now()
where provider_id in ('nium', 'tranglo', 'thunes');

insert into public.partner_capabilities (provider_id, capability_code, capability_name, capability_type, environment, enabled, readiness_status, provenance, notes)
values
  ('ripple', 'XRPL_TESTNET_CONNECTIVITY', 'XRPL Testnet Connectivity', 'settlement', 'sandbox', true, 'Testing', 'NO_DATA', 'Connectivity is verified by the partner connection test function.'),
  ('ripple', 'XRPL_SETTLEMENT_PROOF', 'XRPL Settlement Proof', 'settlement', 'sandbox', true, 'Testing', 'NO_DATA', 'Client execution can create XRPL testnet proof for hybrid routes.')
on conflict (provider_id, capability_code, environment) do update set
  enabled = excluded.enabled,
  readiness_status = excluded.readiness_status,
  provenance = excluded.provenance,
  notes = excluded.notes,
  updated_at = now();

insert into public.partner_supported_corridors (provider_id, corridor_code, source_country, destination_country, source_currency, destination_currency, capability_code, environment, readiness_status, provenance, notes)
values
  ('ripple', 'XRPL-TESTNET', 'United Kingdom', 'XRPL Testnet', 'GBP', 'XRP', 'XRPL_TESTNET_CONNECTIVITY', 'sandbox', 'Testing', 'NO_DATA', 'Connectivity is verified by the partner connection test function.')
on conflict (provider_id, corridor_code, environment) do update set
  readiness_status = excluded.readiness_status,
  provenance = excluded.provenance,
  notes = excluded.notes,
  updated_at = now();

insert into public.partner_credentials_metadata (provider_id, environment, configured, credential_reference, last_updated, notes)
values
  ('ripple', 'sandbox', true, 'public-testnet:xrpl-json-rpc', now(), 'Public XRPL testnet endpoint metadata. No API secret required.')
on conflict (provider_id, environment) do update set
  configured = excluded.configured,
  credential_reference = excluded.credential_reference,
  last_updated = excluded.last_updated,
  notes = excluded.notes;
