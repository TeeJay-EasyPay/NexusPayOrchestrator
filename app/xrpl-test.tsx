import { router } from "expo-router";
import { useEffect, useState } from "react";
import { View } from "react-native";

import { AppButton } from "../src/components/ui/AppButton";
import { AppCard } from "../src/components/ui/AppCard";
import { AppText } from "../src/components/ui/AppText";
import { Screen } from "../src/components/ui/Screen";
import { getOrCreateWallet } from "../src/lib/xrplWallet";
import { colors } from "../src/theme";

export default function XrplTestScreen() {
  const [address, setAddress] = useState("");
  const [status, setStatus] = useState("Connecting...");

  useEffect(() => {
    async function init() {
      try {
        const wallet = await getOrCreateWallet();

        setAddress(wallet.address);
        setStatus("XRPL Testnet wallet ready");
      } catch (error) {
        console.error(error);
        setStatus("Failed to connect");
      }
    }

    init();
  }, []);

  return (
    <Screen>
      <View style={{ gap: 18 }}>
        <View>
          <AppText variant="title" color={colors.textPrimary}>
            XRPL Testnet
          </AppText>

          <AppText variant="caption" color={colors.textSecondary}>
            Validate the testnet wallet connection used by NexusPay.
          </AppText>
        </View>

        <AppCard>
          <View style={{ gap: 10 }}>
            <AppText variant="subheading">Connection Status</AppText>

            <AppText variant="body">{status}</AppText>

            {address ? (
              <AppText variant="caption">Wallet: {address}</AppText>
            ) : null}
          </View>
        </AppCard>

        <AppButton
          title="Back Home"
          variant="secondary"
          onPress={() => router.push("/")}
        />
      </View>
    </Screen>
  );
}