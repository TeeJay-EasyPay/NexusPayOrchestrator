export type Currency = "GBP" | "PHP" | "MYR" | "AED" | "XRP" | "RLUSD";

export type RailType = "FIAT" | "CRYPTO" | "HYBRID";

export type PayoutMethod = "BANK" | "MOBILE_WALLET";

export type FundingMethod = "OPEN_BANKING" | "CARD";

export type FundingStatus =
  | "NOT_STARTED"
  | "AUTHORISING"
  | "AUTHORISED"
  | "SETTLED"
  | "FAILED";

export type LiquidityStatus =
  | "AVAILABLE"
  | "LOW"
  | "INSUFFICIENT"
  | "NOT_REQUIRED";

export type PartnerHealth =
  | "EXCELLENT"
  | "GOOD"
  | "WATCH"
  | "DEGRADED";

export type RouteFamily =
  | "FASTEST"
  | "LOWEST_COST"
  | "BEST_LIQUIDITY"
  | "DIGITAL_BRIDGE"
  | "BACKUP";

export interface Recipient {
  name: string;
  firstName?: string;
  middleName?: string;
  surname?: string;
  country: string;
  currency: Currency;
  payoutMethod: PayoutMethod;

  bankName?: string;
  bankCode?: string;
  accountNumber?: string;

  mobileWalletProvider?: string;
  mobileNumber?: string;
}

export interface RouteQuote {
  id: string;
  rail: RailType;
  provider: string;

  sendAmount: number;
  receiveAmount: number;
  fxRate: number;
  fee: number;

  estimatedTime: string;
  score: number;

  bridgeAsset?: Currency;

  liquidityRequiredRlusd?: number;

  liquidityAvailable?: boolean;

  liquidityStatus?: LiquidityStatus;

  routeFamily?: RouteFamily;

  routeRankLabel?: string;

  evaluatedRoutesCount?: number;

  partnerHealth?: PartnerHealth;

  partnerUptime?: number;

  speedScore?: number;

  costScore?: number;

  liquidityScore?: number;

  reliabilityScore?: number;

  orchestrationReason?: string;

  settlementStages?: string[];

  routeConfidence?: number;

  steps: string[];
}

export interface Transfer {
  id: string;

  senderCurrency: Currency;
  senderAmount: number;

  recipient: Recipient;

  routes: RouteQuote[];
  selectedRoute?: RouteQuote;

  fundingMethod?: FundingMethod;
  fundingStatus?: FundingStatus;
  fundingReference?: string;
  fundingAuthorisedAt?: number;

  status:
    | "CREATED"
    | "ROUTES_FETCHED"
    | "ROUTE_SELECTED"
    | "FUNDING_SELECTED"
    | "FUNDING_AUTHORISED"
    | "IN_PROGRESS"
    | "COMPLETED"
    | "FAILED";

  createdAt: number;
}