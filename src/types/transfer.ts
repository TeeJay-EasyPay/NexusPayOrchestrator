export type Currency = "GBP" | "PHP" | "MYR" | "AED" | "XRP" | "RLUSD";

export type RailType = "FIAT" | "CRYPTO" | "HYBRID";

export type PayoutMethod = "BANK" | "MOBILE_WALLET";

export interface Recipient {
  name: string;
  country: string;
  currency: Currency;
  payoutMethod: PayoutMethod;

  bankName?: string;
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

  steps: string[];
}

export interface Transfer {
  id: string;

  senderCurrency: Currency;
  senderAmount: number;

  recipient: Recipient;

  routes: RouteQuote[];
  selectedRoute?: RouteQuote;

  status:
    | "CREATED"
    | "ROUTES_FETCHED"
    | "ROUTE_SELECTED"
    | "IN_PROGRESS"
    | "COMPLETED"
    | "FAILED";

  createdAt: number;
}