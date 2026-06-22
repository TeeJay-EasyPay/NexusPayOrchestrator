-- NexusPay Orchestrator
-- Corporate Governance & Approval Framework V1
-- Migration: 20260622000100_corporate_governance_approval_framework
-- Additive and safe to re-run

create extension if not exists pgcrypto;

create table if not exists public.payment_categories (
  id text primary key,
  label text not null,
  description text,
  display_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.payment_types (
  id text primary key,
  category_id text not null references public.payment_categories(id) on delete restrict,
  label text not null,
  description text,
  display_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.approval_roles (
  id text primary key,
  label text not null,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.approval_rules (
  id uuid primary key default gen_random_uuid(),
  payment_type_id text not null references public.payment_types(id) on delete cascade,
  label text not null,
  min_amount numeric not null default 0 check (min_amount >= 0),
  max_amount numeric check (max_amount is null or max_amount >= min_amount),
  sequential boolean not null default true,
  enabled boolean not null default true,
  created_by_persona_id text,
  updated_by_persona_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.approval_rule_roles (
  id uuid primary key default gen_random_uuid(),
  approval_rule_id uuid not null references public.approval_rules(id) on delete cascade,
  approval_role_id text not null references public.approval_roles(id) on delete restrict,
  stage_order integer not null default 1 check (stage_order > 0),
  required boolean not null default true,
  created_at timestamptz not null default now(),
  unique (approval_rule_id, approval_role_id, stage_order)
);

alter table public.payout_batches
  add column if not exists payment_category_id text references public.payment_categories(id) on delete restrict,
  add column if not exists payment_type_id text references public.payment_types(id) on delete restrict,
  add column if not exists created_by_persona_id text,
  add column if not exists created_by_role text,
  add column if not exists released_by_persona_id text,
  add column if not exists released_at timestamptz,
  add column if not exists approval_status text not null default 'NOT_REQUIRED',
  add column if not exists status_history jsonb not null default '[]'::jsonb,
  add column if not exists governance_metadata jsonb not null default '{}'::jsonb;

create table if not exists public.batch_approvals (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.payout_batches(id) on delete cascade,
  approval_rule_id uuid references public.approval_rules(id) on delete set null,
  approval_role_id text not null references public.approval_roles(id) on delete restrict,
  assigned_persona_id text not null,
  stage_order integer not null default 1 check (stage_order > 0),
  decision text not null default 'PENDING' check (decision in ('PENDING', 'APPROVED', 'REJECTED', 'SKIPPED')),
  decision_by_persona_id text,
  decision_at timestamptz,
  comment text,
  created_at timestamptz not null default now(),
  unique (batch_id, approval_role_id, assigned_persona_id, stage_order)
);

create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id text not null,
  actor_persona_id text,
  actor_role text,
  event_type text not null,
  event_message text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.notifications
  add column if not exists notification_type text not null default 'GENERAL',
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create index if not exists payment_types_category_idx on public.payment_types(category_id);
create index if not exists approval_rules_payment_type_idx on public.approval_rules(payment_type_id);
create index if not exists approval_rule_roles_rule_idx on public.approval_rule_roles(approval_rule_id);
create index if not exists batch_approvals_batch_idx on public.batch_approvals(batch_id);
create index if not exists batch_approvals_assignee_idx on public.batch_approvals(assigned_persona_id);
create index if not exists batch_approvals_decision_idx on public.batch_approvals(decision);
create index if not exists audit_events_entity_idx on public.audit_events(entity_type, entity_id);
create index if not exists audit_events_actor_idx on public.audit_events(actor_persona_id);

alter table public.payment_categories enable row level security;
alter table public.payment_types enable row level security;
alter table public.approval_roles enable row level security;
alter table public.approval_rules enable row level security;
alter table public.approval_rule_roles enable row level security;
alter table public.batch_approvals enable row level security;
alter table public.audit_events enable row level security;

drop policy if exists "payment categories readable" on public.payment_categories;
create policy "payment categories readable" on public.payment_categories for select to authenticated using (true);
drop policy if exists "payment categories writable" on public.payment_categories;
create policy "payment categories writable" on public.payment_categories for all to authenticated using (true) with check (true);

drop policy if exists "payment types readable" on public.payment_types;
create policy "payment types readable" on public.payment_types for select to authenticated using (true);
drop policy if exists "payment types writable" on public.payment_types;
create policy "payment types writable" on public.payment_types for all to authenticated using (true) with check (true);

drop policy if exists "approval roles readable" on public.approval_roles;
create policy "approval roles readable" on public.approval_roles for select to authenticated using (true);
drop policy if exists "approval roles writable" on public.approval_roles;
create policy "approval roles writable" on public.approval_roles for all to authenticated using (true) with check (true);

drop policy if exists "approval rules readable" on public.approval_rules;
create policy "approval rules readable" on public.approval_rules for select to authenticated using (true);
drop policy if exists "approval rules writable" on public.approval_rules;
create policy "approval rules writable" on public.approval_rules for all to authenticated using (true) with check (true);

drop policy if exists "approval rule roles readable" on public.approval_rule_roles;
create policy "approval rule roles readable" on public.approval_rule_roles for select to authenticated using (true);
drop policy if exists "approval rule roles writable" on public.approval_rule_roles;
create policy "approval rule roles writable" on public.approval_rule_roles for all to authenticated using (true) with check (true);

drop policy if exists "batch approvals readable" on public.batch_approvals;
create policy "batch approvals readable" on public.batch_approvals for select to authenticated using (true);
drop policy if exists "batch approvals writable" on public.batch_approvals;
create policy "batch approvals writable" on public.batch_approvals for all to authenticated using (true) with check (true);

drop policy if exists "audit events readable" on public.audit_events;
create policy "audit events readable" on public.audit_events for select to authenticated using (true);
drop policy if exists "audit events writable" on public.audit_events;
create policy "audit events writable" on public.audit_events for insert to authenticated with check (true);

insert into public.participants (id, participant_type, name, country, bank_name, account_last4, currency)
values
  ('nexus-manufacturing-ltd', 'CORPORATE', 'NexusPay Corporate Workspace', 'United Kingdom', 'Nexus Corporate Bank', '1000', 'GBP'),
  ('maria-santos', 'INDIVIDUAL', 'Maria', 'Philippines', 'BPI', '9044', 'PHP'),
  ('john-khan', 'INDIVIDUAL', 'John', 'United Kingdom', 'Monzo', '2219', 'GBP')
on conflict (id) do update set
  participant_type = excluded.participant_type,
  name = excluded.name,
  country = excluded.country,
  bank_name = excluded.bank_name,
  account_last4 = excluded.account_last4,
  currency = excluded.currency;

insert into public.payment_categories (id, label, description, display_order)
values
  ('people_payments', 'People Payments', 'Payroll, bonuses, commissions, contractors and expense reimbursements.', 10),
  ('supplier_payments', 'Supplier Payments', 'Supplier, vendor, procurement, inventory and manufacturing payments.', 20),
  ('operating_expenses', 'Operating Expenses', 'Rent, utilities, insurance, software, marketing, travel and training.', 30),
  ('financial_obligations', 'Financial Obligations', 'Loan repayments, mortgages, leasing and credit facilities.', 40),
  ('tax_regulatory', 'Tax & Regulatory', 'Tax, payroll tax, VAT and pension contributions.', 50),
  ('internal_transfers', 'Internal Transfers', 'Internal settlement and funding movements.', 60),
  ('investor_distributions', 'Investor Distributions', 'Dividends and partner distributions.', 70),
  ('other', 'Other', 'Miscellaneous corporate payments.', 80)
on conflict (id) do update set
  label = excluded.label,
  description = excluded.description,
  display_order = excluded.display_order,
  active = true;

insert into public.payment_types (id, category_id, label, display_order)
values
  ('payroll', 'people_payments', 'Payroll', 10),
  ('bonus', 'people_payments', 'Bonus', 20),
  ('commission', 'people_payments', 'Commission', 30),
  ('contractor', 'people_payments', 'Contractor', 40),
  ('expenses_reimbursement', 'people_payments', 'Expenses Reimbursement', 50),
  ('supplier', 'supplier_payments', 'Supplier', 10),
  ('vendor', 'supplier_payments', 'Vendor', 20),
  ('procurement', 'supplier_payments', 'Procurement', 30),
  ('inventory', 'supplier_payments', 'Inventory', 40),
  ('manufacturing', 'supplier_payments', 'Manufacturing', 50),
  ('rent', 'operating_expenses', 'Rent', 10),
  ('utilities', 'operating_expenses', 'Utilities', 20),
  ('insurance', 'operating_expenses', 'Insurance', 30),
  ('software', 'operating_expenses', 'Software', 40),
  ('marketing', 'operating_expenses', 'Marketing', 50),
  ('travel', 'operating_expenses', 'Travel', 60),
  ('training', 'operating_expenses', 'Training', 70),
  ('loan_repayment', 'financial_obligations', 'Loan Repayment', 10),
  ('mortgage', 'financial_obligations', 'Mortgage', 20),
  ('leasing', 'financial_obligations', 'Leasing', 30),
  ('credit_facility', 'financial_obligations', 'Credit Facility', 40),
  ('tax_payment', 'tax_regulatory', 'Tax Payment', 10),
  ('payroll_tax', 'tax_regulatory', 'Payroll Tax', 20),
  ('vat', 'tax_regulatory', 'VAT', 30),
  ('pension_contributions', 'tax_regulatory', 'Pension Contributions', 40),
  ('internal_settlement', 'internal_transfers', 'Internal Settlement', 10),
  ('internal_funding', 'internal_transfers', 'Internal Funding', 20),
  ('dividend', 'investor_distributions', 'Dividend', 10),
  ('partner_distribution', 'investor_distributions', 'Partner Distribution', 20),
  ('miscellaneous', 'other', 'Miscellaneous', 10)
on conflict (id) do update set
  category_id = excluded.category_id,
  label = excluded.label,
  display_order = excluded.display_order,
  active = true;

insert into public.approval_roles (id, label, description)
values
  ('corporate_user', 'Corporate User', 'Corporate platform administrator.'),
  ('ceo', 'Chief Executive Officer', 'Executive approval authority.'),
  ('cfo', 'Chief Financial Officer', 'Financial approval authority.'),
  ('cto', 'Chief Technology Officer', 'Operational intelligence authority.'),
  ('finance_manager', 'Finance Manager', 'Batch creator and threshold approver.'),
  ('finance_director', 'Finance Director', 'Higher-value finance approval authority.'),
  ('auditor', 'Auditor', 'Read-only audit and reporting authority.')
on conflict (id) do update set
  label = excluded.label,
  description = excluded.description,
  active = true;

insert into public.approval_rules (payment_type_id, label, min_amount, max_amount, sequential, enabled)
values
  ('payroll', 'Payroll requires CFO approval', 0, null, true, true),
  ('supplier', 'Supplier up to 10000 requires Finance Manager', 0, 10000, true, true),
  ('supplier', 'Supplier 10000 to 50000 requires Finance Manager and CFO', 10000, 50000, true, true),
  ('supplier', 'Supplier over 50000 requires CFO and CEO', 50000, null, true, true),
  ('vendor', 'Vendor up to 10000 requires Finance Manager', 0, 10000, true, true),
  ('vendor', 'Vendor over 10000 requires CFO', 10000, null, true, true),
  ('dividend', 'Dividend requires CFO and CEO', 0, null, true, true),
  ('partner_distribution', 'Partner distribution requires CFO and CEO', 0, null, true, true),
  ('loan_repayment', 'Loan repayment requires CFO', 0, null, true, true),
  ('tax_payment', 'Tax payment requires CFO', 0, null, true, true),
  ('miscellaneous', 'Miscellaneous requires Finance Manager', 0, null, true, true)
on conflict do nothing;

insert into public.approval_rule_roles (approval_rule_id, approval_role_id, stage_order, required)
select r.id, 'cfo', 1, true
from public.approval_rules r
where r.label in ('Payroll requires CFO approval', 'Vendor over 10000 requires CFO', 'Loan repayment requires CFO', 'Tax payment requires CFO')
on conflict do nothing;

insert into public.approval_rule_roles (approval_rule_id, approval_role_id, stage_order, required)
select r.id, 'finance_manager', 1, true
from public.approval_rules r
where r.label in ('Supplier up to 10000 requires Finance Manager', 'Vendor up to 10000 requires Finance Manager', 'Miscellaneous requires Finance Manager')
on conflict do nothing;

insert into public.approval_rule_roles (approval_rule_id, approval_role_id, stage_order, required)
select r.id, 'finance_manager', 1, true
from public.approval_rules r
where r.label = 'Supplier 10000 to 50000 requires Finance Manager and CFO'
on conflict do nothing;

insert into public.approval_rule_roles (approval_rule_id, approval_role_id, stage_order, required)
select r.id, 'cfo', 2, true
from public.approval_rules r
where r.label = 'Supplier 10000 to 50000 requires Finance Manager and CFO'
on conflict do nothing;

insert into public.approval_rule_roles (approval_rule_id, approval_role_id, stage_order, required)
select r.id, 'cfo', 1, true
from public.approval_rules r
where r.label in ('Supplier over 50000 requires CFO and CEO', 'Dividend requires CFO and CEO', 'Partner distribution requires CFO and CEO')
on conflict do nothing;

insert into public.approval_rule_roles (approval_rule_id, approval_role_id, stage_order, required)
select r.id, 'ceo', 2, true
from public.approval_rules r
where r.label in ('Supplier over 50000 requires CFO and CEO', 'Dividend requires CFO and CEO', 'Partner distribution requires CFO and CEO')
on conflict do nothing;
