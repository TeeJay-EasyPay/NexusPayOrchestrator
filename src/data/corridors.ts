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
  {
    country: "Saudi Arabia",
    currency: "SAR",
    payoutMethods: [
      {
        type: "BANK",
        providers: ["Al Rajhi Bank", "SNB", "Riyad Bank"],
      },
    ],
  },
  {
    country: "Qatar",
    currency: "QAR",
    payoutMethods: [
      {
        type: "BANK",
        providers: ["QNB", "Commercial Bank of Qatar"],
      },
    ],
  },
  {
    country: "Kuwait",
    currency: "KWD",
    payoutMethods: [
      {
        type: "BANK",
        providers: ["NBK", "KFH", "Boubyan Bank"],
      },
    ],
  },
  {
    country: "Bahrain",
    currency: "BHD",
    payoutMethods: [
      {
        type: "BANK",
        providers: ["NBB", "BBK", "Khaleeji Bank"],
      },
    ],
  },
  {
    country: "Oman",
    currency: "OMR",
    payoutMethods: [
      {
        type: "BANK",
        providers: ["Bank Muscat", "NBO", "Sohar International"],
      },
    ],
  },
  {
    country: "Singapore",
    currency: "SGD",
    payoutMethods: [
      {
        type: "BANK",
        providers: ["DBS", "OCBC", "UOB"],
      },
    ],
  },
  {
    country: "Thailand",
    currency: "THB",
    payoutMethods: [
      {
        type: "BANK",
        providers: ["Bangkok Bank", "Kasikornbank", "SCB"],
      },
    ],
  },
  {
    country: "Indonesia",
    currency: "IDR",
    payoutMethods: [
      {
        type: "BANK",
        providers: ["BCA", "Mandiri", "BNI"],
      },
    ],
  },
  {
    country: "Vietnam",
    currency: "VND",
    payoutMethods: [
      {
        type: "BANK",
        providers: ["Vietcombank", "BIDV", "Techcombank"],
      },
    ],
  },
];