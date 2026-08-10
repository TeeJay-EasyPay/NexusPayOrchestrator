import { useCallback, useEffect, useState } from "react";
import { getNiumBeneficiarySchema, NiumBeneficiarySchema } from "../services/niumBeneficiarySchemaService";
import { Currency } from "../types/transfer";

export function useNiumBeneficiarySchema(input: { country?: string; currency?: Currency; enabled?: boolean }) {
  const [schema, setSchema] = useState<NiumBeneficiarySchema | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const reload = useCallback(() => setReloadKey((value) => value + 1), []);

  useEffect(() => {
    if (!input.enabled || !input.country || !input.currency) {
      setSchema(null); setError(null); setLoading(false); return;
    }
    let active = true;
    setSchema(null); setError(null); setLoading(true);
    void getNiumBeneficiarySchema({ country: input.country, currency: input.currency })
      .then((result) => { if (active) setSchema(result); })
      .catch((caught) => { if (active) setError(caught instanceof Error ? caught.message : "Nium recipient requirements are unavailable."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [input.country, input.currency, input.enabled, reloadKey]);

  return { schema, loading, error, reload };
}
