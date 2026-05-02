const XRPL_TESTNET_EXPLORER_BASE_URL = "https://testnet.xrpl.org";

export function getXrplTestnetTransactionUrl(txHash: string) {
  return `${XRPL_TESTNET_EXPLORER_BASE_URL}/transactions/${txHash}`;
}

export function shortenTxHash(txHash: string) {
  if (!txHash) return "";
  return `${txHash.slice(0, 8)}...${txHash.slice(-8)}`;
}