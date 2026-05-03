import { supabase } from "../lib/supabase";
import { Recipient, RouteQuote, Transfer } from "../types/transfer";

function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeRecipient(row: any): Recipient {
  return {
    name: row.recipient_name ?? "Recipient",
    country: row.recipient_country ?? "Destination",
    currency: row.recipient_currency ?? "PHP",
    payoutMethod: row.payout_method ?? "BANK",
    bankName: row.payout_method === "BANK" ? row.payout_provider ?? undefined : undefined,
    mobileWalletProvider:
      row.payout_method === "MOBILE_WALLET" ? row.payout_provider ?? undefined : undefined,
  } as Recipient;
}

export async function saveCompletedTransfer(transfer: Transfer) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return;
  }

  const recipient = transfer.recipient;
  const route = transfer.selectedRoute;

  const { error } = await supabase.from("transfers").upsert({
    id: transfer.id,
    user_id: user.id,
    sender_currency: transfer.senderCurrency,
    sender_amount: transfer.senderAmount,
    recipient_country: recipient.country,
    recipient_currency: recipient.currency,
    recipient_name: recipient.name,
    payout_method: recipient.payoutMethod,
    payout_provider:
      recipient.payoutMethod === "BANK"
        ? recipient.bankName ?? null
        : recipient.mobileWalletProvider ?? null,
    selected_route: route ?? null,
    status: transfer.status,
    updated_at: new Date().toISOString(),
    completed_at: transfer.status === "COMPLETED" ? new Date().toISOString() : null,
  });

  if (error) {
    console.warn("Failed to persist completed transfer", error.message);
  }
}

export async function loadCompletedTransfers(): Promise<Transfer[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from("transfers")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(25);

  if (error) {
    console.warn("Failed to load transfer history", error.message);
    return [];
  }

  return (data ?? []).map((row: any) => {
    const selectedRoute = row.selected_route as RouteQuote | undefined;

    return {
      id: row.id,
      senderCurrency: row.sender_currency ?? "GBP",
      senderAmount: toNumber(row.sender_amount),
      recipient: normalizeRecipient(row),
      routes: selectedRoute ? [selectedRoute] : [],
      selectedRoute,
      status: row.status ?? "COMPLETED",
      createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
    } as Transfer;
  });
}
