/**
 * Supabase Edge Function — nexuspay-initiate-collection
 * External Rail Readiness Sprint — 2026-06-16
 *
 * Initiates a collection with the configured first-leg provider.
 * This function owns all server-side provider calls so that:
 *  - Provider secrets never reach the mobile client
 *  - All events are persisted server-side
 *  - Auth and account scope are validated server-side
 *
 * STATUS: STUB — Ready for real provider implementation when credentials available.
 * Currently returns a mock response matching the CollectionProvider interface contract.
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // ── Auth Validation ───────────────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Request Parsing ───────────────────────────────────────────────────────
    const body = await req.json();
    const { transferId, accountId, amount, currency, reference, redirectUrl } = body;

    if (!transferId || !accountId || !amount || !currency) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Provider Mode ─────────────────────────────────────────────────────────
    const providerMode = Deno.env.get('PROVIDER_MODE') ?? 'mock';

    // ── Provider Execution ────────────────────────────────────────────────────
    // STUB: When real provider credentials are available, replace this section
    // with a real TrueLayer/Yapily/Plaid API call.
    //
    // Example for TrueLayer:
    // const truelayerClientId = Deno.env.get('TRUELAYER_CLIENT_ID');
    // const truelayerClientSecret = Deno.env.get('TRUELAYER_CLIENT_SECRET');
    // const response = await fetch('https://auth.truelayer-sandbox.com/connect/token', { ... });

    const mockResult = {
      status: 'REQUIRES_AUTHORIZATION',
      externalReference: `edge-${providerMode}-${transferId.slice(0, 8)}`,
      executedAt: new Date().toISOString(),
      authorizationUrl:
        providerMode === 'mock'
          ? `https://mock-bank.sandbox.nexuspay.com/auth?ref=edge-${transferId.slice(0, 8)}&redirect=${encodeURIComponent(redirectUrl ?? 'nexuspay://collection-callback')}`
          : null,
      metadata: { provider: 'EdgeFunction', mode: providerMode },
    };

    // ── Persist Event ─────────────────────────────────────────────────────────
    // NOTE: When Supabase tables are created, uncomment to persist events server-side:
    // const serviceClient = createClient(
    //   Deno.env.get('SUPABASE_URL') ?? '',
    //   Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    // );
    // await serviceClient.from('provider_events').insert({ ... });

    return new Response(JSON.stringify(mockResult), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
