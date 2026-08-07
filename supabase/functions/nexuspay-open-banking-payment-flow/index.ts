/** Genuine Yapily sandbox payment authorisation, initiation and status orchestration. */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const PAYMENT_FEATURES = ['INITIATE_DOMESTIC_SINGLE_PAYMENT', 'CREATE_DOMESTIC_SINGLE_PAYMENT'];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

function env(name: string) {
  return Deno.env.get(name)?.trim() ?? '';
}

function serviceClient() {
  return createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'));
}

function userClient(authHeader: string) {
  return createClient(env('SUPABASE_URL'), env('SUPABASE_ANON_KEY'), {
    global: { headers: { Authorization: authHeader } },
  });
}

function yapilyConfig() {
  const id = env('YAPILY_APPLICATION_UUID') || env('YAPILY_APPLICATION_ID');
  const secret = env('YAPILY_APPLICATION_SECRET');
  if (!id || !secret) throw new Error('Yapily Supabase secrets are not configured.');
  return {
    baseUrl: (env('YAPILY_BASE_URL') || 'https://api.yapily.com').replace(/\/$/, ''),
    authorization: `Basic ${btoa(`${id}:${secret}`)}`,
  };
}

async function yapilyFetch(path: string, init: RequestInit = {}) {
  const config = yapilyConfig();
  const started = Date.now();
  const response = await fetch(`${config.baseUrl}${path}`, {
    ...init,
    headers: {
      Authorization: config.authorization,
      Accept: 'application/json',
      ...(init.body ? { 'Content-Type': 'application/json;charset=UTF-8' } : {}),
      ...(init.headers ?? {}),
    },
  });
  const text = await response.text();
  let payload: any = null;
  try { payload = text ? JSON.parse(text) : null; } catch { payload = null; }
  return { response, payload, text, responseTimeMs: Date.now() - started };
}

function collection(payload: any): any[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.institutions)) return payload.institutions;
  return [];
}

function institutionView(row: any) {
  const features = Array.isArray(row?.features) ? row.features.filter((value: unknown) => typeof value === 'string') : [];
  const countries = Array.isArray(row?.countries) ? row.countries : [];
  const media = Array.isArray(row?.media) ? row.media : [];
  return {
    id: String(row?.id ?? ''),
    name: String(row?.name ?? row?.fullName ?? row?.id ?? ''),
    fullName: String(row?.fullName ?? row?.name ?? row?.id ?? ''),
    environmentType: String(row?.environmentType ?? 'UNKNOWN'),
    countries: countries.map((country: any) => String(country?.countryCode2 ?? '')).filter(Boolean),
    features,
    iconUrl: String(media.find((item: any) => item?.type === 'icon')?.source ?? ''),
    paymentInitiationSupported: PAYMENT_FEATURES.every((feature) => features.includes(feature)),
    provenance: 'SANDBOX',
    source: 'Yapily Institutions API',
  };
}

async function discoverInstitutions() {
  const listResult = await yapilyFetch('/institutions?countries=GB');
  if (!listResult.response.ok) {
    throw new Error(`Yapily institution discovery failed with HTTP ${listResult.response.status}.`);
  }
  const institutions = collection(listResult.payload).map(institutionView);
  return {
    institutions: institutions.filter((institution) =>
      institution.id &&
      ['SANDBOX', 'MOCK'].includes(institution.environmentType) &&
      institution.countries.includes('GB') &&
      institution.paymentInitiationSupported
    ),
    discoveryMode: 'APPLICATION_CONNECTED_INSTITUTIONS',
    responseTimeMs: listResult.responseTimeMs,
  };
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map((item) => item.toString(16).padStart(2, '0')).join('');
}

function step(flow: any, key: string, label: string, status: string, sequence: number, metadata: Record<string, unknown> = {}) {
  return {
    flow_id: flow.id,
    transfer_id: flow.transfer_id,
    user_id: flow.user_id,
    step_key: key,
    label,
    status,
    provider: 'Yapily',
    provenance: status === 'FAILED' ? 'NO_DATA' : 'SANDBOX',
    sequence,
    metadata,
  };
}

async function saveStep(row: Record<string, unknown>) {
  const { error } = await serviceClient().from('open_banking_payment_flow_steps').upsert(row, { onConflict: 'flow_id,step_key' });
  if (error) throw error;
}

async function readFlow(flowId: string, userId: string) {
  const client = serviceClient();
  const { data: flow, error } = await client.from('open_banking_payment_flows').select('*').eq('id', flowId).eq('user_id', userId).single();
  if (error || !flow) throw new Error('Open banking flow was not found.');
  const { data: steps, error: stepError } = await client.from('open_banking_payment_flow_steps').select('*').eq('flow_id', flowId).order('sequence');
  if (stepError) throw stepError;
  return { flow, steps: steps ?? [] };
}

