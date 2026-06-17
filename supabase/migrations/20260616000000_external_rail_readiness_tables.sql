-- NexusPay Orchestrator — External Rail Readiness Tables
-- Migration: 20260616000000_external_rail_readiness_tables
-- Sprint: External Rail Readiness Sprint — 2026-06-16
--
-- STATUS: READY TO APPLY
-- These tables are required when transitioning from mock to sandbox mode.
-- They can be applied safely alongside existing tables — no existing schema is modified.
--
-- Run with: supabase db push
-- Or apply via Supabase Dashboard SQL editor.

-- ────────────────────────────────────────────────────────────────────────────
-- provider_execution_sessions
-- Records each provider API session (one per transfer per provider leg)
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS provider_execution_sessions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_id       UUID NOT NULL,
  user_id           UUID NOT NULL REFERENCES auth.users(id),
  account_id        TEXT NOT NULL,
  provider          TEXT NOT NULL,
  provider_type     TEXT NOT NULL CHECK (provider_type IN ('collection', 'payout', 'fx')),
  mode              TEXT NOT NULL CHECK (mode IN ('mock', 'sandbox', 'live')),
  status            TEXT NOT NULL DEFAULT 'INITIATED',
  initiated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at      TIMESTAMPTZ,
  external_reference TEXT,
  metadata          JSONB,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS provider_execution_sessions_transfer_id_idx
  ON provider_execution_sessions (transfer_id);

CREATE INDEX IF NOT EXISTS provider_execution_sessions_user_id_idx
  ON provider_execution_sessions (user_id);

ALTER TABLE provider_execution_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own provider sessions"
  ON provider_execution_sessions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Edge Functions use service role — no insert policy needed for client

-- ────────────────────────────────────────────────────────────────────────────
-- provider_events
-- Every provider interaction event — the audit trail
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS provider_events (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id            TEXT NOT NULL UNIQUE, -- Application-generated UUID
  transfer_id         UUID NOT NULL,
  user_id             UUID NOT NULL REFERENCES auth.users(id),
  account_id          TEXT NOT NULL,
  provider            TEXT,
  provider_type       TEXT CHECK (provider_type IN ('collection', 'payout', 'fx')),
  event_type          TEXT NOT NULL,
  provider_status     TEXT,
  transfer_state      TEXT NOT NULL,
  timestamp           TIMESTAMPTZ NOT NULL,
  external_reference  TEXT,
  error_code          TEXT,
  error_message       TEXT,
  retry_eligible      BOOLEAN DEFAULT FALSE,
  metadata            JSONB,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS provider_events_transfer_id_idx
  ON provider_events (transfer_id);

CREATE INDEX IF NOT EXISTS provider_events_user_id_idx
  ON provider_events (user_id);

CREATE INDEX IF NOT EXISTS provider_events_account_id_idx
  ON provider_events (account_id);

CREATE INDEX IF NOT EXISTS provider_events_timestamp_idx
  ON provider_events (timestamp DESC);

ALTER TABLE provider_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own provider events"
  ON provider_events
  FOR SELECT
  USING (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────────────────────
-- provider_webhooks
-- Inbound webhooks from real providers
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS provider_webhooks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider      TEXT NOT NULL,
  event_type    TEXT,
  payload       JSONB NOT NULL,
  received_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed     BOOLEAN NOT NULL DEFAULT FALSE,
  processed_at  TIMESTAMPTZ,
  error         TEXT
);

-- No RLS — only accessible by Edge Functions via service role

-- ────────────────────────────────────────────────────────────────────────────
-- route_certifications
-- Tracks certification status for each corridor/provider combination
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS route_certifications (
  id                       TEXT PRIMARY KEY,
  corridor                 TEXT NOT NULL,
  collection_provider      TEXT NOT NULL,
  payout_provider          TEXT NOT NULL,
  fx_provider              TEXT,
  status                   TEXT NOT NULL DEFAULT 'NOT_STARTED'
                             CHECK (status IN (
                               'UNKNOWN', 'NOT_STARTED', 'IN_PROGRESS',
                               'PASS', 'FAIL', 'BLOCKED', 'NEEDS_PARTNER_ACCESS'
                             )),
  certification_result     TEXT,
  last_tested              TIMESTAMPTZ,
  evidence                 TEXT,
  failure_reason           TEXT,
  retry_recommendation     TEXT,
  founder_approval_state   TEXT NOT NULL DEFAULT 'NOT_REVIEWED'
                             CHECK (founder_approval_state IN (
                               'NOT_REVIEWED', 'PENDING_REVIEW', 'APPROVED', 'REJECTED'
                             )),
  founder_approved_at      TIMESTAMPTZ,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (corridor, collection_provider, payout_provider, COALESCE(fx_provider, 'NONE'))
);

CREATE INDEX IF NOT EXISTS route_certifications_corridor_idx
  ON route_certifications (corridor);

CREATE INDEX IF NOT EXISTS route_certifications_status_idx
  ON route_certifications (status);

ALTER TABLE route_certifications ENABLE ROW LEVEL SECURITY;

-- Corporate users can read certifications (read-only via app)
CREATE POLICY "Authenticated users can view route certifications"
  ON route_certifications
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Only service role (Edge Functions) can insert/update
-- Founder approval should be done via a secure admin endpoint

-- ────────────────────────────────────────────────────────────────────────────
-- sandbox_test_results
-- Results from sandbox test runs (when real provider access is obtained)
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sandbox_test_results (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_run_id         TEXT NOT NULL,
  corridor            TEXT NOT NULL,
  collection_provider TEXT NOT NULL,
  payout_provider     TEXT NOT NULL,
  scenario            TEXT NOT NULL,
  result              TEXT NOT NULL CHECK (result IN ('PASS', 'FAIL', 'ERROR', 'SKIPPED')),
  events_captured     INTEGER DEFAULT 0,
  duration_ms         INTEGER,
  ran_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  error               TEXT,
  metadata            JSONB
);

CREATE INDEX IF NOT EXISTS sandbox_test_results_test_run_id_idx
  ON sandbox_test_results (test_run_id);

CREATE INDEX IF NOT EXISTS sandbox_test_results_corridor_idx
  ON sandbox_test_results (corridor);

-- ────────────────────────────────────────────────────────────────────────────
-- Updated timestamp trigger (reusable)
-- ────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_route_certifications_updated_at
  BEFORE UPDATE ON route_certifications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
