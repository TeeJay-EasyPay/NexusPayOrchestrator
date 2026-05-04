import { Pressable, ScrollView, View } from "react-native";

import { SavedRecipient } from "../../types/recipient";
import { colors } from "../../theme";
import { AppCard } from "../ui/AppCard";
import { AppText } from "../ui/AppText";

type Props = {
  recipients: SavedRecipient[];
  selectedRecipientId?: string;
  onSelectRecipient: (recipient: SavedRecipient) => void;
  onToggleFavorite: (recipient: SavedRecipient) => void;
};

function getProviderLabel(recipient: SavedRecipient) {
  return recipient.payoutMethod === "BANK"
    ? recipient.bankName || "Bank"
    : recipient.mobileWalletProvider || "Wallet";
}

export function SavedRecipientsCard({
  recipients,
  selectedRecipientId,
  onSelectRecipient,
  onToggleFavorite,
}: Props) {
  return (
    <AppCard>
      <View style={{ gap: 12 }}>
        <AppText variant="subheading">Saved recipients</AppText>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: "row", gap: 12 }}>
            {recipients.map((recipient) => {
              const isSelected = selectedRecipientId === recipient.id;

              return (
                <Pressable
                  key={recipient.id}
                  onPress={() => onSelectRecipient(recipient)}
                  style={{
                    width: 190,
                    padding: 14,
                    borderRadius: 22,
                    backgroundColor: isSelected ? "#FFF8E1" : "#F9FAFB",
                    borderWidth: 1,
                    borderColor: isSelected ? colors.gold : "#E5E7EB",
                  }}
                >
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <AppText style={{ fontSize: 20 }}>
                      {recipient.country === "Malaysia" ? "🇲🇾" : "🌍"}
                    </AppText>

                    <Pressable
                      onPress={(e) => {
                        e.stopPropagation();
                        onToggleFavorite(recipient);
                      }}
                    >
                      <AppText style={{ fontSize: 18 }}>
                        {recipient.isFavorite ? "⭐" : "☆"}
                      </AppText>
                    </Pressable>
                  </View>

                  <View style={{ marginTop: 8 }}>
                    <AppText style={{ fontWeight: "900" }}>{recipient.name}</AppText>
                    <AppText variant="caption">
                      {recipient.country} • {getProviderLabel(recipient)}
                    </AppText>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </View>
    </AppCard>
  );
}
