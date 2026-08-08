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

class AirwallexApiError extends Error {
  constructor(
    public readonly operation: string,
    public readonly httpStatus: number,
    public readonly providerCode: string,
    public readonly fieldSources: string[],
    message: string,
  ) {
    super(message);
    this.name = 'AirwallexApiError';
  }

  get retryable() {
    return this.httpStatus === 408 || this.httpStatus === 429 || this.httpStatus >= 500;
  }
}

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

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function optionalNumber(value: unknown) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric >= 0 ? numeric : undefined;
}

function normalizeBeneficiarySchemaField(value: unknown) {
  const row = asRecord(value);
  const field = asRecord(row.field);
  const rule = asRecord(row.rule);
  const path = safeString(row.path);
  if (!path.startsWith('beneficiary.') || path.includes('__proto__') || path.includes('constructor')) return null;

  const options = Array.isArray(field.options)
    ? field.options.map((option) => {
      const item = asRecord(option);
      return { label: safeString(item.label, safeString(item.value)), value: safeString(item.value) };
    }).filter((option) => option.value)
    : [];

  return {
    path,
    required: row.required === true,
    enabled: row.enabled !== false,
    label: safeString(field.label, safeString(field.key, path.split('.').at(-1) ?? 'Recipient field')),
    placeholder: safeString(field.placeholder),
    description: safeString(field.description) || safeString(field.tip) || undefined,
    type: safeString(field.type, 'TEXT'),
    defaultValue: safeString(field.default) || undefined,
    options,
    pattern: safeString(rule.pattern) || undefined,
    minLength: optionalNumber(rule.min_length ?? rule.minLength),
    maxLength: optionalNumber(rule.max_length ?? rule.maxLength),
  };
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

async function recordAirwallexExecutionEvidence(sourceCurrency: string, destinationCountry: string, destinationCurrency: string) {
  const db = buildServiceClient();
  const validatedAt = new Date().toISOString();
  const capabilityResult = await db.from('partner_capabilities').update({
    enabled: true,
    readiness_status: 'Validated',
    provenance: 'SANDBOX',
    last_validated_at: validatedAt,
    notes: 'Authenticated Airwallex sandbox beneficiary validation, transfer validation and transfer creation have succeeded.',
    updated_at: validatedAt,
  }).eq('provider_id', 'airwallex').eq('environment', 'sandbox').in('capability_code', [
    'BENEFICIARY_VALIDATION',
    'TRANSFER_VALIDATION',
    'TRANSFER_CREATION',
  ]);
  if (capabilityResult.error) console.error('Airwallex capability evidence update failed.', capabilityResult.error.message);

  const corridorResult = await db.from('partner_supported_corridors').update({
    readiness_status: 'Validated',
    provenance: 'SANDBOX',
    last_validated_at: validatedAt,
    notes: 'Validated by an authenticated Airwallex sandbox beneficiary and transfer submission for this corridor.',
    updated_at: validatedAt,
  }).eq('provider_id', 'airwallex')
    .eq('environment', 'sandbox')
    .eq('source_country', 'United Kingdom')
    .eq('destination_country', destinationCountry)
    .eq('source_currency', sourceCurrency)
    .eq('destination_currency', destinationCurrency);
  if (corridorResult.error) console.error('Airwallex corridor evidence update failed.', corridorResult.error.message);
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
    const details = payload?.details as Record<string, unknown> | undefined;
    const errors = Array.isArray(details?.errors) ? details.errors as Record<string, unknown>[] : [];
    const fieldSources = errors
      .map((item) => safeString(item.source))
      .filter(Boolean);
    throw new AirwallexApiError(
      options.operation,
      response.status,
      safeString(payload?.code, `HTTP_${response.status}`),
      fieldSources,
      safeString(payload?.message, `Airwallex rejected ${options.operation}.`),
    );
  }

  return payload as Record<string, unknown>;
}

