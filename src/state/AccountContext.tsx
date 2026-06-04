import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export type AccountScope = "demo" | "personal";

const ACCOUNT_SCOPE_STORAGE_KEY = "nexuspay-account-scope";

type AccountContextType = {
  accountScope: AccountScope;
  ready: boolean;
  setAccountScope: (scope: AccountScope) => Promise<void>;
  clearAccountScope: () => Promise<void>;
};

const AccountContext = createContext<AccountContextType | undefined>(undefined);

async function saveScope(scope: AccountScope) {
  await AsyncStorage.setItem(ACCOUNT_SCOPE_STORAGE_KEY, scope);
}

async function loadScope(): Promise<AccountScope> {
  const value = await AsyncStorage.getItem(ACCOUNT_SCOPE_STORAGE_KEY);
  if (value === "demo" || value === "personal") {
    return value;
  }

  return "demo";
}

export function AccountProvider({ children }: { children: React.ReactNode }) {
  const [accountScope, setAccountScopeState] = useState<AccountScope>("demo");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    loadScope()
      .then((scope) => {
        if (!mounted) return;
        setAccountScopeState(scope);
      })
      .finally(() => {
        if (mounted) {
          setReady(true);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const value = useMemo<AccountContextType>(
    () => ({
      accountScope,
      ready,
      setAccountScope: async (scope: AccountScope) => {
        setAccountScopeState(scope);
        await saveScope(scope);
      },
      clearAccountScope: async () => {
        setAccountScopeState("demo");
        await AsyncStorage.removeItem(ACCOUNT_SCOPE_STORAGE_KEY);
      },
    }),
    [accountScope, ready]
  );

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}

export function useAccount() {
  const context = useContext(AccountContext);

  if (!context) {
    throw new Error("useAccount must be used within AccountProvider");
  }

  return context;
}

export async function getStoredAccountScope(): Promise<AccountScope> {
  return loadScope();
}
