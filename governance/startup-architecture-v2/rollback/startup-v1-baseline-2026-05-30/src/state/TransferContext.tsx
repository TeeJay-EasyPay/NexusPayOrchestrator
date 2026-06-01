import React, { createContext, useContext, useEffect, useState } from "react";
import { createTransferId } from "../lib/id";
import { supabase } from "../lib/supabase";
import { loadCompletedTransfers, saveCompletedTransfer } from "../services/transferService";
import { saveRecipientFromTransfer } from "../services/recipientService";
import { writeTransactionAuditLog } from "../services/transactionAuditService";
import {
  FundingMethod,
  FundingStatus,
  Recipient,
  RouteQuote,
  Transfer,
} from "../types/transfer";

interface TransferContextType {
  transfer: Transfer | null;
  completedTransfers: Transfer[];
  isLoadingTransfers: boolean;

  hydrateTransfers: () => Promise<void>;
  createTransfer: (amount: number) => void;
  setRecipient: (recipient: Recipient) => void;
  setRoutes: (routes: RouteQuote[]) => void;
  selectRoute: (route: RouteQuote) => void;
  setFundingMethod: (method: FundingMethod, fundingReference?: string) => void;
  setFundingStatus: (status: FundingStatus) => void;
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
  const [isLoadingTransfers, setIsLoadingTransfers] = useState(false);

  useEffect(() => {
    hydrateTransfers();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        hydrateTransfers();
        return;
      }

      setCompletedTransfers([]);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function hydrateTransfers() {
    setIsLoadingTransfers(true);

    try {
      const persistedTransfers = await loadCompletedTransfers();
      setCompletedTransfers(persistedTransfers);
    } finally {
      setIsLoadingTransfers(false);
    }
  }

  const createTransfer = (amount: number) => {
    const newTransfer: Transfer = {
      id: createTransferId(),
      senderCurrency: "GBP",
      senderAmount: amount,
      recipient: {} as Recipient,
      routes: [],
      fundingStatus: "NOT_STARTED",
      status: "CREATED",
      createdAt: Date.now(),
    };

    setTransfer(newTransfer);

    void writeTransactionAuditLog({
      transactionId: newTransfer.id,
      eventType: "TRANSFER_CREATED",
      status: "SUCCESS",
      message: "Transfer created and prepared for route orchestration.",
      metadata: {
        sender_currency: newTransfer.senderCurrency,
        sender_amount: newTransfer.senderAmount,
      },
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

      void writeTransactionAuditLog({
        transactionId: currentTransfer.id,
        eventType: "ROUTES_GENERATED",
        status: "SUCCESS",
        message: "Route intelligence generated ranked transfer options.",
        metadata: {
          route_count: routes.length,
          providers: routes.map((route) => route.provider),
          best_route_provider: routes[0]?.provider,
          best_route_score: routes[0]?.score,
        },
      });

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

      void writeTransactionAuditLog({
        transactionId: currentTransfer.id,
        eventType: "ROUTE_SELECTED",
        status: "SUCCESS",
        message: "User selected a route for transfer execution.",
        metadata: {
          provider: route.provider,
          rail: route.rail,
          score: route.score,
          fee: route.fee,
          estimated_time: route.estimatedTime,
          receive_amount: route.receiveAmount,
          bridge_asset: route.bridgeAsset ?? null,
        },
      });

      return {
        ...currentTransfer,
        selectedRoute: route,
        status: "ROUTE_SELECTED",
      };
    });
  };

  const setFundingMethod = (method: FundingMethod, fundingReference?: string) => {
    setTransfer((currentTransfer) => {
      if (!currentTransfer) return currentTransfer;

      void writeTransactionAuditLog({
        transactionId: currentTransfer.id,
        eventType: "FUNDING_METHOD_SELECTED",
        status: "SUCCESS",
        message: "Funding method selected for transfer authorisation.",
        metadata: {
          funding_method: method,
          funding_reference: fundingReference ?? null,
        },
      });

      return {
        ...currentTransfer,
        fundingMethod: method,
        fundingReference,
        fundingStatus: "NOT_STARTED",
        status: "FUNDING_SELECTED",
      };
    });
  };

  const setFundingStatus = (status: FundingStatus) => {
    setTransfer((currentTransfer) => {
      if (!currentTransfer) return currentTransfer;

      if (status === "AUTHORISED") {
        void writeTransactionAuditLog({
          transactionId: currentTransfer.id,
          eventType: "FUNDING_AUTHORISED",
          status: "SUCCESS",
          message: "Funding source authorised successfully.",
          metadata: {
            funding_method: currentTransfer.fundingMethod ?? null,
            funding_reference: currentTransfer.fundingReference ?? null,
            authorised_amount: currentTransfer.senderAmount,
            sender_currency: currentTransfer.senderCurrency,
          },
        });
      }

      return {
        ...currentTransfer,
        fundingStatus: status,
        fundingAuthorisedAt:
          status === "AUTHORISED" ? Date.now() : currentTransfer.fundingAuthorisedAt,
        status: status === "AUTHORISED" ? "FUNDING_AUTHORISED" : currentTransfer.status,
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
        fundingStatus: currentTransfer.fundingStatus ?? "AUTHORISED",
        status: "COMPLETED",
      };

      void writeTransactionAuditLog({
        transactionId: completedTransfer.id,
        eventType: "TRANSFER_COMPLETED",
        status: "SUCCESS",
        message: "Transfer marked complete by the NexusPay orchestration layer.",
        metadata: {
          final_status: completedTransfer.status,
          selected_provider: completedTransfer.selectedRoute?.provider ?? null,
          rail: completedTransfer.selectedRoute?.rail ?? null,
          recipient_country: completedTransfer.recipient?.country ?? null,
          recipient_currency: completedTransfer.recipient?.currency ?? null,
        },
      });

      saveCompletedTransfer(completedTransfer).then(() => {
        hydrateTransfers();
      });

      saveRecipientFromTransfer(completedTransfer);

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
        isLoadingTransfers,
        hydrateTransfers,
        createTransfer,
        setRecipient,
        setRoutes,
        selectRoute,
        setFundingMethod,
        setFundingStatus,
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
