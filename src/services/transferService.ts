import { supabase } from "../lib/supabase";
import { getStoredAccountScope } from "../state/AccountContext";
import { getStoredPersonaId } from "../state/PersonaContext";
import { Currency, FundingMethod, FundingStatus, PayoutMethod, Recipient, RouteQuote, Transfer } from "../types/transfer";

function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
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

function toFundingMethod(value: unknown): FundingMethod | undefined {
  return value === "OPEN_BANKING" || value === "CARD" ? value : undefined;
}

function toFundingStatus(value: unknown): FundingStatus | undefined {
  const allowed: FundingStatus[] = ["NOT_STARTED", "AUTHORISING", "AUTHORISED", "SETTLED", "FAILED"];
  return allowed.includes(value as FundingStatus) ? (value as FundingStatus) : undefined;
}

function toCleanString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
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

function getRecipientSnapshot(row: any): Partial<Recipient> {
  const selectedRoute = row.selected_route as (RouteQuote & {
    recipientSnapshot?: Partial<Recipient>;
  }) | null;

  return selectedRoute?.recipientSnapshot ?? {};
}

function normalizeRecipient(row: any): Recipient {
  const snapshot = getRecipientSnapshot(row);
  const recipientName =
    toCleanString(snapshot.name) || toCleanString(row.recipient_name) || "Recipient";
  const splitName = splitRecipientName(recipientName);

  const hasStructuredName = snapshot.firstName || snapshot.middleName || snapshot.surname;

  const payoutMethod = toPayoutMethod(snapshot.payoutMethod ?? row.payout_method);
  const country =
    toCleanString(snapshot.country) || toCleanString(row.recipient_country) || "Destination";
  const currency = toCurrency(snapshot.currency ?? row.recipient_currency);
  const payoutProvider = toCleanString(row.payout_provider);

  return {
    name: recipientName,
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
    currency,
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
  };
}

function buildSelectedRoutePayload(transfer: Transfer) {
  if (!transfer.selectedRoute) return null;

  return {
    ...transfer.selectedRoute,
    accountScope: transfer.accountScope,
    personaId: transfer.personaId,
    recipientSnapshot: transfer.recipient,
  };
}

export async function saveTransferProgress(transfer: Transfer) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return;
  }

  const accountScope = transfer.accountScope ?? (await getStoredAccountScope());
  const personaId = transfer.personaId ?? (await getStoredPersonaId());

  const recipient = transfer.recipient ?? ({} as Recipient);
  const routePayload = buildSelectedRoutePayload({ ...transfer, accountScope, personaId });
  const now = new Date().toISOString();

  const { error } = await supabase.from("transfers").upsert({
    id: transfer.id,
    user_id: user.id,
    sender_currency: transfer.senderCurrency,
    sender_amount: transfer.senderAmount,
    recipient_country: recipient.country ?? "Destination",
    recipient_currency: recipient.currency ?? "PHP",
    recipient_name: recipient.name ?? "Recipient",
    payout_method: recipient.payoutMethod ?? "BANK",
    payout_provider:
      recipient.payoutMethod === "BANK"
        ? recipient.bankName ?? null
        : recipient.mobileWalletProvider ?? null,
    selected_route: routePayload,
    funding_method: transfer.fundingMethod ?? null,
    funding_status: transfer.fundingStatus ?? null,
    funding_reference: transfer.fundingReference ?? null,
    funding_authorised_at: transfer.fundingAuthorisedAt
      ? new Date(transfer.fundingAuthorisedAt).toISOString()
      : null,
    status: transfer.status,
    open_banking_flow_id: transfer.openBankingFlow?.id ?? null,
    open_banking_provider: transfer.openBankingFlow?.providerId ?? null,
    open_banking_status: transfer.openBankingFlow?.status ?? null,
    updated_at: now,
    completed_at: transfer.status === "COMPLETED" ? now : null,
  });

  if (error) {
    console.warn("Failed to persist transfer progress", error.message);
  }
}

export async function saveCompletedTransfer(transfer: Transfer) {
  await saveTransferProgress({ ...transfer, status: "COMPLETED" });
}

export async function loadCompletedTransfers(): Promise<Transfer[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const accountScope = await getStoredAccountScope();
  const activePersonaId = await getStoredPersonaId();

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

  return (data ?? [])
    .map((row: any) => {
    const selectedRoute = row.selected_route as RouteQuote | undefined;
    const rowScope = (selectedRoute?.accountScope as "demo" | "personal" | undefined) ?? "demo";
    const rowPersonaId = selectedRoute?.personaId ?? "personal-user";

    if (rowScope !== accountScope) {
      return null;
    }

    if (accountScope === "personal" && rowPersonaId !== activePersonaId) {
      return null;
    }

    return {
      id: row.id,
      senderCurrency: toCurrency(row.sender_currency, "GBP"),
      senderAmount: toNumber(row.sender_amount),
      recipient: normalizeRecipient(row),
      routes: selectedRoute ? [selectedRoute] : [],
      selectedRoute,
      fundingMethod: toFundingMethod(row.funding_method),
      fundingStatus: toFundingStatus(row.funding_status),
      fundingReference: row.funding_reference ?? undefined,
      fundingAuthorisedAt: row.funding_authorised_at ? new Date(row.funding_authorised_at).getTime() : undefined,
      status: row.status ?? "COMPLETED",
      createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
      accountScope: rowScope,
      personaId: rowPersonaId,
    } as Transfer;
  })
    .filter((item): item is Transfer => Boolean(item));
}
