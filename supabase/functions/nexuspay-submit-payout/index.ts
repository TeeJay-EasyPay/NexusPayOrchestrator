/**
 * Supabase Edge Function — nexuspay-submit-payout
 * External Rail Readiness Sprint — 2026-06-16
 *
 * Submits a payout to the configured last-leg payout provider.
 * This function owns all server-side provider calls so that:
 *  - Provider secrets never reach the mobile client
 *  - All events are persisted server-side
 *  - Auth and account scope are validated server-side
 *
 * STATUS: STUB — Ready for real provider implementation when credentials available.
 * Currently returns a mock response matching the PayoutProvider interface contract.
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
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
    const {
      transferId, accountId, amount, sourceCurrency,
      destinationCurrency, destinationAmount, recipient, reference,
    } = body;

    if (!transferId || !accountId || !amount || !sourceCurrency || !destinationCurrency || !recipient) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Recipient Validation ──────────────────────────────────────────────────
    if (!recipient.name || !recipient.country || !recipient.currency) {
      return new Response(JSON.stringify({ error: 'Invalid recipient: missing name, country, or currency' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Provider Mode ─────────────────────────────────────────────────────────
    const providerMode = Deno.env.get('PROVIDER_MODE') ?? 'mock';

    // ── Provider Execution ────────────────────────────────────────────────────
    // STUB: When Nium/Tranglo/Thunes credentials are available, replace this section.
    //
    // Example for Nium:
    // const niumClientId = Deno.env.get('NIUM_CLIENT_ID');
    // const niumClientSecret = Deno.env.get('NIUM_CLIENT_SECRET');
    // const response = await fetch('https://gateway.nium.com/api/...', { ... });

    const corridor = `${sourceCurrency}-${destinationCurrency}`;
    const ref = `edge-payout-${providerMode}-${transferId.slice(0, 8)}`;

    const mockResult = {
      status: 'PENDING',
      externalReference: ref,
      executedAt: new Date().toISOString(),
      metadata: {
        provider: 'EdgeFunction',
        mode: providerMode,
        corridor,
        recipientName: recipient.name,
        destinationAmount,
      },
    };

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
