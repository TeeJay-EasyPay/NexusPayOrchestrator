-- Persist provider-defined Airwallex beneficiary fields for repeat payments.
-- Existing recipient RLS policies continue to govern these user-owned records.

alter table if exists public.recipients
  add column if not exists beneficiary_details jsonb not null default '{}'::jsonb,
  add column if not exists beneficiary_transfer_method text,
  add column if not exists beneficiary_schema_fetched_at timestamptz;

alter table if exists public.recipients
  drop constraint if exists recipients_beneficiary_transfer_method_check;

alter table if exists public.recipients
  add constraint recipients_beneficiary_transfer_method_check
  check (
    beneficiary_transfer_method is null
    or beneficiary_transfer_method in ('LOCAL', 'SWIFT')
  );

comment on column public.recipients.beneficiary_details is
  'User-owned recipient payout fields collected from the Airwallex form schema; governed by recipient RLS.';
comment on column public.recipients.beneficiary_transfer_method is
  'Airwallex payout method selected by current provider schema evidence.';
comment on column public.recipients.beneficiary_schema_fetched_at is
  'Timestamp of the Airwallex sandbox form schema used to collect beneficiary details.';
