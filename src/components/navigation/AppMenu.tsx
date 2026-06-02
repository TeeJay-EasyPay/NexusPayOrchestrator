import { usePathname, useRouter } from "expo-router";
import { Pressable, View } from "react-native";

import { colors } from "../../theme";
import { AppText } from "../ui/AppText";

const MENU_ITEMS = [
  { label: "Home", route: "/", match: "/", icon: "H" },
  { label: "Send", route: "/send", match: "/send", icon: "S" },
  { label: "Transfers", route: "/transactions", match: "/transactions", icon: "T" },
  { label: "Routes", route: "/routes", match: "/routes", icon: "R" },
  { label: "Account", route: "/account", match: "/account", icon: "A" },
] as const;

export function AppMenu() {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <View
      style={{
        padding: 12,
        borderRadius: 26,
        backgroundColor: "#061625",
        borderWidth: 1,
        borderColor: "#0E2E4A",
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
              backgroundColor: isActive ? "#0D2F4A" : "transparent",
            }}
          >
            <AppText
              style={{
                fontSize: 16,
                color: isActive ? colors.gold : "#6B8CA3",
                fontWeight: "900",
              }}
            >
              {item.icon}
            </AppText>

            <AppText
              variant="caption"
              style={{
                color: isActive ? colors.gold : "#6B8CA3",
                fontWeight: "700",
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
