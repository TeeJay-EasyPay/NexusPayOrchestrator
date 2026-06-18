import { Feather } from "@expo/vector-icons";
import { usePathname, useRouter } from "expo-router";
import { useState } from "react";
import { Modal, Pressable, ScrollView, StatusBar, StyleSheet, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAccount } from "../../state/AccountContext";
import { useAuth } from "../../state/AuthContext";
import { usePersona } from "../../state/PersonaContext";
import { AppText } from "../ui/AppText";

export const consumerColors = {
  background: "#F4F8FD",
  blue: "#0A3D78",
  blueDark: "#062D5A",
  blueSoft: "#DCEBFF",
  white: "#FFFFFF",
  text: "#0F2239",
  muted: "#5F728A",
  border: "#CBD8E7",
  success: "#0F8A5F",
  warning: "#8C5D06",
  surface: "#F8FBFF",
};

const defaultTabs = [
  { label: "Home", route: "/consumer", icon: "home" },
  { label: "Send", route: "/consumer/send", icon: "send" },
  { label: "FX", route: "/consumer/fx", icon: "trending-up" },
  { label: "Track", route: "/consumer/track", icon: "clock" },
  { label: "Profile", route: "/consumer/profile", icon: "user" },
] as const;

const participantTabs = [
  { label: "Home", route: "/consumer", icon: "home" },
  { label: "Send", route: "/consumer/send", icon: "send" },
  { label: "Alerts", route: "/participant-notifications", icon: "bell" },
  { label: "Received", route: "/received-transfers", icon: "download" },
  { label: "Profile", route: "/consumer/profile", icon: "user" },
] as const;

const businessTabs = [
  { label: "Home", route: "/consumer", icon: "home" },
  { label: "Send", route: "/consumer/send", icon: "send" },
  { label: "Batch", route: "/corporate-payouts", icon: "layers" },
  { label: "Recipients", route: "/business-recipients", icon: "users" },
  { label: "Alerts", route: "/participant-notifications", icon: "bell" },
] as const;

const corporateTabs = [
  { label: "Home", route: "/consumer", icon: "home" },
  { label: "Send", route: "/consumer/send", icon: "send" },
  { label: "Batch", route: "/corporate-payouts", icon: "layers" },
  { label: "Recipients", route: "/business-recipients", icon: "users" },
  { label: "Alerts", route: "/participant-notifications", icon: "bell" },
] as const;

