import "react-native-get-random-values";

import { Stack } from "expo-router";
import { useEffect } from "react";
import { Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AuthGate } from "../src/components/auth/AuthGate";
import { logStartupInfo } from "../src/services/startupLogger";
import { AuthProvider } from "../src/state/AuthContext";
import { DeviceUnlockProvider } from "../src/state/DeviceUnlockContext";
import { PaymentMethodsProvider } from "../src/state/PaymentMethodsContext";
import { TransferProvider } from "../src/state/TransferContext";
import { WalletProvider } from "../src/state/WalletContext";

const ROOT_DEBUG_VISUAL = true;

export default function Layout() {
  useEffect(() => {
    logStartupInfo({
      event: "layout-mounted",
      stage: "app-bootstrap",
      status: "start",
    });
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: "#000000", opacity: 1 }}>
      <View style={{ flex: 1, backgroundColor: "#000000" }}>
        <SafeAreaProvider>
          <AuthProvider>
            <DeviceUnlockProvider>
              <WalletProvider>
                <PaymentMethodsProvider>
                  <TransferProvider>
                    <AuthGate>
                      <Stack
                        screenOptions={{
                          headerShown: false,
                          contentStyle: { backgroundColor: "#000000" },
                          animation: "none",
                        }}
                      />
                    </AuthGate>
                  </TransferProvider>
                </PaymentMethodsProvider>
              </WalletProvider>
            </DeviceUnlockProvider>
          </AuthProvider>
        </SafeAreaProvider>

        {ROOT_DEBUG_VISUAL ? (
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              top: 14,
              left: 14,
              right: 14,
              zIndex: 9999,
              elevation: 9999,
              borderRadius: 8,
              borderWidth: 2,
              borderColor: "#00E5FF",
              backgroundColor: "#000000",
              paddingVertical: 8,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#00E5FF", fontWeight: "900", fontSize: 16 }}>
              ROOT LAYOUT LOADED
            </Text>
          </View>
        ) : null}
      </View>
    </GestureHandlerRootView>
  );
}
