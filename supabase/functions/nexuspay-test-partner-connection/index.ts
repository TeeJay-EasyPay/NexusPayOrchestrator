/**
 * Supabase Edge Function - nexuspay-test-partner-connection
 *
 * Runs lightweight partner connectivity tests from the backend boundary.
 * Secrets are read only from Supabase Edge Function secrets.
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  NiumApiError,
  fetchNiumCorridors,
  niumConfig,
  niumPayoutConfigured,
} from '../_shared/nium.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type TestStatus = 'SUCCESS' | 'FAILED' | 'SKIPPED';

type TestRecordInput = {
  providerId: string;
  environment: string;
  testType: string;
  status: TestStatus;
  readiness: string;
  responseTimeMs?: number | null;
  httpStatus?: number | null;
  institutionCount?: number | null;
  capabilityCount?: number | null;
  responseSummary: string;
  errorCode?: string | null;
  errorMessage?: string | null;
  createdBy?: string | null;
  metadata?: Record<string, unknown>;
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

function buildServiceClient() {
  return createClient(
    getEnv('SUPABASE_URL'),
    getEnv('SUPABASE_SERVICE_ROLE_KEY'),
  );
}

function buildUserClient(authHeader: string) {
  return createClient(
    getEnv('SUPABASE_URL'),
    getEnv('SUPABASE_ANON_KEY'),
    { global: { headers: { Authorization: authHeader } } },
  );
}

async function persistTest(input: TestRecordInput) {
  const serviceClient = buildServiceClient();
  const { data, error } = await serviceClient
    .from('partner_connection_tests')
    .insert({
      provider_id: input.providerId,
      environment: input.environment,
      test_type: input.testType,
      status: input.status,
      readiness: input.readiness,
      response_time_ms: input.responseTimeMs ?? null,
      http_status: input.httpStatus ?? null,
      institution_count: input.institutionCount ?? null,
      capability_count: input.capabilityCount ?? null,
      response_summary: input.responseSummary,
      error_code: input.errorCode ?? null,
      error_message: input.errorMessage ?? null,
      created_by: input.createdBy ?? null,
      metadata: input.metadata ?? {},
    })
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  await serviceClient
    .from('partner_connection_status')
    .upsert({
      provider_id: input.providerId,
      environment: input.environment,
      status: input.status === 'SUCCESS' ? 'Sandbox Active' : input.status === 'SKIPPED' ? 'Not Started' : 'Testing',
      last_checked_at: new Date().toISOString(),
      last_result: input.responseSummary,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'provider_id,environment' });

  if (input.status === 'SUCCESS') {
    await serviceClient
      .from('partner_providers')
      .update({
        status: input.environment === 'production' ? 'Production' : 'Sandbox Active',
        last_successful_test_at: new Date().toISOString(),
        readiness_score: Math.max(input.capabilityCount ? 82 : 76, 76),
        updated_at: new Date().toISOString(),
      })
      .eq('id', input.providerId);

    await serviceClient
      .from('partner_capabilities')
      .update({
        readiness_status: 'Validated',
        provenance: 'LIVE',
        last_validated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('provider_id', input.providerId)
      .eq('environment', input.environment)
      .in('capability_code', ['OPEN_BANKING_AUTH', 'INSTITUTION_DISCOVERY']);
  }

  return data;
}

function countInstitutions(payload: unknown) {
  if (Array.isArray(payload)) return payload.length;
  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>;
    if (Array.isArray(record.data)) return record.data.length;
    if (Array.isArray(record.institutions)) return record.institutions.length;
  }
  return null;
}

async function runYapilyTest(providerId: string, environment: string, createdBy: string | null) {
  const applicationUuid = getEnv('YAPILY_APPLICATION_UUID') || getEnv('YAPILY_APPLICATION_ID');
  const applicationSecret = getEnv('YAPILY_APPLICATION_SECRET');
  const baseUrl = getEnv('YAPILY_BASE_URL') || 'https://api.yapily.com';

  if (!applicationUuid || !applicationSecret) {
    const test = await persistTest({
      providerId,
      environment,
      testType: 'institution_discovery',
      status: 'FAILED',
      readiness: 'NO_DATA',
      responseSummary: 'Yapily Supabase secrets are not configured.',
      errorCode: 'MISSING_CREDENTIALS',
      errorMessage: 'Expected YAPILY_APPLICATION_UUID and YAPILY_APPLICATION_SECRET in Supabase Edge Function secrets.',
      createdBy,
      metadata: { provider: 'yapily', baseUrlConfigured: Boolean(baseUrl) },
    });
    return { test };
  }

  const started = Date.now();
  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/institutions?countries=GB`, {
    method: 'GET',
    headers: {
      Authorization: `Basic ${btoa(`${applicationUuid}:${applicationSecret}`)}`,
      Accept: 'application/json',
    },
  });
  const responseTimeMs = Date.now() - started;
  const text = await response.text();
  let payload: unknown = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = null;
  }

  const institutionCount = countInstitutions(payload);
  const discoveryMode = 'APPLICATION_CONNECTED_INSTITUTIONS';
  const success = response.ok;
  const test = await persistTest({
    providerId,
    environment,
    testType: 'institution_discovery',
    status: success ? 'SUCCESS' : 'FAILED',
    readiness: success ? 'SANDBOX' : 'DIAGNOSTIC',
    responseTimeMs,
    httpStatus: response.status,
    institutionCount,
    capabilityCount: success ? 2 : 1,
    responseSummary: success
      ? `Yapily authenticated and returned ${institutionCount ?? 'available'} institution record(s).`
      : `Yapily capability test failed with HTTP ${response.status}.`,
    errorCode: success ? null : `HTTP_${response.status}`,
    errorMessage: success ? null : text.slice(0, 500),
    createdBy,
    metadata: {
      provider: 'yapily',
      endpoint: '/institutions',
      discoveryMode,
      responseShape: Array.isArray(payload) ? 'array' : payload && typeof payload === 'object' ? 'object' : 'unknown',
    },
  });

  return { test };
}

async function runUnsupportedProviderTest(providerId: string, environment: string, createdBy: string | null) {
  const test = await persistTest({
    providerId,
    environment,
    testType: 'capability_check',
    status: 'SKIPPED',
    readiness: 'NO_DATA',
    responseSummary: 'No live connection adapter is implemented for this provider yet.',
    errorCode: 'ADAPTER_NOT_IMPLEMENTED',
    errorMessage: null,
    createdBy,
    metadata: { provider: providerId },
  });
  return { test };
}

async function runRippleTest(providerId: string, environment: string, createdBy: string | null) {
  const endpoint = getEnv('XRPL_JSON_RPC_URL') || 'https://s.altnet.rippletest.net:51234';
  const started = Date.now();

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        method: 'server_info',
        params: [{}],
      }),
    });
    const responseTimeMs = Date.now() - started;
    const text = await response.text();
    let payload: Record<string, unknown> | null = null;
    try {
      payload = text ? JSON.parse(text) : null;
    } catch {
      payload = null;
    }

    const serverState =
      typeof payload?.result === 'object' && payload.result
        ? String((payload.result as Record<string, unknown>).info && typeof (payload.result as Record<string, unknown>).info === 'object'
          ? ((payload.result as Record<string, Record<string, unknown>>).info.server_state ?? 'unknown')
          : 'unknown')
        : 'unknown';
    const success = response.ok && Boolean(payload?.result);

    const test = await persistTest({
      providerId,
      environment,
      testType: 'xrpl_server_info',
      status: success ? 'SUCCESS' : 'FAILED',
      readiness: success ? 'LIVE' : 'DIAGNOSTIC',
      responseTimeMs,
      httpStatus: response.status,
      institutionCount: null,
      capabilityCount: success ? 1 : 0,
      responseSummary: success
        ? `XRPL testnet responded with server state ${serverState}.`
        : `XRPL testnet connectivity failed with HTTP ${response.status}.`,
      errorCode: success ? null : `HTTP_${response.status}`,
      errorMessage: success ? null : text.slice(0, 500),
      createdBy,
      metadata: {
        provider: 'ripple',
        endpoint: 'xrpl-testnet-json-rpc',
        serverState,
      },
    });
    return { test };
  } catch (error) {
    const test = await persistTest({
      providerId,
      environment,
      testType: 'xrpl_server_info',
      status: 'FAILED',
      readiness: 'DIAGNOSTIC',
      responseTimeMs: Date.now() - started,
      responseSummary: 'XRPL testnet connectivity failed before receiving a response.',
      errorCode: 'XRPL_CONNECTION_FAILED',
      errorMessage: error instanceof Error ? error.message : String(error),
      createdBy,
      metadata: { provider: 'ripple', endpoint: 'xrpl-testnet-json-rpc' },
    });
    return { test };
  }
}

async function airwallexAuthenticate(baseUrl: string) {
  const clientId = getEnv('AIRWALLEX_CLIENT_ID');
  const apiKey = getEnv('AIRWALLEX_API_KEY');

  if (!clientId || !apiKey) {
    throw new Error('MISSING_AIRWALLEX_CREDENTIALS');
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

  const text = await response.text();
  let payload: Record<string, unknown> | null = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = null;
  }

  const token = typeof payload?.token === 'string' ? payload.token : typeof payload?.access_token === 'string' ? payload.access_token : '';
  const expiresAt = typeof payload?.expires_at === 'string' ? payload.expires_at : null;

  return { response, token, expiresAt };
}

async function runAirwallexTest(providerId: string, environment: string, createdBy: string | null) {
  const baseUrl = getEnv('AIRWALLEX_BASE_URL') || 'https://api-demo.airwallex.com';
  const started = Date.now();

  try {
    const { response, token, expiresAt } = await airwallexAuthenticate(baseUrl);
    const authResponseTimeMs = Date.now() - started;

    if (!response.ok || !token) {
      const test = await persistTest({
        providerId,
        environment,
        testType: 'airwallex_read_only_connectivity',
        status: 'FAILED',
        readiness: 'DIAGNOSTIC',
        responseTimeMs: authResponseTimeMs,
        httpStatus: response.status,
        capabilityCount: 0,
        responseSummary: `Airwallex authentication failed with HTTP ${response.status}.`,
        errorCode: `HTTP_${response.status}`,
        errorMessage: 'Authentication failed. Response body omitted to avoid credential or account leakage.',
        createdBy,
        metadata: {
          provider: 'airwallex',
          environment,
          auth_status: response.status,
          base_url_configured: Boolean(baseUrl),
        },
      });
      return { test };
    }

    const capabilityStarted = Date.now();
    const capabilityResponse = await fetch(`${baseUrl.replace(/\/$/, '')}/api/v1/account_capabilities/funding_limits`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    const responseTimeMs = Date.now() - started;
    const capabilityText = await capabilityResponse.text();
    let capabilityPayload: Record<string, unknown> | null = null;
    try {
      capabilityPayload = capabilityText ? JSON.parse(capabilityText) : null;
    } catch {
      capabilityPayload = null;
    }
    const itemCount = Array.isArray(capabilityPayload?.items) ? capabilityPayload.items.length : null;
    const success = capabilityResponse.ok;

    const serviceClient = buildServiceClient();
    if (success) {
      await serviceClient
        .from('partner_capabilities')
        .update({
          readiness_status: 'Validated',
          provenance: 'LIVE',
          last_validated_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('provider_id', providerId)
        .eq('environment', environment)
        .in('capability_code', ['API_AUTHENTICATION', 'ACCOUNT_CAPABILITIES_READ']);
    }

    const test = await persistTest({
      providerId,
      environment,
      testType: 'airwallex_read_only_connectivity',
      status: success ? 'SUCCESS' : 'FAILED',
      readiness: success ? 'LIVE' : 'DIAGNOSTIC',
      responseTimeMs,
      httpStatus: capabilityResponse.status,
      capabilityCount: success ? 2 : 1,
      responseSummary: success
        ? `Airwallex authenticated and account capability read returned ${itemCount ?? 'available'} funding limit record(s).`
        : `Airwallex authenticated, but capability read failed with HTTP ${capabilityResponse.status}.`,
      errorCode: success ? null : `HTTP_${capabilityResponse.status}`,
      errorMessage: success ? null : capabilityText.slice(0, 300),
      createdBy,
      metadata: {
        provider: 'airwallex',
        endpoint: '/api/v1/account_capabilities/funding_limits',
        auth_token_present: true,
        token_expiry_present: Boolean(expiresAt),
        auth_response_time_ms: authResponseTimeMs,
        capability_response_time_ms: Date.now() - capabilityStarted,
      },
    });
    return { test };
  } catch (error) {
    const missingCredentials = error instanceof Error && error.message === 'MISSING_AIRWALLEX_CREDENTIALS';
    const test = await persistTest({
      providerId,
      environment,
      testType: 'airwallex_read_only_connectivity',
      status: 'FAILED',
      readiness: missingCredentials ? 'NO_DATA' : 'DIAGNOSTIC',
      responseTimeMs: Date.now() - started,
      responseSummary: missingCredentials
        ? 'Airwallex Supabase secrets are not configured.'
        : 'Airwallex read-only connectivity test failed before completion.',
      errorCode: missingCredentials ? 'MISSING_CREDENTIALS' : 'AIRWALLEX_CONNECTION_FAILED',
      errorMessage: missingCredentials
        ? 'Expected AIRWALLEX_CLIENT_ID and AIRWALLEX_API_KEY in Supabase Edge Function secrets.'
        : error instanceof Error ? error.message : String(error),
      createdBy,
      metadata: { provider: 'airwallex', endpoint: '/api/v1/authentication/login' },
    });
    return { test };
  }
}

async function runNiumTest(providerId: string, environment: string, createdBy: string | null) {
  const started = Date.now();
  try {
    const result = await fetchNiumCorridors({ size: 1 });
    const totalCorridors = Number(result.totalElements ?? 0);
    const payoutConfigured = niumPayoutConfigured();
    const config = niumConfig();
    const serviceClient = buildServiceClient();
    await serviceClient.from('partner_capabilities').update({
      readiness_status: 'Validated',
      provenance: 'SANDBOX',
      last_validated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('provider_id', providerId).eq('environment', environment)
      .in('capability_code', ['API_AUTHENTICATION', 'SUPPORTED_CORRIDORS_READ']);
    await serviceClient.from('partner_capabilities').update({
      readiness_status: payoutConfigured ? 'Testing' : 'Not configured',
      provenance: payoutConfigured ? 'DERIVED' : 'NO_DATA',
      updated_at: new Date().toISOString(),
    }).eq('provider_id', providerId).eq('environment', environment)
      .in('capability_code', ['BENEFICIARY_CREATION', 'PAYOUT_CREATION', 'PAYOUT_STATUS']);
    const test = await persistTest({
      providerId,
      environment,
      testType: 'nium_read_only_corridor_connectivity',
      status: 'SUCCESS',
      readiness: payoutConfigured ? 'SANDBOX' : 'PARTIAL',
      responseTimeMs: Date.now() - started,
      httpStatus: 200,
      capabilityCount: payoutConfigured ? 5 : 2,
      responseSummary: payoutConfigured
        ? `Nium authenticated and returned ${totalCorridors} sandbox corridor record(s); payout identifiers are configured.`
        : `Nium authenticated and returned ${totalCorridors} sandbox corridor record(s); customer and wallet identifiers are still required for payouts.`,
      createdBy,
      metadata: {
        provider: 'nium',
        endpoint: `/v3/client/${config.clientHashId ? '[configured]' : '[missing]'}/supportedCorridors`,
        total_corridors: totalCorridors,
        customer_configured: Boolean(config.customerHashId),
        wallet_configured: Boolean(config.walletHashId),
      },
    });
    return { test };
  } catch (error) {
    const providerError = error instanceof NiumApiError ? error : null;
    const test = await persistTest({
      providerId,
      environment,
      testType: 'nium_read_only_corridor_connectivity',
      status: 'FAILED',
      readiness: providerError?.providerCode === 'NIUM_CREDENTIALS_NOT_CONFIGURED' ? 'NO_DATA' : 'DIAGNOSTIC',
      responseTimeMs: Date.now() - started,
      httpStatus: providerError?.httpStatus ?? null,
      capabilityCount: 0,
      responseSummary: 'Nium read-only sandbox connectivity test failed.',
      errorCode: providerError?.providerCode ?? 'NIUM_CONNECTION_FAILED',
      errorMessage: providerError?.message ?? (error instanceof Error ? error.message : String(error)),
      createdBy,
      metadata: { provider: 'nium', endpoint: '/api/v3/client/[configured]/supportedCorridors' },
    });
    return { test };
  }
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return json({ error: 'Missing authorization header' }, 401);
    }

    const userClient = buildUserClient(authHeader);
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return json({ error: 'Unauthorized' }, 401);
    }

    const body = await req.json().catch(() => ({}));
    const providerId = String(body.providerId ?? '').trim().toLowerCase();
    const environment = String(body.environment ?? 'sandbox').trim().toLowerCase();

    if (!providerId) {
      return json({ error: 'providerId is required' }, 400);
    }

    if (!['development', 'sandbox', 'pilot', 'production'].includes(environment)) {
      return json({ error: 'Unsupported environment' }, 400);
    }

    if (providerId === 'yapily') {
      return json(await runYapilyTest(providerId, environment, user.id));
    }

    if (providerId === 'ripple') {
      return json(await runRippleTest(providerId, environment, user.id));
    }

    if (providerId === 'airwallex') {
      return json(await runAirwallexTest(providerId, environment, user.id));
    }

    if (providerId === 'nium') {
      return json(await runNiumTest(providerId, environment, user.id));
    }

    return json(await runUnsupportedProviderTest(providerId, environment, user.id));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return json({ error: message }, 500);
  }
});