export function ConsumerShell({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { signOut } = useAuth();
  const { clearAccountScope } = useAccount();
  const { selectedPersona } = usePersona();
  const [menuOpen, setMenuOpen] = useState(false);
  const { height } = useWindowDimensions();
  const dropdownMaxHeight = Math.max(240, height - 128);
  const isCorporatePersona = selectedPersona.id === "corporate-demo";
  const isBusinessPersona = selectedPersona.participantType === "BUSINESS";
  const isParticipantPersona = selectedPersona.kind === "PARTICIPANT";
  const shellTint = isCorporatePersona
    ? {
        active: "#D6A84F",
        inactive: "#B7C7D8",
        navBackground: "#061625",
        headerBackground: "#07111F",
        heroBackground: "#0B3F4A",
        heroBorder: "rgba(255,255,255,0.14)",
      }
    : {
        active: consumerColors.blue,
        inactive: consumerColors.muted,
        navBackground: consumerColors.white,
        headerBackground: consumerColors.white,
        heroBackground: consumerColors.blueSoft,
        heroBorder: consumerColors.border,
      };
  const workspaceLabel = isCorporatePersona
    ? "Corporate Workspace"
    : isBusinessPersona
      ? "Business Account"
      : "Personal Account";
  const tabs =
    isCorporatePersona
      ? corporateTabs
      : isBusinessPersona
        ? businessTabs
        : selectedPersona.kind === "PARTICIPANT"
        ? participantTabs
        : defaultTabs;

  async function handleSignOut() {
    setMenuOpen(false);
    await clearAccountScope();
    await signOut();
    router.replace("/multi-account-preview" as never);
  }

  return (
    <SafeAreaView style={[styles.safe, isCorporatePersona && styles.corporateSafe]}>
      <StatusBar barStyle={isCorporatePersona ? "light-content" : "dark-content"} backgroundColor={shellTint.headerBackground} />
      <View style={[styles.root, isCorporatePersona && styles.corporateRoot]}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          <View style={[styles.header, isCorporatePersona && styles.corporateHeader]}>
            <View style={styles.identity}>
              <View style={[styles.avatar, isCorporatePersona && styles.corporateAvatar]}>
                <AppText color={consumerColors.white} style={styles.avatarText}>
                  NP
                </AppText>
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="caption" color={isCorporatePersona ? "#D6A84F" : consumerColors.blue}>
                  {workspaceLabel}
                </AppText>
                <AppText color={isCorporatePersona ? consumerColors.white : consumerColors.text} style={styles.accountName}>
                  {selectedPersona.label}
                </AppText>
                <AppText variant="caption" color={isCorporatePersona ? "#B7C7D8" : consumerColors.muted}>
                  {selectedPersona.kind === "PARTICIPANT"
                    ? `${selectedPersona.bankName ?? "Bank"} ${selectedPersona.accountLast4 ? `****${selectedPersona.accountLast4}` : ""}`
                    : "NexusPay"}
                </AppText>
              </View>
              <View style={styles.headerActions}>
                <Pressable
                  onPress={() => router.push("/multi-account-preview" as never)}
                  style={[styles.operatorLink, isCorporatePersona && styles.corporateOperatorLink]}
                >
                  <Feather name="repeat" size={15} color={isCorporatePersona ? "#D6A84F" : consumerColors.blue} />
                </Pressable>

                <Pressable onPress={() => setMenuOpen((open) => !open)} style={[styles.operatorLink, isCorporatePersona && styles.corporateOperatorLink]}>
                  <Feather name="menu" size={16} color={isCorporatePersona ? "#D6A84F" : consumerColors.blue} />
                </Pressable>
              </View>
            </View>

            <View
              style={[
                styles.heroPanel,
                {
                  backgroundColor: shellTint.heroBackground,
                  borderColor: shellTint.heroBorder,
                },
              ]}
            >
              <AppText variant="caption" color={isCorporatePersona ? "#D6A84F" : consumerColors.blue} style={styles.eyebrow}>
                {eyebrow}
              </AppText>
              <AppText color={isCorporatePersona ? consumerColors.white : consumerColors.blueDark} style={styles.title}>
                {title}
              </AppText>
              <AppText color={isCorporatePersona ? "#D7E4F1" : consumerColors.muted} style={styles.subtitle}>
                {subtitle}
              </AppText>
            </View>

            <Modal
              animationType="fade"
              transparent
              visible={menuOpen}
              onRequestClose={() => setMenuOpen(false)}
            >
              <View style={styles.dropdownOverlay}>
                <Pressable style={styles.dropdownBackdrop} onPress={() => setMenuOpen(false)} />
                <View style={[styles.dropdown, { maxHeight: dropdownMaxHeight }]}>
                  <ScrollView nestedScrollEnabled showsVerticalScrollIndicator contentContainerStyle={styles.dropdownScroll}>
                  <Pressable onPress={() => { setMenuOpen(false); router.push("/consumer" as never); }} style={styles.dropdownItem}>
                    <AppText style={styles.dropdownTitle}>Home</AppText>
                  </Pressable>
                  <Pressable onPress={() => { setMenuOpen(false); router.push("/consumer/send" as never); }} style={styles.dropdownItem}>
                    <AppText style={styles.dropdownTitle}>Send</AppText>
                  </Pressable>
                  {!isCorporatePersona ? (
                    <>
                      <Pressable onPress={() => { setMenuOpen(false); router.push("/consumer/fx" as never); }} style={styles.dropdownItem}>
                        <AppText style={styles.dropdownTitle}>FX rates</AppText>
                      </Pressable>
                      <Pressable onPress={() => { setMenuOpen(false); router.push("/consumer/transfers" as never); }} style={styles.dropdownItem}>
                        <AppText style={styles.dropdownTitle}>Transfers</AppText>
                      </Pressable>
                    </>
                  ) : null}
                  {isParticipantPersona ? (
                    <>
                      <Pressable onPress={() => { setMenuOpen(false); router.push("/participant-notifications" as never); }} style={styles.dropdownItem}>
                        <AppText style={styles.dropdownTitle}>Alerts</AppText>
                      </Pressable>
                      <Pressable onPress={() => { setMenuOpen(false); router.push("/received-transfers" as never); }} style={styles.dropdownItem}>
                        <AppText style={styles.dropdownTitle}>Received Transfers</AppText>
                      </Pressable>
                    </>
                  ) : null}
                  {isBusinessPersona ? (
                    <Pressable onPress={() => { setMenuOpen(false); router.push("/corporate-payouts" as never); }} style={styles.dropdownItem}>
                      <AppText style={styles.dropdownTitle}>Batch Payments</AppText>
                    </Pressable>
                  ) : null}
                  {isBusinessPersona ? (
                    <Pressable onPress={() => { setMenuOpen(false); router.push("/business-recipients" as never); }} style={styles.dropdownItem}>
                      <AppText style={styles.dropdownTitle}>Recipients</AppText>
                    </Pressable>
                  ) : null}
                  {!isCorporatePersona ? (
                    <>
                      <Pressable onPress={() => { setMenuOpen(false); router.push("/consumer/nexus-ai" as never); }} style={styles.dropdownItem}>
                        <AppText style={styles.dropdownTitle}>Nexus AI</AppText>
                      </Pressable>
                      <Pressable onPress={() => { setMenuOpen(false); router.push("/consumer/profile" as never); }} style={styles.dropdownItem}>
                        <AppText style={styles.dropdownTitle}>Profile</AppText>
                      </Pressable>
                    </>
                  ) : null}
                  <Pressable onPress={() => { setMenuOpen(false); router.push("/consumer/settings" as never); }} style={styles.dropdownItem}>
                    <AppText style={styles.dropdownTitle}>Settings</AppText>
                  </Pressable>
                  <Pressable onPress={() => { setMenuOpen(false); router.push("/multi-account-preview" as never); }} style={styles.dropdownItem}>
                    <AppText style={styles.dropdownTitle}>Account and persona switcher</AppText>
                  </Pressable>
                  <Pressable onPress={handleSignOut} style={[styles.dropdownItem, styles.signOutItem]}>
                    <AppText style={styles.signOutText}>Sign out</AppText>
                  </Pressable>
                  </ScrollView>
                </View>
              </View>
            </Modal>
          </View>

          <View style={styles.content}>{children}</View>
        </ScrollView>

        <View
          style={[
            styles.nav,
            {
              backgroundColor: shellTint.navBackground,
              borderColor: isCorporatePersona ? "rgba(255,255,255,0.14)" : consumerColors.border,
            },
          ]}
        >
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.navScroll}>
          {tabs.map((tab) => {
            const active = tab.route === "/consumer" ? pathname === tab.route : pathname.startsWith(tab.route);

            return (
              <Pressable
                key={tab.route}
                onPress={() => router.push(tab.route as never)}
                style={[styles.navItem, active && { backgroundColor: shellTint.active }]}
              >
                <Feather
                  name={tab.icon}
                  size={17}
                  color={active ? (isCorporatePersona ? "#061625" : consumerColors.white) : shellTint.inactive}
                />
                <AppText
                  variant="caption"
                  style={{
                    color: active ? (isCorporatePersona ? "#061625" : consumerColors.white) : shellTint.inactive,
                    fontWeight: "900",
                  }}
                >
                  {tab.label}
                </AppText>
              </Pressable>
            );
          })}
          </ScrollView>
        </View>
      </View>
    </SafeAreaView>
  );
}

