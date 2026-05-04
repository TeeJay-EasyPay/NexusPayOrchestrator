import { useRouter } from "expo-router";
import { Pressable, ScrollView, View } from "react-native";

import { useTransfer } from "../../state/TransferContext";
import { colors } from "../../theme";
import { AppCard } from "../ui/AppCard";
import { AppText } from "../ui/AppText";

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

  return {
    flag: "🌍",
    backgroundColor: "#F1F5F9",
  };
}

export function RecentTransactionHistoryCard() {
  const router = useRouter();
  const { completedTransfers } = useTransfer();

  function handleResend(item: (typeof completedTransfers)[number]) {
    const recipient = item.recipient;

    router.push({
      pathname: "/send",
      params: {
        amount: String(item.senderAmount),
        country: recipient.country,
        payoutMethod: recipient.payoutMethod,
        provider:
          recipient.payoutMethod === "BANK"
            ? recipient.bankName ?? ""
            : recipient.mobileWalletProvider ?? "",
        firstName: recipient.firstName ?? "",
        middleName: recipient.middleName ?? "",
        surname: recipient.surname ?? "",
        bankCode: recipient.bankCode ?? "",
        accountNumber: recipient.accountNumber ?? "",
        mobileNumber: recipient.mobileNumber ?? "",
      },
    });
  }

  return (
    <AppCard>
      <View style={{ gap: 12 }}>
        <View style={{ gap: 4 }}>
          <AppText variant="subheading" color={colors.textDarkPrimary}>
            Recent transaction history
          </AppText>

          <AppText variant="caption" color={colors.textDarkSecondary}>
            Tap Resend to repeat a previous transfer with the same details.
          </AppText>
        </View>

        {completedTransfers.length === 0 ? (
          <AppText variant="body" color={colors.textDarkSecondary}>
            No completed transfers yet.
          </AppText>
        ) : (
          <ScrollView
            nestedScrollEnabled
            showsVerticalScrollIndicator={false}
            style={{ maxHeight: 318 }}
            contentContainerStyle={{ gap: 10, paddingRight: 2 }}
          >
            {completedTransfers.map((item) => {
              const route = item.selectedRoute;
              const recipient = item.recipient;
              const avatar = getRecipientFlag(recipient.country);

              return (
                <View
                  key={item.id}
                  style={{
                    padding: 12,
                    borderRadius: 18,
                    backgroundColor: "#F9FAFB",
                    borderWidth: 1,
                    borderColor: "#E5E7EB",
                    gap: 8,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      gap: 12,
                      alignItems: "flex-start",
                    }}
                  >
                    <View style={{ flexDirection: "row", gap: 10, flex: 1 }}>
                      <View
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 22,
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: avatar.backgroundColor,
                          borderWidth: 1,
                          borderColor: "#E2E8F0",
                        }}
                      >
                        <AppText style={{ fontSize: 22 }}>{avatar.flag}</AppText>
                      </View>

                      <View style={{ flex: 1, gap: 3 }}>
                        <AppText
                          variant="body"
                          color={colors.textDarkPrimary}
                          style={{ fontWeight: "800" }}
                        >
                          {recipient.name || "Recipient"}
                        </AppText>

                        <AppText variant="caption" color={colors.textDarkSecondary}>
                          {recipient.country} • {route?.provider ?? "Route"}
                        </AppText>
                      </View>
                    </View>

                    <View style={{ alignItems: "flex-end", gap: 6 }}>
                      <View
                        style={{
                          paddingHorizontal: 9,
                          paddingVertical: 4,
                          borderRadius: 999,
                          backgroundColor: "#DCFCE7",
                        }}
                      >
                        <AppText
                          variant="caption"
                          style={{ color: "#166534", fontWeight: "900" }}
                        >
                          COMPLETED
                        </AppText>
                      </View>

                      <Pressable
                        onPress={() => handleResend(item)}
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 7,
                          borderRadius: 999,
                          backgroundColor: colors.gold,
                        }}
                      >
                        <AppText
                          variant="caption"
                          style={{ color: "#0B1F2A", fontWeight: "900" }}
                        >
                          Resend
                        </AppText>
                      </Pressable>
                    </View>
                  </View>

                  <View
                    style={{
                      padding: 11,
                      borderRadius: 15,
                      backgroundColor: "#FFFFFF",
                      borderWidth: 1,
                      borderColor: "#E8EEF3",
                      gap: 4,
                    }}
                  >
                    <AppText variant="caption" color={colors.textDarkSecondary}>
                      £{item.senderAmount.toFixed(2)} GBP →{" "}
                      {route
                        ? `${route.receiveAmount.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })} ${recipient.currency}`
                        : recipient.currency}
                    </AppText>

                    <AppText variant="caption" color={colors.textDarkMuted}>
                      Ref: NPX-{item.id.slice(-6)}
                    </AppText>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        )}
      </View>
    </AppCard>
  );
}
