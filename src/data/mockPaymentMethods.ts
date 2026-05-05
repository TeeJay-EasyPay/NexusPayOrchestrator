export type SavedPaymentMethodType = "CARD" | "OPEN_BANKING";

export type SavedPaymentMethodStatus = "ACTIVE" | "CONNECTED" | "NEEDS_REAUTH";

export type SavedPaymentMethod = {
  id: string;
  type: SavedPaymentMethodType;
  label: string;
  subtitle: string;
  provider: string;
  reference: string;
  status: SavedPaymentMethodStatus;
  isPrimary: boolean;
  last4?: string;
  fundingLimitGbp: number;
};

export const mockPaymentMethods: SavedPaymentMethod[] = [
  {
    id: "card_visa_4242",
    type: "CARD",
    label: "Visa ending 4242",
    subtitle: "Debit card • Expires 12/26",
    provider: "Visa / Stripe test rail",
    reference: "card_4242",
    status: "ACTIVE",
    isPrimary: false,
    last4: "4242",
    fundingLimitGbp: 500,
  },
  {
    id: "bank_hsbc_open_banking",
    type: "OPEN_BANKING",
    label: "HSBC UK Current Account",
    subtitle: "Connected through Open Banking simulation",
    provider: "Open Banking / TrueLayer-style rail",
    reference: "bank_hsbc_uk",
    status: "CONNECTED",
    isPrimary: true,
    last4: "1188",
    fundingLimitGbp: 1000,
  },
];

export function getPrimaryPaymentMethod() {
  return mockPaymentMethods.find((method) => method.isPrimary) ?? mockPaymentMethods[0];
}
