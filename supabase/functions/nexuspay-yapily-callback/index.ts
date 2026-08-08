/** Public Yapily callback. Deployed without gateway JWT verification; protected by a one-use callback token. */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

function env(name: string) {
  return Deno.env.get(name)?.trim() ?? '';
}

function client() {
  return createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'));
}

function appRedirect(flowId: string, outcome: string, reason?: string) {
  const base = env('YAPILY_APP_RETURN_URL') || 'nexuspayorchestrator://open-banking-return';
  const url = new URL(base);
  url.searchParams.set('flow_id', flowId);
  url.searchParams.set('outcome', outcome);
  if (reason) url.searchParams.set('reason', reason.slice(0, 160));
  return new Response(null, { status: 302, headers: { Location: url.toString(), 'Cache-Control': 'no-store' } });
}

function yapilyConfig() {
  const id = env('YAPILY_APPLICATION_UUID') || env('YAPILY_APPLICATION_ID');
  const secret = env('YAPILY_APPLICATION_SECRET');
  if (!id || !secret) throw new Error('Yapily credentials are unavailable.');
  return { baseUrl: (env('YAPILY_BASE_URL') || 'https://api.yapily.com').replace(/\/$/, ''), authorization: `Basic ${btoa(`${id}:${secret}`)}` };
}

async function yapily(path: string, init: RequestInit = {}) {
  const config = yapilyConfig();
  const response = await fetch(`${config.baseUrl}${path}`, {
    ...init,
    headers: { Authorization: config.authorization, Accept: 'application/json', ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...(init.headers ?? {}) },
  });
  const text = await response.text();
  let payload: any = null;
  try { payload = text ? JSON.parse(text) : null; } catch { payload = null; }
  return { response, payload, text };
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((item) => item.toString(16).padStart(2, '0')).join('');
}

function toBase64(value: Uint8Array) {
  return btoa(String.fromCharCode(...value));
}

async function encryptToken(token: string) {
  const keyBytes = Uint8Array.from(atob(env('YAPILY_TOKEN_ENCRYPTION_KEY')), (character) => character.charCodeAt(0));
  if (keyBytes.length !== 32) throw new Error('Yapily token encryption is unavailable.');
  const key = await crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['encrypt']);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(token));
  return { ciphertext: toBase64(new Uint8Array(encrypted)), iv: toBase64(iv) };
}

function step(flow: any, key: string, label: string, status: string, sequence: number, metadata: Record<string, unknown> = {}) {
  return { flow_id: flow.id, transfer_id: flow.transfer_id, user_id: flow.user_id, step_key: key, label, status, provider: 'Yapily', provenance: status === 'FAILED' ? 'NO_DATA' : 'SANDBOX', sequence, metadata };
}

async function saveStep(row: Record<string, unknown>) {
  const { error } = await client().from('open_banking_payment_flow_steps').upsert(row, { onConflict: 'flow_id,step_key' });
  if (error) throw error;
}

async function fail(flow: any, code: string, reason: string) {
  const now = new Date().toISOString();
  await client().from('open_banking_payment_flows').update({ status: 'PAYMENT_FAILED', failure_code: code, failure_reason: reason.slice(0, 500), callback_received_at: now, updated_at: now }).eq('id', flow.id);
  await saveStep(step(flow, 'customer_authorization', 'Yapily sandbox bank authorisation failed', 'FAILED', 3, { code, reason: reason.slice(0, 240) }));
}

