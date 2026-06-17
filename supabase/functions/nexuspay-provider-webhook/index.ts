/**
 * Supabase Edge Function — nexuspay-provider-webhook
 * External Rail Readiness Sprint — 2026-06-16
 *
 * Receives inbound webhooks from real providers (TrueLayer, Nium, etc.)
 * Persists webhook to provider_webhooks table.
 * Triggers transfer state machine update.
 *
 * STATUS: STUB — Ready for real provider webhook signatures when credentials available.
 *
 * Security:
 * - Each provider uses a webhook signature (HMAC-SHA256 or similar)
 * - Signature validation is required before processing the payload
 * - Signature secret stored in Supabase Edge Function Secrets
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-signature',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const provider = new URL(req.url).searchParams.get('provider');
    if (!provider) {
      return new Response(JSON.stringify({ error: 'Provider query parameter required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Signature Validation (STUB) ───────────────────────────────────────────
    // When real provider webhook secrets are available:
    // const signature = req.headers.get('x-webhook-signature');
    // const secret = Deno.env.get(`${provider.toUpperCase()}_WEBHOOK_SECRET`);
    // validateHmacSignature(body, signature, secret); // throw if invalid

    const payload = await req.json();

    // ── Persist Webhook ───────────────────────────────────────────────────────
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { error: insertError } = await serviceClient
      .from('provider_webhooks')
      .insert({
        provider,
        event_type: payload.event_type ?? payload.type ?? 'UNKNOWN',
        payload,
        received_at: new Date().toISOString(),
        processed: false,
      });

    if (insertError) {
      console.error('Failed to persist webhook:', insertError);
      // Return 200 to provider to prevent retries — log for investigation
    }

    // ── Process Webhook ───────────────────────────────────────────────────────
    // STUB: Process provider-specific event and update transfer state.
    // This will vary per provider — implement when provider docs are available.

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    // Return 200 to prevent provider retry storms on server errors
    // Log the error for investigation
    console.error('Webhook processing error:', message);
    return new Response(JSON.stringify({ received: true, error: message }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
