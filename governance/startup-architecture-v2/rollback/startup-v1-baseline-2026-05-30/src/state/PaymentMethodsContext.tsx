import React, { createContext, useContext, useMemo, useState } from "react";

import {
  mockPaymentMethods,
  SavedPaymentMethod,
} from "../data/mockPaymentMethods";

type PaymentMethodsContextType = {
  paymentMethods: SavedPaymentMethod[];
  primaryMethodId: string;
  primaryMethod?: SavedPaymentMethod;
  setPrimaryMethod: (methodId: string) => void;
};

const PaymentMethodsContext = createContext<PaymentMethodsContextType | undefined>(undefined);

export function PaymentMethodsProvider({ children }: { children: React.ReactNode }) {
  const [primaryMethodId, setPrimaryMethodId] = useState(
    mockPaymentMethods.find((method) => method.isPrimary)?.id ?? mockPaymentMethods[0]?.id ?? ""
  );

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
