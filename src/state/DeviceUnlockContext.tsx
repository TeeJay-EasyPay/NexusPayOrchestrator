import * as LocalAuthentication from "expo-local-authentication";
import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";

type DeviceUnlockContextType = {
  locked: boolean;
  biometricAvailable: boolean;
  unlock: () => Promise<boolean>;
  unlockWithPassword: () => void;
  lockApp: () => void;
};

const DeviceUnlockContext = createContext<DeviceUnlockContextType | undefined>(undefined);

export function DeviceUnlockProvider({ children }: { children: React.ReactNode }) {
  const [locked, setLocked] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const wasBackgroundedRef = useRef(false);
  const unlockInProgressRef = useRef(false);

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
      // Do not lock on "inactive". Android/iOS can briefly report inactive
      // while the native biometric sheet is opening/closing, which can re-lock
      // the app during a successful unlock and leave the UI stuck behind the overlay.
      if (state === "background") {
        wasBackgroundedRef.current = true;
        setLocked(true);
        return;
      }

      if (state === "active" && wasBackgroundedRef.current) {
        wasBackgroundedRef.current = false;
        setLocked(true);
      }
    });

    return () => subscription.remove();
  }, []);

  async function unlock() {
    if (!biometricAvailable) {
      return false;
    }

    if (unlockInProgressRef.current) {
      return false;
    }

    unlockInProgressRef.current = true;

    try {
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
    } finally {
      unlockInProgressRef.current = false;
    }
  }

  function unlockWithPassword() {
    setLocked(false);
  }

  function lockApp() {
    setLocked(true);
  }

  return (
    <DeviceUnlockContext.Provider
      value={{ locked, biometricAvailable, unlock, unlockWithPassword, lockApp }}
    >
      {children}
    </DeviceUnlockContext.Provider>
  );
}

export function useDeviceUnlock() {
  const context = useContext(DeviceUnlockContext);
  if (!context) throw new Error("useDeviceUnlock must be used within DeviceUnlockProvider");
  return context;
}
