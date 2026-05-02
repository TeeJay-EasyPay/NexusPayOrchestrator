import * as SecureStore from "expo-secure-store";
import * as xrpl from "xrpl";

import { getXrplClient } from "./xrplClient";

const WALLET_KEY = "nexuspay_test_wallet";

export const RLUSD_DISPLAY_CODE = "RLUSD";

export const RLUSD_CURRENCY_CODE =
  "524C555344000000000000000000000000000000";

export const RLUSD_TESTNET_ISSUER =
  process.env.EXPO_PUBLIC_RLUSD_ISSUER ??
  "rQhWct2fv4Vc4KRjRgMrxa8xPN9Zx9iLKV";

function isValidXrplAddress(address: string) {
  return xrpl.isValidClassicAddress(address);
}

export async function getOrCreateWallet() {
  const existingSeed = await SecureStore.getItemAsync(WALLET_KEY);

  if (existingSeed) {
    return xrpl.Wallet.fromSeed(existingSeed);
  }

  const client = await getXrplClient();
  const fundResult = await client.fundWallet();
  const wallet = fundResult.wallet;

  await SecureStore.setItemAsync(WALLET_KEY, wallet.seed!);

  return wallet;
}

export async function getXrplTestnetXrpBalance(address: string): Promise<number> {
  if (!address || !isValidXrplAddress(address)) {
    return 0;
  }

  const client = await getXrplClient();

  try {
    const response = await client.request({
      command: "account_info",
      account: address,
      ledger_index: "validated",
    });

    const drops = response.result.account_data.Balance;

    return Number(xrpl.dropsToXrp(drops));
  } catch (error) {
    console.error("Failed to fetch XRPL XRP balance", error);
    return 0;
  }
}

export async function getXrplTestnetRlusdBalance(
  address: string
): Promise<number> {
  if (!address || !isValidXrplAddress(address)) {
    return 0;
  }

  if (!isValidXrplAddress(RLUSD_TESTNET_ISSUER)) {
    console.error("Invalid RLUSD issuer address", RLUSD_TESTNET_ISSUER);
    return 0;
  }

  const client = await getXrplClient();

  try {
    const response = await client.request({
      command: "account_lines",
      account: address,
      peer: RLUSD_TESTNET_ISSUER,
      ledger_index: "validated",
    });

    const rlusdLine = response.result.lines.find(
      (line) =>
        line.currency === RLUSD_CURRENCY_CODE &&
        line.account === RLUSD_TESTNET_ISSUER
    );

    if (!rlusdLine) {
      return 0;
    }

    return Number(rlusdLine.balance ?? 0);
  } catch (error) {
    console.error("Failed to fetch XRPL RLUSD balance", error);
    return 0;
  }
}

export async function ensureRlusdTrustline(addressWallet: xrpl.Wallet) {
  if (!isValidXrplAddress(RLUSD_TESTNET_ISSUER)) {
    throw new Error(`Invalid RLUSD issuer: ${RLUSD_TESTNET_ISSUER}`);
  }

  const client = await getXrplClient();

  const trustSet: xrpl.TrustSet = {
    TransactionType: "TrustSet",
    Account: addressWallet.address,
    LimitAmount: {
      currency: RLUSD_CURRENCY_CODE,
      issuer: RLUSD_TESTNET_ISSUER,
      value: "1000000",
    },
  };

  const prepared = await client.autofill(trustSet);
  const signed = addressWallet.sign(prepared);
  const result = await client.submitAndWait(signed.tx_blob);

  return result.result.hash;
}