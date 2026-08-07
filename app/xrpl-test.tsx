import { router } from "expo-router";
import { useEffect, useState } from "react";
import { View } from "react-native";

import { AppButton } from "../src/components/ui/AppButton";
import { AppCard } from "../src/components/ui/AppCard";
import { AppText } from "../src/components/ui/AppText";
import { Screen } from "../src/components/ui/Screen";
import { getXrplTestnetStatus } from "../src/services/xrplTestnetService";
import { colors } from "../src/theme";

export default function XrplTestScreen() {
  const [address, setAddress] = useState("");
  const [status, setStatus] = useState("Connecting...");
  const [networkEvidence, setNetworkEvidence] = useState<{
    sourceXrp: number;
    destinationRlusd: number;
    ledgerIndex: number;
    feeXrp: number;
  } | null>(null);

  useEffect(() => {
    async function init() {
      try {
        const evidence = await getXrplTestnetStatus(1);

        setAddress(evidence.source.address);
        setNetworkEvidence({
          sourceXrp: evidence.source.xrpBalance,
          destinationRlusd: evidence.destination.rlusdBalance,
          ledgerIndex: evidence.ledgerIndex,
          feeXrp: evidence.networkFeeXrp,
        });
        setStatus(!evidence.source.trustlineActive || !evidence.destination.trustlineActive
          ? "XRPL Testnet trustline incomplete"
          : evidence.pathQuote?.sufficientSourceXrp
            ? "XRPL Testnet returned an executable XRP-to-RLUSD path"
            : "No executable XRP-to-RLUSD path for the diagnostic amount");
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

            {networkEvidence ? (
              <View style={{ gap: 4 }}>
                <AppText variant="caption">Source XRP: {networkEvidence.sourceXrp.toFixed(6)} (TESTNET)</AppText>
                <AppText variant="caption">Destination RLUSD: {networkEvidence.destinationRlusd.toFixed(6)} (TESTNET)</AppText>
                <AppText variant="caption">Network fee: {networkEvidence.feeXrp.toFixed(6)} XRP (TESTNET)</AppText>
                <AppText variant="caption">Validated ledger: {networkEvidence.ledgerIndex}</AppText>
              </View>
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
