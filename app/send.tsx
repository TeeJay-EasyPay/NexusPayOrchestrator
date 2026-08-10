import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, TextInput, View } from "react-native";

import { NexusAIToggleCard } from "../src/components/intelligence/NexusAIToggleCard";
import { DataProvenanceBadge } from "../src/components/operations-v2/DataProvenanceBadge";
import { AirwallexBeneficiaryFields } from "../src/components/payments/AirwallexBeneficiaryFields";
import { NiumBeneficiaryFields } from "../src/components/payments/NiumBeneficiaryFields";
import { SavedRecipientsCard } from "../src/components/recipients/SavedRecipientsCard";
import { AppButton } from "../src/components/ui/AppButton";
import { AppCard } from "../src/components/ui/AppCard";
import { AppText } from "../src/components/ui/AppText";
import { Screen } from "../src/components/ui/Screen";

import { corridors } from "../src/data/corridors";
import { useNexusAIScreenSetting } from "../src/hooks/useNexusAISettings";
import { useCanonicalRouteQuotes } from "../src/hooks/useCanonicalRouteQuotes";
import { useAirwallexBeneficiarySchema } from "../src/hooks/useAirwallexBeneficiarySchema";
import { useNiumBeneficiarySchema } from "../src/hooks/useNiumBeneficiarySchema";
import { writeAuditLog } from "../src/services/auditLog";
import {
  generateAirwallexSandboxRecipient,
  materializeAirwallexBeneficiaryFields,
  validateAirwallexBeneficiaryFields,
} from "../src/services/airwallexBeneficiarySchemaService";
import { materializeNiumBeneficiaryFields, validateNiumBeneficiaryFields } from "../src/services/niumBeneficiarySchemaService";
import {
    loadSavedRecipients,
    toggleRecipientFavorite,
} from "../src/services/recipientService";
import { useTransfer } from "../src/state/TransferContext";
import { useWallet } from "../src/state/WalletContext";
import { colors } from "../src/theme";
import { SavedRecipient } from "../src/types/recipient";
import { PayoutMethod, PayoutProviderSelection, Recipient, RouteQuote } from "../src/types/transfer";

function formatCurrency(value: number) {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function getStringParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function InputField({
  value,
  onChangeText,
  placeholder,
  keyboardType = "default",
  large = false,
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  keyboardType?: "default" | "decimal-pad" | "number-pad" | "phone-pad";
  large?: boolean;
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      keyboardType={keyboardType}
      placeholder={placeholder}
      placeholderTextColor={colors.textDarkMuted}
      style={{
        borderWidth: 1,
        borderColor: "#E1E8F0",
        borderRadius: 18,
        padding: large ? 20 : 15,
        fontSize: large ? 32 : 16,
        fontWeight: large ? "900" : "600",
        color: colors.textDarkPrimary,
        backgroundColor: "#F8FAFC",
      }}
    />
  );
}

function SelectorChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        paddingVertical: 12,
        paddingHorizontal: 15,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: selected ? colors.gold : "#E6ECF2",
        backgroundColor: selected ? colors.goldSoft : "#F6F8FB",
        shadowColor: selected ? colors.gold : "transparent",
        shadowOpacity: selected ? 0.18 : 0,
        shadowRadius: selected ? 10 : 0,
        elevation: selected ? 4 : 0,
        transform: [{ scale: pressed ? 0.98 : 1 }],
      })}
    >
      <AppText
        variant="caption"
        style={{
          color: selected ? colors.gold : colors.textDarkSecondary,
          fontWeight: "900",
        }}
      >
        {label}
      </AppText>
    </Pressable>
  );
}

function InfoPill({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <View
      style={{
        flex: 1,
        padding: 13,
        borderRadius: 18,
        backgroundColor: accent ? colors.goldSoft : "#F8FAFC",
        borderWidth: 1,
        borderColor: accent ? "#F1D99B" : "#E6ECF2",
        gap: 5,
      }}
    >
      <AppText variant="caption" color={accent ? colors.gold : colors.textDarkMuted}>
        {label}
      </AppText>
      <AppText
        variant="body"
        color={colors.textDarkPrimary}
        style={{ fontWeight: "900" }}
      >
        {value}
      </AppText>
    </View>
  );
}

