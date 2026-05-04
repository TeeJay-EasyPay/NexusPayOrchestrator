// updated send.tsx (only change: removed corridor panel from top card)

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

function formatCurrency(value: number) {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function InputField({ value, onChangeText, placeholder, keyboardType = "default", large = false }: any) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      keyboardType={keyboardType}
      placeholder={placeholder}
      placeholderTextColor={colors.textDarkMuted}
      style={{
        borderWidth: 1,
        borderColor: "#E6ECF2",
        borderRadius: 14,
        padding: large ? 18 : 14,
        fontSize: large ? 28 : 16,
        fontWeight: large ? "800" : "500",
        color: colors.textDarkPrimary,
        backgroundColor: "#F8FAFC",
      }}
    />
  );
}

export default function SendScreen() {
  const params = useLocalSearchParams();
  const { gbpBalance } = useWallet();
  const { createTransfer, setRecipient } = useTransfer();

  const [savedRecipients, setSavedRecipients] = useState<SavedRecipient[]>([]);
  const [selectedRecipientId, setSelectedRecipientId] = useState<string | null>(null);
  const [amount, setAmount] = useState("");

  const refreshSavedRecipients = useCallback(() => {
    loadSavedRecipients().then(setSavedRecipients);
  }, []);

  useFocusEffect(refreshSavedRecipients);

  const handleFindRoutes = () => {
    const numericAmount = Number(amount);

    if (!amount || Number.isNaN(numericAmount) || numericAmount <= 0) {
      Alert.alert("Enter amount", "Please enter a valid GBP amount.");
      return;
    }

    if (numericAmount > gbpBalance) {
      Alert.alert("Insufficient balance");
      return;
    }

    createTransfer(numericAmount);
    router.push("/routes");
  };

  return (
    <Screen style={{ backgroundColor: colors.background }}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={{ gap: 20, paddingBottom: 40 }}>

          <View style={{ gap: 6 }}>
            <AppText variant="caption" color={colors.gold}>SEND MONEY</AppText>
            <AppText variant="title" color={colors.textPrimary}>New Transfer</AppText>
          </View>

          <AppCard>
            <View style={{ gap: 14 }}>
              <AppText variant="subheading" color={colors.textDarkPrimary}>You send</AppText>

              <InputField
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                placeholder="0.00"
                large
              />

              <AppText variant="caption" color={colors.textDarkSecondary}>
                Available balance: £{gbpBalance}
              </AppText>
            </View>
          </AppCard>

          <SavedRecipientsCard
            recipients={savedRecipients}
            selectedRecipientId={selectedRecipientId ?? undefined}
            onSelectRecipient={() => {}}
            onToggleFavorite={() => {}}
          />

          <Pressable
            onPress={handleFindRoutes}
            style={{
              paddingVertical: 16,
              borderRadius: 18,
              alignItems: "center",
              backgroundColor: colors.gold,
            }}
          >
            <AppText style={{ fontWeight: "900" }}>Find best routes →</AppText>
          </Pressable>

          <AppButton title="Back Home" variant="secondary" onPress={() => router.push("/")} />

        </View>
      </ScrollView>
    </Screen>
  );
}
