/**
 * Supabase Edge Function - nexuspay-submit-payout
 *
 * Server-side payout boundary for NexusPay last-leg providers.
 * Airwallex sandbox credentials are read only from Supabase Edge Function
 * secrets. The mobile app receives redacted references and canonical status.
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type CanonicalPayoutStatus = 'NOT_STARTED' | 'INITIATED' | 'PROCESSING' | 'PAID_OUT' | 'FAILED';

type AirwallexJourneyStep = {
  key: string;
  label: string;
  description: string;
  status: 'PENDING' | 'DONE' | 'FAILED';
  provider: 'Airwallex Sandbox';
  provenance: 'SANDBOX';
  providerStatus?: string;
  occurredAt: string;
};

const AIRWALLEX_API_VERSION = '2024-09-27';
const AIRWALLEX_SANDBOX_BASE_URL = 'https://api.sandbox.airwallex.com';

type AirwallexTokenCache = {
  token: string;
  expiresAtMs: number;
};

let airwallexTokenCache: AirwallexTokenCache | null = null;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function getEnv(name: string) {
  return Deno.env.get(name)?.trim() ?? '';
}

function buildServiceClient() {
  return createClient(getEnv('SUPABASE_URL'), getEnv('SUPABASE_SERVICE_ROLE_KEY'));
}

function buildUserClient(authHeader: string) {
  return createClient(
    getEnv('SUPABASE_URL'),
    getEnv('SUPABASE_ANON_KEY'),
    { global: { headers: { Authorization: authHeader } } },
  );
}

function maskAccount(value?: string | null) {
  if (!value) return 'not supplied';
  const digits = String(value).replace(/\s/g, '');
  return `****${digits.slice(-4)}`;
}

function safeString(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function getCountryCode(country: string) {
  const map: Record<string, string> = {
    Philippines: 'PH',
    Malaysia: 'MY',
    Singapore: 'SG',
    UAE: 'AE',
    'Saudi Arabia': 'SA',
    Qatar: 'QA',
    Kuwait: 'KW',
    Bahrain: 'BH',
    Oman: 'OM',
    'United Kingdom': 'GB',
  };
  return map[country] ?? country.slice(0, 2).toUpperCase();
}

function mapAirwallexStatus(status: unknown): CanonicalPayoutStatus {
  const value = String(status ?? '').toUpperCase();
  if (['PAID', 'SETTLED', 'COMPLETED'].includes(value)) return 'PAID_OUT';
  if (['FAILED', 'CANCELLED', 'REJECTED'].includes(value)) return 'FAILED';
  if (['PROCESSING', 'SCHEDULED', 'SENT', 'IN_PROGRESS', 'PENDING_REVIEW', 'PENDING_APPROVAL'].includes(value)) return 'PROCESSING';
  if (['INITIATED', 'CREATED', 'SUBMITTED'].includes(value)) return 'INITIATED';
  return 'PROCESSING';
}

function providerReference(id?: string | null) {
  return id ? `airwallex:${id}` : `airwallex:pending:${crypto.randomUUID()}`;
}

function requestIdForTransfer(transferId: string) {
  const compact = transferId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 36);
  return `npx-${compact}`;
}

function redactPayload(payload: Record<string, unknown>) {
  const copy = { ...payload };
  delete copy.Authorization;
  delete copy.authorization;
  delete copy.token;
  delete copy.access_token;
  return copy;
}

async function parseProviderResponse(response: Response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return { raw: text.slice(0, 300) };
  }
}

async function airwallexRequest(
  path: string,
  options: RequestInit & { operation: string; correlationId: string; payoutIntentId?: string | null },
) {
  const baseUrl = AIRWALLEX_SANDBOX_BASE_URL;
  const token = await getAirwallexToken(baseUrl);
  const startedAt = new Date();
  const response = await fetch(`${baseUrl.replace(/\/$/, '')}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'x-api-version': AIRWALLEX_API_VERSION,
      ...(options.headers ?? {}),
    },
  });
  const payload = await parseProviderResponse(response);
  const endedAt = new Date();

  await buildServiceClient().from('provider_payout_attempts').insert({
    payout_intent_id: options.payoutIntentId ?? null,
    provider_id: 'airwallex',
    environment: 'sandbox',
    operation: options.operation,
    correlation_id: options.correlationId,
    provider_reference: typeof payload?.id === 'string' ? payload.id : null,
    started_at: startedAt.toISOString(),
    ended_at: endedAt.toISOString(),
    http_status: response.status,
    canonical_result: response.ok ? 'SUCCESS' : 'FAILED',
    redacted_error_code: response.ok ? null : `HTTP_${response.status}`,
    redacted_error_message: response.ok ? null : JSON.stringify(payload).slice(0, 300),
    metadata: {
      path,
      response_shape: Array.isArray(payload) ? 'array' : payload && typeof payload === 'object' ? 'object' : 'unknown',
    },
  });

  if (!response.ok) {
    throw new Error(`Airwallex ${options.operation} failed with HTTP ${response.status}`);
  }

  return payload as Record<string, unknown>;
}

async function getAirwallexToken(baseUrl: string) {
  if (airwallexTokenCache && airwallexTokenCache.expiresAtMs - Date.now() > 60_000) {
    return airwallexTokenCache.token;
  }

  const clientId = getEnv('AIRWALLEX_CLIENT_ID');
  const apiKey = getEnv('AIRWALLEX_API_KEY');
  if (!clientId || !apiKey) {
    throw new Error('Airwallex credentials are not configured in Supabase secrets.');
  }

  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/api/v1/authentication/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-client-id': clientId,
      'x-api-key': apiKey,
    },
    body: '{}',
  });
  const payload = await parseProviderResponse(response);
  const token = safeString(payload?.token) || safeString(payload?.access_token);
  if (!response.ok || !token) {
    throw new Error(`Airwallex authentication failed with HTTP ${response.status}.`);
  }

  const expiresAtMs = payload?.expires_at
    ? Date.parse(String(payload.expires_at))
    : Date.now() + 25 * 60_000;
  airwallexTokenCache = { token, expiresAtMs: Number.isNaN(expiresAtMs) ? Date.now() + 25 * 60_000 : expiresAtMs };
  return token;
}

function airwallexJourneyStep(
  key: string,
  label: string,
  description: string,
  status: AirwallexJourneyStep['status'] = 'DONE',
  providerStatus?: string,
): AirwallexJourneyStep {
  return {
    key,
    label,
    description,
    status,
    provider: 'Airwallex Sandbox',
    provenance: 'SANDBOX',
    providerStatus,
    occurredAt: new Date().toISOString(),
  };
}

function storedJourney(intent: Record<string, unknown>): AirwallexJourneyStep[] {
  const evidence = intent.evidence as Record<string, unknown> | null;
  const journey = evidence?.provider_journey;
  return Array.isArray(journey) ? journey as AirwallexJourneyStep[] : [];
}

function mergeJourneyStep(journey: AirwallexJourneyStep[], step: AirwallexJourneyStep) {
  return [...journey.filter((item) => item.key !== step.key), step];
}

async function runAirwallexSandboxLifecycle(
  providerTransferId: string,
  initialStatus: string,
  correlationId: string,
  payoutIntentId: string,
  initialJourney: AirwallexJourneyStep[],
) {
  let providerStatus = initialStatus.toUpperCase();
  let journey = [...initialJourney];
  const retrieveUntil = async (targetStatus: string, operation: string) => {
    for (let attempt = 1; attempt <= 8; attempt += 1) {
      const retrieved = await airwallexRequest(`/api/v1/transfers/${providerTransferId}`, {
        method: 'GET',
        operation: `${operation}_${attempt}`,
        correlationId,
        payoutIntentId,
      });
      providerStatus = safeString(retrieved.status, providerStatus).toUpperCase();
      if (providerStatus === targetStatus) return;
      if (['FAILED', 'CANCELLED'].includes(providerStatus)) {
        throw new Error(`Airwallex transfer entered ${providerStatus} while waiting for ${targetStatus}.`);
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    throw new Error(`Airwallex remained ${providerStatus} while waiting for ${targetStatus}.`);
  };

  const transitionWithRetry = async (nextStatus: 'SENT' | 'PAID') => {
    let lastError: unknown;
    for (let attempt = 1; attempt <= 8; attempt += 1) {
      try {
        return await airwallexRequest(`/api/v1/simulation/transfers/${providerTransferId}/transition`, {
          method: 'POST',
          operation: `transfer_simulation_${nextStatus.toLowerCase()}_${attempt}`,
          correlationId,
          payoutIntentId,
          body: JSON.stringify({ next_status: nextStatus }),
        });
      } catch (error) {
        lastError = error;
        const retryable = error instanceof Error && error.message.includes('HTTP 500');
        if (!retryable || attempt === 8) throw error;
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
    }
    throw lastError instanceof Error ? lastError : new Error(`Airwallex ${nextStatus} transition failed.`);
  };

  try {
    if (providerStatus === 'SCHEDULED') {
      const sentTransition = await transitionWithRetry('SENT');
      providerStatus = safeString(sentTransition.status, providerStatus).toUpperCase();
    }

    if (providerStatus === 'PROCESSING') {
      journey = mergeJourneyStep(journey, airwallexJourneyStep(
        'airwallex_processing',
        'Airwallex payout processing',
        'Airwallex accepted the sandbox transfer for processing.',
        'DONE',
        providerStatus,
      ));
      await retrieveUntil('SENT', 'transfer_retrieve_until_sent');
    }

    if (providerStatus === 'SENT') {
      journey = mergeJourneyStep(journey, airwallexJourneyStep(
        'airwallex_sent',
        'Airwallex payout sent',
        'Airwallex dispatched the sandbox transfer to the destination payout rail.',
        'DONE',
        providerStatus,
      ));
    }

    if (providerStatus === 'SENT') {
      const paidTransition = await transitionWithRetry('PAID');
      providerStatus = safeString(paidTransition.status, providerStatus).toUpperCase();
      if (providerStatus !== 'PAID') {
        await retrieveUntil('PAID', 'transfer_retrieve_until_paid');
      }
    }

    if (providerStatus !== 'PAID') {
      throw new Error(`Airwallex lifecycle ended at ${providerStatus} instead of PAID.`);
    }

    journey = mergeJourneyStep(journey, airwallexJourneyStep(
      'airwallex_paid',
      'Airwallex recipient payout completed',
      'Airwallex confirmed the sandbox transfer as PAID.',
      'DONE',
      providerStatus,
    ));

    return {
      providerStatus,
      journey,
      simulationSummary: 'Airwallex sandbox lifecycle completed at PAID.',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Airwallex sandbox lifecycle transition failed.';
    journey = mergeJourneyStep(journey, airwallexJourneyStep(
      'airwallex_lifecycle_failure',
      'Airwallex payout lifecycle interrupted',
      message,
      'FAILED',
      providerStatus,
    ));
    return {
      providerStatus,
      journey,
      simulationSummary: `Airwallex sandbox lifecycle stopped at ${providerStatus}: ${message}`,
    };
  }
}

function buildBeneficiary(recipient: Record<string, unknown>, destinationCurrency: string) {
  const countryCode = getCountryCode(safeString(recipient.country));
  const accountName = safeString(recipient.name, 'NexusPay Sandbox Recipient');
  const accountNumber = safeString(recipient.accountNumber, '00000000');
  const bankCode = safeString(recipient.bankCode);

  const bankDetails: Record<string, unknown> = {
    account_currency: destinationCurrency,
    account_name: accountName,
    account_number: accountNumber,
    bank_country_code: countryCode,
    bank_name: safeString(recipient.bankName, 'Sandbox Bank'),
  };

  if (bankCode) {
    bankDetails.account_routing_type1 = countryCode === 'PH' ? 'bank_code' : 'sort_code';
    bankDetails.account_routing_value1 = bankCode;
  }

  const bankName = safeString(recipient.bankName).toLowerCase();
  if (countryCode === 'PH' && bankName.includes('bdo')) {
    bankDetails.swift_code = 'BNORPHMM';
  }

  return {
    entity_type: 'PERSONAL',
    first_name: safeString(recipient.firstName, accountName.split(' ')[0]),
    last_name: safeString(recipient.surname, accountName.split(' ').slice(1).join(' ') || 'Recipient'),
    address: {
      country_code: countryCode,
      city: 'Sandbox City',
      street_address: 'Sandbox Address',
      postcode: '00000',
    },
    bank_details: bankDetails,
  };
}

async function upsertIntent(body: Record<string, unknown>, providerRequestId: string, beneficiarySummary: string) {
  const serviceClient = buildServiceClient();
  const transferId = safeString(body.transferId);
  const { data, error } = await serviceClient
    .from('provider_payout_intents')
    .upsert({
      transfer_id: transferId,
      provider_id: 'airwallex',
      environment: 'sandbox',
      idempotency_key: providerRequestId,
      provider_request_id: providerRequestId,
      canonical_status: 'CREATED',
      source_currency: safeString(body.sourceCurrency, 'GBP'),
      transfer_currency: safeString(body.destinationCurrency),
      transfer_amount: Number(body.destinationAmount ?? body.amount ?? 0),
      destination_country: safeString((body.recipient as Record<string, unknown>)?.country),
      destination_currency: safeString(body.destinationCurrency),
      beneficiary_summary: beneficiarySummary,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'transfer_id,provider_id,environment' })
    .select('*')
    .single();

  if (error) throw error;
  return data as Record<string, unknown>;
}

async function captureEvidence(intentId: string, evidenceType: string, summary: string, payload: Record<string, unknown>) {
  const { data, error } = await buildServiceClient()
    .from('provider_payout_evidence')
    .insert({
      payout_intent_id: intentId,
      provider_id: 'airwallex',
      environment: 'sandbox',
      evidence_type: evidenceType,
      summary,
      payload: redactPayload(payload),
    })
    .select('id, summary')
    .single();

  if (error) throw error;
  return data as { id: string; summary: string };
}

function toPayoutResult(
  intent: Record<string, unknown>,
  body: Record<string, unknown>,
  evidence?: { id: string; summary: string },
  journey: AirwallexJourneyStep[] = storedJourney(intent),
) {
  const recipient = body.recipient as Record<string, unknown>;
  const providerTransferId = safeString(intent.provider_transfer_id);
  const providerStatus = safeString(intent.provider_status);
  const status = mapAirwallexStatus(providerStatus || intent.canonical_status);
  const currency = safeString(body.destinationCurrency, safeString(intent.transfer_currency));
  const country = safeString(recipient?.country, safeString(intent.destination_country));

  return {
    providerId: 'AIRWALLEX_SANDBOX',
    providerName: 'Airwallex Sandbox',
    payoutReference: providerReference(providerTransferId || safeString(intent.provider_request_id)),
    payoutRail: 'BANK_ACCOUNT',
    status,
    amount: Number(body.destinationAmount ?? body.amount ?? intent.transfer_amount ?? 0),
    currency,
    country,
    recipientName: safeString(recipient?.name, 'Sandbox recipient'),
    destinationLabel: `${safeString(recipient?.bankName, 'Bank')} - ${maskAccount(safeString(recipient?.accountNumber))}`,
    estimatedArrival: 'Airwallex sandbox lifecycle',
    createdAt: safeString(intent.created_at, new Date().toISOString()),
    updatedAt: new Date().toISOString(),
    sandbox: true,
    providerMessage: providerTransferId
      ? `Airwallex sandbox transfer ${status === 'PAID_OUT' ? 'completed' : 'submitted'} with redacted evidence.`
      : 'Airwallex sandbox payout intent recorded; provider transfer reference pending.',
    providerRequestId: safeString(intent.provider_request_id),
    providerStatus,
    evidenceId: evidence?.id,
    evidenceSummary: evidence?.summary,
    providerJourney: journey,
  };
}

async function handleAirwallexCreate(body: Record<string, unknown>) {
  const transferId = safeString(body.transferId);
  if (!transferId) throw new Error('transferId is required for Airwallex payout.');
  const recipient = body.recipient as Record<string, unknown>;
  if (!recipient || typeof recipient !== 'object') throw new Error('recipient is required for Airwallex payout.');

  const providerRequestId = requestIdForTransfer(transferId);
  const destinationCurrency = safeString(body.destinationCurrency, safeString(recipient.currency));
  const beneficiarySummary = `${safeString(recipient.name, 'Recipient')} - ${safeString(recipient.bankName, 'Bank')} - ${maskAccount(safeString(recipient.accountNumber))}`;
  let intent = await upsertIntent(body, providerRequestId, beneficiarySummary);
  const correlationId = crypto.randomUUID();

  if (safeString(intent.provider_transfer_id)) {
    const providerTransferId = safeString(intent.provider_transfer_id);
    const retrieved = await airwallexRequest(`/api/v1/transfers/${providerTransferId}`, {
      method: 'GET',
      operation: 'transfer_retrieve_for_resume',
      correlationId,
      payoutIntentId: safeString(intent.id),
    });
    const lifecycle = await runAirwallexSandboxLifecycle(
      providerTransferId,
      safeString(retrieved.status, safeString(intent.provider_status, 'SCHEDULED')),
      correlationId,
      safeString(intent.id),
      storedJourney(intent),
    );
    const canonicalStatus = mapAirwallexStatus(lifecycle.providerStatus);
    const existingEvidence = intent.evidence && typeof intent.evidence === 'object'
      ? intent.evidence as Record<string, unknown>
      : {};
    const { data: resumedIntent, error: resumeError } = await buildServiceClient()
      .from('provider_payout_intents')
      .update({
        canonical_status: canonicalStatus,
        provider_status: lifecycle.providerStatus,
        completed_at: canonicalStatus === 'PAID_OUT' ? new Date().toISOString() : intent.completed_at,
        evidence: {
          ...existingEvidence,
          provider_status: lifecycle.providerStatus,
          simulation_summary: lifecycle.simulationSummary,
          provider_journey: lifecycle.journey,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', safeString(intent.id))
      .select('*')
      .single();
    if (resumeError) throw resumeError;
    return toPayoutResult(resumedIntent as Record<string, unknown>, body, undefined, lifecycle.journey);
  }

  const beneficiary = buildBeneficiary(recipient, destinationCurrency);
  const beneficiaryPayload = {
    beneficiary,
    nickname: safeString(recipient.name, 'NexusPay Sandbox Recipient').slice(0, 64),
    transfer_methods: ['LOCAL'],
  };
  await airwallexRequest('/api/v1/beneficiaries/validate', {
    method: 'POST',
    operation: 'beneficiary_validate',
    correlationId,
    payoutIntentId: safeString(intent.id),
    body: JSON.stringify(beneficiaryPayload),
  });
  let providerJourney: AirwallexJourneyStep[] = [
    airwallexJourneyStep(
      'airwallex_authenticated',
      'Airwallex sandbox authenticated',
      `Airwallex accepted the authenticated API request using version ${AIRWALLEX_API_VERSION}.`,
    ),
    airwallexJourneyStep(
      'airwallex_beneficiary_validated',
      'Airwallex beneficiary validated',
      'Airwallex validated the beneficiary and bank instruction.',
    ),
  ];

  const beneficiaryCreate = await airwallexRequest('/api/v1/beneficiaries/create', {
    method: 'POST',
    operation: 'beneficiary_create',
    correlationId,
    payoutIntentId: safeString(intent.id),
    body: JSON.stringify(beneficiaryPayload),
  });

  const beneficiaryId = safeString(beneficiaryCreate.id);
  if (!beneficiaryId) {
    throw new Error('Airwallex beneficiary creation did not return an ID.');
  }
  providerJourney = mergeJourneyStep(providerJourney, airwallexJourneyStep(
    'airwallex_beneficiary_created',
    'Airwallex beneficiary created',
    'Airwallex created the sandbox beneficiary and returned a redacted reference.',
  ));

  const transferPayload = {
    beneficiary_id: beneficiaryId,
    transfer_amount: String(Number(body.destinationAmount ?? body.amount ?? 0)),
    transfer_currency: destinationCurrency,
    source_currency: safeString(body.sourceCurrency, 'GBP'),
    transfer_method: 'LOCAL',
    reason: 'business_expenses',
    reference: safeString(body.reference, `NexusPay ${transferId.slice(0, 8)}`).slice(0, 35),
    request_id: providerRequestId,
  };

  await airwallexRequest('/api/v1/transfers/validate', {
    method: 'POST',
    operation: 'transfer_validate',
    correlationId,
    payoutIntentId: safeString(intent.id),
    body: JSON.stringify(transferPayload),
  });
  providerJourney = mergeJourneyStep(providerJourney, airwallexJourneyStep(
    'airwallex_transfer_validated',
    'Airwallex transfer validated',
    'Airwallex validated the last-leg transfer instruction before submission.',
  ));

  const transferCreate = await airwallexRequest('/api/v1/transfers/create', {
    method: 'POST',
    operation: 'transfer_create',
    correlationId,
    payoutIntentId: safeString(intent.id),
    body: JSON.stringify(transferPayload),
  });

  const providerTransferId = safeString(transferCreate.id);
  let providerStatus = safeString(transferCreate.status, 'CREATED');
  let simulationSummary = 'Sandbox transition not attempted.';
  providerJourney = mergeJourneyStep(providerJourney, airwallexJourneyStep(
    'airwallex_transfer_submitted',
    'Airwallex payout submitted',
    'Airwallex created the sandbox transfer and returned a redacted transfer reference.',
    'DONE',
    providerStatus,
  ));

  if (providerTransferId) {
    const lifecycle = await runAirwallexSandboxLifecycle(
      providerTransferId,
      providerStatus,
      correlationId,
      safeString(intent.id),
      providerJourney,
    );
    providerStatus = lifecycle.providerStatus;
    providerJourney = lifecycle.journey;
    simulationSummary = lifecycle.simulationSummary;
  }

  const canonicalStatus = mapAirwallexStatus(providerStatus);

  const { data: updatedIntent, error } = await buildServiceClient()
    .from('provider_payout_intents')
    .update({
      provider_beneficiary_id: beneficiaryId,
      provider_transfer_id: providerTransferId,
      canonical_status: canonicalStatus,
      provider_status: providerStatus,
      submitted_at: new Date().toISOString(),
      completed_at: canonicalStatus === 'PAID_OUT' ? new Date().toISOString() : null,
      fee_amount: transferCreate.fee_amount ?? null,
      fee_currency: transferCreate.fee_currency ?? null,
      amount_payer_pays: transferCreate.amount_payer_pays ?? null,
      amount_beneficiary_receives: transferCreate.amount_beneficiary_receives ?? null,
      evidence: {
        request_id: providerRequestId,
        transfer_id_present: Boolean(providerTransferId),
        beneficiary_id_present: Boolean(beneficiaryId),
        provider_status: providerStatus,
        simulation_summary: simulationSummary,
        provider_journey: providerJourney,
      },
      updated_at: new Date().toISOString(),
    })
    .eq('id', safeString(intent.id))
    .select('*')
    .single();

  if (error) throw error;
  intent = updatedIntent as Record<string, unknown>;

  const evidence = await captureEvidence(safeString(intent.id), 'AIRWALLEX_TRANSFER_CREATED', 'Airwallex sandbox transfer submitted with redacted provider references.', {
    request_id: providerRequestId,
    transfer_id_present: Boolean(providerTransferId),
    beneficiary_id_present: Boolean(beneficiaryId),
    provider_status: providerStatus,
    canonical_status: canonicalStatus,
    simulation_summary: simulationSummary,
    provider_journey: providerJourney,
    amount_payer_pays: transferCreate.amount_payer_pays ?? null,
    amount_beneficiary_receives: transferCreate.amount_beneficiary_receives ?? null,
    fee_amount: transferCreate.fee_amount ?? null,
    fee_currency: transferCreate.fee_currency ?? null,
  });

  return toPayoutResult(intent, body, evidence, providerJourney);
}

async function handleAirwallexRetrieve(body: Record<string, unknown>) {
  const reference = safeString(body.payoutReference).replace(/^airwallex:/, '');
  if (!reference) return { status: 'PROCESSING' };

  const serviceClient = buildServiceClient();
  const { data: intent } = await serviceClient
    .from('provider_payout_intents')
    .select('*')
    .or(`provider_transfer_id.eq.${reference},provider_request_id.eq.${reference}`)
    .maybeSingle();

  if (!intent?.provider_transfer_id) {
    return { status: mapAirwallexStatus(intent?.provider_status ?? intent?.canonical_status) };
  }

  const retrieved = await airwallexRequest(`/api/v1/transfers/${intent.provider_transfer_id}`, {
    method: 'GET',
    operation: 'transfer_retrieve',
    correlationId: crypto.randomUUID(),
    payoutIntentId: safeString(intent.id),
  });
  const providerStatus = safeString(retrieved.status, safeString(intent.provider_status));
  const canonicalStatus = mapAirwallexStatus(providerStatus);

  await serviceClient
    .from('provider_payout_intents')
    .update({
      canonical_status: canonicalStatus,
      provider_status: providerStatus,
      completed_at: canonicalStatus === 'PAID_OUT' ? new Date().toISOString() : intent.completed_at,
      failed_at: canonicalStatus === 'FAILED' ? new Date().toISOString() : intent.failed_at,
      updated_at: new Date().toISOString(),
    })
    .eq('id', safeString(intent.id));

  return { status: canonicalStatus, providerStatus };
}

function mockResult(body: Record<string, unknown>) {
  const transferId = safeString(body.transferId, crypto.randomUUID());
  const recipient = body.recipient as Record<string, unknown>;
  const destinationCurrency = safeString(body.destinationCurrency, safeString(recipient?.currency, 'GBP'));
  const destinationAmount = Number(body.destinationAmount ?? body.amount ?? 0);
  const providerMode = getEnv('PROVIDER_MODE') || 'mock';
  return {
    status: 'PENDING',
    externalReference: `edge-payout-${providerMode}-${transferId.slice(0, 8)}`,
    executedAt: new Date().toISOString(),
    metadata: {
      provider: 'EdgeFunction',
      mode: providerMode,
      corridor: `${safeString(body.sourceCurrency, 'GBP')}-${destinationCurrency}`,
      recipientName: safeString(recipient?.name, 'Recipient'),
      destinationAmount,
    },
  };
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Missing authorization header' }, 401);

    const userClient = buildUserClient(authHeader);
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return json({ error: 'Unauthorized' }, 401);

    const body = await req.json().catch(() => ({}));
    const providerId = safeString(body.providerId).toLowerCase();
    const environment = safeString(body.environment, 'sandbox').toLowerCase();
    if (environment !== 'sandbox') {
      return json({ error: 'Only Airwallex sandbox execution is enabled.' }, 400);
    }

    if (providerId === 'airwallex') {
      if (safeString(body.operation) === 'retrieve') {
        return json(await handleAirwallexRetrieve(body));
      }
      return json(await handleAirwallexCreate(body));
    }

    return json(mockResult(body));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return json({ error: message }, 500);
  }
});
