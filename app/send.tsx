import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, TextInput, View } from "react-native";

import { NexusAIToggleCard } from "../src/components/intelligence/NexusAIToggleCard";
import { SavedRecipientsCard } from "../src/components/recipients/SavedRecipientsCard";
import { AppButton } from "../src/components/ui/AppButton";
import { AppCard } from "../src/components/ui/AppCard";
import { AppText } from "../src/components/ui/AppText";
import { Screen } from "../src/components/ui/Screen";

import { corridors } from "../src/data/corridors";
import { useNexusAIScreenSetting } from "../src/hooks/useNexusAISettings";
import { writeAuditLog } from "../src/services/auditLog";
import {
    loadSavedRecipients,
    toggleRecipientFavorite,
} from "../src/services/recipientService";
import { useTransfer } from "../src/state/TransferContext";
import { useWallet } from "../src/state/WalletContext";
import { colors } from "../src/theme";
import { SavedRecipient } from "../src/types/recipient";
import { PayoutMethod, Recipient } from "../src/types/transfer";

function formatCurrency(value: number) {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function getPayoutLabel(method: PayoutMethod) {
  return method === "BANK" ? "Bank account" : "Mobile wallet";
}

function getStringParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function getCorridorSignal(country: string) {
  const corridorSignals: Record<
    string,
    {
      confidence: number;
      liquidity: string;
      delivery: string;
      rail: string;
      receiveRate: number;
      fee: string;
      save: string;
    }
  > = {
    Philippines: {
      confidence: 92,
      liquidity: "High",
      delivery: "Minutes",
      rail: "GBP → RLUSD → PHP",
      receiveRate: 72.4,
      fee: "£3.20",
      save: "£12.40",
    },
    Malaysia: {
      confidence: 86,
      liquidity: "Healthy",
      delivery: "Minutes",
      rail: "GBP → RLUSD → MYR",
      receiveRate: 5.92,
      fee: "£2.85",
      save: "£8.10",
    },
    UAE: {
      confidence: 90,
      liquidity: "High",
      delivery: "Minutes",
      rail: "GBP → RLUSD → AED",
      receiveRate: 4.65,
      fee: "£2.95",
      save: "£9.30",
    },
    "Saudi Arabia": {
      confidence: 85,
      liquidity: "Stable",
      delivery: "Minutes",
      rail: "GBP → RLUSD → SAR",
      receiveRate: 4.77,
      fee: "£3.05",
      save: "£7.40",
    },
    Qatar: {
      confidence: 84,
      liquidity: "Stable",
      delivery: "Minutes",
      rail: "GBP → RLUSD → QAR",
      receiveRate: 4.61,
      fee: "£3.10",
      save: "£7.10",
    },
    Kuwait: {
      confidence: 83,
      liquidity: "Balanced",
      delivery: "Minutes",
      rail: "GBP → RLUSD → KWD",
      receiveRate: 0.38,
      fee: "£3.20",
      save: "£6.80",
    },
    Bahrain: {
      confidence: 82,
      liquidity: "Balanced",
      delivery: "Minutes",
      rail: "GBP → RLUSD → BHD",
      receiveRate: 0.47,
      fee: "£3.15",
      save: "£6.40",
    },
    Oman: {
      confidence: 80,
      liquidity: "Monitored",
      delivery: "Minutes",
      rail: "GBP → RLUSD → OMR",
      receiveRate: 0.49,
      fee: "£3.25",
      save: "£5.90",
    },
    Singapore: {
      confidence: 93,
      liquidity: "Very High",
      delivery: "Minutes",
      rail: "GBP → RLUSD → SGD",
      receiveRate: 1.72,
      fee: "£2.70",
      save: "£10.20",
    },
    Thailand: {
      confidence: 84,
      liquidity: "Stable",
      delivery: "Minutes",
      rail: "GBP → RLUSD → THB",
      receiveRate: 45.21,
      fee: "£3.05",
      save: "£7.20",
    },
    Indonesia: {
      confidence: 82,
      liquidity: "Monitored",
      delivery: "Minutes",
      rail: "GBP → RLUSD → IDR",
      receiveRate: 20840,
      fee: "£3.30",
      save: "£6.30",
    },
    Vietnam: {
      confidence: 81,
      liquidity: "Monitored",
      delivery: "Minutes",
      rail: "GBP → RLUSD → VND",
      receiveRate: 31980,
      fee: "£3.35",
      save: "£6.10",
    },
  };

  const signal = corridorSignals[country];
  if (signal) {
    return signal;
  }

  if (country === "Philippines") {
    return {
      confidence: 92,
      liquidity: "High",
      delivery: "Minutes",
      rail: "GBP → RLUSD → PHP",
      receiveRate: 72.4,
      fee: "£3.20",
      save: "£12.40",
    };
  }

  return {
    confidence: 86,
    liquidity: "Healthy",
    delivery: "Minutes",
    rail: "GBP → RLUSD → MYR",
    receiveRate: 5.92,
    fee: "£2.85",
    save: "£8.10",
  };
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

function RoutePreviewCard({
  selectedCountry,
  currency,
  amount,
  provider,
  payoutMethod,
}: {
  selectedCountry: string;
  currency?: string;
  amount: number;
  provider: string;
  payoutMethod: PayoutMethod;
}) {
  const signal = getCorridorSignal(selectedCountry);
  const estimatedReceive = amount > 0 ? amount * signal.receiveRate : 0;

  return (
    <AppCard>
      <View style={{ gap: 16 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
          <View style={{ gap: 4, flex: 1 }}>
            <AppText variant="subheading" color={colors.textDarkPrimary}>
              Route preview
            </AppText>
            <AppText variant="caption" color={colors.textDarkSecondary}>
              Best route candidate based on speed, cost, liquidity and payout reliability.
            </AppText>
          </View>

          <View
            style={{
              paddingHorizontal: 11,
              paddingVertical: 7,
              borderRadius: 999,
              backgroundColor: colors.goldSoft,
              borderWidth: 1,
              borderColor: "#F1D99B",
              alignSelf: "flex-start",
            }}
          >
            <AppText variant="caption" color={colors.gold} style={{ fontWeight: "900" }}>
              Best route
            </AppText>
          </View>
        </View>

        <View
          style={{
            padding: 16,
            borderRadius: 22,
            backgroundColor: "#F8FAFC",
            borderWidth: 1,
            borderColor: "#E6ECF2",
            gap: 14,
          }}
        >
          <View style={{ gap: 7 }}>
            <AppText variant="caption" color={colors.textDarkMuted}>
              Orchestration rail
            </AppText>
            <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
              {signal.rail.split(" → ").map((step, index, list) => (
                <View key={`${step}-${index}`} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <View
                    style={{
                      paddingVertical: 8,
                      paddingHorizontal: 11,
                      borderRadius: 999,
                      backgroundColor: index === 1 ? colors.goldSoft : "#FFFFFF",
                      borderWidth: 1,
                      borderColor: index === 1 ? "#F1D99B" : "#E6ECF2",
                    }}
                  >
                    <AppText
                      variant="caption"
                      color={index === 1 ? colors.gold : colors.textDarkPrimary}
                      style={{ fontWeight: "900" }}
                    >
                      {step}
                    </AppText>
                  </View>
                  {index < list.length - 1 ? (
                    <AppText color={colors.textDarkMuted} style={{ fontWeight: "900" }}>
                      →
                    </AppText>
                  ) : null}
                </View>
              ))}
            </View>
          </View>

          <View style={{ flexDirection: "row", gap: 8 }}>
            <InfoPill label="ETA" value={signal.delivery} />
            <InfoPill label="Fee" value={signal.fee} accent />
            <InfoPill label="You save" value={signal.save} />
          </View>

          <View style={{ gap: 8 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <AppText variant="caption" color={colors.textDarkMuted}>
                Confidence
              </AppText>
              <AppText variant="caption" color={colors.gold} style={{ fontWeight: "900" }}>
                {signal.confidence}%
              </AppText>
            </View>
            <View
              style={{
                height: 10,
                borderRadius: 999,
                backgroundColor: "#E6ECF2",
                overflow: "hidden",
              }}
            >
              <View
                style={{
                  width: `${signal.confidence}%`,
                  height: "100%",
                  backgroundColor: colors.gold,
                }}
              />
            </View>
          </View>
        </View>

        <View
          style={{
            padding: 16,
            borderRadius: 22,
            backgroundColor: colors.goldSoft,
            borderWidth: 1,
            borderColor: "#F1D99B",
            gap: 7,
          }}
        >
          <AppText variant="caption" color={colors.gold}>
            Estimated receive amount
          </AppText>

          <AppText variant="title" color={colors.textDarkPrimary}>
            {estimatedReceive > 0 ? formatCurrency(estimatedReceive) : "0.00"}{" "}
            {currency ?? ""}
          </AppText>

          <AppText variant="caption" color={colors.textDarkSecondary}>
            {getPayoutLabel(payoutMethod)} via {provider || "provider"}
          </AppText>
        </View>
      </View>
    </AppCard>
  );
}

export default function SendScreen() {
  const params = useLocalSearchParams();
  const { gbpBalance } = useWallet();
  const { createTransfer, setRecipient } = useTransfer();
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

  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [surname, setSurname] = useState("");
  const [bankCode, setBankCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
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
  const balanceAfterTransfer = Math.max((gbpBalance ?? 0) - safeAmount, 0);

  const selectedCorridor = useMemo(
    () => corridors.find((corridor) => corridor.country === selectedCountry),
    [selectedCountry]
  );

  const availablePayoutMethods = selectedCorridor?.payoutMethods ?? [];

  const selectedPayoutConfig = useMemo(
    () => availablePayoutMethods.find((method) => method.type === selectedPayoutMethod),
    [availablePayoutMethods, selectedPayoutMethod]
  );

  const availableProviders = selectedPayoutConfig?.providers ?? [];

  const handleSelectSavedRecipient = (recipient: SavedRecipient) => {
    setSelectedRecipientId(recipient.id);
    setSelectedCountry(recipient.country);
    setSelectedPayoutMethod(recipient.payoutMethod);

    if (recipient.payoutMethod === "BANK") {
      setSelectedProvider(recipient.bankName || "");
      setBankCode(recipient.bankCode || "");
      setAccountNumber(recipient.accountNumber || "");
      setMobileNumber("");
    } else {
      setSelectedProvider(recipient.mobileWalletProvider || "");
      setMobileNumber(recipient.mobileNumber || "");
      setBankCode("");
      setAccountNumber("");
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
    setMobileNumber("");
  };

  const handlePayoutMethodSelect = (method: PayoutMethod) => {
    const payoutConfig = availablePayoutMethods.find((item) => item.type === method);

    clearSelectedRecipient();
    setSelectedPayoutMethod(method);
    setSelectedProvider(payoutConfig?.providers[0] ?? "");
    setBankCode("");
    setAccountNumber("");
    setMobileNumber("");
  };

  const handleFindRoutes = () => {
    const numericAmount = Number(amount);

    if (!amount || Number.isNaN(numericAmount) || numericAmount <= 0) {
      Alert.alert("Enter amount", "Please enter a valid GBP amount.");
      return;
    }

    if (numericAmount > gbpBalance) {
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

    if (selectedPayoutMethod === "BANK" && !bankCode.trim()) {
      Alert.alert(
        "Bank routing required",
        "Please enter the recipient bank, branch, or sort code."
      );
      return;
    }

    if (selectedPayoutMethod === "BANK" && !accountNumber.trim()) {
      Alert.alert(
        "Account number required",
        "Please enter recipient bank account number."
      );
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

    const recipient: Recipient = {
      name: recipientFullName,
      firstName: firstName.trim(),
      middleName: middleName.trim() || undefined,
      surname: surname.trim(),
      country: selectedCorridor.country,
      currency: selectedCorridor.currency,
      payoutMethod: selectedPayoutMethod,
      bankName: selectedPayoutMethod === "BANK" ? selectedProvider : undefined,
      bankCode: selectedPayoutMethod === "BANK" ? bankCode.trim() : undefined,
      accountNumber:
        selectedPayoutMethod === "BANK" ? accountNumber.trim() : undefined,
      mobileWalletProvider:
        selectedPayoutMethod === "MOBILE_WALLET" ? selectedProvider : undefined,
      mobileNumber:
        selectedPayoutMethod === "MOBILE_WALLET" ? mobileNumber.trim() : undefined,
    };

    createTransfer(numericAmount);
    setRecipient(recipient);
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
                  value={`£${formatCurrency(gbpBalance ?? 0)}`}
                />
                <InfoPill
                  label="After transfer"
                  value={`£${formatCurrency(balanceAfterTransfer)}`}
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

          <RoutePreviewCard
            selectedCountry={selectedCountry}
            currency={selectedCorridor?.currency}
            amount={safeAmount}
            provider={selectedProvider}
            payoutMethod={selectedPayoutMethod}
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
                  ? "Payout bank"
                  : "Wallet provider"}
              </AppText>

              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {availableProviders.map((provider) => (
                  <SelectorChip
                    key={provider}
                    label={provider}
                    selected={selectedProvider === provider}
                    onPress={() => {
                      clearSelectedRecipient();
                      setSelectedProvider(provider);
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
                  <InputField
                    value={bankCode}
                    onChangeText={(value) => {
                      clearSelectedRecipient();
                      setBankCode(value);
                    }}
                    placeholder="Bank / branch / sort code *"
                  />

                  <InputField
                    value={accountNumber}
                    onChangeText={(value) => {
                      clearSelectedRecipient();
                      setAccountNumber(value);
                    }}
                    keyboardType="number-pad"
                    placeholder="Recipient bank account number *"
                  />
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
