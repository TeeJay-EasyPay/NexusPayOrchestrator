import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Wallet, isValidClassicAddress } from "npm:xrpl@4.6.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RLUSD_CURRENCY = "524C555344000000000000000000000000000000";
const RLUSD_ISSUER = "rQhWct2fv4Vc4KRjRgMrxa8xPN9Zx9iLKV";
const DEFAULT_RPC_URL = "https://s.altnet.rippletest.net:51234";

type RpcEnvelope<T> = {
  result?: T & { error?: string; error_message?: string; status?: string };
};

type WalletEvidence = {
  address: string;
  xrpBalance: number;
  rlusdBalance: number;
  trustlineActive: boolean;
  ownerCount: number;
};

type PathQuote = {
  destinationAmountRlusd: number;
  sourceAmountXrp: number;
  xrpPerRlusd: number;
  paths: unknown[];
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function env(name: string) {
  return Deno.env.get(name)?.trim() ?? "";
}

function serviceClient() {
  return createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"));
}

function userClient(authHeader: string) {
  return createClient(env("SUPABASE_URL"), env("SUPABASE_ANON_KEY"), {
    global: { headers: { Authorization: authHeader } },
  });
}

async function rpc<T>(method: string, params: Record<string, unknown>) {
  const response = await fetch(env("XRPL_JSON_RPC_URL") || DEFAULT_RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ method, params: [params] }),
  });
  const payload = await response.json() as RpcEnvelope<T>;
  if (!response.ok || !payload.result || payload.result.error) {
    throw new Error(payload.result?.error_message || payload.result?.error || `XRPL ${method} failed with HTTP ${response.status}.`);
  }
  return payload.result;
}

function walletFromSecret(name: string) {
  const seed = env(name);
  if (!seed) throw new Error("XRPL Testnet wallet secrets are not configured.");
  const wallet = Wallet.fromSeed(seed);
  if (!isValidClassicAddress(wallet.address)) throw new Error("XRPL Testnet wallet configuration is invalid.");
  return wallet;
}

async function readWallet(address: string): Promise<WalletEvidence> {
  const [account, lines] = await Promise.all([
    rpc<{ account_data: { Balance: string; OwnerCount: number } }>("account_info", {
      account: address,
      ledger_index: "validated",
    }),
    rpc<{ lines: { account: string; currency: string; balance: string }[] }>("account_lines", {
      account: address,
      peer: RLUSD_ISSUER,
      ledger_index: "validated",
    }),
  ]);
  const line = lines.lines.find((candidate) =>
    candidate.account === RLUSD_ISSUER && candidate.currency === RLUSD_CURRENCY
  );
  return {
    address,
    xrpBalance: Number(account.account_data.Balance) / 1_000_000,
    rlusdBalance: Number(line?.balance ?? 0),
    trustlineActive: Boolean(line),
    ownerCount: account.account_data.OwnerCount,
  };
}

async function readPathQuote(sourceAddress: string, destinationAddress: string, amountRlusd: number): Promise<PathQuote> {
  const result = await rpc<{
    alternatives: { source_amount: string | { value?: string }; paths_computed?: unknown[] }[];
  }>("ripple_path_find", {
    source_account: sourceAddress,
    destination_account: destinationAddress,
    destination_amount: { currency: RLUSD_CURRENCY, issuer: RLUSD_ISSUER, value: normalizeAmount(amountRlusd) },
    source_currencies: [{ currency: "XRP" }],
  });
  const alternative = result.alternatives?.find((candidate) => typeof candidate.source_amount === "string");
  if (!alternative || typeof alternative.source_amount !== "string") {
    throw new Error("XRPL Testnet returned no executable XRP-to-RLUSD path.");
  }
  const sourceAmountXrp = Number(alternative.source_amount) / 1_000_000;
  return {
    destinationAmountRlusd: amountRlusd,
    sourceAmountXrp,
    xrpPerRlusd: sourceAmountXrp / amountRlusd,
    paths: alternative.paths_computed ?? [],
  };
}

