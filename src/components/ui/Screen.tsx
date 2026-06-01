import { usePathname } from "expo-router";
import { View, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppDropdownMenu } from "../navigation/AppDropdownMenu";
import { AppMenu } from "../navigation/AppMenu";
import { isPublicStartupRoute } from "../../startup/startupRoutes";
import { colors } from "../../theme";

export function Screen({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showAppChrome = !isPublicStartupRoute(pathname);

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
