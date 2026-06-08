import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, TextInput, View } from "react-native";

import {
    ConsumerAction,
    ConsumerCard,
    ConsumerPill,
    ConsumerShell,
    consumerColors,
} from "../../src/components/consumer/ConsumerShell";
import { AppText } from "../../src/components/ui/AppText";
import { corridors } from "../../src/data/corridors";
import { buildOrchestratedRouteQuotes } from "../../src/lib/settlementOrchestrator";
import { useTransfer } from "../../src/state/TransferContext";
import { useWallet } from "../../src/state/WalletContext";
import { Currency, FundingMethod, Recipient, RouteQuote } from "../../src/types/transfer";

function inputStyle() {
  return {
    borderWidth: 1,
    borderColor: consumerColors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: consumerColors.white,
    color: consumerColors.text,
    fontSize: 15,
  } as const;
}

function asString(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

export default function ConsumerSendScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { simulatedRlusdBalance } = useWallet();
  const { createTransfer, startTransfer } = useTransfer();

  const [amount, setAmount] = useState(asString(params.amount) || "250");
  const [firstName, setFirstName] = useState(asString(params.firstName));
  const [lastName, setLastName] = useState(asString(params.surname));
  const [manualCountry, setManualCountry] = useState(asString(params.country) || "Philippines");
  const [selectedBank, setSelectedBank] = useState("");
  const [manualSortCode, setManualSortCode] = useState(asString(params.bankCode));
  const [manualAccountNumber, setManualAccountNumber] = useState(asString(params.accountNumber));
  const [fundingMethod, setFundingMethod] = useState<FundingMethod>("CARD");
  const [fundingReference, setFundingReference] = useState("Visa **** 4242");
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const selectedCorridor = useMemo(
    () => corridors.find((item) => item.country === manualCountry),
    [manualCountry]
  );

  const bankProviders = useMemo(() => {
    const bankMethod = selectedCorridor?.payoutMethods.find((method) => method.type === "BANK");
    return bankMethod?.providers ?? [];
  }, [selectedCorridor]);

  const manualCurrency = (selectedCorridor?.currency ?? "PHP") as Currency;

  const parsedAmount = Number(amount);
  const sendAmount = Number.isFinite(parsedAmount) ? parsedAmount : 0;

  const recipient = useMemo<Recipient | null>(() => {
    const normalizedFirstName = firstName.trim();
    const normalizedLastName = lastName.trim();

    if (!normalizedFirstName || !normalizedLastName) {
      return null;
    }

    const normalizedName = `${normalizedFirstName} ${normalizedLastName}`.trim();

    if (normalizedName.toLowerCase() === "personal family recipient") {
      return null;
    }

    if (!selectedBank.trim()) {
      return null;
    }

    if (!manualSortCode.trim() || !manualAccountNumber.trim()) {
      return null;
    }

    return {
      name: normalizedName,
      firstName: normalizedFirstName,
      surname: normalizedLastName,
      country: manualCountry.trim() || "Philippines",
      currency: manualCurrency,
      payoutMethod: "BANK",
      bankName: selectedBank.trim(),
      bankCode: manualSortCode.trim(),
      accountNumber: manualAccountNumber.trim(),
    };
  }, [firstName, lastName, manualAccountNumber, manualCountry, manualCurrency, manualSortCode, selectedBank]);

  const allRoutes = useMemo<RouteQuote[]>(() => {
    if (!recipient || sendAmount <= 0) {
      return [];
    }

    return buildOrchestratedRouteQuotes({
      amount: sendAmount,
      currency: recipient.currency,
      simulatedRlusdBalance,
    });
  }, [recipient, sendAmount, simulatedRlusdBalance]);

  const routes = useMemo<RouteQuote[]>(() => {
    if (allRoutes.length === 0) {
      return [];
    }

    const cheapest = [...allRoutes].sort((a, b) => a.fee - b.fee)[0];
    const safest = [...allRoutes]
      .filter((route) => route.id !== cheapest.id)
      .sort((a, b) => b.score - a.score)[0];

    return safest ? [cheapest, safest] : [cheapest];
  }, [allRoutes]);

  const selectedRoute = routes.find((route) => route.id === selectedRouteId) ?? routes[0];

  function submitTransfer() {
    if (!recipient) {
      setErrorMessage("Enter recipient name, country, sort code, and account number.");
      return;
    }

    if (recipient.name.trim().toLowerCase() === "personal family recipient") {
      setErrorMessage("Recipient name must be a real named beneficiary.");
      return;
    }

    if (!recipient.bankCode?.trim()) {
      setErrorMessage("Recipient sort code is required.");
      return;
    }

    if (!recipient.accountNumber?.trim()) {
      setErrorMessage("Recipient account number is required.");
      return;
    }

    if (recipient.payoutMethod !== "BANK") {
      setErrorMessage("Recipient must be configured for bank payout with sort code and account number.");
      return;
    }

    if (!recipient.bankName?.trim()) {
      setErrorMessage("Select a destination bank for the chosen country.");
      return;
    }

    if (sendAmount <= 0) {
      setErrorMessage("Enter a valid amount greater than 0.");
      return;
    }

    if (!fundingReference.trim()) {
      setErrorMessage("Select a funding source before continuing.");
      return;
    }

    if (!selectedRoute) {
      setErrorMessage("Choose a delivery route to continue.");
      return;
    }

    createTransfer(sendAmount, {
      recipient,
      routes,
      selectedRoute,
      fundingMethod,
      fundingReference,
      fundingStatus: "AUTHORISED",
    });

    startTransfer();

    router.push("/consumer/track" as never);
  }

  return (
    <ConsumerShell
      eyebrow="SEND"
      title="Send money"
      subtitle="Quick, clear, and confidence-first transfer setup."
    >
      <ConsumerCard accent>
        <AppText variant="caption" color={consumerColors.muted}>
          Amount
        </AppText>
        <TextInput
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          placeholder="250"
          placeholderTextColor={consumerColors.muted}
          style={inputStyle()}
        />
      </ConsumerCard>

      <ConsumerCard>
        <AppText color={consumerColors.text} style={{ fontWeight: "900", fontSize: 18 }}>
          Recipient selection
        </AppText>
        <AppText variant="caption" color={consumerColors.muted}>
          Step 1: Select destination country
        </AppText>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {corridors.map((corridor) => {
            const active = corridor.country === manualCountry;
            return (
              <Pressable
                key={corridor.country}
                onPress={() => {
                  setManualCountry(corridor.country);
                  setSelectedBank("");
                  setErrorMessage(null);
                }}
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 8,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: active ? consumerColors.blue : consumerColors.border,
                  backgroundColor: active ? consumerColors.blueSoft : consumerColors.white,
                }}
              >
                <AppText
                  variant="caption"
                  style={{ color: active ? consumerColors.blueDark : consumerColors.muted, fontWeight: "900" }}
                >
                  {corridor.country} • {corridor.currency}
                </AppText>
              </Pressable>
            );
          })}
        </View>

        <AppText variant="caption" color={consumerColors.muted}>
          Step 2: Select bank for {manualCountry} ({manualCurrency})
        </AppText>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {bankProviders.map((provider) => {
            const active = provider === selectedBank;
            return (
              <Pressable
                key={provider}
                onPress={() => {
                  setSelectedBank(provider);
                  setErrorMessage(null);
                }}
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 8,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: active ? consumerColors.blue : consumerColors.border,
                  backgroundColor: active ? consumerColors.blueSoft : consumerColors.white,
                }}
              >
                <AppText
                  variant="caption"
                  style={{ color: active ? consumerColors.blueDark : consumerColors.muted, fontWeight: "900" }}
                >
                  {provider}
                </AppText>
              </Pressable>
            );
          })}
        </View>

        <AppText variant="caption" color={consumerColors.muted}>
          Step 3: Enter recipient name
        </AppText>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <TextInput
            value={firstName}
            onChangeText={(value) => {
              setFirstName(value);
              setErrorMessage(null);
            }}
            placeholder="First name"
            placeholderTextColor={consumerColors.muted}
            style={[inputStyle(), { flex: 1 }]}
          />
          <TextInput
            value={lastName}
            onChangeText={(value) => {
              setLastName(value);
              setErrorMessage(null);
            }}
            placeholder="Last name"
            placeholderTextColor={consumerColors.muted}
            style={[inputStyle(), { flex: 1 }]}
          />
        </View>

        <AppText variant="caption" color={consumerColors.muted}>
          Step 4: Enter recipient bank details
        </AppText>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <TextInput
            value={manualSortCode}
            onChangeText={(value) => {
              setManualSortCode(value);
              setErrorMessage(null);
            }}
            placeholder="Sort code"
            placeholderTextColor={consumerColors.muted}
            style={[inputStyle(), { flex: 1 }]}
          />
          <TextInput
            value={manualAccountNumber}
            onChangeText={(value) => {
              setManualAccountNumber(value);
              setErrorMessage(null);
            }}
            placeholder="Account number"
            placeholderTextColor={consumerColors.muted}
            style={[inputStyle(), { flex: 1 }]}
          />
        </View>
      </ConsumerCard>

      <ConsumerCard>
        <AppText color={consumerColors.text} style={{ fontWeight: "900", fontSize: 18 }}>
          Funding source
        </AppText>
        <AppText color={consumerColors.muted}>
          Select how this transfer is funded before execution.
        </AppText>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {[
            { id: "Visa **** 4242", method: "CARD" as FundingMethod },
            { id: "Visa **** 1088", method: "CARD" as FundingMethod },
            { id: "Barclays UK • Main", method: "OPEN_BANKING" as FundingMethod },
            { id: "HSBC UK • Current", method: "OPEN_BANKING" as FundingMethod },
          ].map((source) => {
            const active = fundingReference === source.id;
            return (
              <Pressable
                key={source.id}
                onPress={() => {
                  setFundingMethod(source.method);
                  setFundingReference(source.id);
                }}
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 8,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: active ? consumerColors.blue : consumerColors.border,
                  backgroundColor: active ? consumerColors.blueSoft : consumerColors.white,
                }}
              >
                <AppText
                  variant="caption"
                  style={{ color: active ? consumerColors.blueDark : consumerColors.muted, fontWeight: "900" }}
                >
                  {source.id}
                </AppText>
              </Pressable>
            );
          })}
        </View>
        <AppText color={consumerColors.muted}>
          Selected: {fundingMethod === "CARD" ? "Card" : "Bank account"} • {fundingReference}
        </AppText>
      </ConsumerCard>

      <ConsumerCard>
        <AppText color={consumerColors.text} style={{ fontWeight: "900", fontSize: 18 }}>
          Choose route
        </AppText>
        {routes.length === 0 ? (
          <AppText color={consumerColors.muted}>Enter recipient and amount to see available routes.</AppText>
        ) : null}
        {routes.map((route, index) => {
          const active = (selectedRoute?.id ?? "") === route.id;
          const routeLabel = index === 0 ? "Cheapest" : "Safest";
          return (
            <Pressable
              key={route.id}
              onPress={() => setSelectedRouteId(route.id)}
              style={{
                borderWidth: 1,
                borderColor: active ? consumerColors.blue : consumerColors.border,
                borderRadius: 8,
                padding: 12,
                gap: 7,
                backgroundColor: active ? consumerColors.blueSoft : consumerColors.white,
              }}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <AppText color={consumerColors.text} style={{ fontWeight: "900", fontSize: 17 }}>
                    {routeLabel} • {route.provider}
                  </AppText>
                  <AppText color={consumerColors.muted}>{route.rail} • ETA {route.estimatedTime}</AppText>
                </View>
                <ConsumerPill label={routeLabel} tone={index === 0 ? "gold" : "green"} />
              </View>
              <AppText color={consumerColors.muted}>
                {index === 0 ? "Lower fees" : "Reliable delivery"}
              </AppText>
              <AppText color={consumerColors.text} style={{ fontWeight: "900" }}>
                Amount received: {route.receiveAmount.toFixed(2)} {recipient?.currency ?? "PHP"}
              </AppText>
              <AppText color={consumerColors.muted}>FX rate: {route.fxRate.toFixed(2)}</AppText>
              <AppText color={consumerColors.muted}>Fee: GBP {route.fee.toFixed(2)}</AppText>
            </Pressable>
          );
        })}
      </ConsumerCard>

      <ConsumerCard accent>
        <AppText color={consumerColors.text} style={{ fontWeight: "900", fontSize: 18 }}>
          Before you continue
        </AppText>
        <AppText color={consumerColors.muted}>
          Transfer creation persists the record and opens tracking automatically.
        </AppText>
        {errorMessage ? (
          <AppText variant="caption" style={{ color: "#B91C1C", fontWeight: "900" }}>
            {errorMessage}
          </AppText>
        ) : null}
        <ConsumerAction label="Send" icon="arrow-right" onPress={submitTransfer} />
      </ConsumerCard>
    </ConsumerShell>
  );
}
