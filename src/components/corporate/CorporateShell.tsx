import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Modal, Pressable, ScrollView, StatusBar, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  canAccessCorporateRoute,
  CorporateRouteKey,
  getCorporateRole,
  getCorporateRouteKeys,
  getRoleLabel,
} from "../../services/corporateAccessService";
import { useAccount } from "../../state/AccountContext";
import { useAuth } from "../../state/AuthContext";
import { usePersona } from "../../state/PersonaContext";
import { colors } from "../../theme";
import { AppText } from "../ui/AppText";

type MenuItem = {
  key: CorporateRouteKey;
  label: string;
  route: string;
  corporateUserRoute?: string;
  icon: keyof typeof Feather.glyphMap;
};

const MENU_ITEMS: MenuItem[] = [
  { key: "home_dashboard", label: "Home", route: "/", icon: "home" },
  { key: "dashboard", label: "Dashboard", route: "/corporate-dashboard", icon: "grid" },
  { key: "send_payments", label: "Send Payments", route: "/consumer/send", corporateUserRoute: "/send", icon: "send" },
  { key: "route_intelligence", label: "Route Intelligence", route: "/routes", icon: "navigation" },
  { key: "operations_command_centre", label: "Operations Command Centre", route: "/operations-v2", icon: "activity" },
  { key: "platform_health", label: "Platform Health", route: "/operations-v2", icon: "cpu" },
  { key: "live_intelligence_feeds", label: "Live Intelligence Feeds", route: "/live-intelligence-feeds", icon: "radio" },
  { key: "nexus_ai", label: "Nexus AI", route: "/nexus-ai", icon: "zap" },
  { key: "track_transfer", label: "Track Transfer", route: "/track", icon: "clock" },
  { key: "account_profile", label: "Account & Profile", route: "/account", icon: "user" },
  { key: "received_transfers", label: "Received Transfers", route: "/received-transfers", icon: "download" },
  { key: "batch_payments", label: "Batch Payments", route: "/corporate-payouts", icon: "layers" },
  { key: "batch_operations", label: "Batch Operations Dashboard", route: "/batch-operations-dashboard", icon: "bar-chart-2" },
  { key: "recipients", label: "Recipients", route: "/business-recipients", icon: "users" },
  { key: "notifications", label: "Notifications", route: "/participant-notifications", icon: "bell" },
  { key: "corporate_governance", label: "Corporate Governance", route: "/corporate-governance", icon: "sliders" },
  { key: "approval_rules", label: "Approval Rules", route: "/corporate-governance", icon: "list" },
  { key: "approval_queue", label: "Approval Queue", route: "/approval-queue", icon: "inbox" },
  { key: "reports", label: "Reports", route: "/corporate-reports", icon: "file-text" },
  { key: "payment_analytics", label: "Payment Analytics", route: "/batch-operations-dashboard", icon: "pie-chart" },
  { key: "audit_logs", label: "Audit Logs", route: "/audit-logs", icon: "archive" },
  { key: "users_personas", label: "Users & Personas", route: "/corporate-users-personas", icon: "user-check" },
  { key: "settings", label: "Settings", route: "/consumer/settings", icon: "settings" },
];

