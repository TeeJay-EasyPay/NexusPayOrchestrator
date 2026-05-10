create table if not exists orchestration_decisions (
    id uuid primary key default gen_random_uuid(),

    transaction_id text not null,
    route_id text not null,
    user_id uuid not null,

    provider text not null,
    provider_adapter_id text,
    provider_mode text,
    provider_reference text,

    rail text not null,
    route_family text,

    orchestration_score numeric,
    orchestration_safety_score numeric,
    orchestration_safety_status text,

    ai_confidence numeric,
    predicted_failure_risk numeric,

    timeout_ms integer,
    max_retries integer,
    retry_backoff_ms integer[],

    idempotency_key text,

    quote_issued_at timestamptz,
    quote_expires_at timestamptz,
    quote_expired boolean default false,

    failover_recommended boolean default false,
    failover_route_id text,

    treasury_score numeric,
    treasury_pressure text,
    corridor_health_score numeric,

    decision_reason text,

    ai_decision_factors text[],
    treasury_decision_factors text[],

    orchestration_payload jsonb,

    created_at timestamptz not null default timezone('utc', now())
);

create index if not exists orchestration_decisions_user_idx
    on orchestration_decisions(user_id);

create index if not exists orchestration_decisions_transaction_idx
    on orchestration_decisions(transaction_id);

create index if not exists orchestration_decisions_provider_idx
    on orchestration_decisions(provider);

alter table orchestration_decisions enable row level security;

create policy "Users can view their orchestration decisions"
on orchestration_decisions
for select
using (auth.uid() = user_id);

create policy "Users can insert their orchestration decisions"
on orchestration_decisions
for insert
with check (auth.uid() = user_id);

create policy "Users can update their orchestration decisions"
on orchestration_decisions
for update
using (auth.uid() = user_id);
