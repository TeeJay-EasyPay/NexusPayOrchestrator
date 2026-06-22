import React, { useEffect, useMemo, useState } from "react";
import { Pressable, TextInput, View } from "react-native";

import { CorporateCard, CorporateShell } from "../src/components/corporate/CorporateShell";
import { AppText } from "../src/components/ui/AppText";
import { canAccessCorporateRoute, CorporateRouteKey, getRoleLabel, hasCorporatePermission } from "../src/services/corporateAccessService";
import { loadApprovalRules, loadPaymentTypes, saveApprovalRuleConfig } from "../src/services/corporateGovernanceService";
import { usePersona } from "../src/state/PersonaContext";
import { colors } from "../src/theme";
import { ApprovalRuleRecord, CorporateRole, PaymentTypeRecord } from "../src/types/multiEntity";

const APPROVER_ROLES: CorporateRole[] = ["finance_manager", "finance_director", "cfo", "ceo"];

function amountLabel(rule: ApprovalRuleRecord): string {
  const min = `GBP ${rule.minAmount.toLocaleString()}`;
  const max = rule.maxAmount === null ? "no limit" : `GBP ${rule.maxAmount.toLocaleString()}`;
  return `${min} - ${max}`;
}

export default function CorporateGovernanceScreen() {
  const { selectedPersona } = usePersona();
  const routeKey: CorporateRouteKey = canAccessCorporateRoute(selectedPersona, "corporate_governance") ? "corporate_governance" : "approval_rules";
  const editable = hasCorporatePermission(selectedPersona, "configure_governance");
  const [rules, setRules] = useState<ApprovalRuleRecord[]>([]);
  const [types, setTypes] = useState<PaymentTypeRecord[]>([]);
  const [drafts, setDrafts] = useState<Record<string, { enabled: boolean; sequential: boolean; minAmount: string; maxAmount: string; roleIds: CorporateRole[] }>>({});
  const [busyRuleId, setBusyRuleId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function refresh() {
    const [ruleRows, typeRows] = await Promise.all([loadApprovalRules(), loadPaymentTypes()]);
    setRules(ruleRows);
    setTypes(typeRows);
    setDrafts(Object.fromEntries(ruleRows.map((rule) => [
      rule.id,
      {
        enabled: rule.enabled,
        sequential: rule.sequential,
        minAmount: String(rule.minAmount),
        maxAmount: rule.maxAmount === null ? "" : String(rule.maxAmount),
        roleIds: rule.roles.map((role) => role.approvalRoleId),
      },
    ])));
  }

  useEffect(() => {
    void refresh();
  }, []);

  const typeMap = useMemo(() => new Map(types.map((type) => [type.id, type])), [types]);

  function updateDraft(ruleId: string, patch: Partial<{ enabled: boolean; sequential: boolean; minAmount: string; maxAmount: string; roleIds: CorporateRole[] }>) {
    setDrafts((current) => ({
      ...current,
      [ruleId]: { ...current[ruleId], ...patch },
    }));
  }

  function toggleRole(ruleId: string, role: CorporateRole) {
    const current = drafts[ruleId]?.roleIds ?? [];
    const next = current.includes(role) ? current.filter((item) => item !== role) : [...current, role];
    updateDraft(ruleId, { roleIds: next });
  }

  async function save(rule: ApprovalRuleRecord) {
    const draft = drafts[rule.id];
    if (!draft) return;

    setBusyRuleId(rule.id);
    setMessage(null);

    try {
      await saveApprovalRuleConfig({
        persona: selectedPersona,
        ruleId: rule.id,
        enabled: draft.enabled,
        sequential: draft.sequential,
        minAmount: Number(draft.minAmount) || 0,
        maxAmount: draft.maxAmount.trim() ? Number(draft.maxAmount) : null,
        roleIds: draft.roleIds,
      });
      setMessage("Approval governance rule saved.");
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Governance update failed.");
    } finally {
      setBusyRuleId(null);
    }
  }

  return (
    <CorporateShell
      routeKey={routeKey}
      title={editable ? "Corporate Governance" : "Governance Rules"}
      subtitle={editable ? "Configure database-driven approval requirements without code changes." : "Read-only approval governance view for audit and executive oversight."}
    >
      {message ? (
        <CorporateCard>
          <AppText color={message.toLowerCase().includes("failed") || message.toLowerCase().includes("cannot") ? "#B91C1C" : colors.textDarkPrimary} style={{ fontWeight: "800" }}>
            {message}
          </AppText>
        </CorporateCard>
      ) : null}

      <CorporateCard>
        <AppText variant="subheading" color={colors.textDarkPrimary} style={{ fontWeight: "900" }}>
          Approval Governance
        </AppText>
        <AppText color={colors.textDarkSecondary}>
          Corporate User may enable chains, change thresholds, and assign approver roles. {getRoleLabel(selectedPersona.corporateRole)} currently has {editable ? "edit" : "view"} access.
        </AppText>
      </CorporateCard>

      {rules.map((rule) => {
        const draft = drafts[rule.id];
        const type = typeMap.get(rule.paymentTypeId);

        return (
          <CorporateCard key={rule.id}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
              <View style={{ flex: 1 }}>
                <AppText variant="subheading" color={colors.textDarkPrimary} style={{ fontWeight: "900" }}>
                  {type?.label ?? rule.paymentTypeId}
                </AppText>
                <AppText variant="caption" color={colors.textDarkSecondary}>
                  {rule.label} - {amountLabel(rule)}
                </AppText>
              </View>
              <Pill label={draft?.enabled ? "ENABLED" : "DISABLED"} tone={draft?.enabled ? "green" : "grey"} />
            </View>

            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {APPROVER_ROLES.map((role) => {
                const active = draft?.roleIds.includes(role);
                return (
                  <Pressable
                    key={role}
                    disabled={!editable}
                    onPress={() => toggleRole(rule.id, role)}
                    style={{ borderRadius: 999, borderWidth: 1, borderColor: active ? "#0B3F4A" : "#CBD5E1", backgroundColor: active ? "#0B3F4A" : "#FFFFFF", paddingHorizontal: 10, paddingVertical: 7 }}
                  >
                    <AppText variant="caption" color={active ? "#FFFFFF" : colors.textDarkPrimary} style={{ fontWeight: "900" }}>
                      {getRoleLabel(role)}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>

            {editable && draft ? (
              <>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                  <AmountInput label="Minimum" value={draft.minAmount} onChangeText={(value) => updateDraft(rule.id, { minAmount: value.replace(/[^0-9.]/g, "") })} />
                  <AmountInput label="Maximum" value={draft.maxAmount} placeholder="No limit" onChangeText={(value) => updateDraft(rule.id, { maxAmount: value.replace(/[^0-9.]/g, "") })} />
                </View>

                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                  <Toggle label={draft.enabled ? "Disable chain" : "Enable chain"} onPress={() => updateDraft(rule.id, { enabled: !draft.enabled })} />
                  <Toggle label={draft.sequential ? "Sequential" : "Parallel"} onPress={() => updateDraft(rule.id, { sequential: !draft.sequential })} />
                  <Pressable disabled={busyRuleId !== null} onPress={() => save(rule)} style={{ flexGrow: 1, flexBasis: "47%", minHeight: 42, borderRadius: 10, backgroundColor: "#087C89", alignItems: "center", justifyContent: "center", opacity: busyRuleId ? 0.65 : 1 }}>
                    <AppText color="#FFFFFF" style={{ fontWeight: "900" }}>{busyRuleId === rule.id ? "Saving..." : "Save rule"}</AppText>
                  </Pressable>
                </View>
              </>
            ) : (
              <AppText color={colors.textDarkSecondary}>
                Required approvers: {rule.roles.map((role) => getRoleLabel(role.approvalRoleId)).join(" -> ") || "None"}
              </AppText>
            )}
          </CorporateCard>
        );
      })}
    </CorporateShell>
  );
}

function AmountInput({ label, value, placeholder, onChangeText }: { label: string; value: string; placeholder?: string; onChangeText: (value: string) => void }) {
  return (
    <View style={{ flexGrow: 1, flexBasis: "47%", minWidth: 120 }}>
      <AppText variant="caption" color={colors.textDarkMuted}>{label}</AppText>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType="numeric"
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        style={{ marginTop: 5, borderWidth: 1, borderColor: "#D1D5DB", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: "#0F172A", backgroundColor: "#F8FAFC" }}
      />
    </View>
  );
}

function Toggle({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ flexGrow: 1, flexBasis: "47%", minHeight: 42, borderRadius: 10, borderWidth: 1, borderColor: "#DDE6EE", backgroundColor: "#F8FAFC", alignItems: "center", justifyContent: "center" }}>
      <AppText color={colors.textDarkPrimary} style={{ fontWeight: "900" }}>{label}</AppText>
    </Pressable>
  );
}

function Pill({ label, tone }: { label: string; tone: "green" | "grey" }) {
  return (
    <View style={{ borderRadius: 999, backgroundColor: tone === "green" ? "#DFF7EC" : "#E5E7EB", paddingHorizontal: 10, paddingVertical: 6, alignSelf: "flex-start" }}>
      <AppText variant="caption" style={{ color: tone === "green" ? "#0F8A5F" : "#475569", fontWeight: "900" }}>{label}</AppText>
    </View>
  );
}
