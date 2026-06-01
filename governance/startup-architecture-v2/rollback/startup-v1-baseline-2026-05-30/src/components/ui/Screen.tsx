import { usePathname } from "expo-router";
import { View, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppDropdownMenu } from "../navigation/AppDropdownMenu";
import { AppMenu } from "../navigation/AppMenu";
import { colors } from "../../theme";

const PUBLIC_ROUTES = new Set([
  "/auth",
  "/check-email",
  "/account-created",
]);

export function Screen({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showAppChrome = !PUBLIC_ROUTES.has(pathname);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {showAppChrome && <AppDropdownMenu />}

        <View style={styles.content}>{children}</View>

        {showAppChrome && <AppMenu />}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
});
