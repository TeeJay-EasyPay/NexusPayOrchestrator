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
      <View style={{ gap: 16 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <View style={{ gap: 4, flex: 1 }}>
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
              padding: 16,
              borderRadius: 20,
              backgroundColor: "#F8FAFC",
              borderWidth: 1,
              borderColor: "#E6ECF2",
              gap: 5,
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
            contentContainerStyle={{ gap: 14, paddingRight: 6, paddingVertical: 2 }}
          >
            {recipients.map((recipient) => {
              const isSelected = selectedRecipientId === recipient.id;

              return (
                <Pressable
                  key={recipient.id}
                  onPress={() => onSelectRecipient(recipient)}
                  style={({ pressed }) => ({
                    width: 188,
                    minHeight: 146,
                    padding: 15,
                    borderRadius: 24,
                    backgroundColor: isSelected ? "#FFF7DF" : "#FAFCFF",
                    borderWidth: 1,
                    borderColor: isSelected
                      ? colors.gold
                      : recipient.isFavorite
                        ? "#E9C978"
                        : "#E6ECF2",
                    shadowColor: isSelected || recipient.isFavorite ? colors.gold : "#020713",
                    shadowOpacity: isSelected ? 0.24 : recipient.isFavorite ? 0.14 : 0.08,
                    shadowRadius: isSelected ? 14 : 10,
                    shadowOffset: { width: 0, height: 7 },
                    elevation: isSelected ? 7 : 4,
                    transform: [{ scale: pressed ? 0.985 : 1 }],
                    gap: 12,
                  })}
                >
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <View
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 24,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: isSelected ? "#F6E4AE" : "#EDF4F8",
                        borderWidth: 1,
                        borderColor: isSelected ? colors.gold : "#DDE6EE",
                      }}
                    >
                      <AppText color={colors.textDarkPrimary} style={{ fontWeight: "900", fontSize: 16 }}>
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
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: recipient.isFavorite ? colors.goldSoft : "#FFFFFF",
                        borderWidth: 1,
                        borderColor: recipient.isFavorite ? colors.gold : "#E6ECF2",
                        shadowColor: recipient.isFavorite ? colors.gold : "#000",
                        shadowOpacity: recipient.isFavorite ? 0.18 : 0.06,
                        shadowRadius: 8,
                      }}
                    >
                      <AppText style={{ fontSize: 18, color: recipient.isFavorite ? colors.gold : colors.textDarkMuted }}>
                        {recipient.isFavorite ? "★" : "☆"}
                      </AppText>
                    </Pressable>
                  </View>

                  <View style={{ gap: 5 }}>
                    <AppText variant="body" color={colors.textDarkPrimary} style={{ fontWeight: "900" }} numberOfLines={1}>
                      {recipient.name}
                    </AppText>
                    <AppText variant="caption" color={colors.textDarkSecondary} numberOfLines={1}>
                      {getProviderLabel(recipient)}
                    </AppText>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 7, marginTop: 4 }}>
                      <AppText style={{ fontSize: 19 }}>{getFlag(recipient.country)}</AppText>
                      <AppText variant="caption" color={isSelected ? colors.gold : colors.textDarkMuted} style={{ fontWeight: "900" }}>
                        {recipient.currency}
                      </AppText>
                    </View>
                  </View>

                  {isSelected ? (
                    <View
                      style={{
                        paddingVertical: 5,
                        paddingHorizontal: 10,
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
