// (trimmed explanation: full file replaced with enhanced styling)

import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
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

  const handleSelectSavedRecipient = (recipient: SavedRecipient) => {
    setSelectedRecipientId(recipient.id);
    writeAuditLog({ eventType: "RECIPIENT_REUSED" });
  };

  return (
    <Screen>
      <ScrollView>
        <View
          style={{
            padding: 16,
            gap: 16,
            backgroundColor: "#020617",
          }}
        >
          <AppText color={cyan} variant="caption">
            ORCHESTRATION ENGINE
          </AppText>

          <AppText variant="title" color="#FFFFFF">
            Send Money
          </AppText>

          <AppCard
            style={{
              backgroundColor: "rgba(5,18,34,0.9)",
              borderColor: "rgba(39,245,255,0.2)",
            }}
          >
            <AppText color="#8EEBFF">Amount</AppText>
            <TextInput
              value={amount}
              onChangeText={setAmount}
              placeholder="£0.00"
              placeholderTextColor="#4FDFFF"
              style={{
                fontSize: 28,
                color: "#FFFFFF",
                marginTop: 8,
                fontWeight: "900",
              }}
            />
          </AppCard>

          <SavedRecipientsCard
            recipients={savedRecipients}
            selectedRecipientId={selectedRecipientId ?? undefined}
            onSelectRecipient={handleSelectSavedRecipient}
            onToggleFavorite={() => {}}
          />

          <AppButton title="Find best routes" />
        </View>
      </ScrollView>
    </Screen>
  );
}
