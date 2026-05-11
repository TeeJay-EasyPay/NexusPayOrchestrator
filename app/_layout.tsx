import * as Updates from 'expo-updates';
import { useEffect, useState } from 'react';
import { TouchableOpacity, View } from 'react-native';
import "react-native-get-random-values";

import { Stack } from "expo-router";

import { AuthGate } from "../src/components/auth/AuthGate";
import { AppText } from "../src/components/ui/AppText";
import { AuthProvider } from "../src/state/AuthContext";
import { DeviceUnlockProvider } from "../src/state/DeviceUnlockContext";
import { PaymentMethodsProvider } from "../src/state/PaymentMethodsContext";
import { TransferProvider } from "../src/state/TransferContext";
import { WalletProvider } from "../src/state/WalletContext";

export default function Layout() {
  const [updateAvailable, setUpdateAvailable] = useState(true);

  useEffect(() => {
    async function checkForUpdates() {
      try {
        const update = await Updates.checkForUpdateAsync();

        if (update.isAvailable) {
          setUpdateAvailable(true);
        }
      } catch (e) {
        console.log('OTA update check failed', e);
      }
    }

    checkForUpdates();
  }, []);

  async function handleUpdate() {
    try {
      console.log('Checking/fetching OTA update...');

      const result = await Updates.fetchUpdateAsync();

      console.log('Fetch result:', result);

      alert('Update downloaded. Reloading app...');

      await Updates.reloadAsync();
    } catch (e) {
      console.log('OTA reload failed', e);

      alert(`OTA failed: ${JSON.stringify(e)}`);
    }
  }

  return (
    <>
      {updateAvailable && (
        <View
          style={{
            position: 'absolute',
            top: 55,
            left: 16,
            right: 16,
            zIndex: 9999,
            backgroundColor: '#0B3F4A',
            borderRadius: 18,
            padding: 16,
            borderWidth: 1,
            borderColor: '#D4AF37',
          }}
        >
          <AppText
            variant="body"
            color="#FFFFFF"
            style={{ fontWeight: '700', marginBottom: 12 }}
          >
            New NexusPay update available
          </AppText>

          <TouchableOpacity
            onPress={handleUpdate}
            style={{
              backgroundColor: '#D4AF37',
              paddingVertical: 12,
              borderRadius: 12,
              alignItems: 'center',
            }}
          >
            <AppText
              variant="body"
              color="#0B3F4A"
              style={{ fontWeight: '900' }}
            >
              Update Now
            </AppText>
          </TouchableOpacity>
        </View>
      )}

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
    </>
  );
}