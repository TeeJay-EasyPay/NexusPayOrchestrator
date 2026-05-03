import React, { createContext, useContext, useEffect, useState } from "react";
import { loadCompletedTransfers, saveCompletedTransfer } from "../services/transferService";
import { Recipient, RouteQuote, Transfer } from "../types/transfer";

interface TransferContextType {
  transfer: Transfer | null;
  completedTransfers: Transfer[];

  createTransfer: (amount: number) => void;
  setRecipient: (recipient: Recipient) => void;
  setRoutes: (routes: RouteQuote[]) => void;
  selectRoute: (route: RouteQuote) => void;
  startTransfer: () => void;
  completeTransfer: () => void;
  resetTransfer: () => void;
}

const TransferContext = createContext<TransferContextType | undefined>(
  undefined
);

export function TransferProvider({ children }: { children: React.ReactNode }) {
  const [transfer, setTransfer] = useState<Transfer | null>(null);
  const [completedTransfers, setCompletedTransfers] = useState<Transfer[]>([]);

  useEffect(() => {
    hydrateTransfers();
  }, []);

  async function hydrateTransfers() {
    const persistedTransfers = await loadCompletedTransfers();

    if (persistedTransfers.length > 0) {
      setCompletedTransfers(persistedTransfers);
    }
  }

  const createTransfer = (amount: number) => {
    setTransfer({
      id: Date.now().toString(),
      senderCurrency: "GBP",
      senderAmount: amount,
      recipient: {} as Recipient,
      routes: [],
      status: "CREATED",
      createdAt: Date.now(),
    });
  };

  const setRecipient = (recipient: Recipient) => {
    setTransfer((currentTransfer) => {
      if (!currentTransfer) return currentTransfer;

      return {
        ...currentTransfer,
        recipient,
      };
    });
  };

  const setRoutes = (routes: RouteQuote[]) => {
    setTransfer((currentTransfer) => {
      if (!currentTransfer) return currentTransfer;

      return {
        ...currentTransfer,
        routes,
        status: "ROUTES_FETCHED",
      };
    });
  };

  const selectRoute = (route: RouteQuote) => {
    setTransfer((currentTransfer) => {
      if (!currentTransfer) return currentTransfer;

      return {
        ...currentTransfer,
        selectedRoute: route,
        status: "ROUTE_SELECTED",
      };
    });
  };

  const startTransfer = () => {
    setTransfer((currentTransfer) => {
      if (!currentTransfer) return currentTransfer;

      return {
        ...currentTransfer,
        status: "IN_PROGRESS",
      };
    });
  };

  const completeTransfer = () => {
    setTransfer((currentTransfer) => {
      if (!currentTransfer) return currentTransfer;

      const completedTransfer: Transfer = {
        ...currentTransfer,
        status: "COMPLETED",
      };

      saveCompletedTransfer(completedTransfer);

      setCompletedTransfers((existingTransfers) => {
        const alreadyExists = existingTransfers.some(
          (item) => item.id === completedTransfer.id
        );

        if (alreadyExists) return existingTransfers;

        return [completedTransfer, ...existingTransfers].slice(0, 25);
      });

      return completedTransfer;
    });
  };

  const resetTransfer = () => {
    setTransfer(null);
  };

  return (
    <TransferContext.Provider
      value={{
        transfer,
        completedTransfers,
        createTransfer,
        setRecipient,
        setRoutes,
        selectRoute,
        startTransfer,
        completeTransfer,
        resetTransfer,
      }}
    >
      {children}
    </TransferContext.Provider>
  );
}

export function useTransfer() {
  const context = useContext(TransferContext);

  if (!context) {
    throw new Error("useTransfer must be used within TransferProvider");
  }

  return context;
}
