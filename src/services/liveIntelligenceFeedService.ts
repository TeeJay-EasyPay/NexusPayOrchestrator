import { supabase } from "../lib/supabase";

export type FeedHealth = "live" | "degraded" | "offline";

export type FXFeedItem = {
  pair: string;
  base: string;
  quote: string;
  rate: number;
  provider: string;
  asOf: string;
  health: FeedHealth;
};

export type TreasuryFeedItem = {
  currency: string;
  availableBalance: number;
  source: string;
  asOf: string;
  health: FeedHealth;
};

export type MarketHoursFeedItem = {
  market: string;
  region: string;
  status: "OPEN" | "CLOSED";
  localHour: number;
  asOf: string;
};

export type LiveIntelligenceFeeds = {
  fx: FXFeedItem[];
  treasury: TreasuryFeedItem[];
  marketHours: MarketHoursFeedItem[];
  refreshedAt: string;
};

const FX_PROVIDER = "Frankfurter";

function getMarketStatus(market: string, region: string, utcOffset: number): MarketHoursFeedItem {
  const now = new Date();
  const localHour = (now.getUTCHours() + utcOffset + 24) % 24;

  return {
    market,
    region,
    localHour,
    status: localHour >= 8 && localHour < 17 ? "OPEN" : "CLOSED",
    asOf: now.toISOString(),
  };
}

async function getLiveFXFeeds(): Promise<FXFeedItem[]> {
  const now = new Date().toISOString();

  try {
    const response = await fetch(
      "https://api.frankfurter.dev/v1/latest?base=GBP&symbols=PHP,MYR,USD"
    );

    if (!response.ok) {
      throw new Error(`FX provider returned ${response.status}`);
    }

    const data = await response.json();

    return Object.entries(data.rates ?? {}).map(([quote, rate]) => ({
      pair: `GBP/${quote}`,
      base: "GBP",
      quote,
      rate: Number(rate),
      provider: FX_PROVIDER,
      asOf: data.date ?? now,
      health: "live",
    }));
  } catch (error) {
    console.error("Live FX feed error:", error);
    return [];
  }
}

async function getLiveTreasuryFeeds(): Promise<TreasuryFeedItem[]> {
  const now = new Date().toISOString();

  try {
    const { data, error } = await supabase
      .from("transactions")
      .select("currency, amount");

    if (error) {
      throw error;
    }

    const balances: Record<string, number> = {};

    for (const row of data ?? []) {
      const currency = String(row.currency ?? "UNKNOWN").toUpperCase();
      const amount = Number(row.amount ?? 0);

      balances[currency] = (balances[currency] ?? 0) + amount;
    }

    return Object.entries(balances).map(([currency, availableBalance]) => ({
      currency,
      availableBalance,
      source: "Supabase transactions",
      asOf: now,
      health: "live",
    }));
  } catch (error) {
    console.error("Live treasury feed error:", error);
    return [];
  }
}

function getMarketHoursFeeds(): MarketHoursFeedItem[] {
  return [
    getMarketStatus("London", "UK", 1),
    getMarketStatus("New York", "US", -4),
    getMarketStatus("Singapore", "ASEAN", 8),
    getMarketStatus("Tokyo", "APAC", 9),
  ];
}

export async function getLiveIntelligenceFeeds(): Promise<LiveIntelligenceFeeds> {
  const [fx, treasury] = await Promise.all([
    getLiveFXFeeds(),
    getLiveTreasuryFeeds(),
  ]);

  return {
    fx,
    treasury,
    marketHours: getMarketHoursFeeds(),
    refreshedAt: new Date().toISOString(),
  };
}