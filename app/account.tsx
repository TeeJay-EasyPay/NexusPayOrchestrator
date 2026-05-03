import { router } from "expo-router";
import { ScrollView, View } from "react-native";

import { AppButton } from "../src/components/ui/AppButton";
import { AppCard } from "../src/components/ui/AppCard";
import { AppText } from "../src/components/ui/AppText";
import { Screen } from "../src/components/ui/Screen";
import { colors } from "../src/theme";

function StatusBadge({ label, tone }: { label: string; tone: "green" | "gold" | "blue" | "grey" }) {
  const styles = {
    green: { backgroundColor: "#DCFCE7", color: "#166534" },
    gold: { backgroundColor: colors.goldSoft, color: "#8A6218" },
    blue: { backgroundColor: "#EAF3FF", color: "#0B63CE" },
    grey: { backgroundColor: "#F1F5F9", color: colors.textDarkSecondary },
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

      <AppText variant="body" color="#FFFFFF" style={{ fontWeight: "900" }}>
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
  tone: "green" | "gold" | "blue" | "grey";
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
              Manage your profile, security settings, verification status and account limits.
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
                  Profile
                </AppText>

                <AppText variant="title" color="#FFFFFF">
                  TJ
                </AppText>

                <AppText variant="caption" color="#BFEAF1">
                  tj@nexuspay.demo • United Kingdom
                </AppText>
              </View>

              <View
                style={{
                  width: 54,
                  height: 54,
                  borderRadius: 27,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "rgba(214,168,79,0.22)",
                  borderWidth: 1,
                  borderColor: "rgba(214,168,79,0.40)",
                }}
              >
                <AppText variant="subheading" color={colors.gold} style={{ fontWeight: "900" }}>
                  TJ
                </AppText>
              </View>
            </View>

            <View style={{ flexDirection: "row", gap: 8 }}>
              <ProfileMetric label="Account tier" value="Standard" />
              <ProfileMetric label="KYC status" value="Pending" />
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
                Identity profile created • Compliance verification required before live transfers
              </AppText>
            </View>
          </View>

          <AppCard>
            <View style={{ gap: 12 }}>
              <View style={{ gap: 4 }}>
                <AppText variant="subheading" color={colors.textDarkPrimary}>
                  Verification & compliance
                </AppText>

                <AppText variant="caption" color={colors.textDarkSecondary}>
                  Placeholder controls for the future KYC / AML provider integration.
                </AppText>
              </View>

              <SettingRow
                title="Identity verification"
                description="Passport, driving licence or national ID verification will be handled by a KYC provider."
                status="Not started"
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
                  These controls will connect to the real auth layer when Supabase Auth is added.
                </AppText>
              </View>

              <SettingRow
                title="Two-factor authentication"
                description="Protect account access using authenticator app, SMS or email-based verification."
                status="Off"
                tone="gold"
              />

              <SettingRow
                title="Trusted devices"
                description="View and manage devices that have recently accessed this account."
                status="1 device"
                tone="blue"
              />

              <SettingRow
                title="Session management"
                description="Future controls for logout everywhere, session expiry and suspicious login alerts."
                status="Planned"
                tone="grey"
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
                <LimitCard label="Daily limit" value="£500" />
                <LimitCard label="Monthly limit" value="£2,500" />
              </View>

              <SettingRow
                title="Risk tier"
                description="Risk tier will be calculated from identity, geography, transaction behaviour and provider checks."
                status="Tier 1"
                tone="blue"
              />
            </View>
          </AppCard>

          <AppCard>
            <View style={{ gap: 12 }}>
              <View style={{ gap: 4 }}>
                <AppText variant="subheading" color={colors.textDarkPrimary}>
                  Account data foundation
                </AppText>

                <AppText variant="caption" color={colors.textDarkSecondary}>
                  Future Supabase-backed records that will sit behind this screen.
                </AppText>
              </View>

              <SettingRow
                title="User profile"
                description="Name, email, country, account status and verification metadata."
                status="Ready"
                tone="green"
              />

              <SettingRow
                title="Transaction records"
                description="Permanent transfer history, route decisions, settlement proofs and references."
                status="Next"
                tone="gold"
              />

              <SettingRow
                title="Audit logs"
                description="Lifecycle events for transfer creation, route selection, failures and compliance actions."
                status="Next"
                tone="gold"
              />
            </View>
          </AppCard>

          <AppButton title="Back home" onPress={() => router.push("/")} />
        </View>
      </ScrollView>
    </Screen>
  );
}