async function readNetworkStatus(amountRlusd?: number) {
  const source = walletFromSecret("XRPL_TESTNET_SOURCE_SEED");
  const destination = walletFromSecret("XRPL_TESTNET_DESTINATION_SEED");
  const [sourceEvidence, destinationEvidence, feeResult, ledgerResult, serverState] = await Promise.all([
    readWallet(source.address),
    readWallet(destination.address),
    rpc<{ drops: { open_ledger_fee: string } }>("fee", {}),
    rpc<{ ledger_current_index: number }>("ledger_current", {}),
    rpc<{ state: { validated_ledger: { reserve_base: number; reserve_inc: number } } }>("server_state", {}),
  ]);
  const fetchedAt = new Date().toISOString();
  const networkFeeXrp = Number(feeResult.drops.open_ledger_fee) / 1_000_000;
  const ledgerIndex = ledgerResult.ledger_current_index;
  const reserveBaseXrp = Number(serverState.state.validated_ledger.reserve_base) / 1_000_000;
  const reserveIncrementXrp = Number(serverState.state.validated_ledger.reserve_inc) / 1_000_000;
  const sourceReserveXrp = reserveBaseXrp + sourceEvidence.ownerCount * reserveIncrementXrp;
  const spendableSourceXrp = Math.max(0, sourceEvidence.xrpBalance - sourceReserveXrp - networkFeeXrp);
  const pathQuote = amountRlusd
    ? await readPathQuote(sourceEvidence.address, destinationEvidence.address, amountRlusd).catch(() => null)
    : null;
  const db = serviceClient();
  await db.from("xrpl_testnet_wallets").upsert([
    {
      address: sourceEvidence.address,
      wallet_role: "SOURCE",
      network: "testnet",
      rlusd_issuer: RLUSD_ISSUER,
      xrp_balance: sourceEvidence.xrpBalance,
      rlusd_balance: sourceEvidence.rlusdBalance,
      trustline_active: sourceEvidence.trustlineActive,
      last_ledger_index: ledgerIndex,
      last_synced_at: fetchedAt,
      updated_at: fetchedAt,
    },
    {
      address: destinationEvidence.address,
      wallet_role: "DESTINATION",
      network: "testnet",
      rlusd_issuer: RLUSD_ISSUER,
      xrp_balance: destinationEvidence.xrpBalance,
      rlusd_balance: destinationEvidence.rlusdBalance,
      trustline_active: destinationEvidence.trustlineActive,
      last_ledger_index: ledgerIndex,
      last_synced_at: fetchedAt,
      updated_at: fetchedAt,
    },
  ], { onConflict: "address" });
  return {
    network: "XRPL Testnet",
    issuer: RLUSD_ISSUER,
    currencyCode: RLUSD_CURRENCY,
    source: sourceEvidence,
    destination: destinationEvidence,
    networkFeeXrp,
    reserveBaseXrp,
    reserveIncrementXrp,
    sourceReserveXrp,
    spendableSourceXrp,
    pathQuote: pathQuote
      ? {
          destinationAmountRlusd: pathQuote.destinationAmountRlusd,
          sourceAmountXrp: pathQuote.sourceAmountXrp,
          xrpPerRlusd: pathQuote.xrpPerRlusd,
          sufficientSourceXrp: pathQuote.sourceAmountXrp * 1.01 <= spendableSourceXrp,
        }
      : null,
    ledgerIndex,
    fetchedAt,
    provenance: "TESTNET",
    evidenceSource: "XRPL Testnet JSON-RPC",
  };
}

function normalizeAmount(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 100_000) {
    throw new Error("A valid positive RLUSD Testnet amount is required.");
  }
  return parsed.toFixed(6).replace(/\.?0+$/, "");
}

