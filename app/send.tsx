import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, View } from "react-native";

import { SavedRecipientsCard } from "../src/components/recipients/SavedRecipientsCard";
import { AppButton } from "../src/components/ui/AppButton";
import { AppCard } from "../src/components/ui/AppCard";
import { AppText } from "../src/components/ui/AppText";
import { Screen } from "../src/components/ui/Screen";

import { writeAuditLog } from "../src/services/auditLog";
import {
  loadSavedRecipients,
  toggleRecipientFavorite,
} from "../src/services/recipientService";

import { SavedRecipient } from "../src/types/recipient";

export default function SendScreen() {
  const [savedRecipients, setSavedRecipients] = useState<SavedRecipient[]>([]);
  const [selectedRecipientId, setSelectedRecipientId] = useState<string | null>(null);

  // load recipients
  const refreshSavedRecipients = async () => {
    const data = await loadSavedRecipients();
    setSavedRecipients(data);
  };

  useEffect(() => {
    refreshSavedRecipients();
  }, []);

  // select recipient
  const handleSelectSavedRecipient = (recipient: SavedRecipient) => {
    setSelectedRecipientId(recipient.id);

    writeAuditLog({
      eventType: "RECIPIENT_REUSED",
      entityType: "recipient",
      entityId: recipient.id,
      metadata: { source: "saved_recipients_card" },
    });
  };

  // toggle favourite
  const handleToggleFavorite = async (recipient: SavedRecipient) => {
    await toggleRecipientFavorite(recipient);
    await refreshSavedRecipients();
  };

  return (
    <Screen>
      <ScrollView>
        <View style={{ padding: 16, gap: 16 }}>
          <AppText variant="title">Send</AppText>

          <SavedRecipientsCard
            recipients={savedRecipients}
            selectedRecipientId={selectedRecipientId || undefined}
            onSelectRecipient={handleSelectSavedRecipient}
            onToggleFavorite={handleToggleFavorite}
          />

          <AppCard>
            <AppText>Send flow continues here...</AppText>
          </AppCard>

          <AppButton title="Back Home" onPress={() => router.push("/")} />
        </View>
      </ScrollView>
    </Screen>
  );
}