function paymentRequest(flowId: string, amount: number, currency: string) {
  if (currency !== 'GBP') throw new Error('Yapily sandbox funding currently supports GBP source payments only.');
  return {
    type: 'DOMESTIC_PAYMENT',
    reference: `NexusPay ${flowId.slice(0, 8)}`.slice(0, 18),
    paymentIdempotencyId: flowId.replace(/-/g, '').slice(0, 35),
    amount: { amount, currency },
    payee: {
      name: env('YAPILY_SANDBOX_PAYEE_NAME') || 'NEXUSPAY SANDBOX',
      accountIdentifications: [
        { type: 'SORT_CODE', identification: env('YAPILY_SANDBOX_PAYEE_SORT_CODE') || '123456' },
        { type: 'ACCOUNT_NUMBER', identification: env('YAPILY_SANDBOX_PAYEE_ACCOUNT_NUMBER') || '12345678' },
      ],
    },
  };
}

async function startFlow(userId: string, body: Record<string, unknown>) {
  const transferId = String(body.transferId ?? '').trim();
  const institutionId = String(body.institutionId ?? '').trim();
  const institutionName = String(body.institutionName ?? '').trim();
  const amount = Number(body.amount ?? 0);
  const currency = String(body.currency ?? 'GBP').trim().toUpperCase();
  const fundingReference = String(body.fundingReference ?? '').trim() || null;
  if (!transferId || !institutionId || !Number.isFinite(amount) || amount <= 0) {
    return json({ error: 'transferId, institutionId and a positive amount are required.' }, 400);
  }

  const institutionResult = await yapilyFetch(`/institutions/${encodeURIComponent(institutionId)}`);
  if (!institutionResult.response.ok) return json({ error: 'The selected institution is not available from Yapily.' }, 409);
  const institution = institutionView(institutionResult.payload?.data ?? institutionResult.payload);
  if (!['SANDBOX', 'MOCK'].includes(institution.environmentType)) {
    return json({ error: 'Only Yapily sandbox or mock institutions are allowed in this environment.' }, 409);
  }
  if (!institution.paymentInitiationSupported) {
    return json({ error: 'The selected Yapily institution does not support the required payment features.' }, 409);
  }

  const flowId = crypto.randomUUID();
  const callbackToken = crypto.randomUUID();
  const callbackTokenHash = await sha256(callbackToken);
  const request = paymentRequest(flowId, amount, currency);
  const callback = `${env('SUPABASE_URL')}/functions/v1/nexuspay-yapily-callback?flow_id=${encodeURIComponent(flowId)}&callback_token=${encodeURIComponent(callbackToken)}`;
  const now = new Date().toISOString();
  const client = serviceClient();
  const { data: flow, error: insertError } = await client.from('open_banking_payment_flows').insert({
    id: flowId,
    transfer_id: transferId,
    user_id: userId,
    provider_id: 'yapily',
    environment: 'sandbox',
    institution_id: institution.id,
    institution_name: institution.fullName || institutionName,
    status: 'CREATING_AUTHORIZATION',
    amount,
    currency,
    funding_reference: fundingReference,
    provenance: 'SANDBOX',
    callback_token_hash: callbackTokenHash,
    payment_idempotency_id: request.paymentIdempotencyId,
    payment_request: request,
    updated_at: now,
  }).select('*').single();
  if (insertError) throw insertError;

  await saveStep(step(flow, 'institution_verified', 'Yapily sandbox institution verified for payment initiation', 'DONE', 1, {
    institution_id: institution.id,
    environment_type: institution.environmentType,
    required_features: PAYMENT_FEATURES,
    http_status: institutionResult.response.status,
  }));

  const authResult = await yapilyFetch('/payment-auth-requests', {
    method: 'POST',
    body: JSON.stringify({
      applicationUserId: `nexuspay-${userId}`,
      institutionId: institution.id,
      callback,
      oneTimeToken: true,
      paymentRequest: request,
    }),
  });
  const authData = authResult.payload?.data ?? authResult.payload;
  if (!authResult.response.ok || !authData?.id || !authData?.authorisationUrl) {
    const reason = (authResult.payload?.error?.message ?? authResult.text.slice(0, 300)) || 'Yapily rejected the payment authorisation request.';
    await client.from('open_banking_payment_flows').update({ status: 'AUTHORIZATION_FAILED', failure_code: `HTTP_${authResult.response.status}`, failure_reason: reason, updated_at: now }).eq('id', flowId);
    await saveStep(step(flow, 'authorization_created', 'Yapily payment authorisation request failed', 'FAILED', 2, { http_status: authResult.response.status, reason }));
    return json({ error: reason, flowId }, 502);
  }

  const { data: updated, error: updateError } = await client.from('open_banking_payment_flows').update({
    payment_request_id: String(authData.id),
    consent_id: authData.institutionConsentId ? String(authData.institutionConsentId) : null,
    provider_state: authData.state ? String(authData.state) : null,
    authorization_url: String(authData.authorisationUrl),
    status: String(authData.status ?? 'AWAITING_AUTHORIZATION'),
    provider_tracing_id: authResult.payload?.meta?.tracingId ? String(authResult.payload.meta.tracingId) : null,
    updated_at: new Date().toISOString(),
  }).eq('id', flowId).select('*').single();
  if (updateError) throw updateError;
  await saveStep(step(flow, 'authorization_created', 'Yapily payment authorisation created', 'DONE', 2, {
    provider_authorization_id: authData.id,
    provider_status: authData.status,
    http_status: authResult.response.status,
    response_time_ms: authResult.responseTimeMs,
  }));
  const capabilityValidatedAt = new Date().toISOString();
  const { error: capabilityError } = await client.from('partner_capabilities').update({
    enabled: true,
    readiness_status: 'Validated',
    provenance: 'SANDBOX',
    last_validated_at: capabilityValidatedAt,
    notes: 'Yapily accepted a sandbox payment authorisation request and issued provider references; customer consent and payment creation remain flow-level evidence.',
    updated_at: capabilityValidatedAt,
  }).eq('provider_id', 'yapily').eq('capability_code', 'PAYMENT_INITIATION').eq('environment', 'sandbox');
  if (capabilityError) console.error('Yapily capability evidence update failed.', capabilityError.message);
  await saveStep(step(flow, 'customer_authorization', 'Waiting for customer authorisation in the Yapily sandbox bank', 'PENDING', 3));
  await client.from('transfers').update({ open_banking_flow_id: flowId, open_banking_provider: 'yapily', open_banking_status: 'AWAITING_AUTHORIZATION', updated_at: now }).eq('id', transferId).eq('user_id', userId);
  const result = await readFlow(flowId, userId);
  return json({ ...result, authorizationUrl: updated.authorization_url });
}

