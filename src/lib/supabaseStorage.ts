type SupabaseStorage = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};

const memory = new Map<string, string>();

export function getSupabaseStorage(): SupabaseStorage {
  if (typeof navigator !== "undefined" && navigator.product === "ReactNative") {
    // Metro resolves the native persistence adapter only for the React Native runtime.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require("react-native-url-polyfill/auto");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("@react-native-async-storage/async-storage").default as SupabaseStorage;
  }

  if (typeof localStorage !== "undefined") {
    return {
      getItem: async (key) => localStorage.getItem(key),
      setItem: async (key, value) => localStorage.setItem(key, value),
      removeItem: async (key) => localStorage.removeItem(key),
    };
  }

  return {
    getItem: async (key) => memory.get(key) ?? null,
    setItem: async (key, value) => { memory.set(key, value); },
    removeItem: async (key) => { memory.delete(key); },
  };
}
