import { usePathname, useRouter } from "expo-router";
import { Pressable, View } from "react-native";

import { colors } from "../../theme";
import { AppText } from "../ui/AppText";

const MENU_ITEMS = [
  { label: "Home", route: "/", match: "/" },
  { label: "Send", route: "/send", match: "/send" },
  { label: "Routes", route: "/routes", match: "/routes" },
  { label: "Track", route: "/track", match: "/track" },
  { label: "Account", route: "/account", match: "/account" },
] as const;

export function AppMenu() {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <View
      style={{
        padding: 10,
        borderRadius: 24,
        backgroundColor: "rgba(255,255,255,0.96)",
        borderWidth: 1,
        borderColor: "#E2E8F0",
        flexDirection: "row",
        gap: 6,
      }}
    >
      {MENU_ITEMS.map((item) => {
        const isActive =
          item.match === "/" ? pathname === "/" : pathname.startsWith(item.match);

        return (
          <Pressable
            key={item.route}
            onPress={() => router.push(item.route)}
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              paddingVertical: 10,
              borderRadius: 18,
              backgroundColor: isActive ? "#0B3F4A" : "#F8FAFC",
              borderWidth: 1,
              borderColor: isActive ? "#0B3F4A" : "#E2E8F0",
            }}
          >
            <AppText
              variant="caption"
              style={{
                color: isActive ? colors.gold : colors.textDarkSecondary,
                fontWeight: "900",
              }}
            >
              {item.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}
