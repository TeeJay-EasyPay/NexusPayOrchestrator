export type FxProviderName =
  | "Frankfurter"
  | "ExchangeRate API"
  | "Currency API CDN"
  | "FloatRates"
  | "Open Exchange Rates"
  | "Fixer"
  | "CurrencyLayer"
  | "Mock Fallback";

export type FxRate = {
  from: string;
  to: string;
  rate: number;
  date: string;
  source: "LIVE" | "MOCK_FALLBACK";
  provider: FxProviderName;
  providerStatus: string;
};

const OPEN_EXCHANGE_RATES_APP_ID = "";
const FIXER_API_KEY = "";
const CURRENCYLAYER_API_KEY = "";

const MOCK_RATES: Record<string, FxRate> = {
  "GBP-PHP": {
    from: "GBP",
    to: "PHP",
    rate: 72.4,
    date: new Date().toISOString().slice(0, 10),
    source: "MOCK_FALLBACK",
    provider: "Mock Fallback",
    providerStatus: "All live FX feeds unavailable",
  },
  "GBP-MYR": {
    from: "GBP",
    to: "MYR",
    rate: 5.92,
    date: new Date().toISOString().slice(0, 10),
    source: "MOCK_FALLBACK",
    provider: "Mock Fallback",
    providerStatus: "All live FX feeds unavailable",
  },
};

async function fetchFromFrankfurter(from: string, to: string): Promise<FxRate> {
  const response = await fetch(
    `https://api.frankfurter.dev/v2/rates?base=${from}&quotes=${to}`
  );

  if (!response.ok) throw new Error("Frankfurter unavailable");

  const data = await response.json();
  const rate = data?.rates?.[to];

  if (typeof rate !== "number") throw new Error("Frankfurter rate missing");

  return {
    from,
    to,
    rate,
    date: data.date ?? new Date().toISOString().slice(0, 10),
    source: "LIVE",
    provider: "Frankfurter",
    providerStatus: "Primary live FX via Frankfurter",
  };
}

async function fetchFromExchangeRateApi(
  from: string,
  to: string
): Promise<FxRate> {
  const response = await fetch(`https://open.er-api.com/v6/latest/${from}`);

  if (!response.ok) throw new Error("ExchangeRate API unavailable");

  const data = await response.json();
  const rate = data?.rates?.[to];

  if (typeof rate !== "number") {
    throw new Error("ExchangeRate API rate missing");
  }

  return {
    from,
    to,
    rate,
    date: data.time_last_update_utc ?? new Date().toISOString().slice(0, 10),
    source: "LIVE",
    provider: "ExchangeRate API",
    providerStatus: "Failover live FX via ExchangeRate API",
  };
}

async function fetchFromCurrencyApiCdn(
  from: string,
  to: string
): Promise<FxRate> {
  const fromLower = from.toLowerCase();
  const toLower = to.toLowerCase();

  const response = await fetch(
    `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/${fromLower}.json`
  );

  if (!response.ok) throw new Error("Currency API CDN unavailable");

  const data = await response.json();
  const rate = data?.[fromLower]?.[toLower];

  if (typeof rate !== "number") {
    throw new Error("Currency API CDN rate missing");
  }

  return {
    from,
    to,
    rate,
    date: data.date ?? new Date().toISOString().slice(0, 10),
    source: "LIVE",
    provider: "Currency API CDN",
    providerStatus: "Failover live FX via Currency API CDN",
  };
}

async function fetchFromFloatRates(from: string, to: string): Promise<FxRate> {
  const fromLower = from.toLowerCase();
  const toLower = to.toLowerCase();

  const response = await fetch(
    `https://www.floatrates.com/daily/${fromLower}.json`
  );

  if (!response.ok) throw new Error("FloatRates unavailable");

  const data = await response.json();
  const rate = data?.[toLower]?.rate;

  if (typeof rate !== "number") {
    throw new Error("FloatRates rate missing");
  }

  return {
    from,
    to,
    rate,
    date: data?.[toLower]?.date ?? new Date().toISOString().slice(0, 10),
    source: "LIVE",
    provider: "FloatRates",
    providerStatus: "Failover live FX via FloatRates",
  };
}

