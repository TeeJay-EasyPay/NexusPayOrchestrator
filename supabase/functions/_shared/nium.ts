export type NiumCanonicalStatus = 'NOT_STARTED' | 'INITIATED' | 'PROCESSING' | 'PAID_OUT' | 'FAILED';

export type NiumConfig = {
  baseUrl: string;
  clientHashId: string;
  apiKey: string;
  customerHashId: string;
  walletHashId: string;
};

export class NiumApiError extends Error {
  constructor(
    public readonly operation: string,
    public readonly httpStatus: number,
    public readonly providerCode: string,
    public readonly field: string | null,
    public readonly action: string | null,
    public readonly pattern: string | null,
    message: string,
  ) {
    super(message);
    this.name = 'NiumApiError';
  }

  get retryable() {
    return this.httpStatus === 408 || this.httpStatus === 429 || this.httpStatus >= 500;
  }
}

export function niumConfig(): NiumConfig {
  return {
    baseUrl: (Deno.env.get('NIUM_BASE_URL') || 'https://gateway.nium.com/api').replace(/\/$/, ''),
    clientHashId: Deno.env.get('NIUM_CLIENT_ID')?.trim() ?? '',
    apiKey: Deno.env.get('NIUM_API_KEY')?.trim() ?? '',
    customerHashId: Deno.env.get('NIUM_CUSTOMER_HASH_ID')?.trim() ?? '',
    walletHashId: Deno.env.get('NIUM_WALLET_HASH_ID')?.trim() ?? '',
  };
}

export function assertNiumConnectionConfig(config = niumConfig()) {
  if (!config.clientHashId || !config.apiKey) {
    throw new NiumApiError(
      'configuration',
      503,
      'NIUM_CREDENTIALS_NOT_CONFIGURED',
      null,
      'Configure NIUM_CLIENT_ID and NIUM_API_KEY as Supabase Edge Function secrets.',
      null,
      'Nium sandbox credentials are not configured.',
    );
  }
  return config;
}

export function assertNiumPayoutConfig(config = assertNiumConnectionConfig()) {
  if (!config.customerHashId || !config.walletHashId) {
    throw new NiumApiError(
      'configuration',
      409,
      'NIUM_CUSTOMER_WALLET_NOT_CONFIGURED',
      null,
      'Onboard a sandbox customer, fund its wallet, then configure NIUM_CUSTOMER_HASH_ID and NIUM_WALLET_HASH_ID.',
      null,
      'Nium connectivity is available, but its sandbox customer and wallet are not configured for payouts.',
    );
  }
  return config;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function firstText(...values: unknown[]) {
  return values.find((value) => typeof value === 'string' && value.trim()) as string | undefined;
}

export async function niumRequest<T = Record<string, unknown>>(
  path: string,
  operation: string,
  init: RequestInit = {},
  config = assertNiumConnectionConfig(),
): Promise<T> {
  const response = await fetch(`${config.baseUrl}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey,
      ...(init.headers ?? {}),
    },
  });
  const raw = await response.text();
  let payload: unknown = {};
  try {
    payload = raw ? JSON.parse(raw) : {};
  } catch {
    payload = {};
  }
  if (!response.ok) {
    const record = asRecord(payload);
    const nested = Array.isArray(record.errors) ? asRecord(record.errors[0]) : {};
    throw new NiumApiError(
      operation,
      response.status,
      firstText(record.code, record.status, nested.code) ?? `HTTP_${response.status}`,
      firstText(record.field, nested.field) ?? null,
      firstText(record.action, nested.action) ?? null,
      firstText(record.regexp, nested.regexp) ?? null,
      firstText(record.description, record.message, nested.description, nested.message) ?? 'Nium sandbox request failed.',
    );
  }
  return payload as T;
}

export function niumCountryCode(country: string) {
  const countries: Record<string, string> = {
    Philippines: 'PH', Malaysia: 'MY', Singapore: 'SG', UAE: 'AE',
    'United Arab Emirates': 'AE',
    'Saudi Arabia': 'SA', Qatar: 'QA', Kuwait: 'KW', Bahrain: 'BH',
    Oman: 'OM', Thailand: 'TH', Indonesia: 'ID', Vietnam: 'VN',
    'United Kingdom': 'GB',
  };
  return countries[country] ?? country.slice(0, 2).toUpperCase();
}

export async function fetchNiumCorridors(input: {
  destinationCountry?: string;
  destinationCurrency?: string;
  payoutMethod?: string;
  beneficiaryAccountType?: string;
  size?: number;
}) {
  const config = assertNiumConnectionConfig();
  const params = new URLSearchParams({ size: String(input.size ?? 100) });
  if (input.destinationCountry) params.set('destinationCountry', input.destinationCountry);
  if (input.destinationCurrency) params.set('destinationCurrency', input.destinationCurrency);
  if (input.payoutMethod) params.set('payoutMethod', input.payoutMethod);
  if (input.beneficiaryAccountType) params.set('beneficiaryAccountType', input.beneficiaryAccountType);
  return niumRequest<{
    content?: Record<string, unknown>[];
    totalElements?: number;
    totalPages?: number;
  }>(`/v3/client/${encodeURIComponent(config.clientHashId)}/supportedCorridors?${params}`, 'supported_corridors', {}, config);
}

export async function fetchNiumFxQuote(sourceCurrency: string, destinationCurrency: string) {
  const params = new URLSearchParams({
    sourceCurrencyCode: sourceCurrency,
    destinationCurrencyCode: destinationCurrency,
  });
  return niumRequest<Record<string, unknown>>(`/v2/exchangeRate?${params}`, 'exchange_rate');
}

export function mapNiumStatus(status: unknown): NiumCanonicalStatus {
  const normalized = String(status ?? '').toUpperCase().replace(/\s+/g, '_');
  if (normalized === 'PAID') return 'PAID_OUT';
  if (['REJECTED', 'RETURN', 'RETURNED', 'ERROR', 'ERROR1', 'EXPIRED', 'CANCELLED'].includes(normalized)) return 'FAILED';
  if (['INITIATED', 'SCHEDULED'].includes(normalized)) return 'INITIATED';
  if (normalized) return 'PROCESSING';
  return 'NOT_STARTED';
}

export function niumPayoutConfigured() {
  const config = niumConfig();
  return Boolean(config.clientHashId && config.apiKey && config.customerHashId && config.walletHashId);
}
