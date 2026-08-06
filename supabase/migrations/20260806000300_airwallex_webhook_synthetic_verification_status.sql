-- NexusPay Orchestrator
-- Airwallex webhook verification metadata after synthetic signed-event test.

update public.partner_capabilities
set
  enabled = true,
  readiness_status = 'Partial - synthetic signature verification passed',
  provenance = 'DIAGNOSTIC',
  last_validated_at = now(),
  notes = 'Unsigned Airwallex webhook requests are rejected; signed synthetic webhook requests are accepted and duplicate event IDs are deduplicated. Actual Airwallex sandbox event delivery is pending transfer API permission.'
where provider_id = 'airwallex'
  and capability_code = 'TRANSFER_WEBHOOKS'
  and environment = 'sandbox';
