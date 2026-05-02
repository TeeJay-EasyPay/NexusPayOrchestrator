import { Currency, PayoutMethod } from "../types/transfer";

export interface Corridor {
  country: string;
  currency: Currency;
  payoutMethods: {
    type: PayoutMethod;
    providers: string[];
  }[];
}

export const corridors: Corridor[] = [
  {
    country: "Philippines",
    currency: "PHP",
    payoutMethods: [
      {
        type: "BANK",
        providers: ["BDO", "BPI", "Metrobank"],
      },
      {
        type: "MOBILE_WALLET",
        providers: ["GCash", "Maya"],
      },
    ],
  },
  {
    country: "Malaysia",
    currency: "MYR",
    payoutMethods: [
      {
        type: "BANK",
        providers: ["Maybank", "CIMB", "Public Bank"],
      },
    ],
  },
  {
    country: "UAE",
    currency: "AED",
    payoutMethods: [
      {
        type: "BANK",
        providers: ["Emirates NBD", "ADCB"],
      },
    ],
  },
];