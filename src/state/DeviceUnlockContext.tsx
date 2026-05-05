import React, { createContext, useContext, useEffect, useState } from "react";
import { AppState } from "react-native";

type DeviceUnlockContextType = {
  locked: boolean;
  unlock: () => Promise<boolean>;
};

const DeviceUnlockContext = createContext<DeviceUnlockContextType | undefined>(undefined);

export function DeviceUnlockProvider({ children }: { children: React.ReactNode }) {
  const [locked, setLocked] = useState(true);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") setLocked(true);
    });

    return () => subscription.remove();
  }, []);

  async function unlock() {
    setLocked(false);
    return true;
  }

  return (
    <DeviceUnlockContext.Provider value={{ locked, unlock }}>
      {children}
    </DeviceUnlockContext.Provider>
  );
}

export function useDeviceUnlock() {
  const context = useContext(DeviceUnlockContext);
  if (!context) throw new Error("useDeviceUnlock must be used within DeviceUnlockProvider");
  return context;
}
