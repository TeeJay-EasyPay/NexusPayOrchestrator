import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, useWindowDimensions, View } from "react-native";

import { supabase } from "../../lib/supabase";
import { colors } from "../../theme";
import { AppText } from "../ui/AppText";

type BadgeUser = {
  email: string;
  displayName: string;
  initials: string;
  isDemo: boolean;
};

function buildBadgeUser(email?: string | null): BadgeUser {
  const safeEmail = email || "Not signed in";
  const isDemo = safeEmail.toLowerCase() === "demo@nexuspay.app";

  if (isDemo) {
    return { email: safeEmail, displayName: "Demo User", initials: "DU", isDemo: true };
  }

  const namePart = safeEmail.includes("@") ? safeEmail.split("@")[0] : safeEmail;
  const cleaned = namePart.replace(/[._-]+/g, " ").trim();

  const displayName = cleaned
    ? cleaned.split(" ").map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(" ")
    : "User";

  const initials =
    displayName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p.charAt(0).toUpperCase())
      .join("") || "U";

  return { email: safeEmail, displayName, initials, isDemo: false };
}

export function UserAccountBadge() {
  const [badgeUser, setBadgeUser] = useState<BadgeUser>(buildBadgeUser(null));
  const { width } = useWindowDimensions();

  const isCompact = width < 430;

  useEffect(() => {
    let mounted = true;

    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (mounted) setBadgeUser(buildBadgeUser(user?.email));
    }

    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setBadgeUser(buildBadgeUser(session?.user?.email));
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <Pressable
      onPress={() => router.push("/account")}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: isCompact ? 0 : 8,
        paddingVertical: isCompact ? 6 : 7,
        paddingHorizontal: isCompact ? 6 : 9,
        borderRadius: 999,
        backgroundColor: "rgba(255,255,255,0.96)",
        borderWidth: 1,
        borderColor: badgeUser.isDemo ? "#F1D99B" : "#E2E8F0",
        transform: [{ scale: pressed ? 0.98 : 1 }],
      })}
    >
      <View
        style={{
          width: isCompact ? 34 : 32,
          height: isCompact ? 34 : 32,
          borderRadius: isCompact ? 17 : 16,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: badgeUser.isDemo ? colors.goldSoft : "#EAF3FF",
          borderWidth: 1,
          borderColor: badgeUser.isDemo ? colors.gold : "#B8D9FF",
        }}
      >
        <AppText
          variant="caption"
          color={badgeUser.isDemo ? colors.gold : "#0B63CE"}
          style={{ fontWeight: "900" }}
        >
          {badgeUser.initials}
        </AppText>
      </View>

      {!isCompact ? (
        <View style={{ maxWidth: 112 }}>
          <AppText
            variant="caption"
            color={colors.textDarkPrimary}
            style={{ fontWeight: "900" }}
            numberOfLines={1}
          >
            {badgeUser.displayName}
          </AppText>

          <AppText
            variant="caption"
            color={badgeUser.isDemo ? colors.gold : colors.textDarkMuted}
            numberOfLines={1}
          >
            {badgeUser.isDemo ? "Demo access" : "Signed in"}
          </AppText>
        </View>
      ) : null}
    </Pressable>
  );
}