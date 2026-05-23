import React from "react";
import {
    ActivityIndicator,
    RefreshControl,
    ScrollView,
    StyleSheet,
    View,
} from "react-native";

import { ActiveAlertsCard } from "../src/components/operations-v2/ActiveAlertsCard";
import { CorridorHealthCard } from "../src/components/operations-v2/CorridorHealthCard";
import { GlobalFlowCard } from "../src/components/operations-v2/GlobalFlowCard";
import { KpiGrid } from "../src/components/operations-v2/KpiGrid";
import { MissionControlCard } from "../src/components/operations-v2/MissionControlCard";
import { NexusAISummaryCard } from "../src/components/operations-v2/NexusAISummaryCard";
import { OperationalHealthCard } from "../src/components/operations-v2/OperationalHealthCard";
import { OperationsHeader } from "../src/components/operations-v2/OperationsHeader";
import { TreasuryLiquidityCard } from "../src/components/operations-v2/TreasuryLiquidityCard";
import { AppText } from "../src/components/ui/AppText";
import { Screen } from "../src/components/ui/Screen";
import { useOperationsCommandCentre } from "../src/hooks/useOperationsCommandCentre";
import { colors } from "../src/theme";

export default function OperationsV2Screen() {
  const state = useOperationsCommandCentre();

  const handleRefresh = async () => {
    state.setRefreshing(true);
    await state.refresh();
  };

  if (state.loading) {
    return (
      <Screen>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.gold} />
          <AppText variant="caption" style={styles.loadingText}>
            Loading Mission Control…
          </AppText>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={state.refreshing ?? false}
            onRefresh={handleRefresh}
            tintColor={colors.gold}
            colors={[colors.gold]}
          />
        }
      >
        <OperationsHeader
          realtimeStatus={state.realtimeStatus ?? "Connecting"}
          lastUpdatedAt={state.lastUpdatedAt ?? new Date().toISOString()}
          refreshing={state.refreshing ?? false}
          onRefresh={handleRefresh}
        />

        <View style={styles.sectionGap} />

        <MissionControlCard
          missionStatus={state.missionStatus ?? null}
        />

        <View style={styles.sectionGap} />

        <KpiGrid kpis={state.kpis ?? []} />

        <View style={styles.sectionGap} />

        <CorridorHealthCard corridorRows={state.corridorRows ?? []} />

        <View style={styles.sectionGap} />

        <TreasuryLiquidityCard
          treasurySummary={state.treasurySummary ?? null}
          feedData={state.feedData ?? null}
        />

        <View style={styles.sectionGap} />

        <ActiveAlertsCard
          events={state.events ?? []}
          severityFilter={state.severityFilter ?? "ALL"}
          setSeverityFilter={state.setSeverityFilter}
        />

        <View style={styles.sectionGap} />

        <GlobalFlowCard
          activeTransfers={state.activeTransfers ?? []}
          corridorRows={state.corridorRows ?? []}
        />

        <View style={styles.sectionGap} />

        <OperationalHealthCard serviceHealth={state.serviceHealth ?? []} />

        <View style={styles.sectionGap} />

        <NexusAISummaryCard
          missionSummary={state.missionSummary ?? null}
          missionSummaryLoading={state.missionSummaryLoading ?? false}
          missionSummaryStatus={state.missionSummaryStatus ?? ""}
          operationsAIEnabled={state.operationsAIEnabled ?? false}
          nexusAILoading={state.nexusAILoading ?? false}
          corridorRows={state.corridorRows ?? []}
          treasurySummary={state.treasurySummary ?? null}
          serviceHealth={state.serviceHealth ?? []}
          kpis={state.kpis ?? []}
          alertCount={state.events?.length ?? 0}
          criticalAlertCount={
            state.events?.filter((e) => e.severity === "FAILOVER" || e.severity === "DEGRADED").length ?? 0
          }
        />

        <View style={styles.bottomPad} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    backgroundColor: colors.background,
  },
  loadingText: {
    color: colors.textMuted,
    marginTop: 8,
  },
  sectionGap: {
    height: 4,
  },
  bottomPad: {
    height: 24,
  },
});
