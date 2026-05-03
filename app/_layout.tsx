import "react-native-get-random-values";

import { Stack } from "expo-router";

import { AuthProvider } from "../src/state/AuthContext";
import { TransferProvider } from "../src/state/TransferContext";
import { WalletProvider } from "../src/state/WalletContext";

export default function Layout() {
  return (
    <AuthProvider>
      <WalletProvider>
        <TransferProvider>
          <Stack screenOptions={{ headerShown: false }} />
        </TransferProvider>
      </WalletProvider>
    </AuthProvider>
  );
}
