/**
 * Supabase Edge Function - nexuspay-provider-webhook
 *
 * Receives provider webhooks and maps verified Airwallex transfer events into
 * NexusPay canonical payout state. Airwallex webhooks are rejected unless the
 * webhook secret and signature headers are present and valid.
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-signature, x-signature, x-timestamp',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function getEnv(name: string) {
  return Deno.env.get(name)?.trim() ?? '';
}

async function hmacSha256Hex(secret: string, value: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value));
  return Array.from(new Uint8Array(signature)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let index = 0; index < a.length; index += 1) {
    result |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return result === 0;
}

async function verifyAirwallexWebhook(req: Request, rawBody: string) {
  const secret = getEnv('AIRWALLEX_WEBHOOK_SECRET');
  if (!secret) {
    return { verified: false, reason: 'AIRWALLEX_WEBHOOK_SECRET_NOT_CONFIGURED' };
  }

  const timestamp = req.headers.get('x-timestamp') ?? '';
  const signature = req.headers.get('x-signature') ?? req.headers.get('x-webhook-signature') ?? '';
  if (!timestamp || !signature) {
    return { verified: false, reason: 'MISSING_AIRWALLEX_SIGNATURE_HEADERS' };
  }

  const expected = await hmacSha256Hex(secret, `${timestamp}${rawBody}`);
  return {
    verified: timingSafeEqual(signature.toLowerCase(), expected.toLowerCase()),
    reason: 'SIGNATURE_CHECKED',
  };
}

function mapAirwallexStatus(status: unknown) {
  const value = String(status ?? '').toUpperCase();
  if (['PAID', 'SETTLED', 'SENT', 'COMPLETED'].includes(value)) return 'PAID_OUT';
  if (['FAILED', 'CANCELLED', 'REJECTED'].includes(value)) return 'FAILED';
  if (['PROCESSING', 'SCHEDULED', 'IN_PROGRESS', 'PENDING_REVIEW', 'PENDING_APPROVAL'].includes(value)) return 'PROCESSING';
  if (['INITIATED', 'CREATED', 'SUBMITTED'].includes(value)) return 'INITIATED';
  return null;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const provider = new URL(req.url).searchParams.get('provider')?.toLowerCase();
    if (!provider) {
      return json({ error: 'Provider query parameter required' }, 400);
    }

    const rawBody = await req.text();
    const verification = provider === 'airwallex'
      ? await verifyAirwallexWebhook(req, rawBody)
      : { verified: false, reason: 'PROVIDER_SIGNATURE_NOT_IMPLEMENTED' };

    if (provider === 'airwallex' && !verification.verified) {
      return json({ received: false, error: verification.reason }, 400);
    }

    const payload = rawBody ? JSON.parse(rawBody) : {};
    const serviceClient = createClient(getEnv('SUPABASE_URL'), getEnv('SUPABASE_SERVICE_ROLE_KEY'));

    const eventType = payload.event_type ?? payload.type ?? payload.name ?? 'UNKNOWN';
    const eventId = payload.id ?? payload.event_id ?? `${provider}-${eventType}-${payload.created_at ?? Date.now()}`;
    const data = payload.data && typeof payload.data === 'object' ? payload.data : payload;
    const object = data.object && typeof data.object === 'object' ? data.object : data;
    const providerTransferId = object.id ?? object.transfer_id ?? null;
    const providerStatus = object.status ?? null;
    const canonicalStatus = provider === 'airwallex' ? mapAirwallexStatus(providerStatus) : null;

    const { error: insertError } = await serviceClient
      .from('provider_webhook_events')
      .insert({
        provider_id: provider,
        environment: 'sandbox',
        event_id: String(eventId),
        event_type: String(eventType),
        provider_transfer_id: providerTransferId ? String(providerTransferId) : null,
        canonical_status: canonicalStatus,
        verified: verification.verified,
        received_at: new Date().toISOString(),
        provider_created_at: payload.created_at ?? null,
        payload,
        processing_status: canonicalStatus ? 'MAPPED' : 'RECEIVED',
      });

    if (insertError && !String(insertError.message).includes('duplicate key')) {
      console.error('Failed to persist provider webhook:', insertError.message);
    }

    if (provider === 'airwallex' && providerTransferId && canonicalStatus) {
      await serviceClient
        .from('provider_payout_intents')
        .update({
          canonical_status: canonicalStatus,
          provider_status: providerStatus ? String(providerStatus) : null,
          completed_at: canonicalStatus === 'PAID_OUT' ? new Date().toISOString() : null,
          failed_at: canonicalStatus === 'FAILED' ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq('provider_id', 'airwallex')
        .eq('environment', 'sandbox')
        .eq('provider_transfer_id', String(providerTransferId));
    }

    return json({ received: true, verified: verification.verified });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('Webhook processing error:', message);
    return json({ received: true, error: message });
  }
});
