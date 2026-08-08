import { supabase } from "../lib/supabase";

export type CryptoJourneyType = "FIAT_TO_CRYPTO" | "CRYPTO_TO_FIAT" | "CRYPTO_TO_CRYPTO";
export type CryptoCapability = {
  id: string;
  provider_code: string;
  environment: "sandbox" | "testnet" | "production";
  journey_type: CryptoJourneyType;
  source_assets: string[];
  destination_assets: string[];
  networks: string[];
  custody_model: "NON_CUSTODIAL" | "PROVIDER_CUSTODIAL" | "PLATFORM_TEST_WALLETS";
  status: "AVAILABLE" | "UNAVAILABLE" | "DISABLED";
  configured: boolean;
  evidence_source: string | null;
  evidence_checked_at: string | null;
  provenance: "LIVE" | "SANDBOX" | "TESTNET" | "UNAVAILABLE";
};

async function edgeError(error: unknown) {
  if (error && typeof error === "object" && "context" in error) {
    const context = (error as { context?: Response }).context;
    const payload = await context?.clone().json().catch(() => null) as { error?: string } | null;
    if (payload?.error) return payload.error;
  }
  return error instanceof Error ? error.message : "Crypto orchestration capability is unavailable.";
}

export async function loadCryptoCapabilities() {
  const { data, error } = await supabase.functions.invoke<{ capabilities: CryptoCapability[]; checkedAt: string }>(
    "nexuspay-crypto-fiat-orchestration",
    { body: { operation: "capabilities" } }
  );
  if (error || !data) throw new Error(await edgeError(error));
  return data;
}
