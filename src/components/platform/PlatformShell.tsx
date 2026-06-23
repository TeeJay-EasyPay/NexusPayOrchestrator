import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Modal, Pressable, ScrollView, StatusBar, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAccount } from "../../state/AccountContext";
import { useAuth } from "../../state/AuthContext";
import { usePersona } from "../../state/PersonaContext";
import { colors } from "../../theme";
import { AppText } from "../ui/AppText";

export type PlatformRouteKey =
  | "home"
  | "partners"
  | "corridors"
  | "providers"
  | "health"
  | "environments"
  | "audit"
  | "implementation_log"
  | "settings";

type MenuItem = {
  key: PlatformRouteKey;
  label: string;
  route: string;
  icon: keyof typeof Feather.glyphMap;
};

const MENU_ITEMS: MenuItem[] = [
  { key: "home", label: "Home", route: "/platform-admin", icon: "home" },
  { key: "partners", label: "Partner Ecosystem", route: "/platform-partners", icon: "share-2" },
  { key: "corridors", label: "Corridor Management", route: "/platform-corridors", icon: "map" },
  { key: "providers", label: "Provider Configuration", route: "/platform-providers", icon: "server" },
  { key: "health", label: "Platform Health", route: "/platform-health", icon: "activity" },
  { key: "environments", label: "Environment Management", route: "/platform-environments", icon: "layers" },
  { key: "audit", label: "System Audit", route: "/platform-audit", icon: "archive" },
  { key: "implementation_log", label: "Implementation Log", route: "/platform-implementation-log", icon: "file-text" },
  { key: "settings", label: "Settings", route: "/platform-settings", icon: "settings" },
];

export function PlatformShell({
  routeKey,
  title,
  subtitle,
  children,
}: {
  routeKey: PlatformRouteKey;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { clearAccountScope } = useAccount();
  const { signOut } = useAuth();
  const { selectedPersona } = usePersona();
  const [menuOpen, setMenuOpen] = useState(false);
  const allowed = selectedPersona.personaGroup === "PLATFORM_ADMINISTRATION";

  async function handleSignOut() {
    setMenuOpen(false);
    await clearAccountScope();
    await signOut();
    router.replace("/multi-account-preview" as never);
  }

  if (!allowed) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="light-content" backgroundColor="#07111F" />
        <View style={styles.blocked}>
          <AppText variant="title" color={colors.white}>Restricted</AppText>
          <AppText variant="body" color="#C7D2E0" style={{ textAlign: "center" }}>
            Platform Administration is only available to the Platform Administrator persona.
          </AppText>
          <Pressable onPress={() => router.replace("/multi-account-preview" as never)} style={styles.primaryButton}>
            <AppText color="#061625" style={styles.primaryButtonText}>Switch persona</AppText>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#07111F" />
      <View style={styles.header}>
        <View style={styles.identity}>
          <View style={styles.avatar}>
            <AppText color="#061625" style={styles.avatarText}>NP</AppText>
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="caption" color="#6ED3D8" style={styles.eyebrow}>Platform Administration</AppText>
            <AppText variant="subheading" color={colors.white} style={{ fontWeight: "900" }}>
              {selectedPersona.label}
            </AppText>
            <AppText variant="caption" color="#B7C7D8">NexusPay operational control layer</AppText>
          </View>
          <Pressable onPress={() => setMenuOpen(true)} style={styles.iconButton}>
            <Feather name="menu" size={18} color="#6ED3D8" />
          </Pressable>
        </View>

        <View style={styles.hero}>
          <AppText variant="caption" color="#6ED3D8" style={styles.eyebrow}>NexusPay Platform</AppText>
          <AppText variant="title" color={colors.white} style={styles.title}>{title}</AppText>
          <AppText variant="body" color="#D7E4F1" style={styles.subtitle}>{subtitle}</AppText>
        </View>
      </View>

      <ScrollView style={styles.body} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>

      <Modal transparent animationType="fade" visible={menuOpen} onRequestClose={() => setMenuOpen(false)}>
        <View style={styles.modal}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setMenuOpen(false)} />
          <View style={styles.drawer}>
            <ScrollView contentContainerStyle={styles.drawerContent}>
              <AppText variant="caption" color="#6ED3D8" style={styles.eyebrow}>Platform navigation</AppText>
              {MENU_ITEMS.map((item) => (
                <Pressable
                  key={item.key}
                  onPress={() => {
                    setMenuOpen(false);
                    router.push(item.route as never);
                  }}
                  style={[styles.menuItem, item.key === routeKey ? styles.activeMenuItem : null]}
                >
                  <Feather name={item.icon} size={16} color="#0B3F4A" />
                  <AppText color="#0F2239" style={styles.menuText}>{item.label}</AppText>
                </Pressable>
              ))}
              <Pressable onPress={handleSignOut} style={[styles.menuItem, styles.signOutItem]}>
                <Feather name="log-out" size={16} color="#B91C1C" />
                <AppText color="#B91C1C" style={styles.menuText}>Sign Out</AppText>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

export function PlatformCard({ children }: { children: React.ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#07111F" },
  header: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 14,
    backgroundColor: "#07111F",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.10)",
  },
  identity: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#6ED3D8",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontWeight: "900" },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  eyebrow: { fontWeight: "900", textTransform: "uppercase", letterSpacing: 0.7 },
  hero: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "#0B3F4A",
    padding: 14,
  },
  title: { fontWeight: "900", marginTop: 4 },
  subtitle: { marginTop: 6, lineHeight: 21 },
  body: { flex: 1, backgroundColor: "#07111F" },
  content: { padding: 16, paddingBottom: 40, gap: 12 },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#DDE6EE",
    padding: 14,
    gap: 10,
  },
  modal: { flex: 1, backgroundColor: "rgba(7,17,31,0.45)" },
  drawer: {
    marginTop: 72,
    marginHorizontal: 16,
    maxHeight: "78%",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    overflow: "hidden",
  },
  drawerContent: { padding: 12, gap: 8 },
  menuItem: {
    minHeight: 44,
    borderRadius: 9,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
  },
  activeMenuItem: { backgroundColor: "#DDF4F2", borderColor: "#6ED3D8" },
  menuText: { fontWeight: "800", flex: 1 },
  signOutItem: { backgroundColor: "#FFF1F2", borderColor: "#FECDD3" },
  blocked: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 14 },
  primaryButton: { borderRadius: 10, backgroundColor: "#6ED3D8", paddingHorizontal: 16, paddingVertical: 11 },
  primaryButtonText: { fontWeight: "900" },
});
