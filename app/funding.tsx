import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";

import { AppButton } from "../src/components/ui/AppButton";
import { AppCard } from "../src/components/ui/AppCard";
import { AppText } from "../src/components/ui/AppText";
import { Screen } from "../src/components/ui/Screen";
import { SavedPaymentMethod } from "../src/data/mockPaymentMethods";
import { authoriseOpenBankingPayment } from "../src/services/openBankingPaymentFlowService";
import { usePaymentMethods } from "../src/state/PaymentMethodsContext";
import { useTransfer } from "../src/state/TransferContext";
import { colors } from "../src/theme";
import { FundingMethod } from "../src/types/transfer";

function mapPaymentMethodToFundingMethod(method: SavedPaymentMethod): FundingMethod {
  return method.type === "OPEN_BANKING" ? "OPEN_BANKING" : "CARD";
}

function methodMeta(method: SavedPaymentMethod) {
  if (method.type === "OPEN_BANKING") {
    return {
      icon: "🏦",
      label: "Pay by Bank via Yapily",
      note: "Lower fees • Strong customer authentication",
    };
  }

  return {
    icon: "💳",
    label: "Card",
    note: "Fast authorisation • Higher processing cost",
  };
}

function PaymentMethodOption({
  method,
  selected,
  isPrimary,
  onPress,
}: {
  method: SavedPaymentMethod;
  selected: boolean;
  isPrimary: boolean;
  onPress: () => void;
}) {
  const meta = methodMeta(method);
  const noteText =
    method.type === "OPEN_BANKING"
      ? "Yapily sandbox bank authorisation - visible flow evidence"
      : "Fast simulated authorisation - higher processing cost";

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
                {meta.label}
              </AppText>

              <AppText variant="subheading" color={colors.textDarkPrimary}>
                {meta.icon} {method.label}
              </AppText>

              <AppText variant="caption" color={colors.textDarkSecondary}>
                {method.subtitle}
              </AppText>
            </View>

            <View style={{ gap: 6, alignItems: "flex-end" }}>
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

              {selected ? (
                <View
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderRadius: 999,
                    backgroundColor: "#DCFCE7",
                  }}
                >
                  <AppText variant="caption" style={{ color: "#166534", fontWeight: "900" }}>
                    SELECTED
                  </AppText>
                </View>
              ) : null}
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
              {noteText}
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
  const { transfer, setFundingMethod, setFundingStatus, setOpenBankingFlow } = useTransfer();
  const {
    paymentMethods,
    primaryMethodId,
    primaryMethod,
    loadingInstitutions,
    institutionError,
    refreshInstitutions,
  } = usePaymentMethods();

  const [selectedMethodId, setSelectedMethodId] = useState(primaryMethodId);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setSelectedMethodId(primaryMethodId);
  }, [primaryMethodId]);

  const selectedMethod = paymentMethods.find((method) => method.id === selectedMethodId);

  async function handleAuthoriseFunding() {
    if (!selectedMethod || busy) return;

    setBusy(true);

    const fundingMethod = mapPaymentMethodToFundingMethod(selectedMethod);
    setFundingMethod(fundingMethod, selectedMethod.reference);
    setFundingStatus("AUTHORISING");

    if (fundingMethod === "OPEN_BANKING" && transfer) {
      try {
        if (!selectedMethod.institutionId || !selectedMethod.institutionName) {
          throw new Error("Select an institution returned by Yapily before continuing.");
        }
        const flow = await authoriseOpenBankingPayment({
          transferId: transfer.id,
          amount: transfer.senderAmount,
          currency: transfer.senderCurrency,
          fundingReference: selectedMethod.reference,
          institutionId: selectedMethod.institutionId,
          institutionName: selectedMethod.institutionName,
        });
        if (!flow.providerPaymentId || flow.status.includes("FAILED")) {
          throw new Error(flow.failureReason ?? "Yapily did not create the sandbox payment.");
        }
        setOpenBankingFlow(flow);
      } catch (error) {
        console.warn("Open banking payment flow failed", error instanceof Error ? error.message : String(error));
        setFundingStatus("FAILED");
        setBusy(false);
        return;
      }
    } else {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

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
              Select a card or Yapily sandbox bank source to authorise this transfer before payout execution.
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

            <AppText variant="caption" color={colors.gold}>
              Primary funding method: {primaryMethod?.label ?? "Not selected"}
            </AppText>
          </View>

          <View style={{ gap: 12 }}>
            {paymentMethods.map((method) => (
              <PaymentMethodOption
                key={method.id}
                method={method}
                selected={selectedMethodId === method.id}
                isPrimary={primaryMethodId === method.id}
                onPress={() => setSelectedMethodId(method.id)}
              />
            ))}
          </View>

          {loadingInstitutions ? (
            <AppCard>
              <AppText variant="caption" color={colors.textDarkSecondary}>
                Loading payment-capable institutions from Yapily...
              </AppText>
            </AppCard>
          ) : null}

          {institutionError ? (
            <AppCard>
              <View style={{ gap: 10 }}>
                <AppText variant="caption" color={colors.danger}>
                  Yapily institutions are unavailable. No simulated bank has been substituted.
                </AppText>
                <AppButton title="Retry Yapily" variant="secondary" onPress={() => void refreshInstitutions()} />
              </View>
            </AppCard>
          ) : null}

          <AppCard>
            <View style={{ gap: 10 }}>
              <AppText variant="subheading" color={colors.textDarkPrimary}>
                Funding authorisation
              </AppText>

              <AppText variant="caption" color={colors.textDarkSecondary}>
                {"Card authorisation remains simulated. Pay by Bank opens Yapily's sandbox institution authorisation and continues only after Yapily creates a payment."}
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
