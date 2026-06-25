import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
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
import { useNexusAIScreenSetting } from "../../src/hooks/useNexusAISettings";
import { buildOrchestratedRouteQuotes } from "../../src/lib/settlementOrchestrator";
import { explainRoute } from "../../src/services/nexusAIService";
import { startOpenBankingPaymentFlow } from "../../src/services/openBankingPaymentFlowService";
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
  const { transfer, createTransfer, startTransfer, setOpenBankingFlow } = useTransfer();
  const { enabled: routeAIEnabled, settings: aiSettings } = useNexusAIScreenSetting("route_enabled");

  const [amount, setAmount] = useState(asString(params.amount) || "250");
  const [firstName, setFirstName] = useState(asString(params.firstName));
  const [lastName, setLastName] = useState(asString(params.surname));
  const [manualCountry, setManualCountry] = useState(asString(params.country) || "Philippines");
  const [selectedBank, setSelectedBank] = useState(asString(params.bankName));
  const [manualSortCode, setManualSortCode] = useState(asString(params.bankCode));
  const [manualAccountNumber, setManualAccountNumber] = useState(asString(params.accountNumber));
  const [fundingMethod, setFundingMethod] = useState<FundingMethod>((asString(params.fundingMethod) as FundingMethod) || "CARD");
  const [fundingReference, setFundingReference] = useState(asString(params.fundingReference) || "Visa **** 4242");
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(
    asString(params.fundingReference)
      ? 3
      : asString(params.firstName) || asString(params.surname) || asString(params.bankCode)
        ? 2
        : 1
  );
  const [showAllCountries, setShowAllCountries] = useState(false);
  const [routeAiSummary, setRouteAiSummary] = useState<string | null>(null);
  const [routeAiLoading, setRouteAiLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const selectedCorridor = useMemo(
    () => corridors.find((item) => item.country === manualCountry),
    [manualCountry]
  );

  const bankProviders = useMemo(() => {
    const bankMethod = selectedCorridor?.payoutMethods.find((method) => method.type === "BANK");
    return bankMethod?.providers ?? [];
  }, [selectedCorridor]);

  const manualCurrency = (selectedCorridor?.currency ?? "PHP") as Currency;
  const visibleCorridors = useMemo(() => {
    const selected = corridors.find((item) => item.country === manualCountry);
    const compact = corridors.slice(0, 6);

    if (showAllCountries) {
      return corridors;
    }

    if (!selected || compact.some((item) => item.country === selected.country)) {
      return compact;
    }

    return [selected, ...compact.slice(0, 5)];
  }, [manualCountry, showAllCountries]);

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
  const recipientNameValid = firstName.trim().length > 0 && lastName.trim().length > 0;
  const recipientBankValid =
    selectedBank.trim().length > 0 &&
    manualSortCode.trim().length > 0 &&
    manualAccountNumber.trim().length > 0;
  const recipientReady = Boolean(recipient);
  const fundingReady = fundingReference.trim().length > 0;
  const routeReady = Boolean(selectedRoute);

  function continueToFunding() {
    if (sendAmount <= 0) {
      setErrorMessage("Enter amount before continuing.");
      setCurrentStep(1);
      return;
    }

    if (!recipientReady) {
      setErrorMessage("Complete recipient details before continuing.");
      setCurrentStep(1);
      return;
    }

    setErrorMessage(null);
    setCurrentStep(2);
  }

  function continueToRoute() {
    if (!fundingReady) {
      setErrorMessage("Select a funding source before continuing.");
      setCurrentStep(2);
      return;
    }

    setErrorMessage(null);
    setCurrentStep(3);
  }

  function continueToReview() {
    if (!routeReady) {
      setErrorMessage("Choose a delivery route to continue.");
      setCurrentStep(3);
      return;
    }

    setErrorMessage(null);
    setCurrentStep(4);
  }

  useEffect(() => {
    if (transfer?.status !== "COMPLETED") {
      return;
    }

    setAmount("250");
    setFirstName("");
    setLastName("");
    setManualCountry("Philippines");
    setSelectedBank("");
    setManualSortCode("");
    setManualAccountNumber("");
    setFundingMethod("CARD");
    setFundingReference("Visa **** 4242");
    setSelectedRouteId(null);
    setCurrentStep(1);
    setRouteAiSummary(null);
    setErrorMessage(null);
  }, [transfer?.status]);

  useEffect(() => {
    if (!routeAIEnabled || !selectedRoute || !recipient) {
      setRouteAiSummary(null);
      return;
    }

    let active = true;
    setRouteAiLoading(true);

    void explainRoute(
      {
        corridor: `${recipient.country} (${recipient.currency})`,
        routeScore: selectedRoute.score,
        liquidityScore: selectedRoute.liquidityScore ?? selectedRoute.score,
        treasuryScore: selectedRoute.treasuryScore ?? selectedRoute.score,
        settlementEstimate: selectedRoute.estimatedTime,
      },
      aiSettings?.sensitivity ?? "balanced",
      {
        timeoutMs: 6500,
        maxRetries: 1,
        _routeQuote: selectedRoute,
      }
    ).then((result) => {
      if (!active) return;
      setRouteAiSummary(result.data.bullets[0] ?? null);
      setRouteAiLoading(false);
    });

    return () => {
      active = false;
    };
  }, [aiSettings?.sensitivity, recipient, routeAIEnabled, selectedRoute]);

  async function submitTransfer() {
    if (submitting) {
      return;
    }

    if (!recipient) {
      setErrorMessage("Enter recipient name, country, sort code, and account number.");
      setCurrentStep(1);
      return;
    }

    if (recipient.name.trim().toLowerCase() === "personal family recipient") {
      setErrorMessage("Recipient name must be a real named beneficiary.");
      setCurrentStep(1);
      return;
    }

    if (!recipient.bankCode?.trim()) {
      setErrorMessage("Recipient sort code is required.");
      setCurrentStep(1);
      return;
    }

    if (!recipient.accountNumber?.trim()) {
      setErrorMessage("Recipient account number is required.");
      setCurrentStep(1);
      return;
    }

    if (recipient.payoutMethod !== "BANK") {
      setErrorMessage("Recipient must be configured for bank payout with sort code and account number.");
      setCurrentStep(1);
      return;
    }

    if (!recipient.bankName?.trim()) {
      setErrorMessage("Select a destination bank for the chosen country.");
      setCurrentStep(1);
      return;
    }

    if (sendAmount <= 0) {
      setErrorMessage("Enter a valid amount greater than 0.");
      setCurrentStep(1);
      return;
    }

    if (!fundingReference.trim()) {
      setErrorMessage("Select a funding source before continuing.");
      setCurrentStep(2);
      return;
    }

    if (!selectedRoute) {
      setErrorMessage("Choose a delivery route to continue.");
      setCurrentStep(3);
      return;
    }

    setSubmitting(true);

    const newTransfer = createTransfer(sendAmount, {
      recipient,
      routes,
      selectedRoute,
      fundingMethod,
      fundingReference,
      fundingStatus: "AUTHORISED",
    });

    if (fundingMethod === "OPEN_BANKING") {
      try {
        const flow = await startOpenBankingPaymentFlow({
          transferId: newTransfer.id,
          amount: newTransfer.senderAmount,
          currency: newTransfer.senderCurrency,
          fundingReference,
        });
        setOpenBankingFlow(flow, newTransfer);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Open banking payment flow failed.");
        setSubmitting(false);
        return;
      }
    }

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
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
          <AppText color={consumerColors.text} style={{ fontWeight: "900", fontSize: 18 }}>
            Transfer summary
          </AppText>
          <ConsumerPill label={`Step ${currentStep}/4`} tone="blue" />
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          <ConsumerPill label={`Amount ${amount || "0"} GBP`} tone="blue" />
          <ConsumerPill label={`Destination ${manualCountry}`} tone="blue" />
          <ConsumerPill
            label={recipientReady ? "Recipient complete" : "Recipient pending"}
            tone={recipientReady ? "green" : "gold"}
          />
          <ConsumerPill
            label={fundingReady && routeReady ? "Funding and route ready" : "Funding/route pending"}
            tone={fundingReady && routeReady ? "green" : "gold"}
          />
        </View>
        <ConsumerAction
          label="View FX rates"
          icon="bar-chart-2"
          secondary
          onPress={() => router.push("/consumer/fx" as never)}
        />
      </ConsumerCard>

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
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <AppText color={consumerColors.text} style={{ fontWeight: "900", fontSize: 18 }}>
            Recipient details
          </AppText>
          <ConsumerPill label={recipientReady ? "Complete" : "Required"} tone={recipientReady ? "green" : "gold"} />
        </View>

        {currentStep !== 1 ? (
          <>
            <AppText color={consumerColors.muted}>
              {firstName.trim()} {lastName.trim()} • {manualCountry} • {selectedBank || "Bank pending"}
            </AppText>
            <ConsumerAction label="Edit recipient" icon="edit-2" secondary onPress={() => setCurrentStep(1)} />
          </>
        ) : (
          <>
            <AppText variant="caption" color={consumerColors.muted}>
              Step 1: Select destination country
            </AppText>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {visibleCorridors.map((corridor) => {
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
            <Pressable onPress={() => setShowAllCountries((open) => !open)}>
              <AppText variant="caption" color={consumerColors.blue} style={{ fontWeight: "900" }}>
                {showAllCountries ? "Show fewer countries" : "Show all countries"}
              </AppText>
            </Pressable>

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
            <AppText variant="caption" style={{ color: recipientNameValid ? consumerColors.success : consumerColors.muted }}>
              {recipientNameValid ? "Recipient name complete" : "Enter first and last name"}
            </AppText>

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
            <AppText variant="caption" style={{ color: recipientBankValid ? consumerColors.success : consumerColors.muted }}>
              {recipientBankValid ? "Bank details complete" : "Select bank and enter sort code + account number"}
            </AppText>

            <ConsumerAction label="Continue to funding" icon="arrow-right" onPress={continueToFunding} />
          </>
        )}
      </ConsumerCard>

      {currentStep >= 2 ? (
      <ConsumerCard>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <AppText color={consumerColors.text} style={{ fontWeight: "900", fontSize: 18 }}>
            Funding source
          </AppText>
          <ConsumerPill label={fundingReady ? "Selected" : "Required"} tone={fundingReady ? "green" : "gold"} />
        </View>

        {currentStep !== 2 ? (
          <>
            <AppText color={consumerColors.muted}>
              {fundingMethod === "CARD" ? "Card" : "Bank account"} • {fundingReference}
            </AppText>
            <ConsumerAction label="Edit funding" icon="edit-2" secondary onPress={() => setCurrentStep(2)} />
          </>
        ) : (
          <>
            <AppText color={consumerColors.muted}>
              Select a card or Yapily sandbox bank source before execution.
            </AppText>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {[
                { id: "Visa **** 4242", method: "CARD" as FundingMethod },
                { id: "Visa **** 1088", method: "CARD" as FundingMethod },
                { id: "Yapily Sandbox - Barclays UK", method: "OPEN_BANKING" as FundingMethod },
                { id: "Yapily Sandbox - HSBC UK", method: "OPEN_BANKING" as FundingMethod },
                { id: "Yapily Sandbox - Lloyds UK", method: "OPEN_BANKING" as FundingMethod },
              ].map((source) => {
                const active = fundingReference === source.id;
                return (
                  <Pressable
                    key={source.id}
                    onPress={() => {
                      setFundingMethod(source.method);
                      setFundingReference(source.id);
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
                      {source.id}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
            <AppText color={consumerColors.muted}>
              Selected: {fundingMethod === "CARD" ? "Card" : "Bank account"} • {fundingReference}
            </AppText>
            <ConsumerAction label="Continue to route" icon="arrow-right" onPress={continueToRoute} />
          </>
        )}
      </ConsumerCard>
      ) : null}

      {currentStep >= 3 ? (
      <ConsumerCard>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <AppText color={consumerColors.text} style={{ fontWeight: "900", fontSize: 18 }}>
            Choose route
          </AppText>
          <ConsumerPill label={routeReady ? "Selected" : "Required"} tone={routeReady ? "green" : "gold"} />
        </View>

        {currentStep !== 3 ? (
          <>
            <AppText color={consumerColors.muted}>
              {selectedRoute ? `${selectedRoute.provider} • ${selectedRoute.estimatedTime}` : "No route selected yet"}
            </AppText>
            <ConsumerAction label="Edit route" icon="edit-2" secondary onPress={() => setCurrentStep(3)} />
          </>
        ) : (
          <>
            {routes.length === 0 ? (
              <AppText color={consumerColors.muted}>Complete recipient and amount to load route options.</AppText>
            ) : null}
            {routes.map((route, index) => {
              const active = (selectedRoute?.id ?? "") === route.id;
              const routeLabel = index === 0 ? "Cheapest" : "Safest";
              return (
                <Pressable
                  key={route.id}
                  onPress={() => {
                    setSelectedRouteId(route.id);
                    setErrorMessage(null);
                  }}
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
            {routeAIEnabled ? (
              <View
                style={{
                  borderWidth: 1,
                  borderColor: consumerColors.border,
                  borderRadius: 8,
                  padding: 12,
                  backgroundColor: consumerColors.white,
                }}
              >
                <AppText color={consumerColors.text} style={{ fontWeight: "900" }}>
                  Nexus AI route insight
                </AppText>
                <AppText color={consumerColors.muted}>
                  {routeAiLoading
                    ? "Analysing route telemetry..."
                    : routeAiSummary ?? "Select a route to view AI confidence commentary."}
                </AppText>
              </View>
            ) : null}
            <ConsumerAction label="Continue to review" icon="arrow-right" onPress={continueToReview} />
          </>
        )}
      </ConsumerCard>
      ) : null}

      {currentStep >= 4 ? (
      <ConsumerCard accent>
        <AppText color={consumerColors.text} style={{ fontWeight: "900", fontSize: 18 }}>
          Review and send
        </AppText>
        {currentStep !== 4 ? (
          <AppText color={consumerColors.muted}>Complete previous steps to unlock final send confirmation.</AppText>
        ) : (
          <AppText color={consumerColors.muted}>
            Transfer creation persists the record and opens tracking automatically.
          </AppText>
        )}
        {errorMessage ? (
          <AppText variant="caption" style={{ color: "#B91C1C", fontWeight: "900" }}>
            {errorMessage}
          </AppText>
        ) : null}
        <ConsumerAction label={submitting ? "Preparing flow..." : "Send"} icon="arrow-right" onPress={submitTransfer} />
      </ConsumerCard>
      ) : null}
    </ConsumerShell>
  );
}
