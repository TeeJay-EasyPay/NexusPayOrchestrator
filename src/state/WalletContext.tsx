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

type WalletContextType = {
  gbpBalance: number | null;
  debitGbp: (amount: number) => void;

  xrplAddress: string | null;
  xrpBalance: number | null;
  rlusdBalance: number | null;
  rlusdIssuer: string;

  isRefreshingXrpBalance: boolean;
  refreshXrpBalance: () => Promise<void>;
  refreshAllXrplBalances: () => Promise<void>;

};

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [gbpBalance] = useState<number | null>(null);

  const [xrplAddress, setXrplAddress] = useState<string | null>(null);
  const [xrpBalance, setXrpBalance] = useState<number | null>(null);
  const [rlusdBalance, setRlusdBalance] = useState<number | null>(null);

  const [isRefreshingXrpBalance, setIsRefreshingXrpBalance] = useState(false);

  function debitGbp(amount: number) {
    void amount;
  }

  const refreshAllXrplBalances = useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return;
    }

    setIsRefreshingXrpBalance(true);

    try {
      const status = await getXrplTestnetStatus();

      setXrplAddress(status.source.address);
      setXrpBalance(status.source.xrpBalance);
      setRlusdBalance(status.source.rlusdBalance);
    } catch (error) {
      console.warn("XRPL wallet refresh skipped", error);
      setXrpBalance(null);
      setRlusdBalance(null);
    } finally {
      setIsRefreshingXrpBalance(false);
    }
  }, []);

  const refreshXrpBalance = useCallback(async () => {
    await refreshAllXrplBalances();
  }, [refreshAllXrplBalances]);

  useEffect(() => {
    refreshAllXrplBalances();
  }, [refreshAllXrplBalances]);

  return (
    <WalletContext.Provider
      value={{
        gbpBalance,
        debitGbp,

        xrplAddress,
        xrpBalance,
        rlusdBalance,
        rlusdIssuer: RLUSD_TESTNET_ISSUER,

        isRefreshingXrpBalance,
        refreshXrpBalance,
        refreshAllXrplBalances,

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
