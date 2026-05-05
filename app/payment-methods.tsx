import { router } from "expo-router";
import { Alert, Pressable, ScrollView, View } from "react-native";

import { AppButton } from "../src/components/ui/AppButton";
import { AppCard } from "../src/components/ui/AppCard";
import { AppText } from "../src/components/ui/AppText";
import { Screen } from "../src/components/ui/Screen";
import { SavedPaymentMethod } from "../src/data/mockPaymentMethods";
import { usePaymentMethods } from "../src/state/PaymentMethodsContext";
import { colors } from "../src/theme";

function methodIcon(method: SavedPaymentMethod) {
  return method.type === "OPEN_BANKING" ? "🏦" : "💳";
}

function methodTypeLabel(method: SavedPaymentMethod) {
  return method.type === "OPEN_BANKING" ? "Open Banking" : "Card";
}

function statusTone(status: SavedPaymentMethod["status"]) {
  if (status === "ACTIVE" || status === "CONNECTED") {
    return { bg: "#DCFCE7", text: "#166534" };
  }

  return { bg: "#FEF3C7", text: "#92400E" };
}

function PaymentMethodManagementCard({
  method,
  isPrimary,
  onSetPrimary,
}: {
  method: SavedPaymentMethod;
  isPrimary: boolean;
  onSetPrimary: () => void;
}) {
  const status = statusTone(method.status);

  return (
    <AppCard
      style={{
        borderWidth: 1,
        borderColor: isPrimary ? colors.gold : "#E2E8F0",
        backgroundColor: isPrimary ? "#FFF8E1" : "#FFFFFF",
      }}
    >
      <View style={{ gap: 14 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
          <View style={{ flex: 1, gap: 4 }}>
            <AppText variant="caption" color={colors.textDarkMuted}>
              {methodTypeLabel(method)} funding source
            </AppText>

            <AppText variant="subheading" color={colors.textDarkPrimary}>
              {methodIcon(method)} {method.label}
            </AppText>

            <AppText variant="caption" color={colors.textDarkSecondary}>
              {method.subtitle}
            </AppText>
          </View>

          <View style={{ gap: 6, alignItems: "flex-end" }}>
            <View
              style={{
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: 999,
                backgroundColor: status.bg,
              }}
            >
              <AppText variant="caption" style={{ color: status.text, fontWeight: "900" }}>
                {method.status}
              </AppText>
            </View>

            {isPrimary ? (
              <View
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderRadius: 999,
                  backgroundColor: colors.goldSoft,
                }}
              >
                <AppText variant="caption" style={{ color: "#8A6218", fontWeight: "900" }}>
                  PRIMARY
                </AppText>
              </View>
            ) : null}
          </View>
        </View>

        <View
          style={{
            padding: 13,
            borderRadius: 18,
            backgroundColor: "#F8FAFC",
            borderWidth: 1,
            borderColor: "#E2E8F0",
            gap: 5,
          }}
        >
          <AppText variant="caption" color={colors.textDarkMuted}>
            Provider
          </AppText>

          <AppText variant="body" color={colors.textDarkPrimary} style={{ fontWeight: "900" }}>
            {method.provider}
          </AppText>

          <AppText variant="caption" color={colors.textDarkSecondary}>
            Reference: {method.reference} • Funding limit £{method.fundingLimitGbp.toLocaleString()}
          </AppText>
        </View>

        <View style={{ flexDirection: "row", gap: 8 }}>
          <Pressable
            onPress={onSetPrimary}
            disabled={isPrimary}
            style={{
              flex: 1,
              padding: 13,
              borderRadius: 16,
              alignItems: "center",
              backgroundColor: isPrimary ? "#E5E7EB" : "#0B3F4A",
            }}
          >
            <AppText
              variant="caption"
              style={{ color: isPrimary ? colors.textDarkMuted : "#FFFFFF", fontWeight: "900" }}
            >
              {isPrimary ? "Primary method" : "Set as primary"}
            </AppText>
          </Pressable>

          <Pressable
            onPress={() =>
              Alert.alert(
                "Coming soon",
                "This will open the edit flow for card or bank details once provider integrations are connected."
              )
            }
            style={{
              flex: 1,
              padding: 13,
              borderRadius: 16,
              alignItems: "center",
              backgroundColor: "#F8FAFC",
              borderWidth: 1,
              borderColor: "#E2E8F0",
            }}
          >
            <AppText variant="caption" style={{ color: colors.textDarkPrimary, fontWeight: "900" }}>
              Manage
            </AppText>
          </Pressable>
        </View>
      </View>
    </AppCard>
  );
}

export default function PaymentMethodsScreen() {
  const {
    paymentMethods,
    primaryMethodId,
    primaryMethod,
    setPrimaryMethod,
  } = usePaymentMethods();

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={{ gap: 18, paddingBottom: 40 }}>
          <View style={{ gap: 6 }}>
            <AppText variant="caption" color={colors.gold}>
              Funding profile
            </AppText>

            <AppText variant="title" color={colors.textPrimary}>
              Payment Methods
            </AppText>

            <AppText variant="body" color={colors.textSecondary}>
              Manage saved cards and connected bank accounts used to fund NexusPay transfers.
            </AppText>
          </View>

          <View
            style={{
              padding: 18,
              borderRadius: 26,
              backgroundColor: "#0B3F4A",
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.14)",
              gap: 12,
            }}
          >
            <AppText variant="caption" color="#BFEAF1">
              Primary funding method
            </AppText>

            <AppText variant="title" color="#FFFFFF">
              {primaryMethod ? primaryMethod.label : "Not selected"}
            </AppText>

            <AppText variant="caption" color="#BFEAF1">
              NexusPay will preselect this method when authorising transfer funding.
            </AppText>
          </View>

          <AppCard>
            <View style={{ gap: 12 }}>
              <AppText variant="subheading" color={colors.textDarkPrimary}>
                Add payment type
              </AppText>

              <AppText variant="caption" color={colors.textDarkSecondary}>
                These actions are simulated for now. Later, card setup can connect to Stripe/Adyen and bank setup can connect to Open Banking.
              </AppText>

              <View style={{ flexDirection: "row", gap: 8 }}>
                <AppButton
                  title="Add card"
                  onPress={() =>
                    Alert.alert(
                      "Add card",
                      "Card setup will be connected to a card tokenisation provider later. No real card data is stored in this prototype."
                    )
                  }
                  style={{ flex: 1 }}
                />

                <AppButton
                  title="Connect bank"
                  variant="secondary"
                  onPress={() =>
                    Alert.alert(
                      "Connect bank",
                      "Open Banking setup will be connected to a provider later. This prototype uses a simulated HSBC connection."
                    )
                  }
                  style={{ flex: 1 }}
                />
              </View>
            </View>
          </AppCard>

          <View style={{ gap: 12 }}>
            {paymentMethods.map((method) => (
              <PaymentMethodManagementCard
                key={method.id}
                method={method}
                isPrimary={primaryMethodId === method.id}
                onSetPrimary={() => setPrimaryMethod(method.id)}
              />
            ))}
          </View>

          <AppButton title="Back to account" variant="secondary" onPress={() => router.push("/account")} />
        </View>
      </ScrollView>
    </Screen>
  );
}
