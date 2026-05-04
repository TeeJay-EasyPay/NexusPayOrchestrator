import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, TextInput, View } from "react-native";

import { SavedRecipientsCard } from "../src/components/recipients/SavedRecipientsCard";
import { AppButton } from "../src/components/ui/AppButton";
import { AppCard } from "../src/components/ui/AppCard";
import { AppText } from "../src/components/ui/AppText";
import { Screen } from "../src/components/ui/Screen";

import { corridors } from "../src/data/corridors";
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

const cyan = "#27F5FF";
const cyanDim = "rgba(39,245,255,0.18)";
const deepSpace = "#020713";
const deepNavy = "#041426";
const panel = "rgba(3,15,30,0.96)";
const panelRaised = "rgba(7,28,50,0.96)";
const mutedText = "#A8C7D8";
const cyanBorder = "rgba(39,245,255,0.55)";

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
    };
  }

  return {
    confidence: 86,
    liquidity: "Healthy",
    delivery: "Minutes",
    rail: "GBP → RLUSD → MYR",
  };
}

function GlassCard({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: any;
}) {
  return (
    <AppCard
      style={{
        backgroundColor: panel,
        borderColor: cyanBorder,
        borderWidth: 1,
        shadowColor: cyan,
        shadowOpacity: 0.45,
        shadowRadius: 28,
        shadowOffset: { width: 0, height: 14 },
        elevation: 12,
        overflow: "hidden",
        ...style,
      }}
    >
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 84,
          backgroundColor: "rgba(39,245,255,0.14)",
        }}
      />

      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: -42,
          right: -42,
          width: 148,
          height: 148,
          borderRadius: 74,
          backgroundColor: "rgba(39,245,255,0.18)",
          shadowColor: cyan,
          shadowOpacity: 1,
          shadowRadius: 32,
        }}
      />

      <View style={{ position: "relative" }}>{children}</View>
    </AppCard>
  );
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
      placeholderTextColor="#6EAFC0"
      style={{
        borderWidth: 1,
        borderColor: "rgba(39,245,255,0.5)",
        borderRadius: 18,
        padding: large ? 18 : 15,
        fontSize: large ? 31 : 16,
        fontWeight: large ? "900" : "700",
        color: "#FFFFFF",
        backgroundColor: "rgba(1,8,18,0.82)",
        shadowColor: cyan,
        shadowOpacity: 0.25,
        shadowRadius: 10,
      }}
    />
  );
}

function SelectorChip({
  label,
  selected,
  onPress,
  accent = cyan,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  accent?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: selected ? accent : "rgba(255,255,255,0.18)",
        backgroundColor: selected
          ? "rgba(39,245,255,0.2)"
          : "rgba(255,255,255,0.06)",
        shadowColor: selected ? accent : "transparent",
        shadowOpacity: selected ? 0.72 : 0,
        shadowRadius: selected ? 18 : 0,
        elevation: selected ? 8 : 0,
        transform: [{ scale: pressed ? 0.98 : 1 }],
      })}
    >
      <AppText
        style={{
          color: selected ? "#FFFFFF" : "#B7D3E1",
          fontWeight: "900",
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
        padding: 12,
        borderRadius: 17,
        backgroundColor: "rgba(39,245,255,0.11)",
        borderWidth: 1,
        borderColor: "rgba(39,245,255,0.26)",
        gap: 4,
      }}
    >
      <AppText variant="caption" color="#8EEBFF">
        {label}
      </AppText>
      <AppText variant="body" color="#FFFFFF" style={{ fontWeight: "900" }}>
        {value}
      </AppText>
    </View>
  );
}