function CanonicalRoutePreviewCard({
  route,
  currency,
  loading,
  error,
}: {
  route?: RouteQuote;
  currency?: string;
  loading: boolean;
  error: string | null;
}) {
  const plan = route?.routePlan;
  const fx = plan?.economics.fxRate;
  const recipient = plan?.economics.estimatedRecipientAmount;

  return (
    <AppCard>
      <View style={{ gap: 14 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
          <View style={{ gap: 4, flex: 1 }}>
            <AppText variant="subheading" color={colors.textDarkPrimary}>Route preview</AppText>
            <AppText variant="caption" color={colors.textDarkSecondary}>
              Generated by the canonical route engine from current provider evidence.
            </AppText>
          </View>
          {plan ? <DataProvenanceBadge classification={plan.eligible ? "DERIVED" : "UNAVAILABLE"} /> : null}
        </View>

        {loading ? (
          <AppText variant="body" color={colors.textDarkSecondary}>Checking live route evidence...</AppText>
        ) : error ? (
          <AppText variant="body" color="#B91C1C">{error}</AppText>
        ) : !plan ? (
          <AppText variant="body" color={colors.textDarkSecondary}>Enter an amount to calculate routes.</AppText>
        ) : (
          <>
            <View style={{ padding: 15, borderRadius: 8, backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#E2E8F0", gap: 8 }}>
              <AppText variant="caption" color={colors.textDarkMuted}>Canonical route</AppText>
              <AppText variant="body" color={colors.textDarkPrimary} style={{ fontWeight: "900" }}>
                {plan.funding.provider.providerName} → {plan.bridge.required ? `${plan.bridge.provider?.providerName} → ` : ""}{plan.payout.provider.providerName}
              </AppText>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                <DataProvenanceBadge classification="SANDBOX" />
                {fx ? <DataProvenanceBadge classification={fx.provenance} /> : null}
                {recipient ? <DataProvenanceBadge classification={recipient.provenance} /> : null}
              </View>
            </View>

            <View style={{ flexDirection: "row", gap: 8 }}>
              <InfoPill label="Score" value={plan.score.value === null ? "Unavailable" : `${plan.score.value}/100`} />
              <InfoPill label="ETA" value={plan.intelligence.etaMinutes.value === null ? "Unavailable" : `${Math.round(plan.intelligence.etaMinutes.value)} min`} />
              <InfoPill label="Cost" value={plan.economics.totalCost.value === null ? "Unavailable" : `£${plan.economics.totalCost.value.toFixed(2)}`} accent />
            </View>

            <View style={{ padding: 15, borderRadius: 8, backgroundColor: plan.eligible ? colors.goldSoft : "#F1F5F9", borderWidth: 1, borderColor: plan.eligible ? "#F1D99B" : "#CBD5E1", gap: 5 }}>
              <AppText variant="caption" color={colors.textDarkMuted}>Estimated recipient amount</AppText>
              <AppText variant="title" color={colors.textDarkPrimary}>
                {recipient?.value == null ? "Unavailable" : `${formatCurrency(recipient.value)} ${currency ?? ""}`}
              </AppText>
              <AppText variant="caption" color={colors.textDarkSecondary}>
                {fx?.value == null ? "Live FX unavailable" : `1 GBP ≈ ${fx.value.toFixed(4)} ${currency ?? ""} via ${fx.source}`}
              </AppText>
            </View>

            {!plan.eligible ? (
              <AppText variant="caption" color="#B91C1C">
                {plan.eligibilityReasons.join(" ")}
              </AppText>
            ) : null}
          </>
        )}
      </View>
    </AppCard>
  );
}

export default function SendScreen() {
  const params = useLocalSearchParams();
  const { gbpBalance, rlusdBalance } = useWallet();
  const { createTransfer } = useTransfer();
  const {
    loading: nexusAILoading,
    enabled: sendAIEnabled,
    disabled: sendAIDisabled,
    toggle: toggleSendAI,
  } = useNexusAIScreenSetting("route_enabled");

  const [savedRecipients, setSavedRecipients] = useState<SavedRecipient[]>([]);
  const [selectedRecipientId, setSelectedRecipientId] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("Philippines");
  const [selectedPayoutMethod, setSelectedPayoutMethod] = useState<PayoutMethod>("BANK");
  const [selectedProvider, setSelectedProvider] = useState("BDO");
  const [payoutProviderId, setPayoutProviderId] = useState<PayoutProviderSelection>("AIRWALLEX_SANDBOX");

  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [surname, setSurname] = useState("");
  const [bankCode, setBankCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [airwallexFields, setAirwallexFields] = useState<Record<string, string>>({});
  const [niumFields, setNiumFields] = useState<Record<string, string>>({});
  const [mobileNumber, setMobileNumber] = useState("");

  const refreshSavedRecipients = useCallback(() => {
    let cancelled = false;

    loadSavedRecipients().then((recipients) => {
      if (!cancelled) setSavedRecipients(recipients);
    });

    const retryTimer = setTimeout(() => {
      loadSavedRecipients().then((recipients) => {
        if (!cancelled) setSavedRecipients(recipients);
      });
    }, 600);

    return () => {
      cancelled = true;
      clearTimeout(retryTimer);
    };
  }, []);

  useFocusEffect(refreshSavedRecipients);

  useEffect(() => {
    const hasResendParams =
      params.amount ||
      params.country ||
      params.firstName ||
      params.middleName ||
      params.surname ||
      params.bankCode ||
      params.accountNumber ||
      params.mobileNumber;

    if (!hasResendParams) return;

    const resendAmount = getStringParam(params.amount);
    const resendCountry = getStringParam(params.country);
    const resendPayoutMethod = getStringParam(params.payoutMethod) as PayoutMethod;
    const resendProvider = getStringParam(params.provider);

    if (resendAmount) setAmount(resendAmount);

    if (resendCountry) {
      const corridor = corridors.find((item) => item.country === resendCountry);

      if (corridor) {
        const payoutMethod =
          resendPayoutMethod === "BANK" || resendPayoutMethod === "MOBILE_WALLET"
            ? resendPayoutMethod
            : corridor.payoutMethods[0].type;

        const payoutConfig = corridor.payoutMethods.find(
          (item) => item.type === payoutMethod
        );

        setSelectedCountry(corridor.country);
        setSelectedPayoutMethod(payoutMethod);
        setSelectedProvider(resendProvider || payoutConfig?.providers[0] || "");
      }
    }

    setFirstName(getStringParam(params.firstName));
    setMiddleName(getStringParam(params.middleName));
    setSurname(getStringParam(params.surname));
    setBankCode(getStringParam(params.bankCode));
    setAccountNumber(getStringParam(params.accountNumber));
    setMobileNumber(getStringParam(params.mobileNumber));
  }, []);

  const numericAmount = Number(amount);
  const safeAmount = !Number.isNaN(numericAmount) && numericAmount > 0 ? numericAmount : 0;
  const balanceAfterTransfer = gbpBalance == null ? null : Math.max(gbpBalance - safeAmount, 0);

  const selectedCorridor = useMemo(
    () => corridors.find((corridor) => corridor.country === selectedCountry),
    [selectedCountry]
  );

  const airwallexSchema = useAirwallexBeneficiarySchema({
    country: selectedCorridor?.country,
    currency: selectedCorridor?.currency,
    enabled: selectedPayoutMethod === "BANK" && payoutProviderId === "AIRWALLEX_SANDBOX",
  });
  const niumSchema = useNiumBeneficiarySchema({
    country: selectedCorridor?.country,
    currency: selectedCorridor?.currency,
    enabled: selectedPayoutMethod === "BANK" && payoutProviderId === "NIUM_SANDBOX",
  });

  const fixedAirwallexFields = useMemo(() => {
    const fullName = [firstName.trim(), middleName.trim(), surname.trim()].filter(Boolean).join(" ");
    return {
      "beneficiary.type": "BANK_ACCOUNT",
      "beneficiary.entity_type": "PERSONAL",
      "beneficiary.first_name": firstName.trim(),
      "beneficiary.last_name": surname.trim(),
      "beneficiary.address.country_code": airwallexSchema.schema?.bankCountryCode ?? "",
      "beneficiary.bank_details.account_name": fullName,
      "beneficiary.bank_details.account_currency": selectedCorridor?.currency ?? "",
      "beneficiary.bank_details.bank_country_code": airwallexSchema.schema?.bankCountryCode ?? "",
      "beneficiary.bank_details.bank_name": selectedProvider,
    };
  }, [airwallexSchema.schema?.bankCountryCode, firstName, middleName, selectedCorridor?.currency, selectedProvider, surname]);

  useEffect(() => {
    if (!airwallexSchema.schema || Object.keys(airwallexFields).length > 0) return;
    const nextValues: Record<string, string> = {};
    const accountField = airwallexSchema.schema.fields.find((field) =>
      field.path.endsWith(".account_number") || field.path.endsWith(".iban")
    );
    const routingField = airwallexSchema.schema.fields.find((field) =>
      field.path.endsWith(".account_routing_value1") || field.path.endsWith(".swift_code")
    );
    if (accountField && accountNumber.trim()) nextValues[accountField.path] = accountNumber.trim();
    if (routingField && bankCode.trim()) nextValues[routingField.path] = bankCode.trim();
    if (Object.keys(nextValues).length > 0) setAirwallexFields(nextValues);
  }, [accountNumber, airwallexFields, airwallexSchema.schema, bankCode]);

  const availablePayoutMethods = useMemo(
    () => selectedCorridor?.payoutMethods ?? [],
    [selectedCorridor],
  );
  const canonicalRouteResult = useCanonicalRouteQuotes({
    amount: safeAmount,
    destinationCurrency: selectedCorridor?.currency,
    destinationCountry: selectedCorridor?.country,
    payoutMethod: selectedPayoutMethod,
    fundingMethod: "OPEN_BANKING",
    actualRlusdBalance: rlusdBalance,
    payoutProviderId,
  });
  const previewRoute = canonicalRouteResult.routes.find((route) => route.routePlan?.eligible)
    ?? canonicalRouteResult.routes[0];

  const selectedPayoutConfig = useMemo(
    () => availablePayoutMethods.find((method) => method.type === selectedPayoutMethod),
    [availablePayoutMethods, selectedPayoutMethod]
  );

  const availableProviders = selectedPayoutConfig?.providers ?? [];

  const handleGenerateSandboxRecipient = () => {
    if (!airwallexSchema.schema) return;
    const generated = generateAirwallexSandboxRecipient(airwallexSchema.schema, availableProviders);
    clearSelectedRecipient();
    setFirstName(generated.firstName);
    setMiddleName("");
    setSurname(generated.lastName);
    setSelectedProvider(generated.bankName);
    setBankCode("");
    setAccountNumber("");
    setAirwallexFields(generated.values);
  };

  const handleSelectSavedRecipient = (recipient: SavedRecipient) => {
    setSelectedRecipientId(recipient.id);
    setSelectedCountry(recipient.country);
    setSelectedPayoutMethod(recipient.payoutMethod);

    if (recipient.payoutMethod === "BANK") {
      setSelectedProvider(recipient.bankName || "");
      setBankCode(recipient.bankCode || "");
      setAccountNumber(recipient.accountNumber || "");
      setAirwallexFields(recipient.airwallexBeneficiaryFields || {});
      setPayoutProviderId(recipient.payoutProviderId || "AIRWALLEX_SANDBOX");
      setNiumFields(recipient.niumBeneficiaryFields || {});
      setMobileNumber("");
    } else {
      setSelectedProvider(recipient.mobileWalletProvider || "");
      setMobileNumber(recipient.mobileNumber || "");
      setBankCode("");
      setAccountNumber("");
      setAirwallexFields({});
      setNiumFields({});
    }

    setFirstName(recipient.firstName || "");
    setMiddleName(recipient.middleName || "");
    setSurname(recipient.surname || "");

    writeAuditLog({
      eventType: "RECIPIENT_REUSED",
      entityType: "recipient",
      entityId: recipient.id,
      metadata: {
        source: "saved_recipients_card",
        country: recipient.country,
        currency: recipient.currency,
        payout_method: recipient.payoutMethod,
        provider:
          recipient.payoutMethod === "BANK"
            ? recipient.bankName
            : recipient.mobileWalletProvider,
      },
    });
  };

  const handleToggleFavorite = async (recipient: SavedRecipient) => {
    await toggleRecipientFavorite(recipient);
    refreshSavedRecipients();
  };

  const clearSelectedRecipient = () => {
    setSelectedRecipientId(null);
  };

  const handleCountrySelect = (country: string) => {
    const corridor = corridors.find((item) => item.country === country);
    if (!corridor) return;

    const firstPayoutMethod = corridor.payoutMethods[0];
    const firstProvider = firstPayoutMethod.providers[0];

    clearSelectedRecipient();
    setSelectedCountry(country);
    setSelectedPayoutMethod(firstPayoutMethod.type);
    setSelectedProvider(firstProvider);
    setBankCode("");
    setAccountNumber("");
    setAirwallexFields({});
    setNiumFields({});
    setMobileNumber("");
  };

  const handlePayoutMethodSelect = (method: PayoutMethod) => {
    const payoutConfig = availablePayoutMethods.find((item) => item.type === method);

    clearSelectedRecipient();
    setSelectedPayoutMethod(method);
    setSelectedProvider(payoutConfig?.providers[0] ?? "");
    setBankCode("");
    setAccountNumber("");
    setAirwallexFields({});
    setNiumFields({});
    setMobileNumber("");
  };

  const handleFindRoutes = () => {
    const numericAmount = Number(amount);

    if (!amount || Number.isNaN(numericAmount) || numericAmount <= 0) {
      Alert.alert("Enter amount", "Please enter a valid GBP amount.");
      return;
    }

    if (gbpBalance != null && numericAmount > gbpBalance) {
      Alert.alert("Insufficient balance", "You do not have enough GBP funds.");
      return;
    }

    if (!selectedCorridor) {
      Alert.alert("Select country", "Please select a destination country.");
      return;
    }

    if (!firstName.trim()) {
      Alert.alert("First name required", "Please enter the recipient first name.");
      return;
    }

    if (!surname.trim()) {
      Alert.alert("Surname required", "Please enter the recipient surname.");
      return;
    }

    const airwallexValidationError = selectedPayoutMethod === "BANK" && payoutProviderId === "AIRWALLEX_SANDBOX"
      ? validateAirwallexBeneficiaryFields(airwallexSchema.schema, airwallexFields, fixedAirwallexFields)
      : null;
    if (selectedPayoutMethod === "BANK" && payoutProviderId === "AIRWALLEX_SANDBOX" && (airwallexSchema.loading || airwallexSchema.error || airwallexValidationError)) {
      Alert.alert(
        "Recipient requirements incomplete",
        airwallexSchema.loading
          ? "Wait for Airwallex recipient requirements to load."
          : airwallexSchema.error ?? airwallexValidationError ?? "Complete the Airwallex recipient requirements."
      );
      return;
    }
    const niumValidationError = selectedPayoutMethod === "BANK" && payoutProviderId === "NIUM_SANDBOX"
      ? validateNiumBeneficiaryFields(niumSchema.schema, niumFields)
      : null;
    if (selectedPayoutMethod === "BANK" && payoutProviderId === "NIUM_SANDBOX" && (niumSchema.loading || niumSchema.error || niumValidationError)) {
      Alert.alert("Recipient requirements incomplete", niumSchema.loading ? "Wait for Nium recipient requirements to load." : niumSchema.error ?? niumValidationError ?? "Complete the Nium recipient requirements.");
      return;
    }

    if (selectedPayoutMethod === "MOBILE_WALLET" && !mobileNumber.trim()) {
      Alert.alert(
        "Mobile number required",
        "Please enter recipient mobile wallet number."
      );
      return;
    }

    const recipientFullName = [firstName.trim(), middleName.trim(), surname.trim()]
      .filter(Boolean)
      .join(" ");

    const materializedFields = airwallexSchema.schema
      ? materializeAirwallexBeneficiaryFields(airwallexSchema.schema, airwallexFields, fixedAirwallexFields)
      : {};
    const materializedNiumFields = niumSchema.schema
      ? materializeNiumBeneficiaryFields(niumSchema.schema, niumFields)
      : {};
    const providerAccountReference = materializedFields["beneficiary.bank_details.account_number"]
      ?? materializedFields["beneficiary.bank_details.iban"]
      ?? accountNumber.trim();
    const providerRoutingReference = materializedFields["beneficiary.bank_details.account_routing_value1"]
      ?? materializedFields["beneficiary.bank_details.swift_code"]
      ?? bankCode.trim();
    const recipient: Recipient = {
      name: recipientFullName,
      firstName: firstName.trim(),
      middleName: middleName.trim() || undefined,
      surname: surname.trim(),
      country: selectedCorridor.country,
      currency: selectedCorridor.currency,
      payoutMethod: selectedPayoutMethod,
      payoutProviderId: selectedPayoutMethod === "BANK" ? payoutProviderId : undefined,
      bankName: selectedPayoutMethod === "BANK" ? selectedProvider : undefined,
      bankCode: selectedPayoutMethod === "BANK" ? (payoutProviderId === "NIUM_SANDBOX" ? materializedNiumFields.routingCodeValue1 : providerRoutingReference) : undefined,
      accountNumber:
        selectedPayoutMethod === "BANK" ? (payoutProviderId === "NIUM_SANDBOX" ? materializedNiumFields.beneficiaryAccountNumber : providerAccountReference) : undefined,
      airwallexTransferMethod: selectedPayoutMethod === "BANK" && payoutProviderId === "AIRWALLEX_SANDBOX" ? airwallexSchema.schema?.transferMethod : undefined,
      airwallexBeneficiaryFields: selectedPayoutMethod === "BANK" && payoutProviderId === "AIRWALLEX_SANDBOX" ? materializedFields : undefined,
      airwallexSchemaFetchedAt: selectedPayoutMethod === "BANK" && payoutProviderId === "AIRWALLEX_SANDBOX" ? airwallexSchema.schema?.fetchedAt : undefined,
      niumPayoutMethod: selectedPayoutMethod === "BANK" && payoutProviderId === "NIUM_SANDBOX" ? "LOCAL" : undefined,
      niumBeneficiaryFields: selectedPayoutMethod === "BANK" && payoutProviderId === "NIUM_SANDBOX" ? materializedNiumFields : undefined,
      niumSchemaFetchedAt: selectedPayoutMethod === "BANK" && payoutProviderId === "NIUM_SANDBOX" ? niumSchema.schema?.fetchedAt : undefined,
      mobileWalletProvider:
        selectedPayoutMethod === "MOBILE_WALLET" ? selectedProvider : undefined,
      mobileNumber:
        selectedPayoutMethod === "MOBILE_WALLET" ? mobileNumber.trim() : undefined,
    };

    const eligibleRoutes = canonicalRouteResult.routes.filter((route) => route.routePlan?.eligible);
    if (canonicalRouteResult.loading) {
      Alert.alert("Routes still loading", "Wait for current provider evidence before continuing.");
      return;
    }
    if (eligibleRoutes.length === 0) {
      Alert.alert("No executable route", previewRoute?.routePlan?.eligibilityReasons.join(" ") || "No evidence-supported route is currently available.");
      return;
    }

    createTransfer(numericAmount, { recipient, routes: canonicalRouteResult.routes });
    router.push("/routes");
  };

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={{ gap: 20, paddingBottom: 40 }}>
          <View style={{ gap: 6 }}>
            <AppText variant="caption" color={colors.gold}>
              SEND MONEY
            </AppText>

            <AppText variant="title" color={colors.textPrimary}>
              New Transfer
            </AppText>

            <AppText variant="body" color={colors.textSecondary}>
              Fast, secure and transparent transfers powered by route intelligence.
            </AppText>
          </View>

          <NexusAIToggleCard
            title="Nexus AI"
            description="Controls route intelligence guidance and AI-assisted transfer setup on this screen."
            enabled={sendAIEnabled}
            disabled={sendAIDisabled}
            loading={nexusAILoading}
            onToggle={toggleSendAI}
          />

          <AppCard>
            <View style={{ gap: 16 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <View>
                  <AppText variant="subheading" color={colors.textDarkPrimary}>
                    You send
                  </AppText>
                  <AppText variant="caption" color={colors.textDarkSecondary}>
                    Enter the GBP amount to route.
                  </AppText>
                </View>
                <View
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 999,
                    backgroundColor: "#F8FAFC",
                    borderWidth: 1,
                    borderColor: "#E6ECF2",
                  }}
                >
                  <AppText variant="caption" color={colors.textDarkSecondary} style={{ fontWeight: "900" }}>
                    GBP
                  </AppText>
                </View>
              </View>

              <InputField
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                placeholder="0.00"
                large
              />

              <View style={{ flexDirection: "row", gap: 8 }}>
                <InfoPill
                  label="Available"
                  value={gbpBalance == null ? "Unavailable" : `£${formatCurrency(gbpBalance)}`}
                />
                <InfoPill
                  label="After transfer"
                  value={balanceAfterTransfer == null ? "Unavailable" : `£${formatCurrency(balanceAfterTransfer)}`}
                  accent={safeAmount > 0}
                />
              </View>
            </View>
          </AppCard>

          <SavedRecipientsCard
            recipients={savedRecipients}
            selectedRecipientId={selectedRecipientId ?? undefined}
            onSelectRecipient={handleSelectSavedRecipient}
            onToggleFavorite={handleToggleFavorite}
          />

          <AppCard>
            <View style={{ gap: 12 }}>
              <AppText variant="subheading" color={colors.textDarkPrimary}>
                Destination
              </AppText>

              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {corridors.map((corridor) => (
                  <SelectorChip
                    key={corridor.country}
                    label={`${corridor.country} • ${corridor.currency}`}
                    selected={selectedCountry === corridor.country}
                    onPress={() => handleCountrySelect(corridor.country)}
                  />
                ))}
              </View>
            </View>
          </AppCard>

          <CanonicalRoutePreviewCard
            route={previewRoute}
            currency={selectedCorridor?.currency}
            loading={canonicalRouteResult.loading}
            error={canonicalRouteResult.error}
          />

          <AppCard>
            <View style={{ gap: 12 }}>
              <AppText variant="subheading" color={colors.textDarkPrimary}>
                Payout method
              </AppText>

              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {availablePayoutMethods.map((method) => (
                  <SelectorChip
                    key={method.type}
                    label={method.type === "BANK" ? "Bank" : "Mobile Wallet"}
                    selected={selectedPayoutMethod === method.type}
                    onPress={() => handlePayoutMethodSelect(method.type)}
                  />
                ))}
              </View>
            </View>
          </AppCard>

          <AppCard>
            <View style={{ gap: 12 }}>
              <AppText variant="subheading" color={colors.textDarkPrimary}>
                {selectedPayoutMethod === "BANK"
                  ? "Recipient bank"
                  : "Wallet provider"}
              </AppText>

              {selectedPayoutMethod === "BANK" ? (
                <>
                  <AppText variant="caption" color={colors.textDarkSecondary}>
                    Choose a common bank or enter another bank. Airwallex validates the account using the provider-required IBAN, BIC or account details below.
                  </AppText>
                  <InputField
                    value={selectedProvider}
                    onChangeText={(value) => {
                      clearSelectedRecipient();
                      setSelectedProvider(value);
                    }}
                    placeholder="Enter recipient bank name *"
                  />
                </>
              ) : null}

              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {availableProviders.map((provider) => (
                  <SelectorChip
                    key={provider}
                    label={provider}
                    selected={selectedProvider === provider}
                    onPress={() => {
                      clearSelectedRecipient();
                      setSelectedProvider(provider);
                      setBankCode("");
                      setAccountNumber("");
                      setAirwallexFields({});
                    }}
                  />
                ))}
              </View>
            </View>
          </AppCard>

          <AppCard>
            <View style={{ gap: 12 }}>
              <View style={{ gap: 4 }}>
                <AppText variant="subheading" color={colors.textDarkPrimary}>
                  Recipient details
                </AppText>

                <AppText variant="caption" color={colors.textDarkSecondary}>
                  First name and surname are required for payout screening and
                  destination matching.
                </AppText>
              </View>

              <InputField
                value={firstName}
                onChangeText={(value) => {
                  clearSelectedRecipient();
                  setFirstName(value);
                }}
                placeholder="First name *"
              />

              <InputField
                value={middleName}
                onChangeText={(value) => {
                  clearSelectedRecipient();
                  setMiddleName(value);
                }}
                placeholder="Middle name (optional)"
              />

              <InputField
                value={surname}
                onChangeText={(value) => {
                  clearSelectedRecipient();
                  setSurname(value);
                }}
                placeholder="Surname *"
              />

              {selectedPayoutMethod === "BANK" ? (
                <>
                  <View style={{ gap: 8 }}>
                    <AppText variant="caption" color={colors.textDarkSecondary}>Payout provider</AppText>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                      <SelectorChip label="Airwallex Sandbox" selected={payoutProviderId === "AIRWALLEX_SANDBOX"} onPress={() => { setPayoutProviderId("AIRWALLEX_SANDBOX"); setNiumFields({}); }} />
                      <SelectorChip label="Nium Sandbox" selected={payoutProviderId === "NIUM_SANDBOX"} onPress={() => { setPayoutProviderId("NIUM_SANDBOX"); setAirwallexFields({}); }} />
                    </View>
                  </View>
                  {payoutProviderId === "AIRWALLEX_SANDBOX" ? <AirwallexBeneficiaryFields
                  schema={airwallexSchema.schema}
                  loading={airwallexSchema.loading}
                  error={airwallexSchema.error}
                  values={airwallexFields}
                  fixedValues={fixedAirwallexFields}
                  onChange={(path, value) => {
                    clearSelectedRecipient();
                    setAirwallexFields((current) => ({ ...current, [path]: value }));
                  }}
                  onRetry={airwallexSchema.reload}
                  onGenerateSandboxRecipient={handleGenerateSandboxRecipient}
                  /> : <NiumBeneficiaryFields schema={niumSchema.schema} loading={niumSchema.loading} error={niumSchema.error} values={niumFields} onChange={(path, value) => { clearSelectedRecipient(); setNiumFields((current) => ({ ...current, [path]: value })); }} onRetry={niumSchema.reload} />}
                </>
              ) : (
                <InputField
                  value={mobileNumber}
                  onChangeText={(value) => {
                    clearSelectedRecipient();
                    setMobileNumber(value);
                  }}
                  keyboardType="phone-pad"
                  placeholder="Recipient mobile wallet number *"
                />
              )}
            </View>
          </AppCard>

          <Pressable
            onPress={handleFindRoutes}
            style={({ pressed }) => ({
              paddingVertical: 18,
              borderRadius: 22,
              alignItems: "center",
              backgroundColor: colors.gold,
              shadowColor: colors.gold,
              shadowOpacity: 0.42,
              shadowRadius: 14,
              shadowOffset: { width: 0, height: 8 },
              elevation: 8,
              transform: [{ scale: pressed ? 0.985 : 1 }],
            })}
          >
            <AppText
              color="#07111F"
              style={{ fontSize: 18, fontWeight: "900" }}
            >
              Find best routes →
            </AppText>
          </Pressable>

          <AppButton
            title="Back Home"
            variant="secondary"
            onPress={() => router.push("/")}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}
