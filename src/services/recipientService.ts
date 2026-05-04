import { supabase } from "../lib/supabase";
import { SavedRecipient } from "../types/recipient";
import { Transfer } from "../types/transfer";

function buildRecipientId(userId: string, transfer: Transfer) {
  const r = transfer.recipient;
  return `${userId}-${r.country}-${r.payoutMethod}-${r.accountNumber ?? r.mobileNumber ?? r.name}`;
}

export async function saveRecipientFromTransfer(transfer: Transfer) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  const r = transfer.recipient;
  const id = buildRecipientId(user.id, transfer);

  const { error } = await supabase.from("recipients").upsert({
    id,
    user_id: user.id,
    name: r.name,
    first_name: r.firstName,
    middle_name: r.middleName,
    surname: r.surname,
    country: r.country,
    currency: r.currency,
    payout_method: r.payoutMethod,
    bank_name: r.bankName,
    bank_code: r.bankCode,
    account_number: r.accountNumber,
    mobile_wallet_provider: r.mobileWalletProvider,
    mobile_number: r.mobileNumber,
    last_used_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  if (error) {
    console.warn("Failed to save recipient", error.message);
  }
}

export async function loadSavedRecipients(): Promise<SavedRecipient[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from("recipients")
    .select("*")
    .eq("user_id", user.id)
    .order("last_used_at", { ascending: false })
    .limit(10);

  if (error) {
    console.warn("Failed to load recipients", error.message);
    return [];
  }

  return (data ?? []).map((row: any) => ({
    id: row.id,
    name: row.name,
    firstName: row.first_name,
    middleName: row.middle_name,
    surname: row.surname,
    country: row.country,
    currency: row.currency,
    payoutMethod: row.payout_method,
    bankName: row.bank_name,
    bankCode: row.bank_code,
    accountNumber: row.account_number,
    mobileWalletProvider: row.mobile_wallet_provider,
    mobileNumber: row.mobile_number,
    lastUsedAt: new Date(row.last_used_at).getTime(),
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
  }));
}
