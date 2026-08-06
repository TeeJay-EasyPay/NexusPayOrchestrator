import { View } from "react-native";

import type { RoutePlanEvent } from "../../services/routePlanService";
import { colors } from "../../theme";
import { AppText } from "../ui/AppText";

export function RoutePlanHistory({ events }: { events: RoutePlanEvent[] }) {
  if (events.length === 0) {
    return (
      <AppText variant="caption" color={colors.textDarkMuted}>
        Route decisions will appear as the approved plan progresses.
      </AppText>
    );
  }

  return (
    <View style={{ gap: 12 }}>
      {events.map((event) => (
        <View key={event.id} style={{ flexDirection: "row", gap: 10 }}>
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              marginTop: 6,
              backgroundColor: event.to_status === "FAILED" ? "#DC2626" : colors.success,
            }}
          />
          <View style={{ flex: 1, gap: 2 }}>
            <AppText variant="body" color={colors.textDarkPrimary} style={{ fontWeight: "800" }}>
              {event.event_type.replace(/_/g, " ")}
            </AppText>
            <AppText variant="caption" color={colors.textDarkMuted}>
              {event.from_status ?? "NEW"} to {event.to_status ?? "UNKNOWN"}
            </AppText>
            {event.reason ? (
              <AppText variant="caption" color={colors.textDarkSecondary}>
                {event.reason}
              </AppText>
            ) : null}
            {event.replacement_route_plan_id ? (
              <AppText variant="caption" color={colors.textDarkMuted}>
                Replacement plan: {event.replacement_route_plan_id}
              </AppText>
            ) : null}
          </View>
        </View>
      ))}
    </View>
  );
}
