import "react-native-get-random-values";

import { Stack } from "expo-router";

import { AuthGate } from "../src/components/auth/AuthGate";
import { AuthProvider } from "../src/state/AuthContext";
import { DeviceUnlockProvider } from "../src/state/DeviceUnlockContext";
import { TransferProvider } from "../src/state/TransferContext";
import { WalletProvider } from "../src/state/WalletContext";

export default function Layout() {
  return (
    <AuthProvider>
      <DeviceUnlockProvider>
        <WalletProvider>
          <TransferProvider>
            <AuthGate>
              <Stack screenOptions={{ headerShown: false }} />
            </AuthGate>
          </TransferProvider>
        </WalletProvider>
      </DeviceUnlockProvider>
    </AuthProvider>
  );
}
