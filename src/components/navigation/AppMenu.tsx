import { Feather } from "@expo/vector-icons";
import { corporatePalette as palette } from "../../theme/useAppColors";
import { usePathname, useRouter } from "expo-router";
import { Pressable, ScrollView, View } from "react-native";

import { canAccessCorporateRoute, CorporateRouteKey, getCorporateRole, isCorporatePersona as checkCorporatePersona } from "../../services/corporateAccessService";
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
  const corporateRole = getCorporateRole(selectedPersona);
  const isParticipantPersona = selectedPersona.kind === "PARTICIPANT";

  const menuItems = [
    ...MENU_ITEMS,
    ...(isCorporatePersona && corporateRole === "batch_payments_processor"
      ? [{ label: "Payouts", route: "/corporate-payouts", match: "/corporate-payouts", icon: "£" }]
      : []),
    ...(isParticipantPersona
      ? [
          { label: "Alerts", route: "/participant-notifications", match: "/participant-notifications", icon: "!" },
          { label: "Received", route: "/received-transfers", match: "/received-transfers", icon: "↓" },
        ]
      : []),
  ] as const;

  if (isCorporatePersona) {
    const items: { label: string; route: string; key: CorporateRouteKey; icon: keyof typeof Feather.glyphMap }[] = [
      { label: "Home", route: corporateRole === "corporate_user" ? "/" : "/corporate-dashboard", key: corporateRole === "corporate_user" ? "home_dashboard" : "dashboard", icon: "home" },
      { label: "Send", route: corporateRole === "corporate_user" ? "/send" : "/consumer/send", key: "send_payments", icon: "send" },
      { label: "Routes", route: "/routes", key: "route_intelligence", icon: "navigation" },
      { label: "Track", route: "/track", key: "track_transfer", icon: "clock" },
      { label: "Account", route: "/account", key: "account_profile", icon: "user" },
      { label: "Payouts", route: "/corporate-payouts", key: "batch_payments", icon: "layers" },
      { label: "Alerts", route: "/participant-notifications", key: "notifications", icon: "bell" },
      { label: "Received", route: "/received-transfers", key: "received_transfers", icon: "download" },
    ].filter(item => item.label !== "Payouts" || corporateRole === "batch_payments_processor") as typeof items;
    return <View style={{ backgroundColor: "white", borderTopWidth: 1, borderColor: palette.border, paddingVertical: 8 }}><ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={{ paddingHorizontal: 8, gap: 4, flexGrow: 1 }}>
      {items.filter(item => canAccessCorporateRoute(selectedPersona, item.key)).map(item => { const active = item.route === "/" ? pathname === "/" : pathname.startsWith(item.route); return <Pressable key={item.label} accessibilityRole="button" accessibilityState={{ selected: active }} onPress={() => router.push(item.route as never)} style={{ minWidth: 64, minHeight: 54, flex: 1, paddingHorizontal: 8, alignItems: "center", justifyContent: "center", gap: 5, borderRadius: 12, backgroundColor: active ? palette.tint : "transparent" }}><Feather name={item.icon} size={21} color={active ? palette.teal : palette.muted} /><AppText style={{ fontSize: 11, fontWeight: active ? "800" : "600" }} color={active ? palette.teal : palette.muted}>{item.label}</AppText></Pressable>; })}
    </ScrollView></View>;
  }
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
