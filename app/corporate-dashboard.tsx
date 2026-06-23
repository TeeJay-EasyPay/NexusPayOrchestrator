import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Pressable, View } from "react-native";

import { CorporateCard, CorporateShell } from "../src/components/corporate/CorporateShell";
import { AppText } from "../src/components/ui/AppText";
import { canAccessCorporateRoute, getRoleLabel } from "../src/services/corporateAccessService";
import { loadApprovalQueue, loadPayoutBatches } from "../src/services/corporateGovernanceService";
import { usePersona } from "../src/state/PersonaContext";
import { colors } from "../src/theme";
import { PayoutBatchRecord } from "../src/types/multiEntity";

function money(value: number): string {
  return `GBP ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function CorporateDashboardScreen() {
  const router = useRouter();
  const { selectedPersona } = usePersona();
  const [batches, setBatches] = useState<PayoutBatchRecord[]>([]);
  const [approvalCount, setApprovalCount] = useState(0);

  useEffect(() => {
    let mounted = true;

    async function load() {
      const [batchRows, approvals] = await Promise.all([
        loadPayoutBatches(25),
        loadApprovalQueue(selectedPersona),
      ]);

      if (!mounted) return;
      setBatches(batchRows);
      setApprovalCount(approvals.filter((item) => item.decision === "PENDING").length);
    }

    void load();

    return () => {
      mounted = false;
    };
  }, [selectedPersona]);

  const totalPending = useMemo(
    () => batches.filter((item) => item.approvalStatus === "PENDING").reduce((sum, item) => sum + item.totalValue, 0),
    [batches],
  );
  const approved = useMemo(() => batches.filter((item) => item.approvalStatus === "APPROVED").length, [batches]);
  const completed = useMemo(() => batches.filter((item) => item.status === "COMPLETED").length, [batches]);

  return (
    <CorporateShell
      routeKey="dashboard"
      title={selectedPersona.corporateRole === "ceo" ? "Executive Dashboard" : selectedPersona.corporateRole === "cfo" ? "Finance Dashboard" : selectedPersona.corporateRole === "cto" ? "Technology Dashboard" : selectedPersona.corporateRole === "auditor" ? "Audit Dashboard" : selectedPersona.corporateRole === "batch_payments_processor" ? "Batch Payments Processor" : "Corporate Dashboard"}
      subtitle={`${getRoleLabel(selectedPersona.corporateRole)} workspace with role-scoped governance access.`}
    >
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        <MetricCard label="Pending approval value" value={money(totalPending)} icon="clock" />
        <MetricCard label="My approval queue" value={String(approvalCount)} icon="inbox" />
        <MetricCard label="Approved batches" value={String(approved)} icon="check-circle" />
        <MetricCard label="Completed batches" value={String(completed)} icon="archive" />
      </View>

      <CorporateCard>
        <AppText variant="subheading" color={colors.textDarkPrimary} style={{ fontWeight: "900" }}>
          Role actions
        </AppText>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {canAccessCorporateRoute(selectedPersona, "batch_payments") ? <Action label="Create batch" icon="layers" onPress={() => router.push("/corporate-payouts" as never)} /> : null}
          {canAccessCorporateRoute(selectedPersona, "approval_queue") ? <Action label="Approval queue" icon="inbox" onPress={() => router.push("/approval-queue" as never)} /> : null}
          {canAccessCorporateRoute(selectedPersona, "batch_operations") ? <Action label="Batch operations" icon="bar-chart-2" onPress={() => router.push("/batch-operations-dashboard" as never)} /> : null}
          {canAccessCorporateRoute(selectedPersona, "corporate_governance") || canAccessCorporateRoute(selectedPersona, "approval_rules") ? <Action label="Governance rules" icon="sliders" onPress={() => router.push("/corporate-governance" as never)} /> : null}
          {canAccessCorporateRoute(selectedPersona, "operations_command_centre") ? <Action label="Operations centre" icon="activity" onPress={() => router.push("/operations-v2" as never)} /> : null}
        </View>
      </CorporateCard>
    </CorporateShell>
  );
}

function MetricCard({ label, value, icon }: { label: string; value: string; icon: keyof typeof Feather.glyphMap }) {
  return (
    <View style={{ flexGrow: 1, flexBasis: "47%", minWidth: 150 }}>
      <CorporateCard>
        <Feather name={icon} size={18} color="#087C89" />
        <AppText variant="caption" color={colors.textDarkMuted}>{label}</AppText>
        <AppText variant="subheading" color={colors.textDarkPrimary} style={{ fontWeight: "900" }}>{value}</AppText>
      </CorporateCard>
    </View>
  );
}

function Action({ label, icon, onPress }: { label: string; icon: keyof typeof Feather.glyphMap; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ minHeight: 46, flexGrow: 1, flexBasis: "47%", borderRadius: 10, borderWidth: 1, borderColor: "#DDE6EE", backgroundColor: "#F8FAFC", paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 8 }}>
      <Feather name={icon} size={17} color="#0B3F4A" />
      <AppText color={colors.textDarkPrimary} style={{ fontWeight: "900", flexShrink: 1 }}>{label}</AppText>
    </Pressable>
  );
}
