import { router } from "expo-router";
import { Alert, ScrollView, View } from "react-native";

import { AppButton } from "../src/components/ui/AppButton";
import { AppCard } from "../src/components/ui/AppCard";
import { AppText } from "../src/components/ui/AppText";
import { Screen } from "../src/components/ui/Screen";
import { writeAuditLog } from "../src/services/auditLog";
import { useAuth } from "../src/state/AuthContext";
import { colors } from "../src/theme";

function getInitials(email?: string | null) {
  if (!email) return "?";
  if (email.toLowerCase() === "demo@nexuspay.app") return "DU";

  const namePart = email.includes("@") ? email.split("@")[0] : email;
  const cleaned = namePart.replace(/[._-]+/g, " ").trim();

  return (
    cleaned
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("") || "U"
  );
}

function getDisplayName(email?: string | null) {
  if (!email) return "Not signed in";
  if (email.toLowerCase() === "demo@nexuspay.app") return "Demo User";

  const namePart = email.includes("@") ? email.split("@")[0] : email;
  const cleaned = namePart.replace(/[._-]+/g, " ").trim();

  return cleaned
    ? cleaned
        .split(" ")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ")
    : "User";
}

function shortId(value?: string) {
  if (!value) return "Not available";
  return `${value.slice(0, 8)}...${value.slice(-6)}`;
}

function StatusBadge({ label, tone }: { label: string; tone: "green" | "gold" | "blue" | "grey" | "red" }) {
  const styles = {
    green: { backgroundColor: "#DCFCE7", color: "#166534" },
    gold: { backgroundColor: colors.goldSoft, color: "#8A6218" },
    blue: { backgroundColor: "#EAF3FF", color: "#0B63CE" },
    grey: { backgroundColor: "#F1F5F9", color: colors.textDarkSecondary },
    red: { backgroundColor: "#FEE2E2", color: "#991B1B" },
  }[tone];

  return (
    <View
      style={{
        alignSelf: "flex-start",
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 999,
        backgroundColor: styles.backgroundColor,
      }}
    >
      <AppText variant="caption" style={{ color: styles.color, fontWeight: "900" }}>
        {label}
      </AppText>
    </View>
  );
}

function ProfileMetric({ label, value }: { label: string; value: string }) {
  return (
    <View
      style={{
        flex: 1,
        padding: 11,
        borderRadius: 16,
        backgroundColor: "rgba(255,255,255,0.10)",
        gap: 4,
      }}
    >
      <AppText variant="caption" color="#BFEAF1">
        {label}
      </AppText>

      <AppText variant="body" color="#FFFFFF" style={{ fontWeight: "900" }} numberOfLines={1}>
        {value}
      </AppText>
    </View>
  );
}

function SettingRow({
  title,
  description,
  status,
  tone,
}: {
  title: string;
  description: string;
  status: string;
  tone: "green" | "gold" | "blue" | "grey" | "red";
}) {
  return (
    <View
      style={{
        padding: 14,
        borderRadius: 18,
        backgroundColor: "#F8FAFC",
        borderWidth: 1,
        borderColor: "#E2E8F0",
        gap: 8,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 12,
        }}
      >
        <View style={{ flex: 1, gap: 4 }}>
          <AppText variant="body" color={colors.textDarkPrimary} style={{ fontWeight: "900" }}>
            {title}
          </AppText>

          <AppText variant="caption" color={colors.textDarkSecondary}>
            {description}
          </AppText>
        </View>

        <StatusBadge label={status} tone={tone} />
      </View>
    </View>
  );
}

function LimitCard({ label, value }: { label: string; value: string }) {
  return (
    <View
      style={{
        flex: 1,
        padding: 13,
        borderRadius: 18,
        backgroundColor: "#F8FAFC",
        borderWidth: 1,
        borderColor: "#E2E8F0",
        gap: 4,
      }}
    >
      <AppText variant="caption" color={colors.textDarkMuted}>
        {label}
      </AppText>

      <AppText variant="body" color={colors.textDarkPrimary} style={{ fontWeight: "900" }}>
        {value}
      </AppText>
    </View>
  );
}

