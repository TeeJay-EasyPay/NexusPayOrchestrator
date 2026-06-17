import { usePathname, useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Modal, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from "react-native";

import { useAuth } from "../../state/AuthContext";
import { useDeviceUnlock } from "../../state/DeviceUnlockContext";
import { usePersona } from "../../state/PersonaContext";
import { colors } from "../../theme";
import { UserAccountBadge } from "../auth/UserAccountBadge";
import { AppText } from "../ui/AppText";

const MENU_ITEMS = [
  {
    label: "Home",
    description: "Dashboard and corridor intelligence",
    route: "/",
    match: "/",
  },
  {
    label: "Send Money",
    description: "Create a new transfer",
    route: "/send",
    match: "/send",
  },
  {
    label: "Route Intelligence",
    description: "Compare ranked payment routes",
    route: "/routes",
    match: "/routes",
  },
  {
    label: "Operations Command Centre V2",
    description: "Mission Control — redesigned operational intelligence platform",
    route: "/operations-v2",
    match: "/operations-v2",
  },
  {
    label: "Live Intelligence Feeds",
    description: "Live FX, treasury and market intelligence feeds",
    route: "/live-intelligence-feeds",
    match: "/live-intelligence-feeds",
  },
  {
  label: "Nexus AI",
  description: "AI configuration, intelligence controls and sensitivity",
  route: "/nexus-ai",
  match: "/nexus-ai",
  },
  {
    label: "Track Transfer",
    description: "Execution status and settlement proof",
    route: "/track",
    match: "/track",
  },
  {
    label: "Account & Profile",
    description: "Identity, security and limits",
    route: "/account",
    match: "/account",
  },
] as const;

export function AppDropdownMenu() {
  const router = useRouter();
  const pathname = usePathname();
  const { signOut } = useAuth();
  const { lockApp } = useDeviceUnlock();
  const { selectedPersona } = usePersona();
  const [isOpen, setIsOpen] = useState(false);
  const { height } = useWindowDimensions();

  const isCorporatePersona = selectedPersona.id === "corporate-demo";
  const isParticipantPersona = selectedPersona.kind === "PARTICIPANT";
  const menuMaxHeight = Math.max(240, height - 118);

  const menuItems = [
    ...MENU_ITEMS,
    ...(isCorporatePersona
      ? [
          {
            label: "Corporate Payouts",
            description: "Execute multi-recipient payout batches",
            route: "/corporate-payouts",
            match: "/corporate-payouts",
          },
        ]
      : []),
    ...(isParticipantPersona
      ? [
          {
            label: "Notifications",
            description: "Active workspace alerts and read status",
            route: "/participant-notifications",
            match: "/participant-notifications",
          },
          {
            label: "Received Transfers",
            description: "Recipient transfer history",
            route: "/received-transfers",
            match: "/received-transfers",
          },
        ]
      : []),
    {
      label: "Account & Persona Switcher",
      description: "Switch between personal, corporate, and recipient personas",
      route: "/multi-account-preview",
      match: "/multi-account-preview",
    },
  ] as const;

  const handleNavigate = (route: any) => {
  setIsOpen(false);
  router.push(route);
};

  const handleSignOut = () => {
    Alert.alert("Sign out", "Do you want to end this NexusPay session?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: async () => {
          setIsOpen(false);
          lockApp();
          await signOut();
        },
      },
    ]);
  };

  return (
    <View style={{ position: "relative", zIndex: 20 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Pressable
            onPress={() => setIsOpen((current) => !current)}
            style={{
              width: 46,
              height: 46,
              borderRadius: 18,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "rgba(255,255,255,0.96)",
              borderWidth: 1,
              borderColor: "#E2E8F0",
            }}
          >
            <AppText
              variant="subheading"
              color={colors.textDarkPrimary}
              style={{ fontWeight: "900", marginTop: -2 }}
            >
              ☰
            </AppText>
          </Pressable>

          <View>
            <AppText variant="caption" color={colors.gold}>
              NexusPay
            </AppText>
            <AppText variant="caption" color={colors.textSecondary}>
              Intelligent payment orchestration
            </AppText>
          </View>
        </View>

        <UserAccountBadge />
      </View>

      <Modal
        animationType="fade"
        transparent
        visible={isOpen}
        onRequestClose={() => setIsOpen(false)}
      >
        <View style={styles.menuOverlay}>
          <Pressable style={styles.menuBackdrop} onPress={() => setIsOpen(false)} />
        <View
          style={{
            marginTop: 62,
            marginHorizontal: 16,
            padding: 12,
            borderRadius: 24,
            backgroundColor: "rgba(255,255,255,0.98)",
            borderWidth: 1,
            borderColor: "#E2E8F0",
            gap: 8,
            shadowColor: "#000",
            shadowOpacity: 0.16,
            shadowRadius: 18,
            shadowOffset: { width: 0, height: 8 },
            elevation: 8,
            maxHeight: menuMaxHeight,
          }}
        >
          <ScrollView
            nestedScrollEnabled
            showsVerticalScrollIndicator
            contentContainerStyle={{ gap: 8, paddingBottom: 2 }}
          >
            {menuItems.map((item) => {
              const isActive =
                item.match === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.match);

              return (
                <Pressable
                  key={item.route}
                  onPress={() => handleNavigate(item.route)}
                  style={{
                    padding: 13,
                    borderRadius: 18,
                    backgroundColor: isActive ? "#0B3F4A" : "#F8FAFC",
                    borderWidth: 1,
                    borderColor: isActive ? "#0B3F4A" : "#E2E8F0",
                    gap: 3,
                  }}
                >
                  <AppText
                    variant="body"
                    style={{
                      color: isActive
                        ? colors.gold
                        : colors.textDarkPrimary,
                      fontWeight: "900",
                    }}
                  >
                    {item.label}
                  </AppText>

                  <AppText
                    variant="caption"
                    style={{
                      color: isActive
                        ? "#BFEAF1"
                        : colors.textDarkSecondary,
                    }}
                  >
                    {item.description}
                  </AppText>
                </Pressable>
              );
            })}

            <Pressable
              onPress={handleSignOut}
              style={{
                padding: 13,
                borderRadius: 18,
                backgroundColor: "#FFF1F2",
                borderWidth: 1,
                borderColor: "#FECDD3",
                gap: 3,
              }}
            >
              <AppText
                variant="body"
                style={{
                  color: "#BE123C",
                  fontWeight: "900",
                }}
              >
                Sign out
              </AppText>

              <AppText
                variant="caption"
                style={{ color: "#9F1239" }}
              >
                End this NexusPay session
              </AppText>
            </Pressable>
          </ScrollView>
        </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  menuOverlay: {
    flex: 1,
    backgroundColor: "rgba(2,19,35,0.22)",
  },
  menuBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
});
