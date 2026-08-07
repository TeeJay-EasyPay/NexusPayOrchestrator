import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import { supabase } from "../lib/supabase";
import {
  getXrplTestnetStatus,
  RLUSD_TESTNET_ISSUER,
} from "../services/xrplTestnetService";

import {
  addSimulatedRlusd,
  getSimulatedRlusdBalance,
  resetSimulatedRlusdBalance,
} from "../lib/simulatedRLusdWallet";

type WalletContextType = {
  gbpBalance: number;
  debitGbp: (amount: number) => void;

  xrplAddress: string | null;
  xrpBalance: number | null;
  rlusdBalance: number | null;
  simulatedRlusdBalance: number;
  rlusdIssuer: string;

  isRefreshingXrpBalance: boolean;
  refreshXrpBalance: () => Promise<void>;
  refreshAllXrplBalances: () => Promise<void>;

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

  function debitGbp(amount: number) {
    setGbpBalance((current) => Math.max(0, current - amount));
  }

  const refreshSimulatedRlusd = useCallback(async () => {
    const balance = await getSimulatedRlusdBalance();
    setSimulatedRlusdBalanceState(balance);
  }, []);

  const refreshAllXrplBalances = useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return;
    }

    setIsRefreshingXrpBalance(true);

    try {
      const [status, simulatedBalance] = await Promise.all([
        getXrplTestnetStatus(),
        getSimulatedRlusdBalance(),
      ]);

      setXrplAddress(status.source.address);
      setXrpBalance(status.source.xrpBalance);
      setRlusdBalance(status.source.rlusdBalance);
      setSimulatedRlusdBalanceState(simulatedBalance);
    } catch (error) {
      console.warn("XRPL wallet refresh skipped", error);
      setXrpBalance(0);
      setRlusdBalance(0);
    } finally {
      setIsRefreshingXrpBalance(false);
    }
  }, []);

  const refreshXrpBalance = useCallback(async () => {
    await refreshAllXrplBalances();
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
        refreshXrpBalance,
        refreshAllXrplBalances,

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
