import "react-native-get-random-values";

import { Stack } from "expo-router";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AuthGate } from "../src/components/auth/AuthGate";
import { logStartupInfo } from "../src/services/startupLogger";
import { AuthProvider } from "../src/state/AuthContext";
import { DeviceUnlockProvider } from "../src/state/DeviceUnlockContext";
import { PaymentMethodsProvider } from "../src/state/PaymentMethodsContext";
import { TransferProvider } from "../src/state/TransferContext";
import { WalletProvider } from "../src/state/WalletContext";

export default function Layout() {
  useEffect(() => {
    logStartupInfo({
      event: "layout-mounted",
      stage: "app-bootstrap",
      status: "start",
    });
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
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
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
