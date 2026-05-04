import { Currency, PayoutMethod } from "./transfer";

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
  mobileWalletProvider?: string;
  mobileNumber?: string;
  isFavorite: boolean;
  lastUsedAt: number;
  createdAt: number;
}
