import { useCallback, useEffect, useState } from "react";

import {
  AirwallexBeneficiarySchema,
  getAirwallexBeneficiarySchema,
} from "../services/airwallexBeneficiarySchemaService";
import { Currency } from "../types/transfer";

export function useAirwallexBeneficiarySchema(input: {
  country?: string;
  currency?: Currency;
  enabled?: boolean;
}) {
  const [schema, setSchema] = useState<AirwallexBeneficiarySchema | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const reload = useCallback(() => setReloadKey((value) => value + 1), []);

  useEffect(() => {
    if (!input.enabled || !input.country || !input.currency) {
      setSchema(null);
      setError(null);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);
    setSchema(null);

    void getAirwallexBeneficiarySchema({ country: input.country, currency: input.currency })
      .then((result) => {
        if (!active) return;
        setSchema(result);
        setLoading(false);
      })
      .catch((schemaError) => {
        if (!active) return;
        setError(schemaError instanceof Error ? schemaError.message : "Airwallex recipient requirements are unavailable.");
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [input.country, input.currency, input.enabled, reloadKey]);

  return { schema, loading, error, reload };
}
