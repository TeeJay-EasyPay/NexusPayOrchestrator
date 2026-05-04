import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, TextInput, View } from "react-native";

import { SavedRecipientsCard } from "../src/components/recipients/SavedRecipientsCard";
import { AppButton } from "../src/components/ui/AppButton";
import { AppCard } from "../src/components/ui/AppCard";
import { AppText } from "../src/components/ui/AppText";
import { Screen } from "../src/components/ui/Screen";

import { corridors } from "../src/data/corridors";
import { loadSavedRecipients } from "../src/services/recipientService";
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
  if (country === "Philippines") {
    return {
      confidence: 92,
      liquidity: "High",
      delivery: "Minutes",
      rail: "GBP → RLUSD → PHP",
      note: "Strong payout coverage and healthy corridor liquidity.",
    };
  }

  return {
    confidence: 86,
    liquidity: "Healthy",
    delivery: "Minutes",
    rail: "GBP → RLUSD → MYR",
    note: "Optimised regional route with monitored payout capacity.",
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
      placeholderTextColor="#8CA0AE"
      style={{
        borderWidth: 1,
        borderColor: "#DDE6EE",
        borderRadius: 18,
        padding: large ? 18 : 15,
        fontSize: large ? 26 : 16,
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
  accent = colors.textDarkPrimary,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  accent?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingVertical: 11,
        paddingHorizontal: 15,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: selected ? accent : "#DDE6EE",
        backgroundColor: selected ? accent : "#FFFFFF",
      }}
    >
      <AppText
        style={{
          color: selected ? "#FFFFFF" : colors.textDarkPrimary,
          fontWeight: "800",
        }}
      >
        {label}
      </AppText>
    </Pressable>
  );
}

