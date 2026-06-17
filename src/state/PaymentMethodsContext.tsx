import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useMemo, useState } from "react";

import {
    mockPaymentMethods,
    SavedPaymentMethod,
} from "../data/mockPaymentMethods";
import { supabase } from "../lib/supabase";
import { getStoredAccountScope } from "./AccountContext";

type PaymentMethodsContextType = {
  paymentMethods: SavedPaymentMethod[];
  primaryMethodId: string;
  primaryMethod?: SavedPaymentMethod;
  setPrimaryMethod: (methodId: string) => void;
};

const PaymentMethodsContext = createContext<PaymentMethodsContextType | undefined>(undefined);

export function PaymentMethodsProvider({ children }: { children: React.ReactNode }) {
  const fallbackPrimary =
    mockPaymentMethods.find((method) => method.isPrimary)?.id ?? mockPaymentMethods[0]?.id ?? "";
  const [primaryMethodId, setPrimaryMethodId] = useState(
    fallbackPrimary
  );

  React.useEffect(() => {
    let mounted = true;

    async function hydratePrimaryMethod() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const scope = await getStoredAccountScope();
      const key = `nexuspay-primary-payment-method:${user?.id ?? "anonymous"}:${scope}`;
      const persisted = await AsyncStorage.getItem(key);

      if (!mounted || !persisted) {
        return;
      }

      const exists = mockPaymentMethods.some((method) => method.id === persisted);

      if (exists) {
        setPrimaryMethodId(persisted);
      }
    }

    void hydratePrimaryMethod();

    return () => {
      mounted = false;
    };
  }, []);

  React.useEffect(() => {
    async function persistPrimaryMethod() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const scope = await getStoredAccountScope();
      const key = `nexuspay-primary-payment-method:${user?.id ?? "anonymous"}:${scope}`;
      await AsyncStorage.setItem(key, primaryMethodId || fallbackPrimary);
    }

    void persistPrimaryMethod();
  }, [primaryMethodId, fallbackPrimary]);

  const value = useMemo(() => {
    const paymentMethods = mockPaymentMethods.map((method) => ({
      ...method,
      isPrimary: method.id === primaryMethodId,
    }));

    return {
      paymentMethods,
      primaryMethodId,
      primaryMethod: paymentMethods.find((method) => method.id === primaryMethodId),
      setPrimaryMethod: setPrimaryMethodId,
    };
  }, [primaryMethodId]);

  return (
    <PaymentMethodsContext.Provider value={value}>
      {children}
    </PaymentMethodsContext.Provider>
  );
}

export function usePaymentMethods() {
  const context = useContext(PaymentMethodsContext);

  if (!context) {
    throw new Error("usePaymentMethods must be used within PaymentMethodsProvider");
  }

  return context;
}
