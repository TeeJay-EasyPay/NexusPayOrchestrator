import { supabase } from "../lib/supabase";

export const RLUSD_TESTNET_ISSUER = "rQhWct2fv4Vc4KRjRgMrxa8xPN9Zx9iLKV";

export type XrplTestnetWalletEvidence = {
  address: string;
  xrpBalance: number;
  rlusdBalance: number;
  trustlineActive: boolean;
  ownerCount: number;
};

export type XrplTestnetStatus = {
  network: "XRPL Testnet";
  issuer: string;
  currencyCode: string;
  source: XrplTestnetWalletEvidence;
  destination: XrplTestnetWalletEvidence;
  networkFeeXrp: number;
  reserveBaseXrp: number;
  reserveIncrementXrp: number;
  sourceReserveXrp: number;
  spendableSourceXrp: number;
  pathQuote: {
    destinationAmountRlusd: number;
    sourceAmountXrp: number;
    xrpPerRlusd: number;
    sufficientSourceXrp: boolean;
  } | null;
  ledgerIndex: number;
  fetchedAt: string;
  provenance: "TESTNET";
  evidenceSource: string;
};

type XrplTransactionRecord = {
  tx_hash: string;
  source_address: string;
  destination_address: string;
  amount_rlusd: number;
  network_fee_xrp: number;
  ledger_index: number;
  engine_result: string;
  canonical_status: "PREPARED" | "SUBMITTED" | "VALIDATED" | "FAILED" | "UNKNOWN";
  validated: boolean;
};

function message(error: unknown) {
  if (error && typeof error === "object" && "message" in error) return String(error.message);
  return "XRPL Testnet service is unavailable.";
}

async function functionErrorMessage(error: unknown) {
  if (error && typeof error === "object" && "context" in error) {
    const context = (error as { context?: Response }).context;
    if (context && typeof context.clone === "function") {
      const payload = await context.clone().json().catch(() => null) as { error?: string } | null;
      if (payload?.error) return payload.error;
    }
  }
  return message(error);
}

export async function getXrplTestnetStatus(amountRlusd?: number) {
  const { data, error } = await supabase.functions.invoke<{ status: XrplTestnetStatus }>("nexuspay-xrpl-testnet", {
    body: { operation: "status", ...(amountRlusd ? { amountRlusd } : {}) },
  });
  if (error || !data?.status) throw new Error(await functionErrorMessage(error));
  return data.status;
}

export async function executeXrplTestnetRlusdTransfer(input: {
  transferId: string;
  routePlanId: string;
  amountRlusd: number;
}) {
  const { data, error } = await supabase.functions.invoke<{ transaction: XrplTransactionRecord }>("nexuspay-xrpl-testnet", {
    body: { operation: "execute", ...input },
  });
  if (error || !data?.transaction) throw new Error(await functionErrorMessage(error));
  return data.transaction;
}
