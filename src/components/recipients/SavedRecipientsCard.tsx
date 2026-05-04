import { Pressable, ScrollView, View } from "react-native";

import { SavedRecipient } from "../../types/recipient";
import { colors } from "../../theme";
import { AppCard } from "../ui/AppCard";
import { AppText } from "../ui/AppText";

type Props = {
  recipients: SavedRecipient[];
  onSelectRecipient: (recipient: SavedRecipient) => void;
};

type FlagConfig = {
  flag: string;
  backgroundColor: string;
};

function getRecipientFlag(country?: string): FlagConfig {
  if (country === "Malaysia") {
    return {
      flag: "🇲🇾",
      backgroundColor: "#E0F2FE",
    };
  }

  if (country === "Philippines") {
    return {
      flag: "🇵🇭",
      backgroundColor: "#EEF2FF",
    };
  }

  if (country === "UAE") {
    return {
      flag: "🇦🇪",
      backgroundColor: "#FEF3C7",
    };
  }

  return {
    flag: "🌍",
    backgroundColor: "#F1F5F9",
  };
}

function getProviderLabel(recipient: SavedRecipient) {
  if (recipient.payoutMethod === "BANK") {
    return recipient.bankName || "Bank payout";
  }

  return recipient.mobileWalletProvider || "Mobile wallet";
}

function getPayoutLabel(recipient: SavedRecipient) {
  return recipient.payoutMethod === "BANK" ? "Bank" : "Wallet";
}

export function SavedRecipientsCard({ recipients, onSelectRecipient }: Props) {
  return (
    <AppCard>
      <View style={{ gap: 12 }}>
        <View style={{ gap: 4 }}>
          <AppText variant="subheading" color={colors.textDarkPrimary}>
            Saved recipients
          </AppText>

          <AppText variant="caption" color={colors.textDarkSecondary}>
            Tap a saved recipient to auto-fill their payout details.
          </AppText>
        </View>

        {recipients.length === 0 ? (
          <View
            style={{
              padding: 14,
              borderRadius: 18,
              backgroundColor: "#F8FAFC",
              borderWidth: 1,
              borderColor: "#E2E8F0",
              gap: 4,
            }}
          >
            <AppText variant="body" color={colors.textDarkPrimary} style={{ fontWeight: "800" }}>
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
            contentContainerStyle={{ gap: 10, paddingRight: 2 }}
          >
            {recipients.map((recipient) => {
              const avatar = getRecipientFlag(recipient.country);

              return (
                <Pressable
                  key={recipient.id}
                  onPress={() => onSelectRecipient(recipient)}
                  style={{
                    width: 188,
                    padding: 13,
                    borderRadius: 22,
                    backgroundColor: "#F9FAFB",
                    borderWidth: 1,
                    borderColor: "#E5E7EB",
                    gap: 10,
                  }}
                >
                  <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
                    <View
                      style={{
                        width: 46,
                        height: 46,
                        borderRadius: 23,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: avatar.backgroundColor,
                        borderWidth: 1,
                        borderColor: "#E2E8F0",
                      }}
                    >
                      <AppText style={{ fontSize: 22 }}>{avatar.flag}</AppText>
                    </View>

                    <View
                      style={{
                        paddingHorizontal: 9,
                        paddingVertical: 4,
                        borderRadius: 999,
                        backgroundColor: "rgba(214,168,79,0.18)",
                        alignSelf: "flex-start",
                      }}
                    >
                      <AppText variant="caption" style={{ color: "#8A5A12", fontWeight: "900" }}>
                        {getPayoutLabel(recipient)}
                      </AppText>
                    </View>
                  </View>

                  <View style={{ gap: 3 }}>
                    <AppText
                      variant="body"
                      color={colors.textDarkPrimary}
                      style={{ fontWeight: "900" }}
                      numberOfLines={1}
                    >
                      {recipient.name}
                    </AppText>

                    <AppText variant="caption" color={colors.textDarkSecondary} numberOfLines={1}>
                      {recipient.country} • {recipient.currency}
                    </AppText>

                    <AppText variant="caption" color={colors.textDarkMuted} numberOfLines={1}>
                      {getProviderLabel(recipient)}
                    </AppText>
                  </View>

                  <View
                    style={{
                      height: 1,
                      backgroundColor: "#E8EEF3",
                    }}
                  />

                  <AppText variant="caption" color={colors.textDarkSecondary} style={{ fontWeight: "800" }}>
                    Tap to use recipient
                  </AppText>
                </Pressable>
              );
            })}
          </ScrollView>
        )}
      </View>
    </AppCard>
  );
}
