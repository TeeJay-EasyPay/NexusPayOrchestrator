-- NexusPay Multi-Entity Demonstrator Seed Script
-- Safe to re-run

insert into public.participants (id, participant_type, name, country, bank_name, account_last4, currency)
values
  ('nexus-manufacturing-ltd', 'CORPORATE', 'Nexus Manufacturing Ltd', 'United Kingdom', 'Nexus Treasury Bank', '1000', 'GBP'),
  ('anne-santos', 'INDIVIDUAL', 'Anne Santos', 'Philippines', 'BDO Unibank', '8421', 'PHP'),
  ('james-rahman', 'INDIVIDUAL', 'James Rahman', 'Malaysia', 'Maybank', '3157', 'MYR'),
  ('sarah-khan', 'INDIVIDUAL', 'Sarah Khan', 'UAE', 'Emirates NBD', '9912', 'AED'),
  ('alpha-trading-llc', 'BUSINESS', 'Alpha Trading LLC', 'UAE', 'ADCB', '1134', 'AED'),
  ('manila-services-inc', 'BUSINESS', 'Manila Services Inc', 'Philippines', 'BDO', '5588', 'PHP'),
  ('kuala-lumpur-logistics', 'BUSINESS', 'Kuala Lumpur Logistics', 'Malaysia', 'CIMB', '7744', 'MYR')
on conflict (id) do update set
  participant_type = excluded.participant_type,
  name = excluded.name,
  country = excluded.country,
  bank_name = excluded.bank_name,
  account_last4 = excluded.account_last4,
  currency = excluded.currency;