async function fetchFromOpenExchangeRates(
  from: string,
  to: string
): Promise<FxRate> {
  if (!OPEN_EXCHANGE_RATES_APP_ID) {
    throw new Error("Open Exchange Rates API key missing");
  }

  const response = await fetch(
    `https://openexchangerates.org/api/latest.json?app_id=${OPEN_EXCHANGE_RATES_APP_ID}`
  );

  if (!response.ok) throw new Error("Open Exchange Rates unavailable");

  const data = await response.json();

  const usdToFrom = data?.rates?.[from];
  const usdToTo = data?.rates?.[to];

  if (typeof usdToFrom !== "number" || typeof usdToTo !== "number") {
    throw new Error("Open Exchange Rates rate missing");
  }

  const rate = usdToTo / usdToFrom;

  return {
    from,
    to,
    rate,
    date: new Date((data.timestamp ?? Date.now() / 1000) * 1000)
      .toISOString()
      .slice(0, 10),
    source: "LIVE",
    provider: "Open Exchange Rates",
    providerStatus: "Failover live FX via Open Exchange Rates",
  };
}

async function fetchFromFixer(from: string, to: string): Promise<FxRate> {
  if (!FIXER_API_KEY) {
    throw new Error("Fixer API key missing");
  }

  const response = await fetch(
    `https://data.fixer.io/api/latest?access_key=${FIXER_API_KEY}&base=${from}&symbols=${to}`
  );

  if (!response.ok) throw new Error("Fixer unavailable");

  const data = await response.json();
  const rate = data?.rates?.[to];

  if (typeof rate !== "number") throw new Error("Fixer rate missing");

  return {
    from,
    to,
    rate,
    date: data.date ?? new Date().toISOString().slice(0, 10),
    source: "LIVE",
    provider: "Fixer",
    providerStatus: "Failover live FX via Fixer",
  };
}

async function fetchFromCurrencyLayer(
  from: string,
  to: string
): Promise<FxRate> {
  if (!CURRENCYLAYER_API_KEY) {
    throw new Error("CurrencyLayer API key missing");
  }

  const response = await fetch(
    `https://api.currencylayer.com/live?access_key=${CURRENCYLAYER_API_KEY}&currencies=${from},${to}`
  );

  if (!response.ok) throw new Error("CurrencyLayer unavailable");

  const data = await response.json();

  const usdToFrom = data?.quotes?.[`USD${from}`];
  const usdToTo = data?.quotes?.[`USD${to}`];

  if (typeof usdToFrom !== "number" || typeof usdToTo !== "number") {
    throw new Error("CurrencyLayer rate missing");
  }

  const rate = usdToTo / usdToFrom;

  return {
    from,
    to,
    rate,
    date: new Date((data.timestamp ?? Date.now() / 1000) * 1000)
      .toISOString()
      .slice(0, 10),
    source: "LIVE",
    provider: "CurrencyLayer",
    providerStatus: "Failover live FX via CurrencyLayer",
  };
}

export async function fetchFxRate(from: string, to: string): Promise<FxRate> {
  const key = `${from}-${to}`;

  const providers = [
    fetchFromFrankfurter,
    fetchFromExchangeRateApi,
    fetchFromCurrencyApiCdn,
    fetchFromFloatRates,
    fetchFromOpenExchangeRates,
    fetchFromFixer,
    fetchFromCurrencyLayer,
  ];

  for (const provider of providers) {
    try {
      return await provider(from, to);
    } catch {
      console.log("FX provider failed, trying next provider");
    }
  }

  return MOCK_RATES[key];
}

export async function fetchCorridorFxRates(): Promise<FxRate[]> {
  const corridors = [
    ["GBP", "PHP"],
    ["GBP", "MYR"],
  ];

  return Promise.all(corridors.map(([from, to]) => fetchFxRate(from, to)));
}