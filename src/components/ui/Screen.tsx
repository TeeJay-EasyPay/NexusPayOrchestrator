import { usePersona } from "../../state/PersonaContext";
import { isCorporatePersona } from "../../services/corporateAccessService";
import { corporatePalette as palette } from "../../theme/useAppColors";
import { usePathname } from "expo-router";
import { View, StyleSheet, StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppDropdownMenu } from "../navigation/AppDropdownMenu";
import { AppMenu } from "../navigation/AppMenu";
import { isPublicStartupRoute } from "../../startup/startupRoutes";
import { colors } from "../../theme";

export function Screen({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { selectedPersona } = usePersona();
  const corporate = isCorporatePersona(selectedPersona) && !isPublicStartupRoute(pathname);
  const showAppChrome = !isPublicStartupRoute(pathname);

  return (
    <SafeAreaView style={[styles.safe, corporate && { backgroundColor: palette.navy }]} edges={corporate ? ["top", "left", "right"] : undefined}>
      {corporate && <StatusBar barStyle="light-content" backgroundColor={palette.navy} />}
      <View style={styles.container}>
        {showAppChrome && <View style={corporate ? { paddingHorizontal: 18, paddingVertical: 13 } : undefined}><AppDropdownMenu branded={corporate} /></View>}

        <View style={[styles.content, corporate && { backgroundColor: palette.canvas, paddingHorizontal: 16 }]}>{children}</View>

        {showAppChrome && (corporate ? <SafeAreaView edges={["bottom"]} style={{ backgroundColor: "white" }}><AppMenu /></SafeAreaView> : <AppMenu />)}
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
