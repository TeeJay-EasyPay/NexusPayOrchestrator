
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
  corridor: string;
  region: "GCC" | "ASEAN" | "GLOBAL";
  liquidityScore: number;
  routeHealth: number;
  liquidityHealth: string;
  treasuryPressure: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  settlementSpeed: string;
  marketStatus: string;
  operationalStatus: "HEALTHY" | "DEGRADED" | "AT_RISK";
  aiRecommendationScore: number;
  fxStability: string;
  recommendation: string;
  insight: string;
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
      "https://api.frankfurter.dev/v1/latest?base=GBP&symbols=PHP,MYR,AED,SAR,QAR,KWD,BHD,OMR,SGD,THB,IDR,VND,USD"
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

  return [
    {
      corridor: "GBP → PHP",
      region: "ASEAN",
      liquidityScore: 92,
      routeHealth: 93,
      liquidityHealth: "STRONG",
      treasuryPressure: "LOW",
      settlementSpeed: "2-6 mins",
      marketStatus: "OPEN",
      operationalStatus: "HEALTHY",
      aiRecommendationScore: 94,
      fxStability: "HIGH",
      recommendation: "Preferred Corridor",
      insight:
        "London and Manila settlement windows currently overlap. FX conditions remain favourable.",
      asOf: now,
      health: "live",
    },
    {
      corridor: "GBP → MYR",
      region: "ASEAN",
      liquidityScore: 82,
      routeHealth: 84,
      liquidityHealth: "STRONG",
      treasuryPressure: "MEDIUM",
      settlementSpeed: "6-12 mins",
      marketStatus: "OPEN",
      operationalStatus: "HEALTHY",
      aiRecommendationScore: 86,
      fxStability: "HIGH",
      recommendation: "Normal Operations",
      insight:
        "Good corridor liquidity with stable market conditions across GBP and MYR.",
      asOf: now,
      health: "live",
    },
    {
      corridor: "GBP → SGD",
      region: "ASEAN",
      liquidityScore: 94,
      routeHealth: 92,
      liquidityHealth: "VERY STRONG",
      treasuryPressure: "LOW",
      settlementSpeed: "3-8 mins",
      marketStatus: "OPEN",
      operationalStatus: "HEALTHY",
      aiRecommendationScore: 93,
      fxStability: "VERY HIGH",
      recommendation: "Preferred Corridor",
      insight: "Singapore corridor shows deep liquidity and resilient operational performance.",
      asOf: now,
      health: "live",
    },
    {
      corridor: "GBP → THB",
      region: "ASEAN",
      liquidityScore: 81,
      routeHealth: 83,
      liquidityHealth: "STABLE",
      treasuryPressure: "MEDIUM",
      settlementSpeed: "8-16 mins",
      marketStatus: "OPEN",
      operationalStatus: "HEALTHY",
      aiRecommendationScore: 84,
      fxStability: "HIGH",
      recommendation: "Normal Operations",
      insight: "Thailand corridor remains stable with manageable pressure across payout rails.",
      asOf: now,
      health: "live",
    },
    {
      corridor: "GBP → IDR",
      region: "ASEAN",
      liquidityScore: 79,
      routeHealth: 81,
      liquidityHealth: "STABLE",
      treasuryPressure: "MEDIUM",
      settlementSpeed: "9-18 mins",
      marketStatus: "OPEN",
      operationalStatus: "DEGRADED",
      aiRecommendationScore: 82,
      fxStability: "MEDIUM",
      recommendation: "Monitor Capacity",
      insight: "Indonesia corridor is available with tighter treasury capacity thresholds.",
      asOf: now,
      health: "degraded",
    },
    {
      corridor: "GBP → VND",
      region: "ASEAN",
      liquidityScore: 78,
      routeHealth: 80,
      liquidityHealth: "STABLE",
      treasuryPressure: "MEDIUM",
      settlementSpeed: "10-20 mins",
      marketStatus: "OPEN",
      operationalStatus: "DEGRADED",
      aiRecommendationScore: 81,
      fxStability: "MEDIUM",
      recommendation: "Monitor Capacity",
      insight: "Vietnam corridor remains operational with elevated liquidity checks.",
      asOf: now,
      health: "degraded",
    },
    {
      corridor: "GBP → AED",
      region: "GCC",
      liquidityScore: 90,
      routeHealth: 91,
      liquidityHealth: "STRONG",
      treasuryPressure: "LOW",
      settlementSpeed: "5-12 mins",
      marketStatus: "OPEN",
      operationalStatus: "HEALTHY",
      aiRecommendationScore: 92,
      fxStability: "HIGH",
      recommendation: "Preferred GCC Corridor",
      insight: "UAE corridor is operating with strong liquidity and stable market windows.",
      asOf: now,
      health: "live",
    },
    {
      corridor: "GBP → SAR",
      region: "GCC",
      liquidityScore: 82,
      routeHealth: 85,
      liquidityHealth: "STABLE",
      treasuryPressure: "MEDIUM",
      settlementSpeed: "7-15 mins",
      marketStatus: "OPEN",
      operationalStatus: "HEALTHY",
      aiRecommendationScore: 86,
      fxStability: "HIGH",
      recommendation: "Normal Operations",
      insight: "Saudi corridor remains stable with moderate treasury pressure under peak demand.",
      asOf: now,
      health: "live",
    },
    {
      corridor: "GBP → QAR",
      region: "GCC",
      liquidityScore: 81,
      routeHealth: 84,
      liquidityHealth: "STABLE",
      treasuryPressure: "MEDIUM",
      settlementSpeed: "8-16 mins",
      marketStatus: "OPEN",
      operationalStatus: "HEALTHY",
      aiRecommendationScore: 85,
      fxStability: "HIGH",
      recommendation: "Normal Operations",
      insight: "Qatar corridor remains operational with balanced corridor risk controls.",
      asOf: now,
      health: "live",
    },
    {
      corridor: "GBP → KWD",
      region: "GCC",
      liquidityScore: 80,
      routeHealth: 83,
      liquidityHealth: "STABLE",
      treasuryPressure: "MEDIUM",
      settlementSpeed: "8-17 mins",
      marketStatus: "OPEN",
      operationalStatus: "DEGRADED",
      aiRecommendationScore: 84,
      fxStability: "MEDIUM",
      recommendation: "Monitor Capacity",
      insight: "Kuwait corridor remains available with heightened treasury monitoring.",
      asOf: now,
      health: "degraded",
    },
    {
      corridor: "GBP → BHD",
      region: "GCC",
      liquidityScore: 78,
      routeHealth: 81,
      liquidityHealth: "STABLE",
      treasuryPressure: "MEDIUM",
      settlementSpeed: "9-18 mins",
      marketStatus: "OPEN",
      operationalStatus: "DEGRADED",
      aiRecommendationScore: 82,
      fxStability: "MEDIUM",
      recommendation: "Monitor Capacity",
      insight: "Bahrain corridor is active with tighter treasury thresholds for larger tickets.",
      asOf: now,
      health: "degraded",
    },
    {
      corridor: "GBP → OMR",
      region: "GCC",
      liquidityScore: 77,
      routeHealth: 80,
      liquidityHealth: "WATCH",
      treasuryPressure: "HIGH",
      settlementSpeed: "10-20 mins",
      marketStatus: "OPEN",
      operationalStatus: "AT_RISK",
      aiRecommendationScore: 79,
      fxStability: "MEDIUM",
      recommendation: "Fallback Corridor",
      insight: "Oman corridor remains serviceable but should be monitored for high-value routes.",
      asOf: now,
      health: "degraded",
    },
    {
      corridor: "GBP → USD",
      region: "GLOBAL",
      liquidityScore: 97,
      routeHealth: 96,
      liquidityHealth: "VERY STRONG",
      treasuryPressure: "LOW",
      settlementSpeed: "2-5 mins",
      marketStatus: "OPEN",
      operationalStatus: "HEALTHY",
      aiRecommendationScore: 95,
      fxStability: "VERY HIGH",
      recommendation: "Preferred Settlement Route",
      insight:
        "Deep liquidity and strong settlement availability across both currencies.",
      asOf: now,
      health: "live",
    },
  ];
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

export const liveIntelligenceFeedsService = {
  getLatest: getLiveIntelligenceFeeds,
};
