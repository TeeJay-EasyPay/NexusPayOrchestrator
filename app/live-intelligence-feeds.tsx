import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { AppDropdownMenu } from "../src/components/navigation/AppDropdownMenu";
import { AppButton } from "../src/components/ui/AppButton";
import {
  getLiveIntelligenceFeeds,
  LiveIntelligenceFeeds,
} from "../src/services/liveIntelligenceFeedService";
import { colors } from "../src/theme";

import { SafeAreaView } from "react-native-safe-area-context";

export default function LiveIntelligenceFeedsScreen() {
  const router = useRouter();

  const [feeds, setFeeds] = useState<LiveIntelligenceFeeds | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadFeeds = useCallback(async () => {
    const result = await getLiveIntelligenceFeeds();
    setFeeds(result);
    setLoading(false);
  }, []);

  const refreshFeeds = useCallback(async () => {
    setRefreshing(true);
    await loadFeeds();
    setRefreshing(false);
  }, [loadFeeds]);

  useEffect(() => {
    loadFeeds();

    const interval = setInterval(() => {
      loadFeeds();
    }, 60000);

    return () => clearInterval(interval);
  }, [loadFeeds]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.gold} />
        <Text style={styles.loadingText}>
          Loading live intelligence feeds...
        </Text>
      </View>
    );
  }

  return (
  <SafeAreaView
    style={{ flex: 1, backgroundColor: "#07111F" }}
    edges={["top"]}
  >
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={refreshFeeds} />
      }
    >
      <AppDropdownMenu />

      <View style={{ marginTop: 20, marginBottom: 24 }}>
        <Text style={styles.title}>Live Intelligence Feeds</Text>

        <Text style={styles.subtitle}>
          Real-time market, treasury and operational intelligence powering
          NexusPay Orchestrator.
        </Text>
      </View>

      {/* MARKET INTELLIGENCE */}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Market Intelligence</Text>

        {feeds?.fx.length ? (
          feeds.fx.map((item) => (
            <View key={item.pair} style={styles.row}>
              <View>
                <Text style={styles.label}>{item.pair}</Text>

                <Text style={styles.meta}>
                  {item.provider}
                </Text>
              </View>

              <View style={styles.right}>
                <Text style={styles.value}>
                  {item.rate.toFixed(4)}
                </Text>

                <Text style={styles.live}>
                  LIVE
                </Text>
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.empty}>
            No market intelligence available.
          </Text>
        )}
      </View>

      {/* TREASURY */}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Treasury Intelligence</Text>

        {feeds?.treasury.length ? (
          feeds.treasury.map((item) => (
            <View key={item.currency} style={styles.row}>
              <View>
                <Text style={styles.label}>
                  {item.currency}
                </Text>

                <Text style={styles.meta}>
                  {item.source}
                </Text>
              </View>

              <View style={styles.right}>
                <Text style={styles.value}>
                  {item.availableBalance.toLocaleString()}
                </Text>

                <Text style={styles.live}>
                  LIVE
                </Text>
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.empty}>
            No treasury intelligence available.
          </Text>
        )}
      </View>

      {/* MARKET HOURS */}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Global Market Hours</Text>

        {feeds?.marketHours.map((item) => (
          <View key={item.market} style={styles.row}>
            <View>
              <Text style={styles.label}>
                {item.market}
              </Text>

              <Text style={styles.meta}>
                {item.region}
              </Text>
            </View>

            <Text
              style={[
                styles.status,
                item.status === "OPEN"
                  ? styles.open
                  : styles.closed,
              ]}
            >
              {item.status}
            </Text>
          </View>
        ))}
      </View>

      <AppButton
        title="Return to Dashboard"
        variant="secondary"
        onPress={() => router.push("/")}
      />

      <Text style={styles.footer}>
        Refreshed{" "}
        {feeds?.refreshedAt
          ? new Date(feeds.refreshedAt).toLocaleString()
          : ""}
      </Text>
        </ScrollView>
  </SafeAreaView>
);

}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#07111F",
  },

  content: {
    padding: 20,
    paddingBottom: 40,
    gap: 16,
  },

  center: {
    flex: 1,
    backgroundColor: "#07111F",
    justifyContent: "center",
    alignItems: "center",
  },

  loadingText: {
    color: "#DCE7F5",
    marginTop: 12,
  },

  title: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "800",
  },

  subtitle: {
    color: "#BFEAF1",
    fontSize: 15,
    marginTop: 8,
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  cardTitle: {
    color: "#0F172A",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 12,
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },

  label: {
    color: "#0F172A",
    fontSize: 16,
    fontWeight: "700",
  },

  meta: {
    color: "#64748B",
    fontSize: 12,
    marginTop: 2,
  },

  right: {
    alignItems: "flex-end",
  },

  value: {
    color: "#0F172A",
    fontSize: 17,
    fontWeight: "800",
  },

  live: {
    color: "#16A34A",
    fontSize: 11,
    fontWeight: "900",
    marginTop: 2,
  },

  status: {
    fontSize: 13,
    fontWeight: "900",
  },

  open: {
    color: "#16A34A",
  },

  closed: {
    color: "#DC2626",
  },

  empty: {
    color: "#64748B",
    paddingVertical: 10,
  },

  footer: {
    color: "#94A3B8",
    textAlign: "center",
    marginTop: 8,
  },
});