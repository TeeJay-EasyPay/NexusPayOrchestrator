import React, { useEffect, useMemo, useState } from "react";
import { View } from "react-native";

import { CorporateCard, CorporateShell } from "../src/components/corporate/CorporateShell";
import { AppText } from "../src/components/ui/AppText";
import { loadAuditEvents, loadPayoutBatches } from "../src/services/corporateGovernanceService";
import { colors } from "../src/theme";
import { AuditEventRecord, PayoutBatchRecord } from "../src/types/multiEntity";

function money(value: number): string {
  return `GBP ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function CorporateReportsScreen() {
  const [batches, setBatches] = useState<PayoutBatchRecord[]>([]);
  const [events, setEvents] = useState<AuditEventRecord[]>([]);

  useEffect(() => {
    let mounted = true;
    Promise.all([loadPayoutBatches(100), loadAuditEvents(50)]).then(([batchRows, eventRows]) => {
      if (!mounted) return;
      setBatches(batchRows);
      setEvents(eventRows);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const totals = useMemo(() => {
    const totalValue = batches.reduce((sum, item) => sum + item.totalValue, 0);
    return {
      batchCount: batches.length,
      totalValue,
      pending: batches.filter((item) => item.approvalStatus === "PENDING").length,
      rejected: batches.filter((item) => item.approvalStatus === "REJECTED").length,
      auditEvents: events.length,
    };
  }, [batches, events]);

  return (
    <CorporateShell
      routeKey="reports"
      title="Reports"
      subtitle="Governance reporting generated from payout batches, approvals, and audit events."
    >
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        <Metric label="Batches" value={String(totals.batchCount)} />
        <Metric label="Total value" value={money(totals.totalValue)} />
        <Metric label="Pending approval" value={String(totals.pending)} />
        <Metric label="Rejected" value={String(totals.rejected)} />
      </View>

      <CorporateCard>
        <AppText variant="subheading" color={colors.textDarkPrimary} style={{ fontWeight: "900" }}>
          Audit Summary
        </AppText>
        <AppText color={colors.textDarkSecondary}>
          {totals.auditEvents} audit events captured across approval, rule, and release workflows.
        </AppText>
      </CorporateCard>

      <CorporateCard>
        <AppText variant="subheading" color={colors.textDarkPrimary} style={{ fontWeight: "900" }}>
          Report Export Scope
        </AppText>
        <AppText color={colors.textDarkSecondary}>
          This report screen is backed by live Supabase governance tables. File export remains a future enhancement; Auditor can review the same evidence in Audit Logs.
        </AppText>
      </CorporateCard>
    </CorporateShell>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexGrow: 1, flexBasis: "47%", minWidth: 145 }}>
      <CorporateCard>
        <AppText variant="caption" color={colors.textDarkMuted}>{label}</AppText>
        <AppText variant="subheading" color={colors.textDarkPrimary} style={{ fontWeight: "900" }}>{value}</AppText>
      </CorporateCard>
    </View>
  );
}