export function ConsumerCard({ children, accent = false }: { children: React.ReactNode; accent?: boolean }) {
  return <View style={[styles.card, accent && styles.cardAccent]}>{children}</View>;
}

export function ConsumerPill({ label, tone = "blue" }: { label: string; tone?: "blue" | "green" | "gold" }) {
  const palette = {
    blue: { bg: consumerColors.blueSoft, fg: consumerColors.blueDark },
    green: { bg: "#DFF7EC", fg: consumerColors.success },
    gold: { bg: "#FFF1CF", fg: consumerColors.warning },
  }[tone];

  return (
    <View style={[styles.pill, { backgroundColor: palette.bg }]}>
      <AppText variant="caption" style={{ color: palette.fg, fontWeight: "900" }}>
        {label}
      </AppText>
    </View>
  );
}

export function ConsumerAction({
  label,
  icon,
  onPress,
  secondary = false,
}: {
  label: string;
  icon: keyof typeof Feather.glyphMap;
  onPress: () => void;
  secondary?: boolean;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.action, secondary && styles.actionSecondary]}>
      <Feather name={icon} size={17} color={secondary ? consumerColors.blue : consumerColors.white} />
      <AppText color={secondary ? consumerColors.blue : consumerColors.white} style={styles.actionText}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: consumerColors.background,
  },
  corporateSafe: {
    backgroundColor: "#07111F",
  },
  root: {
    flex: 1,
    backgroundColor: consumerColors.background,
  },
  corporateRoot: {
    backgroundColor: "#07111F",
  },
  scroll: {
    paddingBottom: 108,
  },
  header: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: consumerColors.white,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
    borderBottomWidth: 1,
    borderBottomColor: consumerColors.border,
  },
  corporateHeader: {
    backgroundColor: "#07111F",
    borderBottomColor: "rgba(255,255,255,0.10)",
  },
  identity: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 22,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: consumerColors.blue,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)",
  },
  corporateAvatar: {
    backgroundColor: "#0B3F4A",
    borderColor: "rgba(214,168,79,0.42)",
  },
  avatarText: {
    fontWeight: "900",
  },
  accountName: {
    fontSize: 18,
    fontWeight: "900",
  },
  operatorLink: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: consumerColors.white,
    borderWidth: 1,
    borderColor: consumerColors.border,
  },
  corporateOperatorLink: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderColor: "rgba(255,255,255,0.16)",
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
  },
  dropdown: {
    marginHorizontal: 16,
    marginTop: 72,
    backgroundColor: consumerColors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: consumerColors.border,
    overflow: "hidden",
  },
  dropdownOverlay: {
    flex: 1,
    backgroundColor: "rgba(15,34,57,0.18)",
  },
  dropdownBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  dropdownScroll: {
    paddingBottom: 2,
  },
  dropdownItem: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: "#E9F0F8",
  },
  dropdownTitle: {
    color: consumerColors.text,
    fontWeight: "800",
  },
  signOutItem: {
    borderBottomWidth: 0,
    backgroundColor: "#FFF3F3",
  },
  signOutText: {
    color: "#B91C1C",
    fontWeight: "900",
  },
  eyebrow: {
    fontWeight: "900",
  },
  heroPanel: {
    marginTop: 2,
    backgroundColor: consumerColors.blueSoft,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: consumerColors.border,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  title: {
    fontSize: 34,
    fontWeight: "900",
    marginTop: 4,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    marginTop: 6,
    maxWidth: 420,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
  },
  card: {
    backgroundColor: consumerColors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: consumerColors.border,
    padding: 16,
    gap: 12,
    shadowColor: "#0F2239",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  cardAccent: {
    backgroundColor: "#EEF5FF",
  },
  pill: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  action: {
    minHeight: 46,
    borderRadius: 10,
    backgroundColor: consumerColors.blue,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 14,
  },
  actionSecondary: {
    backgroundColor: consumerColors.white,
    borderWidth: 1,
    borderColor: consumerColors.border,
  },
  actionText: {
    fontWeight: "900",
  },
  nav: {
    position: "absolute",
    left: 10,
    right: 10,
    bottom: 10,
    minHeight: 72,
    borderRadius: 12,
    backgroundColor: consumerColors.white,
    borderWidth: 1,
    borderColor: consumerColors.border,
    flexDirection: "row",
    padding: 8,
    gap: 4,
  },
  navItem: {
    minWidth: 72,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    gap: 4,
    paddingHorizontal: 8,
  },
  navScroll: {
    flexGrow: 1,
    gap: 4,
  },
});