async function handleAirwallexBeneficiarySchema(body: Record<string, unknown>) {
  const destinationCountry = safeString(body.destinationCountry);
  const destinationCurrency = safeString(body.destinationCurrency);
  if (!destinationCountry || !destinationCurrency) {
    throw new Error('Destination country and currency are required for Airwallex recipient requirements.');
  }

  const bankCountryCode = getCountryCode(destinationCountry);
  const entityType = safeString(body.entityType, 'PERSONAL').toUpperCase() === 'COMPANY' ? 'COMPANY' : 'PERSONAL';
  const requestedMethod = safeString(body.transferMethod).toUpperCase();
  const methods = requestedMethod === 'LOCAL' || requestedMethod === 'SWIFT'
    ? [requestedMethod]
    : ['LOCAL', 'SWIFT'];
  let lastError: unknown;

  for (const transferMethod of methods) {
    try {
      const result = await airwallexRequest('/api/v1/beneficiary_form_schemas/generate', {
        method: 'POST',
        operation: `beneficiary_form_schema_${transferMethod.toLowerCase()}`,
        correlationId: crypto.randomUUID(),
        body: JSON.stringify({
          account_currency: destinationCurrency,
          bank_country_code: bankCountryCode,
          entity_type: entityType,
          transfer_method: transferMethod,
        }),
      });
      const fields = Array.isArray(result.fields)
        ? result.fields.map(normalizeBeneficiarySchemaField).filter(Boolean)
        : [];
      if (fields.length === 0) throw new Error('Airwallex returned an empty beneficiary form schema.');

      return {
        provider: 'Airwallex Sandbox',
        provenance: 'SANDBOX',
        source: 'Airwallex Beneficiary Form Schema API',
        transferMethod,
        bankCountryCode,
        accountCurrency: destinationCurrency,
        entityType,
        fields,
        fetchedAt: new Date().toISOString(),
      };
    } catch (error) {
      lastError = error;
      const unsupported = error instanceof AirwallexApiError &&
        (error.httpStatus === 400 || error.providerCode === 'SCHEMA_DEFINITION_NOT_FOUND');
      if (!unsupported) throw error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('Airwallex returned no supported beneficiary schema for this corridor.');
}

async function handleAirwallexFxQuote(body: Record<string, unknown>) {
  const sellCurrency = safeString(body.sellCurrency).toUpperCase();
  const buyCurrency = safeString(body.buyCurrency).toUpperCase();
  const sellAmount = Number(body.sellAmount);
  if (!sellCurrency || !buyCurrency || !Number.isFinite(sellAmount) || sellAmount <= 0) {
    throw new Error('Valid sell currency, buy currency and sell amount are required for an Airwallex FX quote.');
  }

  const quote = await airwallexRequest('/api/v1/fx/quotes/create', {
    method: 'POST',
    operation: 'fx_quote_create',
    correlationId: crypto.randomUUID(),
    body: JSON.stringify({
      sell_currency: sellCurrency,
      buy_currency: buyCurrency,
      sell_amount: sellAmount,
      validity: 'MIN_15',
    }),
  });

  const quoteId = safeString(quote.quote_id);
  const buyAmount = Number(quote.buy_amount);
  const clientRate = Number(quote.client_rate);
  if (!quoteId || !Number.isFinite(buyAmount) || !Number.isFinite(clientRate)) {
    throw new Error('Airwallex returned an incomplete sandbox FX quote.');
  }

  return {
    quoteId,
    sellCurrency: safeString(quote.sell_currency, sellCurrency),
    buyCurrency: safeString(quote.buy_currency, buyCurrency),
    sellAmount: Number(quote.sell_amount ?? sellAmount),
    buyAmount,
    clientRate,
    midRate: Number.isFinite(Number(quote.mid_rate)) ? Number(quote.mid_rate) : null,
    validFromAt: safeString(quote.valid_from_at, new Date().toISOString()),
    validToAt: safeString(quote.valid_to_at),
    source: 'Airwallex Transactional FX Quote API',
    provenance: 'SANDBOX',
  };
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
  let journey = initialJourney.filter(
    (step) => !['airwallex_lifecycle_failure', 'airwallex_lifecycle_pending'].includes(step.key),
  );
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

  const transitionWithRetry = async (nextStatus: 'PROCESSING' | 'SENT' | 'PAID') => {
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
        const retryable = error instanceof AirwallexApiError && error.retryable;
        if (!retryable || attempt === 8) throw error;
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
    }
    throw lastError instanceof Error ? lastError : new Error(`Airwallex ${nextStatus} transition failed.`);
  };

  try {
    if (providerStatus === 'SCHEDULED') {
      const processingTransition = await transitionWithRetry('PROCESSING');
      providerStatus = safeString(processingTransition.status, providerStatus).toUpperCase();
      if (providerStatus !== 'PROCESSING') {
        await retrieveUntil('PROCESSING', 'transfer_retrieve_until_processing');
      }
    }

    if (providerStatus === 'PROCESSING') {
      journey = mergeJourneyStep(journey, airwallexJourneyStep(
        'airwallex_processing',
        'Airwallex payout processing',
        'Airwallex accepted the sandbox transfer for processing.',
        'DONE',
        providerStatus,
      ));
      const sentTransition = await transitionWithRetry('SENT');
      providerStatus = safeString(sentTransition.status, providerStatus).toUpperCase();
      if (providerStatus !== 'SENT') {
        await retrieveUntil('SENT', 'transfer_retrieve_until_sent');
      }
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
    const awaitingTransition = !['FAILED', 'CANCELLED'].includes(providerStatus);
    journey = mergeJourneyStep(journey, airwallexJourneyStep(
      awaitingTransition ? 'airwallex_lifecycle_pending' : 'airwallex_lifecycle_failure',
      awaitingTransition ? 'Airwallex payout awaiting next status' : 'Airwallex payout lifecycle interrupted',
      message,
      awaitingTransition ? 'PENDING' : 'FAILED',
      providerStatus,
    ));
    return {
      providerStatus,
      journey,
      simulationSummary: `Airwallex sandbox lifecycle stopped at ${providerStatus}: ${message}`,
    };
  }
}

function applyBeneficiaryFields(target: Record<string, unknown>, values: Record<string, unknown>) {
  for (const [path, rawValue] of Object.entries(values)) {
    if (!path.startsWith('beneficiary.') || path.includes('__proto__') || path.includes('constructor')) continue;
    const segments = path.split('.').slice(1);
    if (segments.length === 0 || segments.some((segment) => !/^[a-zA-Z0-9_]+$/.test(segment))) continue;
    let cursor = target;
    for (const segment of segments.slice(0, -1)) {
      const existing = cursor[segment];
      if (!existing || typeof existing !== 'object' || Array.isArray(existing)) cursor[segment] = {};
      cursor = cursor[segment] as Record<string, unknown>;
    }
    const value = typeof rawValue === 'string' ? rawValue.trim() : rawValue;
    if (value !== '' && value !== null && value !== undefined) cursor[segments.at(-1)!] = value;
  }
}

function recipientAccountReference(recipient: Record<string, unknown>) {
  const fields = asRecord(recipient.airwallexBeneficiaryFields);
  return safeString(fields['beneficiary.bank_details.account_number']) ||
    safeString(fields['beneficiary.bank_details.iban']) ||
    safeString(recipient.accountNumber);
}

function buildBeneficiary(recipient: Record<string, unknown>, destinationCurrency: string) {
  const countryCode = getCountryCode(safeString(recipient.country));
  const accountName = safeString(recipient.name, 'NexusPay Sandbox Recipient');
  const dynamicFields = asRecord(recipient.airwallexBeneficiaryFields);
  if (Object.keys(dynamicFields).length > 0) {
    const beneficiary: Record<string, unknown> = {
      entity_type: 'PERSONAL',
      type: 'BANK_ACCOUNT',
      first_name: safeString(recipient.firstName, accountName.split(' ')[0]),
      last_name: safeString(recipient.surname, accountName.split(' ').slice(1).join(' ') || 'Recipient'),
      address: { country_code: countryCode },
      bank_details: {
        account_currency: destinationCurrency,
        account_name: accountName,
        bank_country_code: countryCode,
        bank_name: safeString(recipient.bankName),
      },
    };
    applyBeneficiaryFields(beneficiary, dynamicFields);
    return beneficiary;
  }

  const accountNumber = safeString(recipient.accountNumber, '00000000');
  const bankCode = safeString(recipient.bankCode);

  const bankDetails: Record<string, unknown> = {
    account_currency: destinationCurrency,
    account_name: accountName,
    account_number: accountNumber,
    bank_country_code: countryCode,
    bank_name: safeString(recipient.bankName, 'Sandbox Bank'),
  };

  if (bankCode && !['MY', 'PH', 'SG'].includes(countryCode)) {
    bankDetails.account_routing_type1 = 'sort_code';
    bankDetails.account_routing_value1 = bankCode;
  }

  const bankName = safeString(recipient.bankName).toLowerCase();
  const swiftCodes: Record<string, Record<string, string>> = {
    MY: {
      maybank: 'MBBEMYKL',
      cimb: 'CIBBMYKL',
      'public bank': 'PBBEMYKL',
    },
    PH: {
      bdo: 'BNORPHMM',
      bpi: 'BOPIPHMM',
      metrobank: 'MBTCPHMM',
    },
  };
  const swiftCode = Object.entries(swiftCodes[countryCode] ?? {})
    .find(([name]) => bankName.includes(name))?.[1];
  if (swiftCode) {
    bankDetails.swift_code = swiftCode;
  }

  const sandboxStates: Record<string, string> = {
    MY: 'Kuala Lumpur',
    PH: 'Metro Manila',
    SG: 'Singapore',
    AE: 'Dubai',
    SA: 'Riyadh',
    QA: 'Doha',
    KW: 'Al Asimah',
    BH: 'Capital',
    OM: 'Muscat',
    GB: 'England',
  };

  return {
    entity_type: 'PERSONAL',
    type: 'BANK_ACCOUNT',
    first_name: safeString(recipient.firstName, accountName.split(' ')[0]),
    last_name: safeString(recipient.surname, accountName.split(' ').slice(1).join(' ') || 'Recipient'),
    address: {
      country_code: countryCode,
      city: 'Sandbox City',
      state: sandboxStates[countryCode] ?? 'Sandbox State',
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
    destinationLabel: `${safeString(recipient?.bankName, 'Bank')} - ${maskAccount(recipientAccountReference(recipient))}`,
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
  const beneficiarySummary = `${safeString(recipient.name, 'Recipient')} - ${safeString(recipient.bankName, 'Bank')} - ${maskAccount(recipientAccountReference(recipient))}`;
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
  const transferMethod = safeString(recipient.airwallexTransferMethod, 'LOCAL').toUpperCase() === 'SWIFT'
    ? 'SWIFT'
    : 'LOCAL';
  const beneficiaryPayload = {
    beneficiary,
    nickname: safeString(recipient.name, 'NexusPay Sandbox Recipient').slice(0, 64),
    transfer_methods: [transferMethod],
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
    transfer_method: transferMethod,
    reason: 'business_expenses',
    reference: safeString(body.reference, `NexusPay ${transferId.slice(0, 8)}`).slice(0, 35),
    request_id: providerRequestId,
    ...(safeString(body.quoteId) ? { quote_id: safeString(body.quoteId) } : {}),
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
    await recordAirwallexExecutionEvidence(
      safeString(body.sourceCurrency, 'GBP'),
      safeString(recipient.country),
      destinationCurrency,
    );
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
  let providerStatus = safeString(retrieved.status, safeString(intent.provider_status));
  let providerJourney = storedJourney(intent);
  let simulationSummary = safeString(
    (intent.evidence as Record<string, unknown> | null)?.simulation_summary,
    'Airwallex status retrieved.',
  );

  if (['SCHEDULED', 'PROCESSING', 'SENT'].includes(providerStatus.toUpperCase())) {
    const lifecycle = await runAirwallexSandboxLifecycle(
      safeString(intent.provider_transfer_id),
      providerStatus,
      crypto.randomUUID(),
      safeString(intent.id),
      providerJourney,
    );
    providerStatus = lifecycle.providerStatus;
    providerJourney = lifecycle.journey;
    simulationSummary = lifecycle.simulationSummary;
  }

  const canonicalStatus = mapAirwallexStatus(providerStatus);
  const existingEvidence = intent.evidence && typeof intent.evidence === 'object'
    ? intent.evidence as Record<string, unknown>
    : {};

  await serviceClient
    .from('provider_payout_intents')
    .update({
      canonical_status: canonicalStatus,
      provider_status: providerStatus,
      completed_at: canonicalStatus === 'PAID_OUT' ? new Date().toISOString() : intent.completed_at,
      failed_at: canonicalStatus === 'FAILED' ? new Date().toISOString() : intent.failed_at,
      evidence: {
        ...existingEvidence,
        provider_status: providerStatus,
        simulation_summary: simulationSummary,
        provider_journey: providerJourney,
      },
      updated_at: new Date().toISOString(),
    })
    .eq('id', safeString(intent.id));

  return { status: canonicalStatus, providerStatus, providerJourney };
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
      if (safeString(body.operation) === 'beneficiary_schema') {
        return json(await handleAirwallexBeneficiarySchema(body));
      }
      if (safeString(body.operation) === 'fx_quote') {
        return json(await handleAirwallexFxQuote(body));
      }
      if (safeString(body.operation) === 'retrieve') {
        return json(await handleAirwallexRetrieve(body));
      }
      return json(await handleAirwallexCreate(body));
    }

    return json(mockResult(body));
  } catch (error) {
    if (error instanceof AirwallexApiError) {
      return json({
        error: error.message,
        code: error.providerCode,
        operation: error.operation,
        providerId: 'AIRWALLEX_SANDBOX',
        providerName: 'Airwallex Sandbox',
        retryable: error.retryable,
        fieldSources: error.fieldSources,
      }, error.httpStatus);
    }
    const message = error instanceof Error ? error.message : 'Internal server error';
    return json({ error: message }, 500);
  }
});
