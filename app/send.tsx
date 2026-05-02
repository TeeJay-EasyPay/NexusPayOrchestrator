import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from "react-native";

import { AppButton } from "../src/components/ui/AppButton";
import { AppCard } from "../src/components/ui/AppCard";
import { AppText } from "../src/components/ui/AppText";
import { Screen } from "../src/components/ui/Screen";

import { corridors } from "../src/data/corridors";

import { PayoutMethod, Recipient } from "../src/types/transfer";

import { useTransfer } from "../src/state/TransferContext";
import { useWallet } from "../src/state/WalletContext";
import { colors } from "../src/theme";

export default function SendScreen() {
  const params = useLocalSearchParams();

  const { gbpBalance } = useWallet();

  const { createTransfer, setRecipient } = useTransfer();

  const [amount, setAmount] = useState("");

  const [selectedCountry, setSelectedCountry] =
    useState("Philippines");

  const [selectedPayoutMethod, setSelectedPayoutMethod] =
    useState<PayoutMethod>("BANK");

  const [selectedProvider, setSelectedProvider] =
    useState("BDO");

  const [recipientName, setRecipientName] =
    useState("");

  const [accountNumber, setAccountNumber] =
    useState("");

  const [mobileNumber, setMobileNumber] =
    useState("");

  useEffect(() => {
    if (typeof params.amount === "string") {
      setAmount(params.amount);
    }

    if (typeof params.country === "string") {
      const corridor = corridors.find(
        (item) => item.country === params.country
      );

      if (corridor) {
        const firstPayoutMethod =
          corridor.payoutMethods[0];

        const firstProvider =
          firstPayoutMethod.providers[0];

        setSelectedCountry(corridor.country);

        setSelectedPayoutMethod(
          firstPayoutMethod.type
        );

        setSelectedProvider(firstProvider);
      }
    }
  }, [params]);

  const selectedCorridor = useMemo(() => {
    return corridors.find(
      (corridor) => corridor.country === selectedCountry
    );
  }, [selectedCountry]);

  const availablePayoutMethods =
    selectedCorridor?.payoutMethods ?? [];

  const selectedPayoutConfig = useMemo(() => {
    return availablePayoutMethods.find(
      (method) => method.type === selectedPayoutMethod
    );
  }, [availablePayoutMethods, selectedPayoutMethod]);

  const availableProviders =
    selectedPayoutConfig?.providers ?? [];

  const handleCountrySelect = (country: string) => {
    const corridor = corridors.find(
      (item) => item.country === country
    );

    if (!corridor) return;

    const firstPayoutMethod =
      corridor.payoutMethods[0];

    const firstProvider =
      firstPayoutMethod.providers[0];

    setSelectedCountry(country);

    setSelectedPayoutMethod(
      firstPayoutMethod.type
    );

    setSelectedProvider(firstProvider);

    setAccountNumber("");
    setMobileNumber("");
  };

  const handlePayoutMethodSelect = (
    method: PayoutMethod
  ) => {
    const payoutConfig =
      availablePayoutMethods.find(
        (item) => item.type === method
      );

    setSelectedPayoutMethod(method);

    setSelectedProvider(
      payoutConfig?.providers[0] ?? ""
    );

    setAccountNumber("");
    setMobileNumber("");
  };

  const handleFindRoutes = () => {
    const numericAmount = Number(amount);

    if (
      !amount ||
      Number.isNaN(numericAmount) ||
      numericAmount <= 0
    ) {
      Alert.alert(
        "Enter amount",
        "Please enter a valid GBP amount."
      );

      return;
    }

    if (numericAmount > gbpBalance) {
      Alert.alert(
        "Insufficient balance",
        "You do not have enough GBP funds."
      );

      return;
    }

    if (!selectedCorridor) {
      Alert.alert(
        "Select country",
        "Please select a destination country."
      );

      return;
    }

    if (!recipientName.trim()) {
      Alert.alert(
        "Recipient required",
        "Please enter recipient name."
      );

      return;
    }

    if (
      selectedPayoutMethod === "BANK" &&
      !accountNumber.trim()
    ) {
      Alert.alert(
        "Account number required",
        "Please enter recipient bank account number."
      );

      return;
    }

    if (
      selectedPayoutMethod === "MOBILE_WALLET" &&
      !mobileNumber.trim()
    ) {
      Alert.alert(
        "Mobile number required",
        "Please enter recipient mobile wallet number."
      );

      return;
    }

    const recipient: Recipient = {
      name: recipientName.trim(),

      country: selectedCorridor.country,

      currency: selectedCorridor.currency,

      payoutMethod: selectedPayoutMethod,

      bankName:
        selectedPayoutMethod === "BANK"
          ? selectedProvider
          : undefined,

      accountNumber:
        selectedPayoutMethod === "BANK"
          ? accountNumber.trim()
          : undefined,

      mobileWalletProvider:
        selectedPayoutMethod === "MOBILE_WALLET"
          ? selectedProvider
          : undefined,

      mobileNumber:
        selectedPayoutMethod === "MOBILE_WALLET"
          ? mobileNumber.trim()
          : undefined,
    };

    createTransfer(numericAmount);

    setRecipient(recipient);

    router.push("/routes");
  };

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
      >
        <View
          style={{
            gap: 18,
            paddingBottom: 40,
          }}
        >
          <View>
            <AppText variant="title" color={colors.textPrimary}>
              Send Money
            </AppText>

            <AppText variant="caption" color={colors.textSecondary}>
              Build a transfer and let
              NexusPay find the best route.
            </AppText>
          </View>

          <AppCard>
            <View style={{ gap: 12 }}>
              <AppText variant="subheading">
                Amount
              </AppText>

              <TextInput
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                placeholder="Enter GBP amount"
                style={{
                  borderWidth: 1,
                  borderColor: "#D6D6D6",
                  borderRadius: 14,
                  padding: 14,
                  fontSize: 18,
                }}
              />

              <AppText variant="caption">
                Available balance: £
                {(gbpBalance ?? 0).toFixed(2)}
              </AppText>
            </View>
          </AppCard>

          <AppCard>
            <View style={{ gap: 12 }}>
              <AppText variant="subheading">
                Destination country
              </AppText>

              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: 8,
                }}
              >
                {corridors.map((corridor) => {
                  const isSelected =
                    selectedCountry ===
                    corridor.country;

                  return (
                    <Pressable
                      key={corridor.country}
                      onPress={() =>
                        handleCountrySelect(
                          corridor.country
                        )
                      }
                      style={{
                        paddingVertical: 10,
                        paddingHorizontal: 14,
                        borderRadius: 999,
                        borderWidth: 1,
                        borderColor: isSelected
                          ? "#111827"
                          : "#D6D6D6",
                        backgroundColor: isSelected
                          ? "#111827"
                          : "#FFFFFF",
                      }}
                    >
                      <AppText
                        style={{
                          color: isSelected
                            ? "#FFFFFF"
                            : "#111827",
                          fontWeight: "700",
                        }}
                      >
                        {corridor.country}
                      </AppText>
                    </Pressable>
                  );
                })}
              </View>

              <AppText variant="caption">
                Recipient currency:{" "}
                {selectedCorridor?.currency}
              </AppText>
            </View>
          </AppCard>

          <AppCard>
            <View style={{ gap: 12 }}>
              <AppText variant="subheading">
                Payout method
              </AppText>

              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: 8,
                }}
              >
                {availablePayoutMethods.map(
                  (method) => {
                    const isSelected =
                      selectedPayoutMethod ===
                      method.type;

                    return (
                      <Pressable
                        key={method.type}
                        onPress={() =>
                          handlePayoutMethodSelect(
                            method.type
                          )
                        }
                        style={{
                          paddingVertical: 10,
                          paddingHorizontal: 14,
                          borderRadius: 999,
                          borderWidth: 1,
                          borderColor: isSelected
                            ? "#111827"
                            : "#D6D6D6",
                          backgroundColor:
                            isSelected
                              ? "#111827"
                              : "#FFFFFF",
                        }}
                      >
                        <AppText
                          style={{
                            color: isSelected
                              ? "#FFFFFF"
                              : "#111827",
                            fontWeight: "700",
                          }}
                        >
                          {method.type === "BANK"
                            ? "Bank"
                            : "Mobile Wallet"}
                        </AppText>
                      </Pressable>
                    );
                  }
                )}
              </View>
            </View>
          </AppCard>

          <AppCard>
            <View style={{ gap: 12 }}>
              <AppText variant="subheading">
                {selectedPayoutMethod ===
                "BANK"
                  ? "Choose bank"
                  : "Choose wallet"}
              </AppText>

              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: 8,
                }}
              >
                {availableProviders.map(
                  (provider) => {
                    const isSelected =
                      selectedProvider ===
                      provider;

                    return (
                      <Pressable
                        key={provider}
                        onPress={() =>
                          setSelectedProvider(
                            provider
                          )
                        }
                        style={{
                          paddingVertical: 10,
                          paddingHorizontal: 14,
                          borderRadius: 999,
                          borderWidth: 1,
                          borderColor: isSelected
                            ? "#2563EB"
                            : "#D6D6D6",
                          backgroundColor:
                            isSelected
                              ? "#EFF6FF"
                              : "#FFFFFF",
                        }}
                      >
                        <AppText
                          style={{
                            fontWeight: "700",
                          }}
                        >
                          {provider}
                        </AppText>
                      </Pressable>
                    );
                  }
                )}
              </View>
            </View>
          </AppCard>

          <AppCard>
            <View style={{ gap: 12 }}>
              <AppText variant="subheading">
                Recipient details
              </AppText>

              <TextInput
                value={recipientName}
                onChangeText={setRecipientName}
                placeholder="Recipient full name"
                style={{
                  borderWidth: 1,
                  borderColor: "#D6D6D6",
                  borderRadius: 14,
                  padding: 14,
                  fontSize: 16,
                }}
              />

              {selectedPayoutMethod ===
              "BANK" ? (
                <TextInput
                  value={accountNumber}
                  onChangeText={setAccountNumber}
                  keyboardType="number-pad"
                  placeholder="Recipient account number"
                  style={{
                    borderWidth: 1,
                    borderColor: "#D6D6D6",
                    borderRadius: 14,
                    padding: 14,
                    fontSize: 16,
                  }}
                />
              ) : (
                <TextInput
                  value={mobileNumber}
                  onChangeText={setMobileNumber}
                  keyboardType="phone-pad"
                  placeholder="Recipient mobile wallet number"
                  style={{
                    borderWidth: 1,
                    borderColor: "#D6D6D6",
                    borderRadius: 14,
                    padding: 14,
                    fontSize: 16,
                  }}
                />
              )}
            </View>
          </AppCard>

          <AppButton
            title="Find best routes"
            onPress={handleFindRoutes}
          />
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