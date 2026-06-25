/**
 * Supabase Edge Function - nexuspay-test-partner-connection
 *
 * Runs lightweight partner connectivity tests from the backend boundary.
 * Secrets are read only from Supabase Edge Function secrets.
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
  const success = response.ok;
  const test = await persistTest({
    providerId,
    environment,
    testType: 'institution_discovery',
    status: success ? 'SUCCESS' : 'FAILED',
    readiness: success ? 'LIVE' : 'DIAGNOSTIC',
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

    return json(await runUnsupportedProviderTest(providerId, environment, user.id));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return json({ error: message }, 500);
  }
});
