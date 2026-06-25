import { supabase } from "../lib/supabase";

export type PartnerStatus =
  | "Not Started"
  | "Researching"
  | "Contacted"
  | "Sandbox Requested"
  | "Sandbox Active"
  | "Testing"
  | "Pilot"
  | "Production"
  | "Paused";

export type PartnerProviderRecord = {
  id: string;
  providerName: string;
  providerCategory: string;
  partnerType?: string | null;
  environment?: string | null;
  sandboxUrl?: string | null;
  productionUrl?: string | null;
  supportedCountries: string[];
  lastSuccessfulTestAt?: string | null;
  readinessScore: number;
  website?: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
  status: PartnerStatus;
  sandboxEnabled: boolean;
  productionEnabled: boolean;
  apiConfigured: boolean;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PartnerCorridorRecord = {
  id: string;
  providerId: string;
  corridorName: string;
  sourceCountry: string;
  destinationCountry: string;
  sourceCurrency: string;
  destinationCurrency: string;
  status: string;
  sandboxReadiness: string;
  productionReadiness: string;
  notes?: string | null;
  updatedAt: string;
};

export type PartnerCredentialMetadataRecord = {
  id: string;
  providerId: string;
  environment: string;
  configured: boolean;
  credentialReference?: string | null;
  lastUpdated?: string | null;
  notes?: string | null;
};

export type PartnerConnectionStatusRecord = {
  id: string;
  providerId: string;
  environment: string;
  status: string;
  lastCheckedAt?: string | null;
  lastResult?: string | null;
};

export type PartnerCapabilityRecord = {
  id: string;
  providerId: string;
  capabilityCode: string;
  capabilityName: string;
  capabilityType: string;
  environment: string;
  enabled: boolean;
  readinessStatus: string;
  provenance: string;
  lastValidatedAt?: string | null;
  notes?: string | null;
};

export type PartnerSupportedCorridorRecord = {
  id: string;
  providerId: string;
  corridorCode: string;
  sourceCountry: string;
  destinationCountry: string;
  sourceCurrency: string;
  destinationCurrency: string;
  capabilityCode?: string | null;
  environment: string;
  readinessStatus: string;
  provenance: string;
  lastValidatedAt?: string | null;
  notes?: string | null;
};

export type PartnerConnectionTestRecord = {
  id: string;
  providerId: string;
  environment: string;
  testType: string;
  status: "SUCCESS" | "FAILED" | "SKIPPED";
  readiness: string;
  responseTimeMs?: number | null;
  httpStatus?: number | null;
  institutionCount?: number | null;
  capabilityCount?: number | null;
  responseSummary?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  testedAt: string;
};

export type PlatformAdministrationSnapshot = {
  providers: PartnerProviderRecord[];
  corridors: PartnerCorridorRecord[];
  credentials: PartnerCredentialMetadataRecord[];
  connections: PartnerConnectionStatusRecord[];
  capabilities: PartnerCapabilityRecord[];
  supportedCorridors: PartnerSupportedCorridorRecord[];
  connectionTests: PartnerConnectionTestRecord[];
};

const fallbackProviders: PartnerProviderRecord[] = [
  provider("thunes", "Thunes", "Payment Network", "Researching", false, false, false, "Global payout network candidate."),
  provider("tranglo", "Tranglo", "Payment Network", "Researching", false, false, false, "Candidate provider. No live NexusPay connectivity configured yet."),
  provider("nium", "Nium", "Payment Network", "Researching", false, false, false, "Candidate provider. No live NexusPay connectivity configured yet."),
  provider("yapily", "Yapily", "Open Banking", "Sandbox Active", true, false, true, "Open banking connectivity candidate."),
  provider("truelayer", "TrueLayer", "Open Banking", "Researching", false, false, false, "Open banking alternative under review."),
  provider("ripple", "Ripple", "Settlement Network", "Testing", true, false, true, "XRPL testnet connectivity candidate."),
  provider("coins-ph", "Coins.ph", "Wallet / Local Payout", "Contacted", false, false, false, "Philippines wallet and payout candidate."),
  provider("gcash", "GCash", "Wallet / Local Payout", "Researching", false, false, false, "Philippines wallet payout candidate."),
  provider("maya", "Maya", "Wallet / Local Payout", "Researching", false, false, false, "Philippines wallet payout candidate."),
];

const fallbackCorridors: PartnerCorridorRecord[] = [
  corridor("tranglo", "UK -> Philippines", "GBP", "PHP", "Sandbox Active", "Active", "Not Started"),
  corridor("nium", "UK -> Malaysia", "GBP", "MYR", "Testing", "Testing", "Not Started"),
  corridor("ripple", "UK -> XRPL Settlement", "GBP", "RLUSD", "Testing", "Testing", "Not Started"),
  corridor("coins-ph", "UK -> Philippines Wallet", "GBP", "PHP", "Contacted", "Not Started", "Not Started"),
  corridor("thunes", "UK -> Multi-market", "GBP", "MULTI", "Researching", "Not Started", "Not Started"),
];

function nowIso() {
  return new Date().toISOString();
}

function provider(
  id: string,
  providerName: string,
  providerCategory: string,
  status: PartnerStatus,
  sandboxEnabled: boolean,
  productionEnabled: boolean,
  apiConfigured: boolean,
  notes: string,
): PartnerProviderRecord {
  return {
    id,
    providerName,
    providerCategory,
    partnerType: providerCategory === "Open Banking" ? "first_leg" : "last_leg",
    environment: "sandbox",
    sandboxUrl: null,
    productionUrl: null,
    supportedCountries: [],
    lastSuccessfulTestAt: null,
    readinessScore: sandboxEnabled && apiConfigured ? 55 : sandboxEnabled ? 40 : 10,
    status,
    sandboxEnabled,
    productionEnabled,
    apiConfigured,
    notes,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
}

function corridor(
  providerId: string,
  corridorName: string,
  sourceCurrency: string,
  destinationCurrency: string,
  status: string,
  sandboxReadiness: string,
  productionReadiness: string,
): PartnerCorridorRecord {
  return {
    id: `${providerId}-${corridorName}`,
    providerId,
    corridorName,
    sourceCountry: "United Kingdom",
    destinationCountry: corridorName.replace("UK -> ", ""),
    sourceCurrency,
    destinationCurrency,
    status,
    sandboxReadiness,
    productionReadiness,
    updatedAt: nowIso(),
  };
}

function mapProvider(row: any): PartnerProviderRecord {
  return {
    id: String(row.id),
    providerName: String(row.provider_name),
    providerCategory: String(row.provider_category),
    partnerType: row.partner_type ? String(row.partner_type) : null,
    environment: row.environment ? String(row.environment) : null,
    sandboxUrl: row.sandbox_url ? String(row.sandbox_url) : null,
    productionUrl: row.production_url ? String(row.production_url) : null,
    supportedCountries: Array.isArray(row.supported_countries) ? row.supported_countries.map(String) : [],
    lastSuccessfulTestAt: row.last_successful_test_at ? String(row.last_successful_test_at) : null,
    readinessScore: Number(row.readiness_score ?? 0),
    website: row.website ? String(row.website) : null,
    contactName: row.contact_name ? String(row.contact_name) : null,
    contactEmail: row.contact_email ? String(row.contact_email) : null,
    status: String(row.status ?? "Not Started") as PartnerStatus,
    sandboxEnabled: Boolean(row.sandbox_enabled),
    productionEnabled: Boolean(row.production_enabled),
    apiConfigured: Boolean(row.api_configured),
    notes: row.notes ? String(row.notes) : null,
    createdAt: String(row.created_at ?? nowIso()),
    updatedAt: String(row.updated_at ?? nowIso()),
  };
}

function mapCorridor(row: any): PartnerCorridorRecord {
  return {
    id: String(row.id),
    providerId: String(row.provider_id),
    corridorName: String(row.corridor_name),
    sourceCountry: String(row.source_country),
    destinationCountry: String(row.destination_country),
    sourceCurrency: String(row.source_currency),
    destinationCurrency: String(row.destination_currency),
    status: String(row.status),
    sandboxReadiness: String(row.sandbox_readiness),
    productionReadiness: String(row.production_readiness),
    notes: row.notes ? String(row.notes) : null,
    updatedAt: String(row.updated_at ?? nowIso()),
  };
}

function mapCredential(row: any): PartnerCredentialMetadataRecord {
  return {
    id: String(row.id),
    providerId: String(row.provider_id),
    environment: String(row.environment),
    configured: Boolean(row.configured),
    credentialReference: row.credential_reference ? String(row.credential_reference) : null,
    lastUpdated: row.last_updated ? String(row.last_updated) : null,
    notes: row.notes ? String(row.notes) : null,
  };
}

function mapConnection(row: any): PartnerConnectionStatusRecord {
  return {
    id: String(row.id),
    providerId: String(row.provider_id),
    environment: String(row.environment),
    status: String(row.status),
    lastCheckedAt: row.last_checked_at ? String(row.last_checked_at) : null,
    lastResult: row.last_result ? String(row.last_result) : null,
  };
}

function mapCapability(row: any): PartnerCapabilityRecord {
  return {
    id: String(row.id),
    providerId: String(row.provider_id),
    capabilityCode: String(row.capability_code),
    capabilityName: String(row.capability_name),
    capabilityType: String(row.capability_type),
    environment: String(row.environment),
    enabled: Boolean(row.enabled),
    readinessStatus: String(row.readiness_status),
    provenance: String(row.provenance ?? "DERIVED"),
    lastValidatedAt: row.last_validated_at ? String(row.last_validated_at) : null,
    notes: row.notes ? String(row.notes) : null,
  };
}

function mapSupportedCorridor(row: any): PartnerSupportedCorridorRecord {
  return {
    id: String(row.id),
    providerId: String(row.provider_id),
    corridorCode: String(row.corridor_code),
    sourceCountry: String(row.source_country),
    destinationCountry: String(row.destination_country),
    sourceCurrency: String(row.source_currency),
    destinationCurrency: String(row.destination_currency),
    capabilityCode: row.capability_code ? String(row.capability_code) : null,
    environment: String(row.environment),
    readinessStatus: String(row.readiness_status),
    provenance: String(row.provenance ?? "DERIVED"),
    lastValidatedAt: row.last_validated_at ? String(row.last_validated_at) : null,
    notes: row.notes ? String(row.notes) : null,
  };
}

function mapConnectionTest(row: any): PartnerConnectionTestRecord {
  return {
    id: String(row.id),
    providerId: String(row.provider_id),
    environment: String(row.environment),
    testType: String(row.test_type),
    status: String(row.status) as PartnerConnectionTestRecord["status"],
    readiness: String(row.readiness),
    responseTimeMs: row.response_time_ms == null ? null : Number(row.response_time_ms),
    httpStatus: row.http_status == null ? null : Number(row.http_status),
    institutionCount: row.institution_count == null ? null : Number(row.institution_count),
    capabilityCount: row.capability_count == null ? null : Number(row.capability_count),
    responseSummary: row.response_summary ? String(row.response_summary) : null,
    errorCode: row.error_code ? String(row.error_code) : null,
    errorMessage: row.error_message ? String(row.error_message) : null,
    testedAt: String(row.tested_at ?? nowIso()),
  };
}

export async function loadPartnerProviders(): Promise<PartnerProviderRecord[]> {
  const { data, error } = await supabase.from("partner_providers").select("*").order("provider_name");
  if (error) {
    console.warn("partner providers unavailable", error.message);
    return fallbackProviders;
  }
  return (data ?? []).map(mapProvider);
}

export async function loadPartnerCorridors(): Promise<PartnerCorridorRecord[]> {
  const { data, error } = await supabase.from("partner_corridors").select("*").order("corridor_name");
  if (error) {
    console.warn("partner corridors unavailable", error.message);
    return fallbackCorridors;
  }
  return (data ?? []).map(mapCorridor);
}

export async function loadPartnerCredentialMetadata(): Promise<PartnerCredentialMetadataRecord[]> {
  const { data, error } = await supabase.from("partner_credentials_metadata").select("*").order("environment");
  if (error) {
    console.warn("partner credential metadata unavailable", error.message);
    return [];
  }
  return (data ?? []).map(mapCredential);
}

export async function loadPartnerConnectionStatus(): Promise<PartnerConnectionStatusRecord[]> {
  const { data, error } = await supabase.from("partner_connection_status").select("*").order("environment");
  if (error) {
    console.warn("partner connection status unavailable", error.message);
    return [];
  }
  return (data ?? []).map(mapConnection);
}

export async function loadPartnerCapabilities(): Promise<PartnerCapabilityRecord[]> {
  const { data, error } = await supabase.from("partner_capabilities").select("*").order("capability_name");
  if (error) {
    console.warn("partner capabilities unavailable", error.message);
    return [];
  }
  return (data ?? []).map(mapCapability);
}

export async function loadPartnerSupportedCorridors(): Promise<PartnerSupportedCorridorRecord[]> {
  const { data, error } = await supabase.from("partner_supported_corridors").select("*").order("corridor_code");
  if (error) {
    console.warn("partner supported corridors unavailable", error.message);
    return [];
  }
  return (data ?? []).map(mapSupportedCorridor);
}

export async function loadPartnerConnectionTests(limit = 20): Promise<PartnerConnectionTestRecord[]> {
  const { data, error } = await supabase
    .from("partner_connection_tests")
    .select("*")
    .order("tested_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.warn("partner connection tests unavailable", error.message);
    return [];
  }
  return (data ?? []).map(mapConnectionTest);
}

export async function runPartnerConnectionTest(providerId: string, environment = "sandbox"): Promise<PartnerConnectionTestRecord | null> {
  const { data, error } = await supabase.functions.invoke<{ test: unknown }>("nexuspay-test-partner-connection", {
    body: { providerId, environment },
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data?.test) {
    return null;
  }

  return mapConnectionTest(data.test);
}

export async function loadPlatformAdministrationSnapshot(): Promise<PlatformAdministrationSnapshot> {
  const [providers, corridors, credentials, connections, capabilities, supportedCorridors, connectionTests] = await Promise.all([
    loadPartnerProviders(),
    loadPartnerCorridors(),
    loadPartnerCredentialMetadata(),
    loadPartnerConnectionStatus(),
    loadPartnerCapabilities(),
    loadPartnerSupportedCorridors(),
    loadPartnerConnectionTests(),
  ]);

  return { providers, corridors, credentials, connections, capabilities, supportedCorridors, connectionTests };
}
