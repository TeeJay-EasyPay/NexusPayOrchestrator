import { executeXrplTestnetRlusdTransfer } from "../services/xrplTestnetService";

type SettlementInput = {
  transferId: string;
  routePlanId: string;
  rlusdAmount: number;
  settlementRate: number;
};

export type XrplSettlementResult = {
  txHash: string;
  sourceAddress: string;
  destinationAddress: string;
  rlusdAmount: string;
  networkFeeXrp: string;
  ledgerIndex: number;
  transactionResult: string;
  settlementRate: number;
};

export async function executeXrplTestnetSettlement({
  transferId,
  routePlanId,
  rlusdAmount,
  settlementRate,
}: SettlementInput): Promise<XrplSettlementResult> {
  const result = await executeXrplTestnetRlusdTransfer({ transferId, routePlanId, amountRlusd: rlusdAmount });
  if (!result.validated || result.canonical_status !== "VALIDATED") {
    throw new Error(`XRPL Testnet transaction ended in ${result.canonical_status}.`);
  }
  return {
    txHash: result.tx_hash,
    sourceAddress: result.source_address,
    destinationAddress: result.destination_address,
    rlusdAmount: String(result.amount_rlusd),
    networkFeeXrp: String(result.network_fee_xrp),
    ledgerIndex: result.ledger_index,
    transactionResult: result.engine_result,
    settlementRate,
  };
}