serve(async (req: Request) => {
  const url = new URL(req.url);
  const flowId = url.searchParams.get('flow_id') ?? '';
  const callbackToken = url.searchParams.get('callback_token') ?? '';
  if (!flowId || !callbackToken) return new Response('Invalid callback.', { status: 400 });

  const db = client();
  const { data: flow } = await db.from('open_banking_payment_flows').select('*').eq('id', flowId).eq('provider_id', 'yapily').maybeSingle();
  if (!flow || await sha256(callbackToken) !== flow.callback_token_hash) return new Response('Invalid callback.', { status: 403 });
  if (flow.provider_payment_id) return appRedirect(flowId, 'payment_submitted');

  const callbackState = url.searchParams.get('state');
  if (callbackState && flow.provider_state && callbackState !== flow.provider_state) {
    await fail(flow, 'STATE_MISMATCH', 'Yapily callback correlation failed.');
    return appRedirect(flowId, 'failed', 'Callback validation failed.');
  }
  const callbackError = url.searchParams.get('error') ?? url.searchParams.get('error_description');
  if (callbackError) {
    await fail(flow, 'AUTHORIZATION_REJECTED', callbackError);
    return appRedirect(flowId, 'failed', callbackError);
  }

  const oneTimeToken = url.searchParams.get('one-time-token') ?? url.searchParams.get('oneTimeToken');
  if (!oneTimeToken) {
    await fail(flow, 'MISSING_ONE_TIME_TOKEN', 'Yapily did not return a one-time consent token.');
    return appRedirect(flowId, 'failed', 'Bank authorisation did not return a usable token.');
  }

  try {
    const exchange = await yapily('/consent-one-time-token', { method: 'POST', body: JSON.stringify({ oneTimeToken }) });
    const consentData = exchange.payload?.data ?? exchange.payload;
    if (!exchange.response.ok || !consentData?.consentToken) {
      const reason = String(exchange.payload?.error?.message ?? exchange.text.slice(0, 300) ?? 'Consent exchange failed.');
      await fail(flow, `CONSENT_HTTP_${exchange.response.status}`, reason);
      return appRedirect(flowId, 'failed', 'Yapily consent exchange failed.');
    }
    const encrypted = await encryptToken(String(consentData.consentToken));
    await db.from('open_banking_provider_tokens').upsert({ flow_id: flowId, provider_id: 'yapily', token_ciphertext: encrypted.ciphertext, token_iv: encrypted.iv, updated_at: new Date().toISOString() });
    await saveStep(step(flow, 'customer_authorization', 'Customer authorised the payment in the Yapily sandbox bank', 'DONE', 3, { consent_id: consentData.id, provider_status: consentData.status, http_status: exchange.response.status }));
    await saveStep(step(flow, 'consent_exchanged', 'Yapily one-time token exchanged securely for payment consent', 'DONE', 4, { consent_id: consentData.id, token_persisted_encrypted: true }));

    const paymentResult = await yapily('/payments', { method: 'POST', headers: { consent: String(consentData.consentToken) }, body: JSON.stringify(flow.payment_request) });
    const payment = paymentResult.payload?.data ?? paymentResult.payload;
    if (!paymentResult.response.ok || !payment?.id) {
      const reason = String(paymentResult.payload?.error?.message ?? paymentResult.text.slice(0, 300) ?? 'Payment creation failed.');
      await fail(flow, `PAYMENT_HTTP_${paymentResult.response.status}`, reason);
      await saveStep(step(flow, 'payment_submitted', 'Yapily sandbox payment submission failed', 'FAILED', 5, { http_status: paymentResult.response.status, reason: reason.slice(0, 240) }));
      return appRedirect(flowId, 'failed', 'Yapily payment submission failed.');
    }

    const providerStatus = String(payment.status ?? payment.statusDetails?.status ?? 'PENDING').toUpperCase();
    const flowStatus = providerStatus === 'COMPLETED' ? 'PAYMENT_COMPLETED' : ['FAILED', 'REJECTED'].includes(providerStatus) ? 'PAYMENT_FAILED' : 'PAYMENT_PENDING';
    const now = new Date().toISOString();
    await db.from('open_banking_payment_flows').update({
      consent_id: String(consentData.id ?? flow.consent_id ?? ''),
      callback_received_at: now,
      provider_payment_id: String(payment.id),
      provider_payment_status: providerStatus,
      provider_status_updated_at: now,
      provider_tracing_id: paymentResult.payload?.meta?.tracingId ? String(paymentResult.payload.meta.tracingId) : flow.provider_tracing_id,
      status: flowStatus,
      updated_at: now,
    }).eq('id', flowId);
    await saveStep(step(flow, 'payment_submitted', 'Yapily sandbox payment submitted with provider-issued reference', 'DONE', 5, { provider_payment_id: payment.id, provider_status: providerStatus, http_status: paymentResult.response.status }));
    await saveStep(step(flow, 'payment_status_received', `Yapily returned payment status: ${providerStatus}`, providerStatus === 'COMPLETED' ? 'DONE' : ['FAILED', 'REJECTED'].includes(providerStatus) ? 'FAILED' : 'PENDING', 6, { provider_status: providerStatus }));
    await db.from('transfers').update({
      funding_method: 'OPEN_BANKING',
      funding_status: providerStatus === 'COMPLETED' ? 'AUTHORISED' : flowStatus === 'PAYMENT_FAILED' ? 'FAILED' : 'AUTHORISING',
      funding_reference: flow.funding_reference,
      funding_authorised_at: providerStatus === 'COMPLETED' ? now : null,
      open_banking_status: flowStatus,
      updated_at: now,
    }).eq('id', flow.transfer_id).eq('user_id', flow.user_id);
    await db.from('partner_capabilities').update({ enabled: true, readiness_status: 'Validated', provenance: 'SANDBOX', last_validated_at: now, notes: 'Authenticated Yapily sandbox payment creation completed with provider-issued evidence.', updated_at: now }).eq('provider_id', 'yapily').eq('capability_code', 'PAYMENT_INITIATION').eq('environment', 'sandbox');
    return appRedirect(flowId, flowStatus === 'PAYMENT_FAILED' ? 'failed' : 'payment_submitted');
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'Unexpected callback processing failure.';
    await fail(flow, 'CALLBACK_PROCESSING_FAILED', reason);
    return appRedirect(flowId, 'failed', reason);
  }
});
