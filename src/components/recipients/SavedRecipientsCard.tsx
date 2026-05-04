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

function getFlag(country: string) {
  if (country === "Malaysia") return "🇲🇾";
  if (country === "Philippines") return "🇵🇭";
  if (country === "UAE") return "🇦🇪";
  if (country === "India") return "🇮🇳";
  return "🌍";
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "NP";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export function SavedRecipientsCard({
  recipients,
  selectedRecipientId,
  onSelectRecipient,
  onToggleFavorite,
}: Props) {
  return (
    <AppCard>
      <View style={{ gap: 14 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <View style={{ gap: 3, flex: 1 }}>
            <AppText variant="subheading" color={colors.textDarkPrimary}>
              Saved recipients
            </AppText>
            <AppText variant="caption" color={colors.textDarkSecondary}>
              Tap a saved recipient to auto-fill payout details.
            </AppText>
          </View>
        </View>

        {recipients.length === 0 ? (
          <View
            style={{
              padding: 14,
              borderRadius: 18,
              backgroundColor: "#F8FAFC",
              borderWidth: 1,
              borderColor: "#E6ECF2",
              gap: 4,
            }}
          >
            <AppText variant="body" color={colors.textDarkPrimary} style={{ fontWeight: "900" }}>
              No saved recipients yet
            </AppText>
            <AppText variant="caption" color={colors.textDarkSecondary}>
              Complete a transfer and NexusPay will save the recipient here automatically.
            </AppText>
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 12, paddingRight: 6 }}
          >
            {recipients.map((recipient) => {
              const isSelected = selectedRecipientId === recipient.id;

              return (
                <Pressable
                  key={recipient.id}
                  onPress={() => onSelectRecipient(recipient)}
                  style={({ pressed }) => ({
                    width: 178,
                    minHeight: 136,
                    padding: 14,
                    borderRadius: 20,
                    backgroundColor: isSelected ? colors.goldSoft : "#F8FAFC",
                    borderWidth: 1,
                    borderColor: isSelected
                      ? "#F1D99B"
                      : recipient.isFavorite
                        ? "#F1D99B"
                        : "#E6ECF2",
                    transform: [{ scale: pressed ? 0.985 : 1 }],
                    gap: 10,
                  })}
                >
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <View
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 22,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: isSelected ? "#F7E8BE" : "#EDF4F8",
                        borderWidth: 1,
                        borderColor: isSelected ? colors.gold : "#DDE6EE",
                      }}
                    >
                      <AppText color={colors.textDarkPrimary} style={{ fontWeight: "900" }}>
                        {getInitials(recipient.name)}
                      </AppText>
                    </View>

                    <Pressable
                      onPress={(event) => {
                        event.stopPropagation();
                        onToggleFavorite(recipient);
                      }}
                      hitSlop={10}
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 17,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: recipient.isFavorite ? colors.goldSoft : "#FFFFFF",
                        borderWidth: 1,
                        borderColor: recipient.isFavorite ? "#F1D99B" : "#E6ECF2",
                      }}
                    >
                      <AppText style={{ fontSize: 18 }}>
                        {recipient.isFavorite ? "★" : "☆"}
                      </AppText>
                    </Pressable>
                  </View>

                  <View style={{ gap: 4 }}>
                    <AppText variant="body" color={colors.textDarkPrimary} style={{ fontWeight: "900" }} numberOfLines={1}>
                      {recipient.name}
                    </AppText>
                    <AppText variant="caption" color={colors.textDarkSecondary} numberOfLines={1}>
                      {getProviderLabel(recipient)}
                    </AppText>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 7, marginTop: 3 }}>
                      <AppText style={{ fontSize: 18 }}>{getFlag(recipient.country)}</AppText>
                      <AppText variant="caption" color={isSelected ? colors.gold : colors.textDarkMuted} style={{ fontWeight: "900" }}>
                        {recipient.currency}
                      </AppText>
                    </View>
                  </View>

                  {isSelected ? (
                    <View
                      style={{
                        paddingVertical: 4,
                        paddingHorizontal: 9,
                        borderRadius: 999,
                        alignSelf: "flex-start",
                        backgroundColor: "#FFFFFF",
                        borderWidth: 1,
                        borderColor: "#F1D99B",
                      }}
                    >
                      <AppText variant="caption" color={colors.gold} style={{ fontWeight: "900" }}>
                        Selected
                      </AppText>
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </ScrollView>
        )}
      </View>
    </AppCard>
  );
}
