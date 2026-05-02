import * as SecureStore from "expo-secure-store";

const SIMULATED_RLUSD_BALANCE_KEY = "nexuspay_simulated_rlusd_balance";

export async function getSimulatedRlusdBalance(): Promise<number> {
  const storedBalance = await SecureStore.getItemAsync(
    SIMULATED_RLUSD_BALANCE_KEY
  );

  if (!storedBalance) {
    return 0;
  }

  return Number(storedBalance);
}

export async function setSimulatedRlusdBalance(amount: number): Promise<void> {
  await SecureStore.setItemAsync(
    SIMULATED_RLUSD_BALANCE_KEY,
    String(Math.max(0, amount))
  );
}

export async function addSimulatedRlusd(amount: number): Promise<number> {
  const currentBalance = await getSimulatedRlusdBalance();
  const nextBalance = currentBalance + amount;

  await setSimulatedRlusdBalance(nextBalance);

  return nextBalance;
}

export async function debitSimulatedRlusd(amount: number): Promise<number> {
  const currentBalance = await getSimulatedRlusdBalance();
  const nextBalance = Math.max(0, currentBalance - amount);

  await setSimulatedRlusdBalance(nextBalance);

  return nextBalance;
}

export async function resetSimulatedRlusdBalance(): Promise<number> {
  await setSimulatedRlusdBalance(0);
  return 0;
}