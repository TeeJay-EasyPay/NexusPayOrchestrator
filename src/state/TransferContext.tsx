import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { createTransferId } from "../lib/id";
import { supabase } from "../lib/supabase";
import { saveRecipientFromTransfer } from "../services/recipientService";
import { writeTransactionAuditLog } from "../services/transactionAuditService";
import { loadCompletedTransfers, saveCompletedTransfer } from "../services/transferService";
import {
    FundingMethod,
    FundingStatus,
    Recipient,
    RouteQuote,
    Transfer,
} from "../types/transfer";
import { useAccount } from "./AccountContext";
import { usePersona } from "./PersonaContext";

interface TransferContextType {
  transfer: Transfer | null;
  completedTransfers: Transfer[];
  isLoadingTransfers: boolean;

  hydrateTransfers: () => Promise<void>;
  createTransfer: (
    amount: number,
    options?: {
      recipient?: Recipient;
      routes?: RouteQuote[];
      selectedRoute?: RouteQuote;
      fundingMethod?: FundingMethod;
      fundingReference?: string;
      fundingStatus?: FundingStatus;
    }
  ) => Transfer;
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
  const { accountScope } = useAccount();
  const { selectedPersona } = usePersona();
  const [transfer, setTransfer] = useState<Transfer | null>(null);
  const [completedTransfers, setCompletedTransfers] = useState<Transfer[]>([]);
  const [isLoadingTransfers, setIsLoadingTransfers] = useState(false);

  const hydrateTransfers = useCallback(async () => {
    setIsLoadingTransfers(true);

    try {
      const persistedTransfers = await loadCompletedTransfers();
      setCompletedTransfers(persistedTransfers);
    } finally {
      setIsLoadingTransfers(false);
    }
  }, []);

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
  }, [hydrateTransfers]);

  const createTransfer = (
    amount: number,
    options?: {
      recipient?: Recipient;
      routes?: RouteQuote[];
      selectedRoute?: RouteQuote;
      fundingMethod?: FundingMethod;
      fundingReference?: string;
      fundingStatus?: FundingStatus;
    }
  ) => {
    const newTransfer: Transfer = {
      id: createTransferId(),
      senderCurrency: "GBP",
      senderAmount: amount,
      recipient: options?.recipient ?? ({} as Recipient),
      routes: options?.routes ?? [],
      selectedRoute: options?.selectedRoute,
      fundingMethod: options?.fundingMethod,
      fundingReference: options?.fundingReference,
      fundingStatus: options?.fundingStatus ?? "NOT_STARTED",
      status: options?.selectedRoute
        ? "ROUTE_SELECTED"
        : options?.routes?.length
          ? "ROUTES_FETCHED"
          : "CREATED",
      createdAt: Date.now(),
      accountScope,
      personaId: selectedPersona.id,
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
        persona_id: newTransfer.personaId,
      },
    });

    if (options?.routes?.length) {
      void writeTransactionAuditLog({
        transactionId: newTransfer.id,
        eventType: "ROUTES_GENERATED",
        status: "SUCCESS",
        message: "Route intelligence generated ranked transfer options.",
        metadata: {
          route_count: options.routes.length,
          providers: options.routes.map((route) => route.provider),
          best_route_provider: options.routes[0]?.provider,
          best_route_score: options.routes[0]?.score,
        },
      });
    }

    if (options?.selectedRoute) {
      void writeTransactionAuditLog({
        transactionId: newTransfer.id,
        eventType: "ROUTE_SELECTED",
        status: "SUCCESS",
        message: "User selected a route for transfer execution.",
        metadata: {
          provider: options.selectedRoute.provider,
          rail: options.selectedRoute.rail,
          score: options.selectedRoute.score,
          fee: options.selectedRoute.fee,
          estimated_time: options.selectedRoute.estimatedTime,
          receive_amount: options.selectedRoute.receiveAmount,
          bridge_asset: options.selectedRoute.bridgeAsset ?? null,
        },
      });
    }

    return newTransfer;
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
