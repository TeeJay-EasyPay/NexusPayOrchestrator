import "react-native-get-random-values";

import { Stack } from "expo-router";

import { TransferProvider } from "../src/state/TransferContext";
import { WalletProvider } from "../src/state/WalletContext";

export default function Layout() {
  return (
    <WalletProvider>
      <TransferProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </TransferProvider>
    </WalletProvider>
  );
}