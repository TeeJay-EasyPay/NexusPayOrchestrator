-- Store one provider-neutral recipient profile plus provider-specific translations.
-- Existing recipient RLS continues to isolate these user-owned records.

alter table public.recipients
  add column if not exists provider_beneficiary_details jsonb not null default '{}'::jsonb,
  add column if not exists provider_schema_evidence jsonb not null default '{}'::jsonb;

comment on column public.recipients.beneficiary_details is
  'Provider-neutral recipient profile used to prepare all eligible payout routes.';
comment on column public.recipients.provider_beneficiary_details is
  'Provider-specific API translations keyed by provider; contains no provider credentials.';
comment on column public.recipients.provider_schema_evidence is
  'Schema method and timestamp evidence keyed by provider for repeat-payment review.';

update public.recipients
set provider_beneficiary_details = case
  when payout_provider_id = 'NIUM_SANDBOX' then jsonb_build_object('nium', beneficiary_details)
  when payout_provider_id = 'AIRWALLEX_SANDBOX' or payout_provider_id is null then jsonb_build_object('airwallex', beneficiary_details)
  else '{}'::jsonb
end
where provider_beneficiary_details = '{}'::jsonb
  and beneficiary_details <> '{}'::jsonb;

update public.recipients
set provider_schema_evidence = case
  when payout_provider_id = 'NIUM_SANDBOX' then jsonb_build_object('nium', jsonb_build_object('payoutMethod', beneficiary_transfer_method, 'fetchedAt', beneficiary_schema_fetched_at))
  when payout_provider_id = 'AIRWALLEX_SANDBOX' or payout_provider_id is null then jsonb_build_object('airwallex', jsonb_build_object('transferMethod', beneficiary_transfer_method, 'fetchedAt', beneficiary_schema_fetched_at))
  else '{}'::jsonb
end
where provider_schema_evidence = '{}'::jsonb
  and (beneficiary_transfer_method is not null or beneficiary_schema_fetched_at is not null);
