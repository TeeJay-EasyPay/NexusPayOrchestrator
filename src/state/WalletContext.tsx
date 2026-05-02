import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import {
  ensureRlusdTrustline,
  getOrCreateWallet,
  getXrplTestnetRlusdBalance,
  getXrplTestnetXrpBalance,
  RLUSD_TESTNET_ISSUER,
} from "../lib/xrplWallet";

import {
  addSimulatedRlusd,
  getSimulatedRlusdBalance,
  resetSimulatedRlusdBalance,
} from "../lib/simulatedRlusdWallet";

type WalletContextType = {
  gbpBalance: number;
  debitGbp: (amount: number) => void;

  xrplAddress: string | null;
  xrpBalance: number | null;
  rlusdBalance: number | null;
  simulatedRlusdBalance: number;
  rlusdIssuer: string;

  isRefreshingXrpBalance: boolean;
  isSettingRlusdTrustline: boolean;

  refreshXrpBalance: () => Promise<void>;
  refreshAllXrplBalances: () => Promise<void>;
  setupRlusdTrustline: () => Promise<void>;

  fundSimulatedRlusd: (amount: number) => Promise<void>;
  resetRlusdSimulation: () => Promise<void>;
};

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [gbpBalance, setGbpBalance] = useState(12480.5);

  const [xrplAddress, setXrplAddress] = useState<string | null>(null);
  const [xrpBalance, setXrpBalance] = useState<number | null>(null);
  const [rlusdBalance, setRlusdBalance] = useState<number | null>(null);
  const [simulatedRlusdBalance, setSimulatedRlusdBalanceState] = useState(0);

  const [isRefreshingXrpBalance, setIsRefreshingXrpBalance] = useState(false);
  const [isSettingRlusdTrustline, setIsSettingRlusdTrustline] = useState(false);

  function debitGbp(amount: number) {
    setGbpBalance((current) => Math.max(0, current - amount));
  }

  const refreshSimulatedRlusd = useCallback(async () => {
    const balance = await getSimulatedRlusdBalance();
    setSimulatedRlusdBalanceState(balance);
  }, []);

  const refreshAllXrplBalances = useCallback(async () => {
    setIsRefreshingXrpBalance(true);

    try {
      const wallet = await getOrCreateWallet();

      setXrplAddress(wallet.address);

      const [liveXrpBalance, liveRlusdBalance, simulatedBalance] =
        await Promise.all([
          getXrplTestnetXrpBalance(wallet.address),
          getXrplTestnetRlusdBalance(wallet.address),
          getSimulatedRlusdBalance(),
        ]);

      setXrpBalance(liveXrpBalance);
      setRlusdBalance(liveRlusdBalance);
      setSimulatedRlusdBalanceState(simulatedBalance);
    } catch (error) {
      console.error("Failed to refresh XRPL wallet balances", error);
      setXrpBalance(0);
      setRlusdBalance(0);
    } finally {
      setIsRefreshingXrpBalance(false);
    }
  }, []);

  const refreshXrpBalance = useCallback(async () => {
    await refreshAllXrplBalances();
  }, [refreshAllXrplBalances]);

  const setupRlusdTrustline = useCallback(async () => {
    setIsSettingRlusdTrustline(true);

    try {
      const wallet = await getOrCreateWallet();

      setXrplAddress(wallet.address);

      await ensureRlusdTrustline(wallet);
      await refreshAllXrplBalances();
    } catch (error) {
      console.error("Failed to set RLUSD trustline", error);
    } finally {
      setIsSettingRlusdTrustline(false);
    }
  }, [refreshAllXrplBalances]);

  const fundSimulatedRlusd = useCallback(async (amount: number) => {
    const nextBalance = await addSimulatedRlusd(amount);
    setSimulatedRlusdBalanceState(nextBalance);
  }, []);

  const resetRlusdSimulation = useCallback(async () => {
    const nextBalance = await resetSimulatedRlusdBalance();
    setSimulatedRlusdBalanceState(nextBalance);
  }, []);

  useEffect(() => {
    refreshAllXrplBalances();
    refreshSimulatedRlusd();
  }, [refreshAllXrplBalances, refreshSimulatedRlusd]);

  return (
    <WalletContext.Provider
      value={{
        gbpBalance,
        debitGbp,

        xrplAddress,
        xrpBalance,
        rlusdBalance,
        simulatedRlusdBalance,
        rlusdIssuer: RLUSD_TESTNET_ISSUER,

        isRefreshingXrpBalance,
        isSettingRlusdTrustline,

        refreshXrpBalance,
        refreshAllXrplBalances,
        setupRlusdTrustline,

        fundSimulatedRlusd,
        resetRlusdSimulation,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);

  if (!context) {
    throw new Error("useWallet must be used inside WalletProvider");
  }

  return context;
}