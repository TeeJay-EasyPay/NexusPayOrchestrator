import { Feather } from "@expo/vector-icons";
import { usePathname, useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppText } from "../ui/AppText";

export const consumerColors = {
  background: "#EAF4FF",
  blue: "#0B4F8A",
  blueDark: "#073B66",
  blueSoft: "#D7ECFF",
  white: "#FFFFFF",
  text: "#102033",
  muted: "#5D7188",
  border: "#C8DAEC",
  success: "#0F8A5F",
  warning: "#A66A00",
};

const tabs = [
  { label: "Home", route: "/consumer", icon: "home" },
  { label: "Send", route: "/consumer/send", icon: "send" },
  { label: "Track", route: "/consumer/track", icon: "clock" },
  { label: "Transfers", route: "/consumer/transfers", icon: "list" },
  { label: "Profile", route: "/consumer/profile", icon: "user" },
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

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.root}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          <View style={styles.header}>
            <View style={styles.identity}>
              <View style={styles.avatar}>
                <AppText color={consumerColors.white} style={styles.avatarText}>
                  NP
                </AppText>
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="caption" color={consumerColors.blueSoft}>
                  Personal Account
                </AppText>
                <AppText color={consumerColors.white} style={styles.accountName}>
                  NexusPay
                </AppText>
              </View>
              <Pressable onPress={() => router.push("/multi-account-preview" as never)} style={styles.operatorLink}>
                <Feather name="repeat" size={15} color={consumerColors.white} />
              </Pressable>
            </View>

            <AppText variant="caption" color={consumerColors.blueSoft} style={styles.eyebrow}>
              {eyebrow}
            </AppText>
            <AppText color={consumerColors.white} style={styles.title}>
              {title}
            </AppText>
            <AppText color={consumerColors.blueSoft} style={styles.subtitle}>
              {subtitle}
            </AppText>
          </View>

          <View style={styles.content}>{children}</View>
        </ScrollView>

        <View style={styles.nav}>
          {tabs.map((tab) => {
            const active = tab.route === "/consumer" ? pathname === tab.route : pathname.startsWith(tab.route);

            return (
              <Pressable
                key={tab.route}
                onPress={() => router.push(tab.route as never)}
                style={[styles.navItem, active && styles.navItemActive]}
              >
                <Feather
                  name={tab.icon}
                  size={17}
                  color={active ? consumerColors.white : consumerColors.muted}
                />
                <AppText
                  variant="caption"
                  style={{
                    color: active ? consumerColors.white : consumerColors.muted,
                    fontWeight: "900",
                  }}
                >
                  {tab.label}
                </AppText>
              </Pressable>
            );
          })}
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
  root: {
    flex: 1,
    backgroundColor: consumerColors.background,
  },
  scroll: {
    paddingBottom: 108,
  },
  header: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 24,
    backgroundColor: consumerColors.blue,
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
    backgroundColor: consumerColors.blueDark,
    alignItems: "center",
    justifyContent: "center",
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
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  eyebrow: {
    fontWeight: "900",
  },
  title: {
    fontSize: 34,
    fontWeight: "900",
    marginTop: 6,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 23,
    marginTop: 7,
  },
  content: {
    paddingHorizontal: 14,
    paddingTop: 14,
    gap: 12,
  },
  card: {
    backgroundColor: consumerColors.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: consumerColors.border,
    padding: 16,
    gap: 12,
  },
  cardAccent: {
    backgroundColor: "#F7FBFF",
  },
  pill: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  action: {
    minHeight: 46,
    borderRadius: 8,
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
    borderRadius: 8,
    backgroundColor: consumerColors.white,
    borderWidth: 1,
    borderColor: consumerColors.border,
    flexDirection: "row",
    padding: 8,
    gap: 4,
  },
  navItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    gap: 4,
  },
  navItemActive: {
    backgroundColor: consumerColors.blue,
  },
});
