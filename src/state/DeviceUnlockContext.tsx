import * as LocalAuthentication from "expo-local-authentication";
import React, { createContext, useContext, useEffect, useState } from "react";
import { AppState } from "react-native";

type DeviceUnlockContextType = {
  locked: boolean;
  biometricAvailable: boolean;
  unlock: () => Promise<boolean>;
};

const DeviceUnlockContext = createContext<DeviceUnlockContextType | undefined>(undefined);

export function DeviceUnlockProvider({ children }: { children: React.ReactNode }) {
  const [locked, setLocked] = useState(true);
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  useEffect(() => {
    async function checkDeviceSecurity() {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      setBiometricAvailable(hasHardware && isEnrolled);
    }

    checkDeviceSecurity();
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") setLocked(true);
    });

    return () => subscription.remove();
  }, []);

  async function unlock() {
    if (!biometricAvailable) {
      setLocked(false);
      return true;
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: "Unlock NexusPay",
      cancelLabel: "Cancel",
      disableDeviceFallback: false,
    });

    if (result.success) {
      setLocked(false);
      return true;
    }

    return false;
  }

  return (
    <DeviceUnlockContext.Provider value={{ locked, biometricAvailable, unlock }}>
      {children}
    </DeviceUnlockContext.Provider>
  );
}

export function useDeviceUnlock() {
  const context = useContext(DeviceUnlockContext);
  if (!context) throw new Error("useDeviceUnlock must be used within DeviceUnlockProvider");
  return context;
}
