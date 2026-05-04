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

const cyan = "#27F5FF";
const cyanSoft = "rgba(39,245,255,0.16)";
const darkPanel = "rgba(5,18,34,0.88)";
const selectedGold = "rgba(255,209,102,0.18)";

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
    <AppCard
      style={{
        backgroundColor: "rgba(3,14,29,0.72)",
        borderColor: "rgba(39,245,255,0.22)",
        borderWidth: 1,
        shadowColor: cyan,
        shadowOpacity: 0.16,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 8 },
      }}
    >
      <View style={{ gap: 14 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <View style={{ gap: 3 }}>
            <AppText variant="subheading" color="#FFFFFF">
              Saved recipients
            </AppText>
            <AppText variant="caption" color="#8EEBFF">
              Tap a recipient node to auto-fill payout details.
            </AppText>
          </View>

          <AppText variant="caption" color={cyan} style={{ fontWeight: "900" }}>
            See all
          </AppText>
        </View>

        {recipients.length === 0 ? (
          <View
            style={{
              padding: 14,
              borderRadius: 20,
              backgroundColor: darkPanel,
              borderWidth: 1,
              borderColor: "rgba(39,245,255,0.18)",
              gap: 4,
            }}
          >
            <AppText variant="body" color="#FFFFFF" style={{ fontWeight: "900" }}>
              No saved recipients yet
            </AppText>
            <AppText variant="caption" color="#A8C7D8">
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
                    width: 190,
                    minHeight: 158,
                    padding: 14,
                    borderRadius: 24,
                    backgroundColor: isSelected ? selectedGold : darkPanel,
                    borderWidth: 1,
                    borderColor: isSelected
                      ? colors.gold
                      : recipient.isFavorite
                        ? "rgba(255,209,102,0.50)"
                        : "rgba(39,245,255,0.25)",
                    shadowColor: isSelected ? colors.gold : cyan,
                    shadowOpacity: isSelected ? 0.38 : 0.16,
                    shadowRadius: isSelected ? 18 : 12,
                    shadowOffset: { width: 0, height: 8 },
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
                        backgroundColor: isSelected ? "rgba(214,168,79,0.28)" : cyanSoft,
                        borderWidth: 1,
                        borderColor: isSelected ? colors.gold : "rgba(39,245,255,0.35)",
                      }}
                    >
                      <AppText color="#FFFFFF" style={{ fontWeight: "900" }}>
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
                        backgroundColor: recipient.isFavorite
                          ? "rgba(214,168,79,0.24)"
                          : "rgba(255,255,255,0.06)",
                        borderWidth: 1,
                        borderColor: recipient.isFavorite ? colors.gold : "rgba(255,255,255,0.14)",
                      }}
                    >
                      <AppText style={{ fontSize: 18 }}>
                        {recipient.isFavorite ? "★" : "☆"}
                      </AppText>
                    </Pressable>
                  </View>

                  <View style={{ gap: 4 }}>
                    <AppText variant="body" color="#FFFFFF" style={{ fontWeight: "900" }} numberOfLines={1}>
                      {recipient.name}
                    </AppText>
                    <AppText variant="caption" color="#B7D3E1" numberOfLines={1}>
                      {getProviderLabel(recipient)}
                    </AppText>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 7, marginTop: 4 }}>
                      <AppText style={{ fontSize: 18 }}>{getFlag(recipient.country)}</AppText>
                      <AppText variant="caption" color={isSelected ? colors.gold : cyan} style={{ fontWeight: "900" }}>
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
                        backgroundColor: "rgba(214,168,79,0.24)",
                        borderWidth: 1,
                        borderColor: "rgba(214,168,79,0.40)",
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
