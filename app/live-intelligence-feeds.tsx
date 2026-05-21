import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";

import {
    getLiveIntelligenceFeeds,
    LiveIntelligenceFeeds,
} from "../src/services/liveIntelligenceFeedService";

export default function LiveIntelligenceFeedsScreen() {
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
        <ActivityIndicator />
        <Text style={styles.loadingText}>Loading live intelligence feeds...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={refreshFeeds} />
      }
    >
      <Text style={styles.title}>Live Intelligence Feeds</Text>
      <Text style={styles.subtitle}>
        Raw live data powering NexusPay intelligence.
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Live FX Feeds</Text>

        {feeds?.fx.length ? (
          feeds.fx.map((item) => (
            <View key={item.pair} style={styles.row}>
              <View>
                <Text style={styles.label}>{item.pair}</Text>
                <Text style={styles.meta}>{item.provider}</Text>
              </View>
              <View style={styles.right}>
                <Text style={styles.value}>{item.rate.toFixed(4)}</Text>
                <Text style={styles.live}>LIVE</Text>
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.empty}>No live FX feeds available.</Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Live Treasury Feeds</Text>

        {feeds?.treasury.length ? (
          feeds.treasury.map((item) => (
            <View key={item.currency} style={styles.row}>
              <View>
                <Text style={styles.label}>{item.currency}</Text>
                <Text style={styles.meta}>{item.source}</Text>
              </View>
              <View style={styles.right}>
                <Text style={styles.value}>
                  {item.availableBalance.toLocaleString()}
                </Text>
                <Text style={styles.live}>LIVE</Text>
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.empty}>No treasury feed data found.</Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Market Hours Feeds</Text>

        {feeds?.marketHours.map((item) => (
          <View key={item.market} style={styles.row}>
            <View>
              <Text style={styles.label}>{item.market}</Text>
              <Text style={styles.meta}>{item.region}</Text>
            </View>
            <Text
              style={[
                styles.status,
                item.status === "OPEN" ? styles.open : styles.closed,
              ]}
            >
              {item.status}
            </Text>
          </View>
        ))}
      </View>

      <Text style={styles.footer}>
        Refreshed:{" "}
        {feeds?.refreshedAt
          ? new Date(feeds.refreshedAt).toLocaleString()
          : "Unknown"}
      </Text>
    </ScrollView>
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
  },
  center: {
    flex: 1,
    backgroundColor: "#07111F",
    alignItems: "center",
    justifyContent: "center",
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
    color: "#9FB3C8",
    marginTop: 8,
    marginBottom: 22,
    fontSize: 15,
  },
  card: {
    backgroundColor: "#101D2F",
    borderRadius: 22,
    padding: 18,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#223656",
  },
  cardTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 14,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 13,
    borderTopWidth: 1,
    borderTopColor: "#223656",
  },
  label: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  meta: {
    color: "#8FA6BF",
    fontSize: 12,
    marginTop: 3,
  },
  right: {
    alignItems: "flex-end",
  },
  value: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "800",
  },
  live: {
    color: "#35D07F",
    fontSize: 11,
    fontWeight: "800",
    marginTop: 3,
  },
  status: {
    fontSize: 13,
    fontWeight: "900",
  },
  open: {
    color: "#35D07F",
  },
  closed: {
    color: "#FF6B6B",
  },
  empty: {
    color: "#8FA6BF",
    paddingVertical: 10,
  },
  footer: {
    color: "#7890AA",
    textAlign: "center",
    marginTop: 4,
  },
});