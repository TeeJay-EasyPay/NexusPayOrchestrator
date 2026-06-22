import React, { useEffect, useState } from "react";
import { View } from "react-native";

import { CorporateCard, CorporateShell } from "../src/components/corporate/CorporateShell";
import { AppText } from "../src/components/ui/AppText";
import { loadAuditEvents } from "../src/services/corporateGovernanceService";
import { colors } from "../src/theme";
import { AuditEventRecord } from "../src/types/multiEntity";

export default function AuditLogsScreen() {
  const [events, setEvents] = useState<AuditEventRecord[]>([]);

  useEffect(() => {
    let mounted = true;
    loadAuditEvents(75).then((rows) => {
      if (mounted) setEvents(rows);
    });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <CorporateShell
      routeKey="audit_logs"
      title="Audit Logs"
      subtitle="Immutable governance and approval decision evidence captured from operational workflows."
    >
      {events.length === 0 ? (
        <CorporateCard>
          <AppText color={colors.textDarkPrimary} style={{ fontWeight: "900" }}>No audit events yet</AppText>
          <AppText color={colors.textDarkSecondary}>Approval and release activity will appear here after workflow actions.</AppText>
        </CorporateCard>
      ) : null}

      {events.map((event) => (
        <CorporateCard key={event.id}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <AppText color={colors.textDarkPrimary} style={{ fontWeight: "900" }}>{event.eventType}</AppText>
              <AppText color={colors.textDarkSecondary}>{event.eventMessage}</AppText>
            </View>
            <AppText variant="caption" color={colors.textDarkMuted}>
              {new Date(event.createdAt).toLocaleDateString()}
            </AppText>
          </View>
          <AppText variant="caption" color={colors.textDarkSecondary}>
            Actor {event.actorPersonaId ?? "system"} - Entity {event.entityType}:{event.entityId.slice(0, 8)}
          </AppText>
        </CorporateCard>
      ))}
    </CorporateShell>
  );
}