function RouteNode({ label, detail }: { label: string; detail: string }) {
  return (
    <View style={{ flex: 1, alignItems: "center", gap: 6 }}>
      <View
        style={{
          width: 45,
          height: 45,
          borderRadius: 23,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: cyanDim,
          borderWidth: 1,
          borderColor: cyan,
          shadowColor: cyan,
          shadowOpacity: 0.72,
          shadowRadius: 16,
          elevation: 8,
        }}
      >
        <AppText color="#FFFFFF" style={{ fontWeight: "900" }}>
          {label.slice(0, 1)}
        </AppText>
      </View>

      <AppText color="#FFFFFF" style={{ fontWeight: "900" }}>
        {label}
      </AppText>

      <AppText variant="caption" color={mutedText}>
        {detail}
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
  const estimatedReceive =
    amount > 0 ? amount * (currency === "PHP" ? 72.4 : 5.92) : 0;

  return (
    <GlassCard style={{ borderColor: "rgba(39,245,255,0.62)" }}>
      <View style={{ gap: 15 }}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <View style={{ gap: 4, flex: 1 }}>
            <AppText variant="subheading" color="#FFFFFF">
              Route preview
            </AppText>
            <AppText variant="caption" color={mutedText}>
              Visual orchestration path before route ranking.
            </AppText>
          </View>

          <View
            style={{
              paddingHorizontal: 11,
              paddingVertical: 7,
              borderRadius: 999,
              backgroundColor: "rgba(39,245,255,0.2)",
              borderWidth: 1,
              borderColor: "rgba(39,245,255,0.62)",
              shadowColor: cyan,
              shadowOpacity: 0.58,
              shadowRadius: 15,
            }}
          >
            <AppText variant="caption" color={cyan} style={{ fontWeight: "900" }}>
              ★ Recommended
            </AppText>
          </View>
        </View>

        <View
          style={{
            padding: 16,
            borderRadius: 24,
            backgroundColor: panelRaised,
            borderWidth: 1,
            borderColor: "rgba(39,245,255,0.38)",
            gap: 15,
            shadowColor: cyan,
            shadowOpacity: 0.28,
            shadowRadius: 20,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <RouteNode label="GBP" detail="You send" />
            <AppText color={cyan} style={{ fontSize: 23, fontWeight: "900" }}>
              →
            </AppText>
            <RouteNode label="RLUSD" detail="Bridge" />
            <AppText color={cyan} style={{ fontSize: 23, fontWeight: "900" }}>
              →
            </AppText>
            <RouteNode label={currency ?? "..."} detail="Recipient gets" />
          </View>

          <View style={{ flexDirection: "row", gap: 8 }}>
            <PreviewMetric label="ETA" value={signal.delivery} />
            <PreviewMetric label="Liquidity" value={signal.liquidity} />
            <PreviewMetric label="Provider" value={provider || "..."} />
          </View>

          <View style={{ gap: 7 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <AppText variant="caption" color={mutedText}>
                Confidence
              </AppText>
              <AppText variant="caption" color={cyan} style={{ fontWeight: "900" }}>
                {signal.confidence}%
              </AppText>
            </View>

            <View
              style={{
                height: 9,
                borderRadius: 999,
                backgroundColor: "rgba(255,255,255,0.12)",
                overflow: "hidden",
              }}
            >
              <View
                style={{
                  width: `${signal.confidence}%`,
                  height: "100%",
                  backgroundColor: cyan,
                }}
              />
            </View>
          </View>
        </View>

        <View
          style={{
            padding: 15,
            borderRadius: 20,
            backgroundColor: "rgba(255,255,255,0.065)",
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.14)",
            gap: 6,
          }}
        >
          <AppText variant="caption" color={mutedText}>
            Estimated receive amount
          </AppText>

          <AppText variant="title" color="#FFFFFF">
            {estimatedReceive > 0 ? formatCurrency(estimatedReceive) : "0.00"}{" "}
            {currency ?? ""}
          </AppText>

          <AppText variant="caption" color={mutedText}>
            {signal.rail} • {getPayoutLabel(payoutMethod)} via{" "}
            {provider || "provider"}
          </AppText>
        </View>
      </View>
    </GlassCard>
  );
}

export default function SendScreen() {
  const params = useLocalSearchParams();
  const { gbpBalance } = useWallet();
  const { createTransfer, setRecipient } = useTransfer();

  const [savedRecipients, setSavedRecipients] = useState<SavedRecipient[]>([]);
  const [selectedRecipientId, setSelectedRecipientId] = useState<string | null>(
    null
  );
  const [amount, setAmount] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("Philippines");
  const [selectedPayoutMethod, setSelectedPayoutMethod] =
    useState<PayoutMethod>("BANK");
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
  const safeAmount =
    !Number.isNaN(numericAmount) && numericAmount > 0 ? numericAmount : 0;
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

  const handleCountrySelect = (country: string) => {
    const corridor = corridors.find((item) => item.country === country);
    if (!corridor) return;

    const firstPayoutMethod = corridor.payoutMethods[0];
    const firstProvider = firstPayoutMethod.providers[0];

    setSelectedRecipientId(null);
    setSelectedCountry(country);
    setSelectedPayoutMethod(firstPayoutMethod.type);
    setSelectedProvider(firstProvider);
    setBankCode("");
    setAccountNumber("");
    setMobileNumber("");
  };

  const handlePayoutMethodSelect = (method: PayoutMethod) => {
    const payoutConfig = availablePayoutMethods.find((item) => item.type === method);

    setSelectedRecipientId(null);
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
    <Screen style={{ backgroundColor: deepSpace }}>
      <View
        style={{
          position: "absolute",
          top: 0,
          left: -18,
          right: -18,
          bottom: -40,
          backgroundColor: deepSpace,
        }}
      />

      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: 0,
          left: -18,
          right: -18,
          height: 620,
          backgroundColor: deepNavy,
          opacity: 0.42,
        }}
      />

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={{ gap: 18, paddingBottom: 40 }}>
          <View style={{ gap: 6 }}>
            <AppText variant="caption" color={cyan} style={{ fontWeight: "900" }}>
              ORCHESTRATION ENGINE
            </AppText>

            <AppText
              variant="title"
              color="#FFFFFF"
              style={{ textShadowColor: cyan, textShadowRadius: 10 }}
            >
              Send Money
            </AppText>

            <AppText variant="body" color={mutedText}>
              Move value through the smartest available corridor.
            </AppText>
          </View>

          <GlassCard style={{ borderColor: "rgba(39,245,255,0.62)" }}>
            <View style={{ gap: 14 }}>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <View style={{ flex: 1, gap: 8 }}>
                  <AppText
                    variant="caption"
                    color="#8EEBFF"
                    style={{ fontWeight: "900" }}
                  >
                    You send
                  </AppText>

                  <InputField
                    value={amount}
                    onChangeText={setAmount}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    large
                  />
                </View>

                <View
                  style={{
                    width: 118,
                    padding: 13,
                    borderRadius: 24,
                    backgroundColor: panelRaised,
                    borderWidth: 1,
                    borderColor: "rgba(39,245,255,0.38)",
                    justifyContent: "center",
                    gap: 6,
                    shadowColor: colors.gold,
                    shadowOpacity: 0.28,
                    shadowRadius: 16,
                  }}
                >
                  <AppText
                    color={cyan}
                    style={{
                      fontSize: 28,
                      fontWeight: "900",
                      textShadowColor: cyan,
                      textShadowRadius: 8,
                    }}
                  >
                    ↗
                  </AppText>

                  <AppText
                    variant="caption"
                    color="#FFFFFF"
                    style={{ fontWeight: "900" }}
                  >
                    Live rate
                  </AppText>

                  <AppText
                    variant="caption"
                    color={colors.gold}
                    style={{ fontWeight: "900" }}
                  >
                    GBP → {selectedCorridor?.currency ?? "..."}
                  </AppText>
                </View>
              </View>

              <View style={{ flexDirection: "row", gap: 8 }}>
                <PreviewMetric
                  label="Available"
                  value={`£${formatCurrency(gbpBalance ?? 0)}`}
                />
                <PreviewMetric
                  label="After"
                  value={`£${formatCurrency(balanceAfterTransfer)}`}
                />
              </View>
            </View>
          </GlassCard>

          <SavedRecipientsCard
            recipients={savedRecipients}
            selectedRecipientId={selectedRecipientId ?? undefined}
            onSelectRecipient={handleSelectSavedRecipient}
            onToggleFavorite={handleToggleFavorite}
          />

          <GlassCard>
            <View style={{ gap: 12 }}>
              <AppText variant="subheading" color="#FFFFFF">
                Corridor
              </AppText>

              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {corridors.map((corridor) => (
                  <SelectorChip
                    key={corridor.country}
                    label={`GBP → ${corridor.currency}`}
                    selected={selectedCountry === corridor.country}
                    onPress={() => handleCountrySelect(corridor.country)}
                  />
                ))}
              </View>
            </View>
          </GlassCard>

          <RoutePreviewCard
            selectedCountry={selectedCountry}
            currency={selectedCorridor?.currency}
            amount={safeAmount}
            provider={selectedProvider}
            payoutMethod={selectedPayoutMethod}
          />

          <GlassCard>
            <View style={{ gap: 12 }}>
              <AppText variant="subheading" color="#FFFFFF">
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
          </GlassCard>

          <GlassCard>
            <View style={{ gap: 12 }}>
              <AppText variant="subheading" color="#FFFFFF">
                {selectedPayoutMethod === "BANK" ? "Payout bank" : "Wallet provider"}
              </AppText>

              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {availableProviders.map((provider) => (
                  <SelectorChip
                    key={provider}
                    label={provider}
                    selected={selectedProvider === provider}
                    onPress={() => {
                      setSelectedRecipientId(null);
                      setSelectedProvider(provider);
                    }}
                    accent={colors.gold}
                  />
                ))}
              </View>
            </View>
          </GlassCard>

          <GlassCard>
            <View style={{ gap: 12 }}>
              <View style={{ gap: 4 }}>
                <AppText variant="subheading" color="#FFFFFF">
                  Recipient details
                </AppText>
                <AppText variant="caption" color={mutedText}>
                  Required for payout screening and destination matching.
                </AppText>
              </View>

              <InputField
                value={firstName}
                onChangeText={(value) => {
                  setSelectedRecipientId(null);
                  setFirstName(value);
                }}
                placeholder="First name *"
              />

              <InputField
                value={middleName}
                onChangeText={(value) => {
                  setSelectedRecipientId(null);
                  setMiddleName(value);
                }}
                placeholder="Middle name (optional)"
              />

              <InputField
                value={surname}
                onChangeText={(value) => {
                  setSelectedRecipientId(null);
                  setSurname(value);
                }}
                placeholder="Surname *"
              />

              {selectedPayoutMethod === "BANK" ? (
                <>
                  <InputField
                    value={bankCode}
                    onChangeText={(value) => {
                      setSelectedRecipientId(null);
                      setBankCode(value);
                    }}
                    placeholder="Bank / branch / sort code *"
                  />

                  <InputField
                    value={accountNumber}
                    onChangeText={(value) => {
                      setSelectedRecipientId(null);
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
                    setSelectedRecipientId(null);
                    setMobileNumber(value);
                  }}
                  keyboardType="phone-pad"
                  placeholder="Recipient mobile wallet number *"
                />
              )}
            </View>
          </GlassCard>

          <Pressable
            onPress={handleFindRoutes}
            style={({ pressed }) => ({
              paddingVertical: 18,
              borderRadius: 22,
              alignItems: "center",
              backgroundColor: colors.gold,
              borderWidth: 1,
              borderColor: "#FFD76B",
              shadowColor: colors.gold,
              shadowOpacity: 0.72,
              shadowRadius: 22,
              elevation: 12,
              transform: [{ scale: pressed ? 0.985 : 1 }],
            })}
          >
            <AppText color="#07111F" style={{ fontSize: 18, fontWeight: "900" }}>
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