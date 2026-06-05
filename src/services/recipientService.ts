import { supabase } from "../lib/supabase";
import { getStoredAccountScope } from "../state/AccountContext";
import { SavedRecipient } from "../types/recipient";
import { Currency, PayoutMethod, Recipient, RouteQuote, Transfer } from "../types/transfer";
import { writeAuditLog } from "./auditLog";

function toCleanString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function toCurrency(value: unknown, fallback: Currency = "PHP"): Currency {
  const allowedCurrencies: Currency[] = [
    "GBP",
    "PHP",
    "MYR",
    "AED",
    "SAR",
    "QAR",
    "KWD",
    "BHD",
    "OMR",
    "SGD",
    "THB",
    "IDR",
    "VND",
    "XRP",
    "RLUSD",
  ];
  return allowedCurrencies.includes(value as Currency) ? (value as Currency) : fallback;
}

function toPayoutMethod(value: unknown, fallback: PayoutMethod = "BANK"): PayoutMethod {
  return value === "BANK" || value === "MOBILE_WALLET" ? value : fallback;
}

function getLast4(value?: string) {
  return value && value.length >= 4 ? value.slice(-4) : undefined;
}

function splitRecipientName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return { firstName: "", middleName: "", surname: "" };
  }

  if (parts.length === 1) {
    return { firstName: parts[0], middleName: "", surname: "" };
  }

  return {
    firstName: parts[0],
    middleName: parts.length > 2 ? parts.slice(1, -1).join(" ") : "",
    surname: parts[parts.length - 1],
  };
}

function buildRecipientId(userId: string, transfer: Transfer, scope: "demo" | "personal") {
  const r = transfer.recipient;
  const uniqueReference = r.accountNumber ?? r.mobileNumber ?? r.name ?? transfer.id;

  return `${userId}-${scope}-${r.country}-${r.payoutMethod}-${uniqueReference}`
    .replace(/\s+/g, "-")
    .toLowerCase();
}

function buildRecipientKey(recipient: Partial<Recipient>) {
  return [
    recipient.country,
    recipient.payoutMethod,
    recipient.accountNumber ?? recipient.mobileNumber ?? recipient.name,
  ]
    .filter(Boolean)
    .join("-");
}

function getRecipientSnapshot(row: any): Partial<Recipient> {
  const selectedRoute = row.selected_route as (RouteQuote & {
    recipientSnapshot?: Partial<Recipient>;
  }) | null;

  return selectedRoute?.recipientSnapshot ?? {};
}

function recipientFromTransferRow(row: any, userId: string): SavedRecipient {
  const snapshot = getRecipientSnapshot(row);
  const name = toCleanString(snapshot.name) || toCleanString(row.recipient_name) || "Recipient";
  const splitName = splitRecipientName(name);
  const hasStructuredName = snapshot.firstName || snapshot.middleName || snapshot.surname;
  const payoutMethod = toPayoutMethod(snapshot.payoutMethod ?? row.payout_method);
  const payoutProvider = toCleanString(row.payout_provider);
  const country = toCleanString(snapshot.country) || toCleanString(row.recipient_country) || "Destination";

  return {
    id: `${userId}-${row.id}`,
    name,
    firstName: hasStructuredName
      ? toCleanString(snapshot.firstName) || undefined
      : splitName.firstName || undefined,
    middleName: hasStructuredName
      ? toCleanString(snapshot.middleName) || undefined
      : splitName.middleName || undefined,
    surname: hasStructuredName
      ? toCleanString(snapshot.surname) || undefined
      : splitName.surname || undefined,
    country,
    currency: toCurrency(snapshot.currency ?? row.recipient_currency),
    payoutMethod,
    bankName:
      payoutMethod === "BANK"
        ? toCleanString(snapshot.bankName) || payoutProvider || undefined
        : undefined,
    bankCode:
      payoutMethod === "BANK" ? toCleanString(snapshot.bankCode) || undefined : undefined,
    accountNumber:
      payoutMethod === "BANK"
        ? toCleanString(snapshot.accountNumber) || undefined
        : undefined,
    mobileWalletProvider:
      payoutMethod === "MOBILE_WALLET"
        ? toCleanString(snapshot.mobileWalletProvider) || payoutProvider || undefined
        : undefined,
    mobileNumber:
      payoutMethod === "MOBILE_WALLET"
        ? toCleanString(snapshot.mobileNumber) || undefined
        : undefined,
    isFavorite: false,
    lastUsedAt: row.completed_at
      ? new Date(row.completed_at).getTime()
      : row.created_at
        ? new Date(row.created_at).getTime()
        : Date.now(),
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
  };
}

