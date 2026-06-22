import { usePathname, useRouter } from "expo-router";
import { Pressable, ScrollView, View } from "react-native";

import { isCorporatePersona as checkCorporatePersona } from "../../services/corporateAccessService";
import { usePersona } from "../../state/PersonaContext";
import { colors } from "../../theme";
import { AppText } from "../ui/AppText";

const MENU_ITEMS = [
  { label: "Home", route: "/", match: "/", icon: "⌂" },
  { label: "Send", route: "/send", match: "/send", icon: "➤" },
  { label: "Routes", route: "/routes", match: "/routes", icon: "⎇" },
  { label: "Track", route: "/track", match: "/track", icon: "◎" },
  { label: "Account", route: "/account", match: "/account", icon: "☺" },
] as const;

export function AppMenu() {
  const router = useRouter();
  const pathname = usePathname();
  const { selectedPersona } = usePersona();

  const isCorporatePersona = checkCorporatePersona(selectedPersona);
  const isParticipantPersona = selectedPersona.kind === "PARTICIPANT";

  const menuItems = [
    ...MENU_ITEMS,
    ...(isCorporatePersona
      ? [{ label: "Payouts", route: "/corporate-payouts", match: "/corporate-payouts", icon: "£" }]
      : []),
    ...(isParticipantPersona
      ? [
          { label: "Alerts", route: "/participant-notifications", match: "/participant-notifications", icon: "!" },
          { label: "Received", route: "/received-transfers", match: "/received-transfers", icon: "↓" },
        ]
      : []),
  ] as const;

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
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 6, flexGrow: 1 }}
      >
        {menuItems.map((item) => {
          const isActive =
            item.match === "/" ? pathname === "/" : pathname.startsWith(item.match);

          return (
            <Pressable
              key={item.route}
              onPress={() => router.push(item.route as never)}
              style={{
                minWidth: 72,
                flex: menuItems.length <= 5 ? 1 : 0,
                alignItems: "center",
                justifyContent: "center",
                paddingVertical: 10,
                paddingHorizontal: 8,
                borderRadius: 18,
                backgroundColor: isActive ? "#0D2F4A" : "transparent",
              }}
            >
              <AppText
                style={{
                  fontSize: 16,
                  color: isActive ? colors.gold : "#6B8CA3",
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
      </ScrollView>
    </View>
  );
}
