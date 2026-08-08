import { supabase } from "../lib/supabase";
import type { Currency } from "../types/transfer";

export type AirwallexFxQuote = {
  quoteId: string;
  sellCurrency: Currency;
  buyCurrency: Currency;
  sellAmount: number;
  buyAmount: number;
  clientRate: number;
  midRate: number | null;
  validFromAt: string;
  validToAt: string;
  source: "Airwallex Transactional FX Quote API";
  provenance: "SANDBOX";
};

export async function getAirwallexFxQuote(input: {
  sellCurrency: Currency;
  buyCurrency: Currency;
  sellAmount: number;
}): Promise<AirwallexFxQuote> {
  const { data, error } = await supabase.functions.invoke<AirwallexFxQuote>("nexuspay-submit-payout", {
    body: {
      providerId: "airwallex",
      environment: "sandbox",
      operation: "fx_quote",
      sellCurrency: input.sellCurrency,
      buyCurrency: input.buyCurrency,
      sellAmount: input.sellAmount,
    },
  });

  if (error) throw new Error(error.message);
  if (!data?.quoteId || !Number.isFinite(data.buyAmount) || !Number.isFinite(data.clientRate)) {
    throw new Error("Airwallex did not return a usable sandbox FX quote.");
  }
  return data;
}