async function loadRecipientsFromTransfers(userId: string): Promise<SavedRecipient[]> {
  const scope = await getStoredAccountScope();
  const { data, error } = await supabase
    .from("transfers")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "COMPLETED")
    .order("created_at", { ascending: false })
    .limit(25);

  if (error) {
    console.warn("Failed to derive recipients from transfer history", error.message);
    return [];
  }

  const dedupedRecipients = new Map<string, SavedRecipient>();

  for (const row of data ?? []) {
    const selectedRoute = row.selected_route as RouteQuote | undefined;
    const rowScope = selectedRoute?.accountScope ?? "demo";

    if (rowScope !== scope) continue;

    const recipient = recipientFromTransferRow(row, `${userId}-${scope}`);
    const key = buildRecipientKey(recipient);

    if (!key) continue;

    if (!dedupedRecipients.has(key)) {
      dedupedRecipients.set(key, recipient);
    }
  }

  return Array.from(dedupedRecipients.values()).slice(0, 10);
}

export async function saveRecipientFromTransfer(transfer: Transfer) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    console.warn("Recipient save skipped: no authenticated Supabase user");
    return;
  }

  const scope = transfer.accountScope ?? (await getStoredAccountScope());

  const r = transfer.recipient;

  if (!r?.name || !r.country || !r.currency || !r.payoutMethod) {
    console.warn("Recipient save skipped: missing recipient details", r);
    return;
  }

  const id = buildRecipientId(user.id, transfer, scope);
  const payload = {
    id,
    user_id: user.id,
    name: r.name,
    first_name: r.firstName ?? null,
    middle_name: r.middleName ?? null,
    surname: r.surname ?? null,
    country: r.country,
    currency: r.currency,
    payout_method: r.payoutMethod,
    bank_name: r.bankName ?? null,
    bank_code: r.bankCode ?? null,
    account_number: r.accountNumber ?? null,
    mobile_wallet_provider: r.mobileWalletProvider ?? null,
    mobile_number: r.mobileNumber ?? null,
    is_favorite: false,
    last_used_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("recipients").upsert(payload, {
    onConflict: "id",
  });

  if (error) {
    console.warn("Failed to save recipient", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
      payload,
    });
    return;
  }

  await writeAuditLog({
    eventType: "RECIPIENT_SAVED",
    entityType: "recipient",
    entityId: id,
    metadata: {
      name: r.name,
      country: r.country,
      currency: r.currency,
      payout_method: r.payoutMethod,
      provider: r.payoutMethod === "BANK" ? r.bankName : r.mobileWalletProvider,
      account_last4: getLast4(r.accountNumber),
      mobile_last4: getLast4(r.mobileNumber),
    },
  });

  console.log("Recipient saved", id);
}

export async function loadSavedRecipients(): Promise<SavedRecipient[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const scope = await getStoredAccountScope();

  const { data, error } = await supabase
    .from("recipients")
    .select("*")
    .eq("user_id", user.id)
    .order("is_favorite", { ascending: false })
    .order("last_used_at", { ascending: false })
    .limit(10);

  if (error) {
    console.warn("Failed to load recipients table, falling back to transfers", error.message);
    return loadRecipientsFromTransfers(user.id);
  }

  const scopedRows = (data ?? []).filter((row: any) =>
    String(row.id ?? "").startsWith(`${user.id}-${scope}-`)
  );

  if (scopedRows.length === 0) {
    return loadRecipientsFromTransfers(user.id);
  }

  return scopedRows.map((row: any) => ({
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
    isFavorite: row.is_favorite ?? false,
    lastUsedAt: row.last_used_at ? new Date(row.last_used_at).getTime() : Date.now(),
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
  }));
}

export async function toggleRecipientFavorite(recipient: SavedRecipient) {
  const nextValue = !recipient.isFavorite;

  const { error } = await supabase
    .from("recipients")
    .update({
      is_favorite: nextValue,
      updated_at: new Date().toISOString(),
    })
    .eq("id", recipient.id);

  if (error) {
    console.warn("Failed to toggle favourite", error.message);
    return;
  }

  await writeAuditLog({
    eventType: nextValue ? "RECIPIENT_FAVORITED" : "RECIPIENT_UNFAVORITED",
    entityType: "recipient",
    entityId: recipient.id,
    metadata: {
      name: recipient.name,
      country: recipient.country,
      currency: recipient.currency,
      payout_method: recipient.payoutMethod,
      provider:
        recipient.payoutMethod === "BANK"
          ? recipient.bankName
          : recipient.mobileWalletProvider,
    },
  });
}
