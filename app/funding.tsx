// updated to use shared payment methods context
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";

import { AppButton } from "../src/components/ui/AppButton";
import { AppCard } from "../src/components/ui/AppCard";
import { AppText } from "../src/components/ui/AppText";
import { Screen } from "../src/components/ui/Screen";
import { usePaymentMethods } from "../src/state/PaymentMethodsContext";
import { useTransfer } from "../src/state/TransferContext";
import { colors } from "../src/theme";
import { FundingMethod } from "../src/types/transfer";

export default function FundingScreen() {
  const { transfer, setFundingMethod, setFundingStatus } = useTransfer();
  const { paymentMethods, primaryMethodId } = usePaymentMethods();

  const [selectedMethodId, setSelectedMethodId] = useState(primaryMethodId);
  const [busy, setBusy] = useState(false);

  const selectedMethod = paymentMethods.find((m) => m.id === selectedMethodId);

  function map(method) {
    return method.type === "OPEN_BANKING" ? "OPEN_BANKING" : "CARD";
  }

  async function handleAuthoriseFunding() {
    if (!selectedMethod || busy) return;

    setBusy(true);

    const fundingMethod = map(selectedMethod);
    setFundingMethod(fundingMethod, selectedMethod.reference);
    setFundingStatus("AUTHORISING");

    await new Promise((r) => setTimeout(r, 1000));

    setFundingStatus("AUTHORISED");
    setBusy(false);
    router.push("/track");
  }

  if (!transfer || !transfer.selectedRoute) {
    return <Screen><AppText>No route</AppText></Screen>;
  }

  return (
    <Screen>
      <ScrollView>
        <View style={{ gap: 12 }}>
          {paymentMethods.map((method) => (
            <Pressable key={method.id} onPress={() => setSelectedMethodId(method.id)}>
              <AppCard style={{ borderColor: selectedMethodId === method.id ? colors.gold : "#E2E8F0" }}>
                <AppText>{method.label} {method.isPrimary ? "(PRIMARY)" : ""}</AppText>
              </AppCard>
            </Pressable>
          ))}

          <AppButton title="Authorise" onPress={handleAuthoriseFunding} />
        </View>
      </ScrollView>
    </Screen>
  );
}
