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

type WalletContextType = {
  gbpBalance: number;
  debitGbp: (amount: number) => void;

  xrplAddress: string | null;
  xrpBalance: number | null;
  rlusdBalance: number | null;
  rlusdIssuer: string;
  isRefreshingXrpBalance: boolean;
  isSettingRlusdTrustline: boolean;
  refreshXrpBalance: () => Promise<void>;
  refreshAllXrplBalances: () => Promise<void>;
  setupRlusdTrustline: () => Promise<void>;
};

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [gbpBalance, setGbpBalance] = useState(12480.5);

  const [xrplAddress, setXrplAddress] = useState<string | null>(null);
  const [xrpBalance, setXrpBalance] = useState<number | null>(null);
  const [rlusdBalance, setRlusdBalance] = useState<number | null>(null);
  const [isRefreshingXrpBalance, setIsRefreshingXrpBalance] = useState(false);
  const [isSettingRlusdTrustline, setIsSettingRlusdTrustline] = useState(false);

  function debitGbp(amount: number) {
    setGbpBalance((current) => Math.max(0, current - amount));
  }

  const refreshAllXrplBalances = useCallback(async () => {
    setIsRefreshingXrpBalance(true);

    try {
      const wallet = await getOrCreateWallet();

      setXrplAddress(wallet.address);

      const [liveXrpBalance, liveRlusdBalance] = await Promise.all([
        getXrplTestnetXrpBalance(wallet.address),
        getXrplTestnetRlusdBalance(wallet.address),
      ]);

      setXrpBalance(liveXrpBalance);
      setRlusdBalance(liveRlusdBalance);
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
        isSettingRlusdTrustline,
        refreshXrpBalance,
        refreshAllXrplBalances,
        setupRlusdTrustline,
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