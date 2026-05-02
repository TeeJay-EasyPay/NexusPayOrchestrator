import { useEffect, useState } from "react";
import { View } from "react-native";

import { AppCard } from "../src/components/ui/AppCard";
import { AppText } from "../src/components/ui/AppText";
import { Screen } from "../src/components/ui/Screen";

import { getOrCreateWallet } from "../src/lib/xrplWallet";

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
        <AppText variant="title">
          XRPL Testnet
        </AppText>

        <AppCard>
          <View style={{ gap: 10 }}>
            <AppText variant="subheading">
              Connection Status
            </AppText>

            <AppText variant="body">
              {status}
            </AppText>

            {address ? (
              <AppText variant="caption">
                Wallet: {address}
              </AppText>
            ) : null}
          </View>
        </AppCard>
      </View>
    </Screen>
  );
}