function PreviewMetric({ label, value }: { label: string; value: string }) {
  return (
    <View
      style={{
        flex: 1,
        padding: 11,
        borderRadius: 16,
        backgroundColor: "rgba(255,255,255,0.10)",
        gap: 4,
      }}
    >
      <AppText variant="caption" color="#BFEAF1">
        {label}
      </AppText>

      <AppText variant="body" color="#FFFFFF" style={{ fontWeight: "900" }}>
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
  const estimatedReceive = amount > 0 ? amount * (currency === "PHP" ? 72.4 : 5.92) : 0;

  return (
    <AppCard>
      <View style={{ gap: 14 }}>
        <View style={{ gap: 4 }}>
          <AppText variant="subheading" color={colors.textDarkPrimary}>
            Route preview
          </AppText>

          <AppText variant="caption" color={colors.textDarkSecondary}>
            A live-style preview before the orchestration engine ranks routes.
          </AppText>
        </View>

        <View
          style={{
            padding: 16,
            borderRadius: 22,
            backgroundColor: "#0B3F4A",
            gap: 12,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              gap: 12,
              alignItems: "flex-start",
            }}
          >
            <View style={{ flex: 1 }}>
              <AppText variant="caption" color="#BFEAF1">
                Corridor
              </AppText>

              <AppText variant="title" color="#FFFFFF">
                GBP → {currency ?? "..."}
              </AppText>
            </View>

            <View
              style={{
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: 999,
                backgroundColor: "rgba(214,168,79,0.22)",
              }}
            >
              <AppText variant="caption" color={colors.gold} style={{ fontWeight: "900" }}>
                {signal.confidence}% confidence
              </AppText>
            </View>
          </View>

          <View
            style={{
              height: 8,
              borderRadius: 999,
              backgroundColor: "rgba(255,255,255,0.18)",
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

          <View style={{ flexDirection: "row", gap: 8 }}>
            <PreviewMetric label="Liquidity" value={signal.liquidity} />
            <PreviewMetric label="Delivery" value={signal.delivery} />
            <PreviewMetric label="Rail" value="RLUSD" />
          </View>
        </View>

        <View
          style={{
            padding: 14,
            borderRadius: 18,
            backgroundColor: "#F8FAFC",
            borderWidth: 1,
            borderColor: "#E2E8F0",
            gap: 8,
          }}
        >
          <AppText variant="caption" color={colors.textDarkMuted}>
            Estimated receive amount
          </AppText>

          <AppText variant="title" color={colors.textDarkPrimary}>
            {estimatedReceive > 0 ? formatCurrency(estimatedReceive) : "0.00"} {currency ?? ""}
          </AppText>

          <AppText variant="caption" color={colors.textDarkSecondary}>
            {signal.rail} • {getPayoutLabel(payoutMethod)} via {provider || "provider"}
          </AppText>

          <AppText variant="caption" color={colors.textDarkSecondary}>
            {signal.note}
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

  const [savedRecipients, setSavedRecipients] = useState<SavedRecipient[]>([]);
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

  useEffect(() => {
    loadSavedRecipients().then(setSavedRecipients);
  }, []);

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

    if (resendAmount) {
      setAmount(resendAmount);
    }

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

  const selectedCorridor = useMemo(() => {
    return corridors.find((corridor) => corridor.country === selectedCountry);
  }, [selectedCountry]);

  const availablePayoutMethods = selectedCorridor?.payoutMethods ?? [];

  const selectedPayoutConfig = useMemo(() => {
    return availablePayoutMethods.find((method) => method.type === selectedPayoutMethod);
  }, [availablePayoutMethods, selectedPayoutMethod]);

  const availableProviders = selectedPayoutConfig?.providers ?? [];

  const handleSelectSavedRecipient = (recipient: SavedRecipient) => {
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
  };

  const handleCountrySelect = (country: string) => {
    const corridor = corridors.find((item) => item.country === country);

    if (!corridor) return;

    const firstPayoutMethod = corridor.payoutMethods[0];
    const firstProvider = firstPayoutMethod.providers[0];

    setSelectedCountry(country);
    setSelectedPayoutMethod(firstPayoutMethod.type);
    setSelectedProvider(firstProvider);

    setBankCode("");
    setAccountNumber("");
    setMobileNumber("");
  };

  const handlePayoutMethodSelect = (method: PayoutMethod) => {
    const payoutConfig = availablePayoutMethods.find((item) => item.type === method);

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
      Alert.alert("Bank routing required", "Please enter the recipient bank, branch, or sort code.");
      return;
    }

    if (selectedPayoutMethod === "BANK" && !accountNumber.trim()) {
      Alert.alert("Account number required", "Please enter recipient bank account number.");
      return;
    }

    if (selectedPayoutMethod === "MOBILE_WALLET" && !mobileNumber.trim()) {
      Alert.alert("Mobile number required", "Please enter recipient mobile wallet number.");
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
      accountNumber: selectedPayoutMethod === "BANK" ? accountNumber.trim() : undefined,
      mobileWalletProvider:
        selectedPayoutMethod === "MOBILE_WALLET" ? selectedProvider : undefined,
      mobileNumber: selectedPayoutMethod === "MOBILE_WALLET" ? mobileNumber.trim() : undefined,
    };

    createTransfer(numericAmount);
    setRecipient(recipient);
    router.push("/routes");
  };

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={{ gap: 18, paddingBottom: 40 }}>
          <View style={{ gap: 6 }}>
            <AppText variant="caption" color={colors.gold}>
              Intelligent transfer cockpit
            </AppText>

            <AppText variant="title" color={colors.textPrimary}>
              Send Money
            </AppText>

            <AppText variant="body" color={colors.textSecondary}>
              Build a transfer, preview the corridor, then let NexusPay rank the best route.
            </AppText>
          </View>

          <View
            style={{
              padding: 18,
              borderRadius: 26,
              backgroundColor: "#0B3F4A",
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.14)",
              gap: 14,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                gap: 12,
                alignItems: "flex-start",
              }}
            >
              <View style={{ flex: 1 }}>
                <AppText variant="caption" color="#BFEAF1">
                  Available GBP balance
                </AppText>

                <AppText variant="title" color="#FFFFFF">
                  £{formatCurrency(gbpBalance ?? 0)}
                </AppText>
              </View>

              <View
                style={{
                  paddingHorizontal: 11,
                  paddingVertical: 6,
                  borderRadius: 999,
                  backgroundColor: "rgba(214,168,79,0.22)",
                }}
              >
                <AppText variant="caption" color={colors.gold} style={{ fontWeight: "900" }}>
                  LIVE BALANCE
                </AppText>
              </View>
            </View>

            <View style={{ height: 1, backgroundColor: "rgba(255,255,255,0.14)" }} />

            <View style={{ flexDirection: "row", gap: 8 }}>
              <PreviewMetric label="After transfer" value={`£${formatCurrency(balanceAfterTransfer)}`} />
              <PreviewMetric label="Destination" value={selectedCorridor?.currency ?? "..."} />
            </View>
          </View>

          <AppCard>
            <View style={{ gap: 12 }}>
              <AppText variant="subheading" color={colors.textDarkPrimary}>
                Amount to send
              </AppText>

              <View style={{ gap: 8 }}>
                <InputField
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  large
                />

                <AppText variant="caption" color={colors.textDarkSecondary}>
                  Enter the GBP amount you want NexusPay to orchestrate.
                </AppText>
              </View>
            </View>
          </AppCard>

          <SavedRecipientsCard
            recipients={savedRecipients}
            onSelectRecipient={handleSelectSavedRecipient}
          />

          <AppCard>
            <View style={{ gap: 12 }}>
              <AppText variant="subheading" color={colors.textDarkPrimary}>
                Destination corridor
              </AppText>

              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {corridors.map((corridor) => {
                  const isSelected = selectedCountry === corridor.country;

                  return (
                    <SelectorChip
                      key={corridor.country}
                      label={`${corridor.country} • ${corridor.currency}`}
                      selected={isSelected}
                      onPress={() => handleCountrySelect(corridor.country)}
                      accent="#0B3F4A"
                    />
                  );
                })}
              </View>

              <View
                style={{
                  padding: 13,
                  borderRadius: 18,
                  backgroundColor: "#F8FAFC",
                  borderWidth: 1,
                  borderColor: "#E2E8F0",
                  gap: 4,
                }}
              >
                <AppText variant="caption" color={colors.textDarkMuted}>
                  Selected corridor
                </AppText>

                <AppText variant="body" color={colors.textDarkPrimary} style={{ fontWeight: "900" }}>
                  GBP → {selectedCorridor?.currency} • {selectedCountry}
                </AppText>
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
                {availablePayoutMethods.map((method) => {
                  const isSelected = selectedPayoutMethod === method.type;

                  return (
                    <SelectorChip
                      key={method.type}
                      label={method.type === "BANK" ? "Bank" : "Mobile Wallet"}
                      selected={isSelected}
                      onPress={() => handlePayoutMethodSelect(method.type)}
                      accent="#111827"
                    />
                  );
                })}
              </View>
            </View>
          </AppCard>

          <AppCard>
            <View style={{ gap: 12 }}>
              <AppText variant="subheading" color={colors.textDarkPrimary}>
                {selectedPayoutMethod === "BANK" ? "Payout bank" : "Wallet provider"}
              </AppText>

              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {availableProviders.map((provider) => {
                  const isSelected = selectedProvider === provider;

                  return (
                    <SelectorChip
                      key={provider}
                      label={provider}
                      selected={isSelected}
                      onPress={() => setSelectedProvider(provider)}
                      accent={colors.gold}
                    />
                  );
                })}
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
                  First name and surname are required for payout screening and bank matching.
                </AppText>
              </View>

              <InputField
                value={firstName}
                onChangeText={setFirstName}
                placeholder="First name *"
              />

              <InputField
                value={middleName}
                onChangeText={setMiddleName}
                placeholder="Middle name (optional)"
              />

              <InputField
                value={surname}
                onChangeText={setSurname}
                placeholder="Surname *"
              />

              {selectedPayoutMethod === "BANK" ? (
                <>
                  <InputField
                    value={bankCode}
                    onChangeText={setBankCode}
                    placeholder="Bank / branch / sort code *"
                  />

                  <InputField
                    value={accountNumber}
                    onChangeText={setAccountNumber}
                    keyboardType="number-pad"
                    placeholder="Recipient bank account number *"
                  />
                </>
              ) : (
                <InputField
                  value={mobileNumber}
                  onChangeText={setMobileNumber}
                  keyboardType="phone-pad"
                  placeholder="Recipient mobile wallet number *"
                />
              )}
            </View>
          </AppCard>

          <View
            style={{
              padding: 16,
              borderRadius: 24,
              backgroundColor: "#F8FAFC",
              borderWidth: 1,
              borderColor: "#E2E8F0",
              gap: 12,
            }}
          >
            <View style={{ gap: 4 }}>
              <AppText variant="subheading" color={colors.textDarkPrimary}>
                Ready for route discovery
              </AppText>

              <AppText variant="caption" color={colors.textDarkSecondary}>
                NexusPay will compare route speed, cost, liquidity and payout reliability next.
              </AppText>
            </View>

            <AppButton title="Find best routes" onPress={handleFindRoutes} />
            <AppButton title="Back Home" variant="secondary" onPress={() => router.push("/")} />
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}
