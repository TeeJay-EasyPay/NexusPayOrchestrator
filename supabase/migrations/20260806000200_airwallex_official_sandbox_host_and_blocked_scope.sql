-- NexusPay Orchestrator
-- Airwallex sandbox metadata update after deployed certification attempt.

update public.partner_providers
set
  sandbox_url = 'https://api-demo.airwallex.com',
  status = 'Testing',
  readiness_score = least(readiness_score, 70),
  notes = 'Airwallex sandbox authentication and account capability read are live. Beneficiary/transfer payout certification is blocked by Airwallex API key scope: beneficiaries/validate returned HTTP 401 unauthorized / insufficient permissions.',
  updated_at = now()
where id = 'airwallex';

update public.partner_capabilities
set
  readiness_status = 'Validated',
  provenance = 'LIVE',
  last_validated_at = now(),
  notes = 'Deployed backend read-only test authenticated and read account capability funding limits successfully.'
where provider_id = 'airwallex'
  and capability_code in ('API_AUTHENTICATION', 'ACCOUNT_CAPABILITIES_READ')
  and environment = 'sandbox';

update public.partner_capabilities
set
  readiness_status = 'Blocked - insufficient Airwallex API permissions',
  provenance = 'NO_DATA',
  notes = 'Guarded sandbox payout certification stopped at beneficiaries/validate: HTTP 401 unauthorized / insufficient permissions. No beneficiary or transfer was created.'
where provider_id = 'airwallex'
  and capability_code in ('BENEFICIARY_VALIDATION', 'TRANSFER_VALIDATION', 'TRANSFER_CREATION')
  and environment = 'sandbox';

update public.partner_supported_corridors
set
  readiness_status = 'Blocked - payout scope unavailable',
  provenance = 'NO_DATA',
  notes = 'Eligible corridor remains blocked until Airwallex sandbox key has beneficiary and transfer permissions.'
where provider_id = 'airwallex'
  and environment = 'sandbox';

update public.partner_credentials_metadata
set
  credential_reference = 'supabase-secrets:AIRWALLEX_CLIENT_ID,AIRWALLEX_API_KEY,AIRWALLEX_BASE_URL,AIRWALLEX_WEBHOOK_SECRET',
  last_updated = now(),
  notes = 'Metadata only. Airwallex sandbox secret names are configured in Supabase Edge Function secrets; values are not stored in database fields or mobile code.'
where provider_id = 'airwallex'
  and environment = 'sandbox';
