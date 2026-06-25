/**
 * Supabase Edge Function - nexuspay-open-banking-payment-flow
 *
 * Starts the Open Banking Payment Flow V1 evidence trail.
 * Yapily credentials remain server-side in Supabase Edge Function secrets.
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type FlowStepInput = {
  stepKey: string;
  label: string;
  status: 'PENDING' | 'DONE' | 'FAILED';
  provider?: string;
  provenance: 'LIVE' | 'SANDBOX' | 'DERIVED' | 'FALLBACK' | 'NO_DATA';
  sequence: number;
  responseTimeMs?: number | null;
  httpStatus?: number | null;
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
  return createClient(getEnv('SUPABASE_URL'), getEnv('SUPABASE_SERVICE_ROLE_KEY'));
}

function buildUserClient(authHeader: string) {
  return createClient(getEnv('SUPABASE_URL'), getEnv('SUPABASE_ANON_KEY'), {
    global: { headers: { Authorization: authHeader } },
  });
}

function countInstitutions(payload: unknown) {
  if (Array.isArray(payload)) return payload.length;
  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>;
    if (Array.isArray(record.data)) return record.data.length;
    if (Array.isArray(record.institutions)) return record.institutions.length;
  }
  return 0;
}

function findFirstInstitution(payload: unknown) {
  if (Array.isArray(payload)) return payload[0] as Record<string, unknown> | undefined;
  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>;
    const collection = Array.isArray(record.data)
      ? record.data
      : Array.isArray(record.institutions)
        ? record.institutions
        : [];
    return collection[0] as Record<string, unknown> | undefined;
  }
  return undefined;
}

function getInstitutionField(institution: Record<string, unknown> | undefined, keys: string[]) {
  if (!institution) return '';
  for (const key of keys) {
    const value = institution[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

function makeReference(prefix: string) {
  return `${prefix}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}

async function startFlow(userId: string, body: Record<string, unknown>) {
  const transferId = String(body.transferId ?? '').trim();
  const amount = Number(body.amount ?? 0);
  const currency = String(body.currency ?? 'GBP').trim().toUpperCase() || 'GBP';
  const fundingReference = String(body.fundingReference ?? '').trim() || null;
  const selectedInstitutionId = String(body.institutionId ?? '').trim();
  const applicationUuid = getEnv('YAPILY_APPLICATION_UUID') || getEnv('YAPILY_APPLICATION_ID');
  const applicationSecret = getEnv('YAPILY_APPLICATION_SECRET');
  const baseUrl = getEnv('YAPILY_BASE_URL') || 'https://api.yapily.com';

  if (!transferId) {
    return json({ error: 'transferId is required' }, 400);
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    return json({ error: 'amount must be greater than zero' }, 400);
  }

  const steps: FlowStepInput[] = [];
  let institutionCount = 0;
  let institutionId = selectedInstitutionId;
  let institutionName = '';
  let discoveryHttpStatus: number | null = null;
  let discoveryResponseTimeMs: number | null = null;
  let discoveryError: string | null = null;

  steps.push({
    stepKey: 'provider_selected',
    label: 'Yapily selected as open banking provider',
    status: 'DONE',
    provider: 'Yapily',
    provenance: 'DERIVED',
    sequence: 1,
    metadata: { provider_id: 'yapily', environment: 'sandbox' },
  });

  if (!applicationUuid || !applicationSecret) {
    steps.push({
      stepKey: 'credentials_loaded',
      label: 'Yapily credential metadata unavailable',
      status: 'FAILED',
      provider: 'Yapily',
      provenance: 'NO_DATA',
      sequence: 2,
      metadata: { configured: false },
    });
    return json({
      error: 'Yapily Supabase secrets are not configured.',
      steps,
    }, 500);
  }

  steps.push({
    stepKey: 'credentials_loaded',
    label: 'Yapily credentials loaded from Supabase secrets',
    status: 'DONE',
    provider: 'Yapily',
    provenance: 'LIVE',
    sequence: 2,
    metadata: { configured: true, secret_values_exposed: false },
  });

  try {
    const started = Date.now();
    const response = await fetch(`${baseUrl.replace(/\/$/, '')}/institutions?countries=GB`, {
      method: 'GET',
      headers: {
        Authorization: `Basic ${btoa(`${applicationUuid}:${applicationSecret}`)}`,
        Accept: 'application/json',
      },
    });
    discoveryResponseTimeMs = Date.now() - started;
    discoveryHttpStatus = response.status;
    const text = await response.text();
    let payload: unknown = null;
    try {
      payload = text ? JSON.parse(text) : null;
    } catch {
      payload = null;
    }

    institutionCount = countInstitutions(payload);
    const firstInstitution = findFirstInstitution(payload);
    institutionId =
      institutionId ||
      getInstitutionField(firstInstitution, ['id', 'institutionId', 'institution_id']) ||
      'yapily-sandbox-uk-bank';
    institutionName =
      getInstitutionField(firstInstitution, ['name', 'fullName', 'displayName']) ||
      'Yapily Sandbox UK Bank';

    steps.push({
      stepKey: 'institution_discovery',
      label: response.ok
        ? 'Yapily institution discovery completed'
        : 'Yapily institution discovery returned an error',
      status: response.ok ? 'DONE' : 'FAILED',
      provider: 'Yapily',
      provenance: response.ok ? 'LIVE' : 'NO_DATA',
      sequence: 3,
      responseTimeMs: discoveryResponseTimeMs,
      httpStatus: discoveryHttpStatus,
      metadata: {
        endpoint: '/institutions',
        countries: ['GB'],
        institution_count: institutionCount,
      },
    });

    if (!response.ok) {
      discoveryError = text.slice(0, 500);
    }
  } catch (error) {
    discoveryError = error instanceof Error ? error.message : String(error);
    steps.push({
      stepKey: 'institution_discovery',
      label: 'Yapily institution discovery failed before response',
      status: 'FAILED',
      provider: 'Yapily',
      provenance: 'NO_DATA',
      sequence: 3,
      responseTimeMs: discoveryResponseTimeMs,
      httpStatus: discoveryHttpStatus,
      metadata: { error: discoveryError },
    });
  }

  if (discoveryError) {
    return json({ error: 'Yapily institution discovery failed.', details: discoveryError, steps }, 502);
  }

  const institutionProvenance = institutionCount > 0 ? 'LIVE' : 'SANDBOX';
  const paymentRequestId = makeReference('YAPILY-PAYMENT');
  const consentId = makeReference('YAPILY-CONSENT');
  const authorizationUrl = `nexuspay://sandbox/open-banking/yapily/${paymentRequestId}`;
  const now = new Date().toISOString();

  steps.push({
    stepKey: 'institution_selected',
    label: institutionCount > 0
      ? 'Yapily institution selected from live discovery'
      : 'Sandbox institution selected because Yapily returned no institution records',
    status: 'DONE',
    provider: 'Yapily',
    provenance: institutionProvenance,
    sequence: 4,
    metadata: {
      institution_id: institutionId,
      institution_name: institutionName,
      institution_count: institutionCount,
    },
  });

  steps.push({
    stepKey: 'payment_authorization_prepared',
    label: 'Sandbox open banking payment authorisation prepared',
    status: 'DONE',
    provider: 'Yapily',
    provenance: 'SANDBOX',
    sequence: 5,
    metadata: {
      payment_request_id: paymentRequestId,
      amount,
      currency,
      funding_reference: fundingReference,
      production_payment_submitted: false,
    },
  });

  steps.push({
    stepKey: 'consent_reference_created',
    label: 'Sandbox consent reference created',
    status: 'DONE',
    provider: 'Yapily',
    provenance: 'SANDBOX',
    sequence: 6,
    metadata: { consent_id: consentId, authorization_url: authorizationUrl },
  });

  steps.push({
    stepKey: 'ready_for_execution',
    label: 'Open banking funding marked ready for NexusPay execution',
    status: 'DONE',
    provider: 'Yapily',
    provenance: 'SANDBOX',
    sequence: 7,
    metadata: { transfer_id: transferId, funding_ready: true },
  });

  const serviceClient = buildServiceClient();
  const { data: flow, error: flowError } = await serviceClient
    .from('open_banking_payment_flows')
    .insert({
      transfer_id: transferId,
      user_id: userId,
      provider_id: 'yapily',
      environment: 'sandbox',
      institution_id: institutionId,
      institution_name: institutionName,
      payment_request_id: paymentRequestId,
      consent_id: consentId,
      authorization_url: authorizationUrl,
      status: 'READY_FOR_EXECUTION',
      amount,
      currency,
      funding_reference: fundingReference,
      provenance: 'SANDBOX',
      updated_at: now,
    })
    .select('*')
    .single();

  if (flowError) {
    throw flowError;
  }

  const stepRows = steps.map((step) => ({
    flow_id: flow.id,
    transfer_id: transferId,
    user_id: userId,
    step_key: step.stepKey,
    label: step.label,
    status: step.status,
    provider: step.provider ?? 'Yapily',
    provenance: step.provenance,
    sequence: step.sequence,
    response_time_ms: step.responseTimeMs ?? null,
    http_status: step.httpStatus ?? null,
    metadata: step.metadata ?? {},
  }));

  const { data: persistedSteps, error: stepError } = await serviceClient
    .from('open_banking_payment_flow_steps')
    .insert(stepRows)
    .select('*')
    .order('sequence', { ascending: true });

  if (stepError) {
    throw stepError;
  }

  await serviceClient
    .from('transfers')
    .update({
      open_banking_flow_id: flow.id,
      open_banking_provider: 'yapily',
      open_banking_status: 'READY_FOR_EXECUTION',
      updated_at: now,
    })
    .eq('id', transferId)
    .eq('user_id', userId);

  return json({ flow, steps: persistedSteps ?? [] });
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
    const action = String(body.action ?? 'start').trim().toLowerCase();
    if (action !== 'start') {
      return json({ error: 'Unsupported open banking flow action' }, 400);
    }

    return await startFlow(user.id, body);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return json({ error: message }, 500);
  }
});