export default function AccountScreen() {
  const { session, demoAccessEnabled, signOut } = useAuth();

  const user = session?.user;
  const email = user?.email ?? "Not signed in";
  const isDemo = email.toLowerCase() === "demo@nexuspay.app" || demoAccessEnabled;
  const displayName = getDisplayName(email);
  const initials = getInitials(email);
  const createdAt = user?.created_at ? new Date(user.created_at).toLocaleDateString() : "Not available";
  const lastSignIn = user?.last_sign_in_at
    ? new Date(user.last_sign_in_at).toLocaleString()
    : "Current session";

  async function handleLogout() {
    Alert.alert("Sign out", "Do you want to end this NexusPay session?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: async () => {
          await writeAuditLog({
            eventType: "LOGOUT",
            metadata: {
              email,
              mode: isDemo ? "DEMO" : "USER",
            },
          });

          await signOut();
          router.replace("/auth");
        },
      },
    ]);
  }

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={{ gap: 18, paddingBottom: 40 }}>
          <View style={{ gap: 6 }}>
            <AppText variant="caption" color={colors.gold}>
              NexusPay identity layer
            </AppText>

            <AppText variant="title" color={colors.textPrimary}>
              Account & Profile
            </AppText>

            <AppText variant="body" color={colors.textSecondary}>
              Manage your signed-in identity, security posture, verification status and account controls.
            </AppText>
          </View>

          <View
            style={{
              padding: 18,
              borderRadius: 26,
              backgroundColor: "#0B3F4A",
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.14)",
              gap: 14,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 12,
              }}
            >
              <View style={{ flex: 1 }}>
                <AppText variant="caption" color="#BFEAF1">
                  Signed-in profile
                </AppText>

                <AppText variant="title" color="#FFFFFF">
                  {displayName}
                </AppText>

                <AppText variant="caption" color="#BFEAF1" numberOfLines={1}>
                  {email}
                </AppText>
              </View>

              <View
                style={{
                  width: 58,
                  height: 58,
                  borderRadius: 29,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: isDemo ? "rgba(214,168,79,0.22)" : "rgba(184,217,255,0.18)",
                  borderWidth: 1,
                  borderColor: isDemo ? "rgba(214,168,79,0.45)" : "rgba(184,217,255,0.45)",
                }}
              >
                <AppText variant="subheading" color={isDemo ? colors.gold : "#B8D9FF"} style={{ fontWeight: "900" }}>
                  {initials}
                </AppText>
              </View>
            </View>

            <View style={{ flexDirection: "row", gap: 8 }}>
              <ProfileMetric label="Access mode" value={isDemo ? "Demo" : "User"} />
              <ProfileMetric label="Auth status" value={session ? "Active" : "Signed out"} />
            </View>

            <View
              style={{
                padding: 13,
                borderRadius: 18,
                backgroundColor: "rgba(255,255,255,0.10)",
                gap: 4,
              }}
            >
              <AppText variant="caption" color="#BFEAF1">
                Account readiness
              </AppText>

              <AppText variant="body" color="#FFFFFF" style={{ fontWeight: "900" }}>
                {isDemo
                  ? "Demo platform access enabled • Real-money transfers disabled"
                  : "Supabase user session active • Compliance verification required before live transfers"}
              </AppText>
            </View>
          </View>

          <AppCard>
            <View style={{ gap: 12 }}>
              <View style={{ gap: 4 }}>
                <AppText variant="subheading" color={colors.textDarkPrimary}>
                  Session details
                </AppText>

                <AppText variant="caption" color={colors.textDarkSecondary}>
                  Live details from the current Supabase Auth session.
                </AppText>
              </View>

              <SettingRow
                title="Supabase user ID"
                description={shortId(user?.id)}
                status={user?.id ? "Active" : "Missing"}
                tone={user?.id ? "green" : "red"}
              />

              <SettingRow
                title="Email identity"
                description={email}
                status={user?.email_confirmed_at ? "Confirmed" : isDemo ? "Demo" : "Unconfirmed"}
                tone={user?.email_confirmed_at || isDemo ? "green" : "gold"}
              />

              <SettingRow
                title="Last sign-in"
                description={lastSignIn}
                status="Current"
                tone="blue"
              />

              <SettingRow
                title="Account created"
                description={createdAt}
                status="Stored"
                tone="green"
              />
            </View>
          </AppCard>

          <AppCard>
            <View style={{ gap: 12 }}>
              <View style={{ gap: 4 }}>
                <AppText variant="subheading" color={colors.textDarkPrimary}>
                  Verification & compliance
                </AppText>

                <AppText variant="caption" color={colors.textDarkSecondary}>
                  These controls remain in simulation until a KYC / AML provider is connected.
                </AppText>
              </View>

              <SettingRow
                title="Identity verification"
                description="Passport, driving licence or national ID verification will be handled by a KYC provider."
                status={isDemo ? "Demo" : "Not started"}
                tone="gold"
              />

              <SettingRow
                title="AML screening"
                description="Sanctions, PEP and adverse media screening will run before live transfer enablement."
                status="Pending"
                tone="grey"
              />

              <SettingRow
                title="Transfer eligibility"
                description="Transfers remain in simulation mode until verification and compliance checks pass."
                status="Demo mode"
                tone="blue"
              />
            </View>
          </AppCard>

          <AppCard>
            <View style={{ gap: 12 }}>
              <View style={{ gap: 4 }}>
                <AppText variant="subheading" color={colors.textDarkPrimary}>
                  Security settings
                </AppText>

                <AppText variant="caption" color={colors.textDarkSecondary}>
                  Auth-backed controls that will grow into the full security profile.
                </AppText>
              </View>

              <SettingRow
                title="Password authentication"
                description="This session was established through Supabase Auth email/password credentials."
                status="Enabled"
                tone="green"
              />

              <SettingRow
                title="Two-factor authentication"
                description="Future protection using authenticator app, SMS or email-based verification."
                status="Planned"
                tone="grey"
              />

              <SettingRow
                title="Trusted devices"
                description="View and manage devices that have recently accessed this account."
                status="1 device"
                tone="blue"
              />
            </View>
          </AppCard>

          <AppCard>
            <View style={{ gap: 12 }}>
              <View style={{ gap: 4 }}>
                <AppText variant="subheading" color={colors.textDarkPrimary}>
                  Limits & account controls
                </AppText>

                <AppText variant="caption" color={colors.textDarkSecondary}>
                  Example limits for a newly created, unverified account.
                </AppText>
              </View>

              <View style={{ flexDirection: "row", gap: 8 }}>
                <LimitCard label="Daily limit" value={isDemo ? "Demo only" : "£500"} />
                <LimitCard label="Monthly limit" value={isDemo ? "Demo only" : "£2,500"} />
              </View>

              <SettingRow
                title="Risk tier"
                description="Risk tier will be calculated from identity, geography, transaction behaviour and provider checks."
                status={isDemo ? "Demo" : "Tier 1"}
                tone="blue"
              />
            </View>
          </AppCard>

          <AppButton title="Back home" onPress={() => router.push("/")} />
          <AppButton title="Sign out" variant="secondary" onPress={handleLogout} />
        </View>
      </ScrollView>
    </Screen>
  );
}
