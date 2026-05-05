import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";

import { AppButton } from "../src/components/ui/AppButton";
import { AppCard } from "../src/components/ui/AppCard";
import { AppText } from "../src/components/ui/AppText";
import { Screen } from "../src/components/ui/Screen";
import { mockPaymentMethods, SavedPaymentMethod } from "../src/data/mockPaymentMethods";
import { useTransfer } from "../src/state/TransferContext";
import { colors } from "../src/theme";
import { FundingMethod } from "../src/types/transfer";

function mapPaymentMethodToFundingMethod(method: SavedPaymentMethod): FundingMethod {
  return method.type === "OPEN_BANKING" ? "OPEN_BANKING" : "CARD";
}

function methodTone(method: SavedPaymentMethod) {
  return method.type === "OPEN_BANKING"
    ? { icon: "🏦", badge: "Pay by Bank", note: "Lower fees • Strong customer authentication" }
    : { icon: "💳", badge: "Card", note: "Fast authorisation • Higher processing cost" };
}

function PaymentMethodOption({
  method,
  selected,
  onPress,
}: {
  method: SavedPaymentMethod;
  selected: boolean;
  onPress: () => void;
}) {
  const tone = methodTone(method);

  return (
    <Pressable onPress={onPress}>
      <AppCard
        style={{
          borderWidth: 1,
          borderColor: selected ? colors.gold : "#E2E8F0",
          backgroundColor: selected ? "#FFF8E1" : "#FFFFFF",
        }}
      >
        <View style={{ gap: 12 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
            <View style={{ flex: 1, gap: 4 }}>
              <AppText variant="caption" color={colors.textDarkMuted}>
                {tone.badge}
              </AppText>

              <AppText variant="subheading" color={colors.textDarkPrimary}>
                {tone.icon} {method.label}
              </AppText>

              <AppText variant="caption" color={colors.textDarkSecondary}>
                {method.subtitle}
              </AppText>
            </View>

            <View
              style={{
                alignSelf: "flex-start",
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: 999,
                backgroundColor: method.isPrimary ? colors.goldSoft : "#F1F5F9",
              }}
            >
              <AppText
                variant="caption"
                style={{
                  color: method.isPrimary ? "#8A6218" : colors.textDarkSecondary,
                  fontWeight: "900",
                }}
              >
                {method.isPrimary ? "PRIMARY" : method.status}
              </AppText>
            </View>
          </View>

          <View
            style={{
              padding: 12,
              borderRadius: 16,
              backgroundColor: "#F8FAFC",
              borderWidth: 1,
              borderColor: "#E2E8F0",
              gap: 4,
            }}
          >
            <AppText variant="caption" color={colors.textDarkSecondary}>
              {tone.note}
            </AppText>

            <AppText variant="caption" color={colors.textDarkMuted}>
              Provider: {method.provider} • Limit £{method.fundingLimitGbp.toLocaleString()}
            </AppText>
          </View>
        </View>
      </AppCard>
    </Pressable>
  );
}

export default function FundingScreen() {
  const { transfer, setFundingMethod, setFundingStatus } = useTransfer();
  const [selectedMethodId, setSelectedMethodId] = useState(
    mockPaymentMethods.find((method) => method.isPrimary)?.id ?? mockPaymentMethods[0]?.id
  );
  const [busy, setBusy] = useState(false);

  const selectedMethod = mockPaymentMethods.find((method) => method.id === selectedMethodId);

  async function handleAuthoriseFunding() {
    if (!selectedMethod || busy) return;

    setBusy(true);

    const fundingMethod = mapPaymentMethodToFundingMethod(selectedMethod);
    setFundingMethod(fundingMethod, selectedMethod.reference);
    setFundingStatus("AUTHORISING");

    await new Promise((resolve) => setTimeout(resolve, 1000));

    setFundingStatus("AUTHORISED");
    setBusy(false);
    router.push("/track");
  }

  if (!transfer || !transfer.selectedRoute) {
    return (
      <Screen>
        <View style={{ gap: 18 }}>
          <View style={{ gap: 6 }}>
            <AppText variant="caption" color={colors.gold}>
              Funding layer
            </AppText>
            <AppText variant="title" color={colors.textPrimary}>
              No selected route
            </AppText>
          </View>

          <AppCard>
            <AppText variant="body" color={colors.textDarkSecondary}>
              Select a route first so NexusPay can authorise the transfer funding source.
            </AppText>
          </AppCard>

          <AppButton title="Go to routes" onPress={() => router.push("/routes")} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={{ gap: 18, paddingBottom: 40 }}>
          <View style={{ gap: 6 }}>
            <AppText variant="caption" color={colors.gold}>
              NexusPay funding layer
            </AppText>

            <AppText variant="title" color={colors.textPrimary}>
              Choose funding source
            </AppText>

            <AppText variant="body" color={colors.textSecondary}>
              Select a saved bank or card source to authorise this transfer before payout execution.
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
              Transfer to fund
            </AppText>

            <AppText variant="title" color="#FFFFFF">
              £{transfer.senderAmount.toFixed(2)} → {transfer.recipient.currency}
            </AppText>

            <AppText variant="caption" color="#BFEAF1">
              Route: {transfer.selectedRoute.provider} • Recipient receives {transfer.selectedRoute.receiveAmount.toFixed(2)} {transfer.recipient.currency}
            </AppText>
          </View>

          <View style={{ gap: 12 }}>
            {mockPaymentMethods.map((method) => (
              <PaymentMethodOption
                key={method.id}
                method={method}
                selected={selectedMethodId === method.id}
                onPress={() => setSelectedMethodId(method.id)}
              />
            ))}
          </View>

          <AppCard>
            <View style={{ gap: 10 }}>
              <AppText variant="subheading" color={colors.textDarkPrimary}>
                Funding authorisation
              </AppText>

              <AppText variant="caption" color={colors.textDarkSecondary}>
                This simulates card/open banking payment authorisation. NexusPay does not hold an in-app balance.
              </AppText>

              <AppButton
                title={busy ? "Authorising funding..." : "Authorise funding and continue"}
                onPress={handleAuthoriseFunding}
                disabled={busy || !selectedMethod}
              />

              <AppButton
                title="Back to routes"
                variant="secondary"
                onPress={() => router.push("/routes")}
                disabled={busy}
              />
            </View>
          </AppCard>
        </View>
      </ScrollView>
    </Screen>
  );
}
