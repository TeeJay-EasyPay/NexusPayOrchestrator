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
  institutionId?: string;
  institutionName?: string;
  provenance?: "SANDBOX" | "SIMULATED";
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
];

export function getPrimaryPaymentMethod() {
  return mockPaymentMethods.find((method) => method.isPrimary) ?? mockPaymentMethods[0];
}