export function CorporateShell({
  routeKey,
  title,
  subtitle,
  children,
}: {
  routeKey: CorporateRouteKey;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { clearAccountScope } = useAccount();
  const { signOut } = useAuth();
  const { selectedPersona } = usePersona();
  const [menuOpen, setMenuOpen] = useState(false);
  const role = getCorporateRole(selectedPersona);
  const allowedKeys = getCorporateRouteKeys(selectedPersona);
  const allowed = canAccessCorporateRoute(selectedPersona, routeKey);
  const menuItems = MENU_ITEMS
    .filter((item) => allowedKeys.includes(item.key))
    .filter((item, index, items) => items.findIndex((candidate) => resolveMenuRoute(candidate, role) === resolveMenuRoute(item, role)) === index);

  function resolveMenuRoute(item: MenuItem, currentRole: typeof role): string {
    return currentRole === "corporate_user" && item.corporateUserRoute ? item.corporateUserRoute : item.route;
  }

  async function handleSignOut() {
    setMenuOpen(false);
    await clearAccountScope();
    await signOut();
    router.replace("/multi-account-preview" as never);
  }

  if (!allowed || !role) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="light-content" backgroundColor="#07111F" />
        <View style={styles.blocked}>
          <AppText variant="title" color={colors.white}>Restricted</AppText>
          <AppText variant="body" color="#C7D2E0" style={{ textAlign: "center" }}>
            This corporate workspace area is not available to the selected persona.
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
            <AppText variant="caption" color="#6ED3D8" style={styles.eyebrow}>Corporate Workspace</AppText>
            <AppText variant="subheading" color={colors.white} style={{ fontWeight: "900" }}>
              {selectedPersona.label}
            </AppText>
            <AppText variant="caption" color="#B7C7D8">{getRoleLabel(role)}</AppText>
          </View>
          <Pressable onPress={() => setMenuOpen(true)} style={styles.iconButton}>
            <Feather name="menu" size={18} color="#6ED3D8" />
          </Pressable>
        </View>

        <View style={styles.hero}>
          <AppText variant="caption" color="#6ED3D8" style={styles.eyebrow}>{getRoleLabel(role)}</AppText>
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
              <AppText variant="caption" color="#6ED3D8" style={styles.eyebrow}>Corporate navigation</AppText>
              {menuItems.map((item) => (
                <Pressable
                  key={`${item.key}-${item.route}`}
                  onPress={() => {
                    setMenuOpen(false);
                    router.push(resolveMenuRoute(item, role) as never);
                  }}
                  style={styles.menuItem}
                >
                  <Feather name={item.icon} size={16} color="#0B3F4A" />
                  <AppText color="#0F2239" style={styles.menuText}>{item.label}</AppText>
                </Pressable>
              ))}
              <Pressable
                onPress={() => {
                  setMenuOpen(false);
                  router.push("/multi-account-preview" as never);
                }}
                style={styles.menuItem}
              >
                <Feather name="repeat" size={16} color="#0B3F4A" />
                <AppText color="#0F2239" style={styles.menuText}>Switch persona</AppText>
              </Pressable>
              <Pressable
                onPress={handleSignOut}
                style={[styles.menuItem, styles.signOutItem]}
              >
                <Feather name="log-out" size={16} color="#B91C1C" />
                <AppText color="#B91C1C" style={styles.menuText}>Sign out</AppText>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

export function CorporateCard({ children }: { children: React.ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#07111F",
  },
  header: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 14,
    backgroundColor: "#07111F",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.10)",
  },
  identity: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#6ED3D8",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontWeight: "900",
  },
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
  eyebrow: {
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  hero: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "#0B3F4A",
    padding: 14,
  },
  title: {
    fontWeight: "900",
    marginTop: 4,
  },
  subtitle: {
    marginTop: 6,
    lineHeight: 21,
  },
  body: {
    flex: 1,
    backgroundColor: "#07111F",
  },
  content: {
    padding: 16,
    paddingBottom: 40,
    gap: 12,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#DDE6EE",
    padding: 14,
    gap: 10,
  },
  modal: {
    flex: 1,
    backgroundColor: "rgba(7,17,31,0.45)",
  },
  drawer: {
    marginTop: 72,
    marginHorizontal: 16,
    maxHeight: "78%",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    overflow: "hidden",
  },
  drawerContent: {
    padding: 12,
    gap: 8,
  },
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
  menuText: {
    fontWeight: "800",
    flex: 1,
  },
  signOutItem: {
    backgroundColor: "#FFF1F2",
    borderColor: "#FECDD3",
  },
  blocked: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 14,
  },
  primaryButton: {
    borderRadius: 10,
    backgroundColor: "#6ED3D8",
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  primaryButtonText: {
    fontWeight: "900",
  },
});
