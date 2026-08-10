import { useEffect, useState } from "react";

import { generateCanonicalRouteQuotes } from "../services/routeIntelligenceService";
import type { Currency, FundingMethod, PayoutMethod, RouteQuote } from "../types/transfer";

type Input = {
  amount: number;
  destinationCurrency?: Currency;
  destinationCountry?: string;
  payoutMethod: PayoutMethod;
  fundingMethod?: FundingMethod;
  actualRlusdBalance?: number | null;
  enabled?: boolean;
};

export function useCanonicalRouteQuotes(input: Input) {
  const [routes, setRoutes] = useState<RouteQuote[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const enabled = input.enabled !== false && input.amount > 0 && Boolean(input.destinationCurrency && input.destinationCountry);
    if (!enabled) {
      setRoutes([]);
      setLoading(false);
      setError(null);
      return () => {
        active = false;
      };
    }

    setLoading(true);
    setError(null);
    const timer = setTimeout(() => {
      void generateCanonicalRouteQuotes({
        amount: input.amount,
        destinationCurrency: input.destinationCurrency!,
        destinationCountry: input.destinationCountry!,
        payoutMethod: input.payoutMethod,
        fundingMethod: input.fundingMethod,
        actualRlusdBalance: input.actualRlusdBalance,
      })
        .then((nextRoutes) => {
          if (active) setRoutes(nextRoutes);
        })
        .catch((caughtError) => {
          if (!active) return;
          setRoutes([]);
          setError(caughtError instanceof Error ? caughtError.message : "Route evidence could not be loaded.");
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 350);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [
    input.actualRlusdBalance,
    input.amount,
    input.destinationCountry,
    input.destinationCurrency,
    input.enabled,
    input.fundingMethod,
    input.payoutMethod,
  ]);

  return { routes, loading, error };
}
