
import * as Updates from 'expo-updates';
import { useEffect } from 'react';
import "react-native-get-random-values";

import { Stack } from "expo-router";

import { AuthGate } from "../src/components/auth/AuthGate";
import { AuthProvider } from "../src/state/AuthContext";
import { DeviceUnlockProvider } from "../src/state/DeviceUnlockContext";
import { PaymentMethodsProvider } from "../src/state/PaymentMethodsContext";
import { TransferProvider } from "../src/state/TransferContext";
import { WalletProvider } from "../src/state/WalletContext";

export default function Layout() {
  useEffect(() => {
    async function checkForUpdates() {
      try {
        const update = await Updates.checkForUpdateAsync();

        if (update.isAvailable) {
          await Updates.fetchUpdateAsync();
          await Updates.reloadAsync();
        }
      } catch (e) {
        console.log('OTA update check failed', e);
      }
    }

    checkForUpdates();
  }, []);
  
  return (
    <AuthProvider>
      <DeviceUnlockProvider>
        <WalletProvider>
          <PaymentMethodsProvider>
            <TransferProvider>
              <AuthGate>
                <Stack screenOptions={{ headerShown: false }} />
              </AuthGate>
            </TransferProvider>
          </PaymentMethodsProvider>
        </WalletProvider>
      </DeviceUnlockProvider>
    </AuthProvider>
  );
}
