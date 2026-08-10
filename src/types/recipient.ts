import { AirwallexTransferMethod, Currency, PayoutMethod, PayoutProviderSelection } from "./transfer";

export interface SavedRecipient {
  id: string;
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
  airwallexTransferMethod?: AirwallexTransferMethod;
  airwallexBeneficiaryFields?: Record<string, string>;
  airwallexSchemaFetchedAt?: string;
  payoutProviderId?: PayoutProviderSelection;
  niumPayoutMethod?: "LOCAL";
  niumBeneficiaryFields?: Record<string, string>;
  niumSchemaFetchedAt?: string;
  mobileWalletProvider?: string;
  mobileNumber?: string;
  isFavorite: boolean;
  lastUsedAt: number;
  createdAt: number;
}
