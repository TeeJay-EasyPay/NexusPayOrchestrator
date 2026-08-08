import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useMemo, useState } from "react";

import { SavedPaymentMethod } from "../data/mockPaymentMethods";
import { listYapilyPaymentInstitutions } from "../services/openBankingPaymentFlowService";
import { supabase } from "../lib/supabase";
import { getStoredAccountScope } from "./AccountContext";

type PaymentMethodsContextType = {
  paymentMethods: SavedPaymentMethod[];
  primaryMethodId: string;
  primaryMethod?: SavedPaymentMethod;
  setPrimaryMethod: (methodId: string) => void;
  loadingInstitutions: boolean;
  institutionError?: string;
  refreshInstitutions: () => Promise<void>;
};

const PaymentMethodsContext = createContext<PaymentMethodsContextType | undefined>(undefined);

export function PaymentMethodsProvider({ children }: { children: React.ReactNode }) {
  const [primaryMethodId, setPrimaryMethodId] = useState("");
  const [institutions, setInstitutions] = useState<SavedPaymentMethod[]>([]);
  const [loadingInstitutions, setLoadingInstitutions] = useState(true);
  const [institutionError, setInstitutionError] = useState<string>();

  const refreshInstitutions = React.useCallback(async () => {
    setLoadingInstitutions(true);
    setInstitutionError(undefined);
    try {
      const rows = await listYapilyPaymentInstitutions();
      if (rows.length === 0) {
        setInstitutions([]);
        setInstitutionError("No payment-capable sandbox institution is registered to the NexusPay Yapily application.");
        return;
      }
      setInstitutions(rows.map((institution) => ({
        id: `yapily:${institution.id}`,
        type: "OPEN_BANKING",
        label: institution.fullName,
        subtitle: "Institution returned by the Yapily sandbox API",
        provider: "Yapily Open Banking Sandbox",
        reference: institution.id,
        status: "CONNECTED",
        isPrimary: false,
        fundingLimitGbp: 1000,
        institutionId: institution.id,
        institutionName: institution.fullName,
        provenance: "SANDBOX",
      })));
      setPrimaryMethodId((current) => current || `yapily:${rows[0].id}`);
    } catch (error) {
      setInstitutions([]);
      setInstitutionError(error instanceof Error ? error.message : "Yapily institutions are unavailable.");
    } finally {
      setLoadingInstitutions(false);
    }
  }, []);

  React.useEffect(() => { void refreshInstitutions(); }, [refreshInstitutions]);

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

      const exists = institutions.some((method) => method.id === persisted);

      if (exists) {
        setPrimaryMethodId(persisted);
      }
    }

    void hydratePrimaryMethod();

    return () => {
      mounted = false;
    };
  }, [institutions]);

  React.useEffect(() => {
    async function persistPrimaryMethod() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const scope = await getStoredAccountScope();
      const key = `nexuspay-primary-payment-method:${user?.id ?? "anonymous"}:${scope}`;
      if (primaryMethodId) await AsyncStorage.setItem(key, primaryMethodId);
    }

    void persistPrimaryMethod();
  }, [primaryMethodId]);

  const value = useMemo(() => {
    const paymentMethods = institutions.map((method) => ({
      ...method,
      isPrimary: method.id === primaryMethodId,
    }));

    return {
      paymentMethods,
      primaryMethodId,
      primaryMethod: paymentMethods.find((method) => method.id === primaryMethodId),
      setPrimaryMethod: setPrimaryMethodId,
      loadingInstitutions,
      institutionError,
      refreshInstitutions,
    };
  }, [institutionError, institutions, loadingInstitutions, primaryMethodId, refreshInstitutions]);

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
