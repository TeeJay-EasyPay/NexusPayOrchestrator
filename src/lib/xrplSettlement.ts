import * as SecureStore from "expo-secure-store";
import * as xrpl from "xrpl";

import { getXrplClient } from "./xrplClient";
import { getOrCreateWallet } from "./xrplWallet";

const DESTINATION_SEED_KEY = "nexuspay_test_destination_wallet";

type SettlementInput = {
  gbpAmount: number;
};

export type XrplSettlementResult = {
  txHash: string;
  sourceAddress: string;
  destinationAddress: string;
  xrpAmount: string;
  settlementRate: number;
};

const DEMO_XRP_PER_GBP = 0.05;
const MAX_TESTNET_XRP_SEND = 25;

async function getOrCreateDestinationWallet() {
  const existingSeed = await SecureStore.getItemAsync(DESTINATION_SEED_KEY);

  if (existingSeed) {
    return xrpl.Wallet.fromSeed(existingSeed);
  }

  const client = await getXrplClient();
  const fundedWallet = await client.fundWallet();

  await SecureStore.setItemAsync(
    DESTINATION_SEED_KEY,
    fundedWallet.wallet.seed!
  );

  return fundedWallet.wallet;
}

function calculateDemoXrpAmount(gbpAmount: number) {
  const rawAmount = gbpAmount * DEMO_XRP_PER_GBP;
  const cappedAmount = Math.min(rawAmount, MAX_TESTNET_XRP_SEND);
  const safeAmount = Math.max(cappedAmount, 0.000001);

  return safeAmount.toFixed(6);
}

export async function executeXrplTestnetSettlement({
  gbpAmount,
}: SettlementInput): Promise<XrplSettlementResult> {
  const client = await getXrplClient();

  const sourceWallet = await getOrCreateWallet();
  const destinationWallet = await getOrCreateDestinationWallet();

  const xrpAmount = calculateDemoXrpAmount(gbpAmount);

  const payment: xrpl.Payment = {
    TransactionType: "Payment",
    Account: sourceWallet.address,
    Destination: destinationWallet.address,
    Amount: xrpl.xrpToDrops(xrpAmount),
  };

  const result = await client.submitAndWait(payment, {
    wallet: sourceWallet,
  });

  const txHash = result.result.hash;

  return {
    txHash,
    sourceAddress: sourceWallet.address,
    destinationAddress: destinationWallet.address,
    xrpAmount,
    settlementRate: DEMO_XRP_PER_GBP,
  };
}