function fromBase64(value: string) {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
}

async function decryptToken(ciphertext: string, iv: string) {
  const keyBytes = fromBase64(env('YAPILY_TOKEN_ENCRYPTION_KEY'));
  if (keyBytes.length !== 32) throw new Error('Yapily token encryption key is not configured correctly.');
  const key = await crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['decrypt']);
  const clear = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromBase64(iv) }, key, fromBase64(ciphertext));
  return new TextDecoder().decode(clear);
}

async function resumeFlow(userId: string, body: Record<string, unknown>) {
  const flowId = String(body.flowId ?? '').trim();
  const current = await readFlow(flowId, userId);
  if (!current.flow.provider_payment_id) return json(current);
  const client = serviceClient();
  const { data: tokenRow } = await client.from('open_banking_provider_tokens').select('*').eq('flow_id', flowId).maybeSingle();
  if (!tokenRow) return json(current);
  const consent = await decryptToken(tokenRow.token_ciphertext, tokenRow.token_iv);
  const statusResult = await yapilyFetch(`/payments/${encodeURIComponent(current.flow.provider_payment_id)}`, { headers: { consent } });
  if (statusResult.response.ok) {
    const payment = statusResult.payload?.data ?? statusResult.payload;
    const providerStatus = String(payment?.status ?? payment?.statusDetails?.status ?? 'UNKNOWN').toUpperCase();
    const terminal = ['COMPLETED', 'FAILED', 'REJECTED'].includes(providerStatus);
    const status = providerStatus === 'COMPLETED' ? 'PAYMENT_COMPLETED' : ['FAILED', 'REJECTED'].includes(providerStatus) ? 'PAYMENT_FAILED' : 'PAYMENT_PENDING';
    await client.from('open_banking_payment_flows').update({ status, provider_payment_status: providerStatus, provider_status_updated_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', flowId);
    await saveStep(step(current.flow, 'payment_status_retrieved', `Yapily payment status retrieved: ${providerStatus}`, terminal ? (providerStatus === 'COMPLETED' ? 'DONE' : 'FAILED') : 'PENDING', 7, { provider_status: providerStatus, http_status: statusResult.response.status }));
  }
  return json(await readFlow(flowId, userId));
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Missing authorization header' }, 401);
    const auth = userClient(authHeader);
    const { data: { user }, error } = await auth.auth.getUser();
    if (error || !user) return json({ error: 'Unauthorized' }, 401);
    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? 'start').toLowerCase();
    if (action === 'institutions') {
      const result = await discoverInstitutions();
      return json({ ...result, provenance: 'SANDBOX', source: 'Yapily API' });
    }
    if (action === 'start') return await startFlow(user.id, body);
    if (action === 'resume') return await resumeFlow(user.id, body);
    return json({ error: 'Unsupported open banking flow action' }, 400);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Internal server error' }, 500);
  }
});