async function waitForValidation(txHash: string) {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    try {
      const result = await rpc<Record<string, unknown> & {
        validated?: boolean;
        ledger_index?: number;
        meta?: { TransactionResult?: string } | string;
      }>("tx", { transaction: txHash, binary: false });
      if (result.validated) {
        const transactionResult = typeof result.meta === "object"
          ? result.meta?.TransactionResult ?? "unknown"
          : "unknown";
        return { validated: true, ledgerIndex: result.ledger_index ?? null, transactionResult };
      }
    } catch {
      // The transaction is commonly unavailable until the next validated ledger.
    }
    await new Promise((resolve) => setTimeout(resolve, 1_500));
  }
  return { validated: false, ledgerIndex: null, transactionResult: "unknown" };
}

async function executeTransfer(input: Record<string, unknown>, userId: string) {
  const transferId = String(input.transferId ?? "");
  const routePlanId = String(input.routePlanId ?? "");
  const amount = normalizeAmount(input.amountRlusd);
  const db = serviceClient();
  const { data: plan, error: planError } = await db
    .from("route_plans")
    .select("id,user_id,transfer_id,status,eligible,plan")
    .eq("id", routePlanId)
    .eq("transfer_id", transferId)
    .eq("user_id", userId)
    .single();
  if (planError || !plan || !plan.eligible || !["APPROVED", "EXECUTING"].includes(plan.status)) {
    throw new Error("The approved XRPL Route Plan could not be verified.");
  }
  const bridge = (plan.plan as { bridge?: { asset?: { value?: string }; provider?: { providerId?: string } } })?.bridge;
  if (bridge?.asset?.value !== "RLUSD" || bridge?.provider?.providerId !== "ripple") {
    throw new Error("The approved Route Plan is not an RLUSD Testnet route.");
  }

  const idempotencyKey = `${transferId}:${routePlanId}:xrpl-rlusd-v1`;
  const { data: existing } = await db
    .from("xrpl_testnet_transactions")
    .select("*")
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();
  if (existing?.canonical_status === "VALIDATED") return existing;
  if (["SUBMITTED", "UNKNOWN"].includes(existing?.canonical_status) && existing?.tx_hash) {
    const reconciled = await waitForValidation(existing.tx_hash);
    if (reconciled.validated) {
      const validatedAt = new Date().toISOString();
      const { data } = await db.from("xrpl_testnet_transactions").update({
        canonical_status: reconciled.transactionResult === "tesSUCCESS" ? "VALIDATED" : "FAILED",
        validated: reconciled.transactionResult === "tesSUCCESS",
        engine_result: reconciled.transactionResult,
        ledger_index: reconciled.ledgerIndex,
        validated_at: validatedAt,
        updated_at: validatedAt,
      }).eq("id", existing.id).select("*").single();
      return data;
    }
    return existing;
  }
  if (existing) {
    throw new Error(
      `The existing XRPL Testnet attempt is ${existing.canonical_status}. A new approved Route Plan is required before another submission.`,
    );
  }

  const source = walletFromSecret("XRPL_TESTNET_SOURCE_SEED");
  const destination = walletFromSecret("XRPL_TESTNET_DESTINATION_SEED");
  const status = await readNetworkStatus(Number(amount));
  if (!status.source.trustlineActive || !status.destination.trustlineActive) {
    throw new Error("Both backend wallets must have an active RLUSD Testnet trustline.");
  }
  if (!status.pathQuote) {
    throw new Error("XRPL Testnet returned no executable XRP-to-RLUSD path for this amount.");
  }
  if (!status.pathQuote.sufficientSourceXrp) {
    throw new Error(`Insufficient spendable XRP for the Testnet path. Available: ${status.spendableSourceXrp.toFixed(6)} XRP.`);
  }

  const account = await rpc<{ account_data: { Sequence: number } }>("account_info", {
    account: source.address,
    ledger_index: "validated",
  });
  const feeDrops = String(Math.max(12, Math.ceil(status.networkFeeXrp * 1_000_000)));
  const freshPath = await readPathQuote(source.address, destination.address, Number(amount));
  const sendMaxDrops = String(Math.ceil(freshPath.sourceAmountXrp * 1_000_000 * 1.01));
  const prepared = {
    TransactionType: "Payment" as const,
    Account: source.address,
    Destination: destination.address,
    Amount: { currency: RLUSD_CURRENCY, issuer: RLUSD_ISSUER, value: amount },
    SendMax: sendMaxDrops,
    ...(freshPath.paths.length > 0 ? { Paths: freshPath.paths } : {}),
    Fee: feeDrops,
    Sequence: account.account_data.Sequence,
    LastLedgerSequence: status.ledgerIndex + 20,
  };
  const signed = source.sign(prepared);
  const now = new Date().toISOString();
  const { data: record, error: insertError } = await db.from("xrpl_testnet_transactions").insert({
    user_id: userId,
    transfer_id: transferId,
    route_plan_id: routePlanId,
    idempotency_key: idempotencyKey,
    tx_hash: signed.hash,
    source_address: source.address,
    destination_address: destination.address,
    asset: "RLUSD",
    amount_rlusd: amount,
    network_fee_xrp: Number(feeDrops) / 1_000_000,
    canonical_status: "PREPARED",
    evidence: {
      provenance: "TESTNET",
      source: "XRPL Testnet JSON-RPC ripple_path_find",
      quoted_source_xrp: freshPath.sourceAmountXrp,
      send_max_xrp: Number(sendMaxDrops) / 1_000_000,
      destination_rlusd: Number(amount),
    },
    updated_at: now,
  }).select("*").single();
  if (insertError) throw insertError;

  try {
    const submitted = await rpc<{ engine_result: string; engine_result_message?: string }>("submit", {
      tx_blob: signed.tx_blob,
      fail_hard: true,
    });
    const submittedAt = new Date().toISOString();
    await db.from("xrpl_testnet_transactions").update({
      canonical_status: "SUBMITTED",
      engine_result: submitted.engine_result,
      submitted_at: submittedAt,
      updated_at: submittedAt,
    }).eq("id", record.id);
    if (!["tesSUCCESS", "terQUEUED"].includes(submitted.engine_result)) {
      throw new Error(submitted.engine_result_message || submitted.engine_result);
    }
    const validation = await waitForValidation(signed.hash);
    const terminalAt = new Date().toISOString();
    const successful = validation.validated && validation.transactionResult === "tesSUCCESS";
    const { data } = await db.from("xrpl_testnet_transactions").update({
      canonical_status: validation.validated ? (successful ? "VALIDATED" : "FAILED") : "UNKNOWN",
      validated: successful,
      engine_result: validation.transactionResult === "unknown" ? submitted.engine_result : validation.transactionResult,
      ledger_index: validation.ledgerIndex,
      validated_at: successful ? terminalAt : null,
      failure_reason: validation.validated && !successful ? validation.transactionResult : null,
      updated_at: terminalAt,
    }).eq("id", record.id).select("*").single();
    await readNetworkStatus();
    return data;
  } catch (error) {
    const failedAt = new Date().toISOString();
    const submittedHashExists = Boolean(signed.hash);
    await db.from("xrpl_testnet_transactions").update({
      canonical_status: submittedHashExists ? "UNKNOWN" : "FAILED",
      failure_reason: error instanceof Error ? error.message : "XRPL submission failed.",
      updated_at: failedAt,
    }).eq("id", record.id);
    throw error;
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) return json({ error: "Authentication required." }, 401);
    const { data: { user }, error } = await userClient(authHeader).auth.getUser();
    if (error || !user) return json({ error: "Authentication required." }, 401);
    const body = await req.json().catch(() => ({})) as Record<string, unknown>;
    const operation = String(body.operation ?? "status");
    if (operation === "status") {
      const amountRlusd = Number(body.amountRlusd);
      return json({ status: await readNetworkStatus(Number.isFinite(amountRlusd) && amountRlusd > 0 ? amountRlusd : undefined) });
    }
    if (operation === "execute") return json({ transaction: await executeTransfer(body, user.id) });
    return json({ error: "Unsupported XRPL Testnet operation." }, 400);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "XRPL Testnet operation failed." }, 400);
  }
});
