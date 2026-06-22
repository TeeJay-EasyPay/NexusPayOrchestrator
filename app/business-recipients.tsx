import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import {
  ConsumerAction,
  ConsumerCard,
  ConsumerPill,
  ConsumerShell,
} from "../src/components/consumer/ConsumerShell";
import { CorporateShell } from "../src/components/corporate/CorporateShell";
import { AppText } from "../src/components/ui/AppText";
import { BusinessRecipient, loadBusinessRecipients } from "../src/services/businessPersonaService";
import { isCorporatePersona as checkCorporatePersona } from "../src/services/corporateAccessService";
import { usePersona } from "../src/state/PersonaContext";

const businessColors = {
  teal: "#087C89",
  tealDark: "#064E57",
  tealSoft: "#DDF4F2",
  green: "#108A5F",
  gold: "#B7791F",
  text: "#0F2239",
  muted: "#5F728A",
  border: "#D7E7E5",
  white: "#FFFFFF",
};

export default function BusinessRecipientsScreen() {
  const router = useRouter();
  const { selectedPersona } = usePersona();
  const [recipients, setRecipients] = useState<BusinessRecipient[]>([]);
  const [loading, setLoading] = useState(true);
  const isCorporatePersona = checkCorporatePersona(selectedPersona);

  useEffect(() => {
    let mounted = true;

    async function load() {
      if (!selectedPersona.participantId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      const rows = await loadBusinessRecipients(selectedPersona.participantId);
      if (mounted) {
        setRecipients(rows);
        setLoading(false);
      }
    }

    void load();

    return () => {
      mounted = false;
    };
  }, [selectedPersona.participantId]);

  const content = (
      <View style={{ gap: 12 }}>
        {isCorporatePersona ? (
          <ConsumerCard>
            <View style={{ gap: 4 }}>
              <AppText variant="caption" color={businessColors.gold} style={{ fontWeight: "900" }}>
                RECIPIENTS
              </AppText>
              <AppText color={businessColors.text} style={styles.title}>
                Corporate recipients
              </AppText>
              <AppText color={businessColors.muted} style={styles.compactCopy}>
                Corporate payees ready for batch payment flows.
              </AppText>
            </View>
          </ConsumerCard>
        ) : null}

      <ConsumerCard>
        <View style={styles.headerRow}>
          <View style={styles.iconBox}>
            <Feather name="users" size={21} color={businessColors.teal} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText color={businessColors.text} style={styles.title}>
              Recipients
            </AppText>
            <AppText color={businessColors.muted} style={styles.compactCopy}>
              Saved payees for {selectedPersona.label}.
            </AppText>
          </View>
          <ConsumerPill label={`${recipients.length}`} tone="blue" />
        </View>
      </ConsumerCard>

      {loading ? (
        <ConsumerCard>
          <AppText color={businessColors.muted}>Loading recipients...</AppText>
        </ConsumerCard>
      ) : null}

      {!loading && recipients.length === 0 ? (
        <ConsumerCard>
          <AppText color={businessColors.muted}>No recipients yet.</AppText>
        </ConsumerCard>
      ) : null}

      {recipients.map((recipient) => (
        <ConsumerCard key={recipient.id}>
          <View style={styles.recipientRow}>
            <View style={styles.recipientAvatar}>
              <AppText color={businessColors.white} style={{ fontWeight: "900" }}>
                {recipient.name.slice(0, 2).toUpperCase()}
              </AppText>
            </View>
            <View style={{ flex: 1 }}>
              <AppText color={businessColors.text} style={styles.recipientName}>
                {recipient.name}
              </AppText>
              <AppText color={businessColors.muted} numberOfLines={1}>
                {recipient.participantType === "BUSINESS" ? "Business" : recipient.participantType === "CORPORATE" ? "Corporate" : "Individual"} - {recipient.bankName} - ****{recipient.accountLast4}
              </AppText>
            </View>
          </View>

          <View style={styles.infoGrid}>
            <InfoCell label="Corridor" value={recipient.corridor} />
            <InfoCell label="Last Payment" value={recipient.lastPayment ?? "No payment yet"} />
          </View>

          <View style={styles.actionRow}>
            <Pressable
              onPress={() => {
                const parts = recipient.name.trim().split(/\s+/);
                router.push({
                  pathname: "/consumer/send",
                  params: {
                    firstName: parts[0] ?? recipient.name,
                    surname: parts.slice(1).join(" ") || recipient.name,
                    country: recipient.country,
                    bankName: recipient.bankName,
                    accountNumber: recipient.accountLast4,
                  },
                } as never);
              }}
              style={styles.iconButton}
            >
              <Feather name="send" size={16} color={businessColors.teal} />
            </Pressable>
            <ConsumerAction label="Batch payment" icon="layers" secondary onPress={() => router.push("/corporate-payouts" as never)} />
          </View>
        </ConsumerCard>
      ))}
      </View>
  );

  if (isCorporatePersona) {
    return (
      <CorporateShell
        routeKey="recipients"
        title="Recipients"
        subtitle="Corporate payees available for classified batch payment workflows."
      >
        {content}
      </CorporateShell>
    );
  }

  return (
    <ConsumerShell
      eyebrow="RECIPIENTS"
      title="Business recipients"
      subtitle="Trusted payees and recent payment context."
    >
      {content}
    </ConsumerShell>
  );
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoCell}>
      <AppText variant="caption" color={businessColors.muted}>
        {label}
      </AppText>
      <AppText color={businessColors.text} style={styles.infoValue}>
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: businessColors.tealSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 19,
    fontWeight: "900",
  },
  compactCopy: {
    lineHeight: 20,
  },
  recipientRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  recipientAvatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: businessColors.teal,
    alignItems: "center",
    justifyContent: "center",
  },
  recipientName: {
    fontSize: 18,
    fontWeight: "900",
  },
  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  infoCell: {
    flexGrow: 1,
    flexBasis: "47%",
    minWidth: 132,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: businessColors.border,
    backgroundColor: "#F7FBFA",
    padding: 11,
    gap: 4,
  },
  infoValue: {
    fontWeight: "900",
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconButton: {
    width: 46,
    height: 46,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: businessColors.border,
    backgroundColor: businessColors.white,
    alignItems: "center",
    justifyContent: "center",
  },
});
