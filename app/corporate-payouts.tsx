import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, TextInput, View } from "react-native";

import { AppButton } from "../src/components/ui/AppButton";
import { AppCard } from "../src/components/ui/AppCard";
import { AppText } from "../src/components/ui/AppText";
import { Screen } from "../src/components/ui/Screen";
import { executePayoutBatch } from "../src/services/multiEntityOrchestrationService";
import {
  loadCorporateRecipients,
  seedDemoParticipantsIfMissing,
} from "../src/services/participantService";
import { usePersona } from "../src/state/PersonaContext";
import { ParticipantRecord } from "../src/types/multiEntity";
import { colors } from "../src/theme";

const INITIAL_AMOUNTS: Record<string, string> = {
  "anne-santos": "123",
  "james-rahman": "456",
  "sarah-khan": "789",
  "alpha-trading-llc": "1111",
  "manila-services-inc": "2222",
  "kuala-lumpur-logistics": "3333",
};

function participantTypeLabel(type: string): string {
  if (type === "CORPORATE") return "Corporate";
  if (type === "BUSINESS") return "Business";
  return "Individual";
}

function formatMoney(value: number): string {
  return `£${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function CorporatePayoutsScreen() {
  const router = useRouter();
  const { selectedPersona } = usePersona();

  const [recipients, setRecipients] = useState<ParticipantRecord[]>([]);
  const [amounts, setAmounts] = useState<Record<string, string>>(INITIAL_AMOUNTS);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [selectedRecipientId, setSelectedRecipientId] = useState<string | null>(null);

  const isCorporatePersona = selectedPersona.id === "corporate-demo";

  useEffect(() => {
    if (!isCorporatePersona) {
      router.replace("/multi-account-preview" as never);
      return;
    }

    let mounted = true;

    async function loadData() {
      setLoading(true);
      await seedDemoParticipantsIfMissing();
      const rows = await loadCorporateRecipients();
      if (mounted) {
        setRecipients(rows);
        setSelectedRecipientId((current) => current ?? rows[0]?.id ?? null);

        setAmounts((current) => {
          const next = { ...current };
          for (const item of rows) {
            if (!next[item.id]) next[item.id] = "0";
          }
          return next;
        });

        setLoading(false);
      }
    }

    void loadData();

    return () => {
      mounted = false;
    };
  }, [isCorporatePersona, router]);

  const recipientMap = useMemo(() => {
    const map: Record<string, ParticipantRecord> = {};
    for (const recipient of recipients) {
      map[recipient.id] = recipient;
    }
    return map;
  }, [recipients]);

  const selectedRecipient = useMemo(
    () => recipients.find((recipient) => recipient.id === selectedRecipientId) ?? recipients[0],
    [recipients, selectedRecipientId],
  );

  const totalAmount = useMemo(
    () => recipients.reduce((sum, r) => sum + (Number(amounts[r.id]) || 0), 0),
    [recipients, amounts],
  );

  async function handleExecuteBatch() {
    if (executing) return;

    setExecuting(true);
    setStatusMessage(null);

    try {
      const output = await executePayoutBatch({
        senderParticipantId: "nexus-manufacturing-ltd",
        transfers: recipients.map((recipient) => ({
          recipientParticipantId: recipient.id,
          amount: Number(amounts[recipient.id]) || 0,
        })),
        recipientMap,
      });

      if (!output.batch) {
        setStatusMessage("No valid amounts entered. Please set at least one amount greater than 0.");
        return;
      }

      setStatusMessage(
        `Batch ${output.batch.id.slice(0, 8)} executed. ${output.transfers.length} transfers created and ${output.notifications.length} notifications sent.`,
      );
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Failed to execute batch");
    } finally {
      setExecuting(false);
    }
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 24 }}>
        <View>
          <AppText variant="caption" color={colors.gold}>
            Corporate Demo
          </AppText>
          <AppText variant="title" color={colors.textPrimary} style={{ marginTop: 2 }}>
            Corporate Payouts
          </AppText>
          <AppText variant="body" color={colors.textSecondary}>
            Nexus Manufacturing Ltd · Multi-recipient payout orchestration
          </AppText>
        </View>

        <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
          <View style={{ flex: 1, minWidth: 150 }}>
            <AppCard>
              <View style={{ gap: 6 }}>
                <AppText variant="caption" color={colors.textDarkMuted}>
                  Batch total
                </AppText>
                <AppText variant="subheading" color={colors.textDarkPrimary} style={{ fontWeight: "800" }}>
                  {formatMoney(totalAmount)}
                </AppText>
                <AppText variant="caption" color={colors.textDarkSecondary}>
                  {recipients.filter((r) => Number(amounts[r.id]) > 0).length} funded recipients
                </AppText>
              </View>
            </AppCard>
          </View>

          <View style={{ flex: 1, minWidth: 150 }}>
            <AppCard>
              <View style={{ gap: 6 }}>
                <AppText variant="caption" color={colors.textDarkMuted}>
                  Selected recipient
                </AppText>
                <AppText variant="subheading" color={colors.textDarkPrimary} style={{ fontWeight: "800" }}>
                  {selectedRecipient?.name ?? "None"}
                </AppText>
                <AppText variant="caption" color={colors.textDarkSecondary}>
                  {selectedRecipient ? `${selectedRecipient.country} · ${selectedRecipient.currency}` : "Choose a recipient below"}
                </AppText>
              </View>
            </AppCard>
          </View>
        </View>

        {loading ? (
          <AppCard>
            <AppText variant="body" color={colors.textDarkPrimary}>Loading recipients...</AppText>
          </AppCard>
        ) : (
          <AppCard>
            <View style={{ gap: 12 }}>
              <View>
                <AppText variant="subheading" color={colors.textDarkPrimary} style={{ fontWeight: "800" }}>
                  Recipients
                </AppText>
                <AppText variant="caption" color={colors.textDarkSecondary}>
                  Select a row to review details and edit the payout amount.
                </AppText>
              </View>

              <View style={{ gap: 8 }}>
                {recipients.map((recipient) => {
                  const active = recipient.id === selectedRecipient?.id;
                  const value = Number(amounts[recipient.id]) || 0;

                  return (
                    <Pressable
                      key={recipient.id}
                      onPress={() => setSelectedRecipientId(recipient.id)}
                      style={{
                        borderWidth: 1,
                        borderColor: active ? colors.gold : "#D1D5DB",
                        borderRadius: 10,
                        backgroundColor: active ? "#FFF7E6" : "#F9FAFB",
                        padding: 11,
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 10,
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <AppText variant="body" color={colors.textDarkPrimary} style={{ fontWeight: "800" }}>
                          {recipient.name}
                        </AppText>
                        <AppText variant="caption" color={colors.textDarkSecondary}>
                          {participantTypeLabel(recipient.participantType)} · {recipient.country}
                        </AppText>
                      </View>
                      <AppText variant="body" color={colors.textDarkPrimary} style={{ fontWeight: "800" }}>
                        {formatMoney(value)}
                      </AppText>
                    </Pressable>
                  );
                })}
              </View>

              {selectedRecipient ? (
                <View
                  style={{
                    borderWidth: 1,
                    borderColor: "#D1D5DB",
                    borderRadius: 12,
                    padding: 12,
                    backgroundColor: "#FFFFFF",
                    gap: 10,
                  }}
                >
                  <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <AppText variant="subheading" color={colors.textDarkPrimary} style={{ fontWeight: "800" }}>
                        {selectedRecipient.name}
                      </AppText>
                      <AppText variant="caption" color={colors.textDarkSecondary}>
                        {selectedRecipient.bankName} ****{selectedRecipient.accountLast4} · {selectedRecipient.currency}
                      </AppText>
                    </View>
                    <AppText variant="caption" color={colors.textDarkMuted}>
                      {participantTypeLabel(selectedRecipient.participantType)}
                    </AppText>
                  </View>

                  <View>
                    <AppText variant="caption" color={colors.textDarkMuted}>
                      Amount (GBP)
                    </AppText>
                    <TextInput
                      value={amounts[selectedRecipient.id] ?? "0"}
                      keyboardType="numeric"
                      onChangeText={(text) => {
                        const sanitized = text.replace(/[^0-9.]/g, "");
                        setAmounts((current) => ({ ...current, [selectedRecipient.id]: sanitized }));
                      }}
                      style={{
                        marginTop: 6,
                        borderWidth: 1,
                        borderColor: "#D1D5DB",
                        borderRadius: 10,
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                        fontSize: 16,
                        fontWeight: "700",
                        color: "#0F172A",
                        backgroundColor: "#F9FAFB",
                      }}
                      placeholder="0"
                      placeholderTextColor="#94A3B8"
                    />
                  </View>
                </View>
              ) : null}
            </View>
          </AppCard>
        )}

        <AppButton
          title={executing ? "Executing batch..." : "Execute Batch"}
          onPress={handleExecuteBatch}
          disabled={executing || loading}
        />

        {statusMessage ? (
          <AppCard>
            <AppText variant="caption" color={statusMessage.toLowerCase().includes("failed") ? "#B91C1C" : colors.textDarkPrimary}>
              {statusMessage}
            </AppText>
          </AppCard>
        ) : null}

        <Pressable
          onPress={() => router.push("/multi-account-preview" as never)}
          style={{ alignItems: "center", paddingVertical: 4 }}
        >
          <AppText variant="caption" color={colors.textSecondary}>
            Switch persona
          </AppText>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}
